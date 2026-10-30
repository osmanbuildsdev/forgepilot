"use server";
import { z } from "zod";
import { and, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { UserError, attempt } from "@/server/errors";
import { db } from "@/server/db";
import {
  aiGenerations,
  sprints,
  taskDependencies,
  tasks,
  user as users,
} from "@/server/db/schema";
import { requireUser, projectAccess } from "@/server/projects/service";
import { recordActivity } from "@/server/activity";
import { getAIProvider } from "@/server/ai/provider";
import { consumeHourlyQuota } from "@/server/ai/quota";

const days = (start: string, end: string) =>
  Math.round(
    (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) /
      86400000,
  ) + 1;

export async function proposeSprintPlan(projectId: string, sprintId: string) {
  return attempt(async () => {
    z.uuid().parse(projectId);
    z.uuid().parse(sprintId);
    const user = await requireUser();
    const project = await projectAccess(projectId, user.id, true);
    const allSprints = await db
      .select()
      .from(sprints)
      .where(eq(sprints.projectId, projectId))
      .orderBy(desc(sprints.startDate));
    const sprint = allSprints.find((s) => s.id === sprintId);
    if (!sprint || sprint.status === "completed")
      throw new UserError(
        "Yalnızca planlanmış veya aktif bir sprint planlanabilir.",
      );

    const today = new Date().toISOString().slice(0, 10);
    const candidates = await db
      .select({
        id: tasks.id,
        number: tasks.number,
        title: tasks.title,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        points: tasks.estimatePoints,
        assignee: users.name,
      })
      .from(tasks)
      .leftJoin(users, eq(users.id, tasks.assigneeId))
      .where(
        and(
          eq(tasks.projectId, projectId),
          ne(tasks.status, "done"),
          isNull(tasks.sprintId),
        ),
      )
      .orderBy(
        sql`case ${tasks.priority} when 'urgent' then 0 when 'high' then 1 when 'medium' then 2 else 3 end`,
        tasks.number,
      )
      .limit(80);
    if (!candidates.length)
      throw new UserError(
        "Sprinte eklenebilecek, sprinti olmayan açık görev yok.",
      );

    const ids = candidates.map((c) => c.id);
    const [deps, inSprint, workload] = await Promise.all([
      db
        .select({
          taskId: taskDependencies.taskId,
          number: tasks.number,
          status: tasks.status,
        })
        .from(taskDependencies)
        .innerJoin(tasks, eq(tasks.id, taskDependencies.dependsOnId))
        .where(inArray(taskDependencies.taskId, ids)),
      db
        .select({
          points: sql<number>`coalesce(sum(${tasks.estimatePoints}), 0)::int`,
        })
        .from(tasks)
        .where(eq(tasks.sprintId, sprintId)),
      db
        .select({
          name: users.name,
          tasks: sql<number>`count(*)::int`,
          points: sql<number>`coalesce(sum(${tasks.estimatePoints}), 0)::int`,
        })
        .from(tasks)
        .innerJoin(users, eq(users.id, tasks.assigneeId))
        .where(and(eq(tasks.projectId, projectId), ne(tasks.status, "done")))
        .groupBy(users.name),
    ]);

    // Capacity comes from history, scaled to this sprint's length; no history
    // means no capacity number, and the AI is told so.
    const history = allSprints
      .filter((s) => s.status === "completed")
      .slice(0, 3);
    let capacity: number | null = null;
    if (history.length) {
      const avgPoints =
        history.reduce((n, s) => n + (s.completedPoints ?? 0), 0) /
        history.length;
      const avgDays =
        history.reduce((n, s) => n + days(s.startDate, s.endDate), 0) /
        history.length;
      capacity = Math.round(
        avgPoints * (days(sprint.startDate, sprint.endDate) / avgDays),
      );
    }
    const remaining =
      capacity === null ? null : Math.max(capacity - inSprint[0].points, 0);

    await consumeHourlyQuota(
      `ai:sprint:${user.id}`,
      10,
      "Saatlik AI sprint planlama sınırına ulaştın. Daha sonra tekrar dene.",
    );
    const provider = getAIProvider();
    const draft = await provider.planSprint({
      sprint: {
        name: sprint.name,
        goal: sprint.goal,
        dates: `${sprint.startDate} – ${sprint.endDate}`,
        pointsAlreadyInSprint: inSprint[0].points,
      },
      capacityPoints: remaining,
      velocityHistory: history.map((s) => ({
        name: s.name,
        completedPoints: s.completedPoints,
      })),
      workload,
      candidates: candidates.map((c) => ({
        taskNumber: c.number,
        title: c.title,
        priority: c.priority,
        overdue: c.dueDate !== null && c.dueDate < today,
        points: c.points,
        assignee: c.assignee,
        waitsOn: deps
          .filter((d) => d.taskId === c.id && d.status !== "done")
          .map((d) => `${project.key}-${d.number}`),
      })),
    });

    const byNumber = new Map(candidates.map((c) => [c.number, c]));
    // Only candidates count, each once; anything else the AI returned is dropped.
    const valid = new Map<number, (typeof draft.picks)[number]>();
    for (const p of draft.picks)
      if (byNumber.has(p.taskNumber) && !valid.has(p.taskNumber))
        valid.set(p.taskNumber, p);
    const picks = [...valid.values()].map((p) => {
      const c = byNumber.get(p.taskNumber)!;
      // Unfinished prerequisites that are neither done nor part of this plan.
      const missing = deps
        .filter(
          (d) =>
            d.taskId === c.id &&
            d.status !== "done" &&
            !draft.picks.some((x) => x.taskNumber === d.number),
        )
        .map((d) => `${project.key}-${d.number}`);
      return {
        taskId: c.id,
        number: c.number,
        title: c.title,
        priority: c.priority,
        points: c.points,
        assignee: c.assignee,
        reason: p.reason,
        warning: missing.length
          ? `Bitmemiş görevi bekliyor: ${missing.join(", ")}`
          : null,
      };
    });
    if (!picks.length)
      throw new UserError("AI uygun bir görev seçemedi. Tekrar dene.");

    const [generation] = await db
      .insert(aiGenerations)
      .values({
        userId: user.id,
        workspaceId: project.workspaceId,
        projectId,
        kind: "sprint_plan",
        model: provider.model,
        input: { sprintId, capacity: remaining },
        output: { summary: draft.summary, taskIds: picks.map((p) => p.taskId) },
        status: "succeeded",
      })
      .returning({ id: aiGenerations.id });
    return {
      generationId: generation.id,
      summary: draft.summary,
      capacity: remaining,
      pointsAlreadyInSprint: inSprint[0].points,
      picks,
    };
  });
}

// Adds the accepted subset of a stored plan to the sprint. Tasks that were
// scheduled elsewhere or finished in the meantime are left alone.
export async function applySprintPlan(
  projectId: string,
  sprintId: string,
  generationId: string,
  taskIds: unknown,
) {
  return attempt(async () => {
    z.uuid().parse(projectId);
    z.uuid().parse(sprintId);
    z.uuid().parse(generationId);
    const accepted = z
      .array(z.uuid())
      .min(1, "En az bir görev seç.")
      .max(40)
      .parse(taskIds);
    const user = await requireUser();
    await projectAccess(projectId, user.id, true);
    const count = await db.transaction(async (tx) => {
      const [generation] = await tx
        .select()
        .from(aiGenerations)
        .where(
          and(
            eq(aiGenerations.id, generationId),
            eq(aiGenerations.userId, user.id),
            eq(aiGenerations.projectId, projectId),
            eq(aiGenerations.kind, "sprint_plan"),
          ),
        )
        .for("update");
      const input = generation?.input as { sprintId?: string } | undefined;
      const output = generation?.output as { taskIds?: string[] } | undefined;
      if (
        !generation ||
        generation.status !== "succeeded" ||
        input?.sprintId !== sprintId
      )
        throw new UserError("Bu plan bulunamadı ya da zaten uygulandı.");
      if (accepted.some((id) => !output?.taskIds?.includes(id)))
        throw new UserError("Plan dışındaki görevler eklenemez.");
      const [sprint] = await tx
        .select({ name: sprints.name, status: sprints.status })
        .from(sprints)
        .where(and(eq(sprints.id, sprintId), eq(sprints.projectId, projectId)));
      if (!sprint || sprint.status === "completed")
        throw new UserError("Sprint kapanmış.");
      const moved = await tx
        .update(tasks)
        .set({ sprintId, updatedAt: new Date() })
        .where(
          and(
            eq(tasks.projectId, projectId),
            inArray(tasks.id, accepted),
            isNull(tasks.sprintId),
            ne(tasks.status, "done"),
          ),
        )
        .returning({ id: tasks.id });
      await tx
        .update(aiGenerations)
        .set({ status: "applied", updatedAt: new Date() })
        .where(eq(aiGenerations.id, generationId));
      if (moved.length)
        await recordActivity(tx, {
          projectId,
          type: "task.updated",
          source: "ai",
          actorId: user.id,
          message: `AI planı onaylandı: ${moved.length} görev ${sprint.name} sprintine eklendi.`,
          metadata: { sprintId, generationId, taskIds: moved.map((m) => m.id) },
        });
      return moved.length;
    });
    revalidatePath("/app", "layout");
    return count;
  });
}
