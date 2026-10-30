"use server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { UserError, attempt } from "@/server/errors";
import { db } from "@/server/db";
import {
  aiGenerations,
  milestones,
  projects,
  sprints,
  tasks,
} from "@/server/db/schema";
import {
  projectData,
  requireUser,
  projectAccess,
  workspaceAccess,
} from "@/server/projects/service";
import { recordActivity } from "@/server/activity";
import { planApproval, planRequest } from "@/features/ai/plan-schema";
import { getAIProvider } from "./provider";
import { consumeHourlyQuota } from "./quota";
import { cachedBriefNarrative } from "./cache";
import { dailyBrief } from "@/server/insights/service";

const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export async function generateTaskDraft(
  projectId: string,
  instruction: string,
) {
  return attempt(async () => {
    z.uuid().parse(projectId);
    z.string().trim().min(10).max(2000).parse(instruction);
    const user = await requireUser();
    await projectAccess(projectId, user.id, true);
    await consumeHourlyQuota(
      `ai:tasks:${user.id}`,
      10,
      "Saatlik AI öneri sınırına ulaştın. Daha sonra tekrar dene.",
    );
    const data = await projectData(projectId, user.id);
    return getAIProvider().generateTasks({
      name: data.project.name,
      description: data.project.description,
      existingTasks: data.tasks.map((t) => t.title).slice(0, 200),
      instruction,
    });
  });
}

export async function generateProjectPlan(workspaceId: string, input: unknown) {
  return attempt(async () => {
    z.uuid().parse(workspaceId);
    const request = planRequest.parse(input);
    const user = await requireUser();
    await workspaceAccess(workspaceId, user.id, true);
    await consumeHourlyQuota(
      `ai:plan:${user.id}`,
      5,
      "Saatlik proje planı sınırına ulaştın (5). Daha sonra tekrar dene.",
    );
    const provider = getAIProvider();
    try {
      const plan = await provider.generateProjectPlan(request);
      const [generation] = await db
        .insert(aiGenerations)
        .values({
          userId: user.id,
          workspaceId,
          kind: "project_plan",
          model: provider.model,
          input: request,
          output: plan,
          status: "succeeded",
        })
        .returning({ id: aiGenerations.id });
      return { generationId: generation.id, plan };
    } catch (error) {
      await db.insert(aiGenerations).values({
        userId: user.id,
        workspaceId,
        kind: "project_plan",
        model: provider.model,
        input: request,
        status: "failed",
        error: error instanceof Error ? error.message.slice(0, 500) : null,
      });
      throw error;
    }
  });
}

export async function createProjectFromPlan(input: unknown) {
  return attempt(async () => {
    const data = planApproval.parse(input);
    const user = await requireUser();
    await workspaceAccess(data.workspaceId, user.id, true);
    const { plan } = data;

    const [generation] = await db
      .select({ id: aiGenerations.id, status: aiGenerations.status })
      .from(aiGenerations)
      .where(
        and(
          eq(aiGenerations.id, data.generationId),
          eq(aiGenerations.userId, user.id),
          eq(aiGenerations.kind, "project_plan"),
        ),
      );
    if (!generation || generation.status !== "succeeded")
      throw new UserError("Bu plan bulunamadı ya da zaten uygulandı.");

    const [taken] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.workspaceId, data.workspaceId),
          eq(projects.key, data.key),
        ),
      );
    if (taken)
      throw new UserError(
        `${data.key} anahtarı bu çalışma alanında zaten kullanılıyor.`,
      );

    const projectId = await db.transaction(async (tx) => {
      const [project] = await tx
        .insert(projects)
        .values({
          workspaceId: data.workspaceId,
          name: data.name,
          key: data.key,
          description: plan.summary,
          nextTaskNumber: plan.tasks.length,
          createdBy: user.id,
        })
        .returning({ id: projects.id });

      const milestoneIds = plan.milestones.length
        ? (
            await tx
              .insert(milestones)
              .values(
                plan.milestones.map((m) => ({
                  projectId: project.id,
                  name: m.name,
                  description: m.description,
                  dueDate: addDays(data.startDate, m.targetWeek * 7 - 1),
                })),
              )
              .returning({ id: milestones.id })
          ).map((m) => m.id)
        : [];

      // Sprints are laid out back to back from the chosen start date.
      const length = data.sprintWeeks * 7;
      const sprintIds = plan.sprints.length
        ? (
            await tx
              .insert(sprints)
              .values(
                plan.sprints.map((s, i) => ({
                  projectId: project.id,
                  name: s.name,
                  goal: s.goal,
                  startDate: addDays(data.startDate, i * length),
                  endDate: addDays(data.startDate, (i + 1) * length - 1),
                })),
              )
              .returning({ id: sprints.id })
          ).map((s) => s.id)
        : [];

      await tx.insert(tasks).values(
        plan.tasks.map((t, i) => ({
          projectId: project.id,
          number: i + 1,
          title: t.title,
          description: t.description,
          priority: t.priority,
          estimatePoints: t.estimatePoints,
          // Out-of-range indexes (e.g. after the user removed an item) unlink.
          milestoneId: milestoneIds[t.milestoneIndex] ?? null,
          sprintId: sprintIds[t.sprintIndex] ?? null,
          createdBy: user.id,
        })),
      );

      await recordActivity(tx, {
        projectId: project.id,
        type: "project.created",
        source: "ai",
        actorId: user.id,
        message: `Proje AI planından oluşturuldu: ${plan.tasks.length} görev, ${milestoneIds.length} milestone, ${sprintIds.length} sprint.`,
        metadata: { generationId: data.generationId },
      });

      await tx
        .update(aiGenerations)
        .set({
          status: "applied",
          projectId: project.id,
          // Keep what was actually applied, including the user's edits.
          output: plan,
          updatedAt: new Date(),
        })
        .where(eq(aiGenerations.id, data.generationId));
      return project.id;
    });
    revalidatePath("/app", "layout");
    return projectId;
  });
}

// Generates at most one narrative per user per day; later calls reuse it.
export async function generateBriefNarrative() {
  return attempt(async () => {
    const user = await requireUser();
    const cached = await cachedBriefNarrative(user.id);
    if (cached) return cached;
    await consumeHourlyQuota(
      `ai:brief:${user.id}`,
      5,
      "Saatlik AI özet sınırına ulaştın. Daha sonra tekrar dene.",
    );
    const brief = await dailyBrief(user.id);
    const facts = {
      date: brief.today,
      completedLast24h: brief.completed.map(briefLine),
      inProgress: brief.inProgress.map(briefLine),
      dueTodayOrOverdue: brief.dueNow.map(briefLine),
      blocked: brief.blocked.map(briefLine),
      risks: brief.risks.map((r) => `${r.projectName}: ${r.detail}`),
    };
    const provider = getAIProvider();
    const narrative = await provider.summarizeActivity(facts);
    await db.insert(aiGenerations).values({
      userId: user.id,
      kind: "daily_brief",
      model: provider.model,
      input: facts,
      output: narrative,
      status: "succeeded",
    });
    return narrative;
  });
}

function briefLine(t: {
  projectKey: string;
  number: number;
  title: string;
  dueDate: string | null;
}) {
  return `${t.projectKey}-${t.number} ${t.title}${t.dueDate ? ` (son tarih ${t.dueDate})` : ""}`;
}
