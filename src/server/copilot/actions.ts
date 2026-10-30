"use server";
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { attempt } from "@/server/errors";
import { db } from "@/server/db";
import {
  aiGenerations,
  githubPullRequests,
  milestones,
  projectRepositories,
  sprints,
  tasks,
} from "@/server/db/schema";
import { requireUser, projectAccess } from "@/server/projects/service";
import { getAIProvider } from "@/server/ai/provider";
import { consumeHourlyQuota } from "@/server/ai/quota";
import {
  copilotQuestion,
  type CopilotAction,
  type CopilotReference,
} from "@/features/ai/copilot-schema";
import { copilotContext } from "./context";

export async function askCopilot(projectId: string, input: unknown) {
  return attempt(async () => {
    z.uuid().parse(projectId);
    const { question, history } = copilotQuestion.parse(input);
    const user = await requireUser();
    const project = await projectAccess(projectId, user.id);
    await consumeHourlyQuota(
      `ai:copilot:${user.id}`,
      30,
      "Saatlik Copilot sınırına ulaştın (30). Daha sonra tekrar dene.",
    );
    const context = await copilotContext(project);
    const provider = getAIProvider();
    const reply = await provider.answerCopilot({ question, history, context });

    const board = `/app/projects/${projectId}/board`;
    const numbers = [
      ...new Set([
        ...reply.references
          .filter((r) => r.kind === "task")
          .map((r) => Number(r.ref.replace(/^\D+-/, ""))),
        ...reply.actions.map((a) => a.taskNumber),
      ]),
    ].filter((n) => Number.isInteger(n) && n > 0);
    const [taskRows, sprintRows, milestoneRows, prRows] = await Promise.all([
      numbers.length
        ? db
            .select({ id: tasks.id, number: tasks.number, title: tasks.title })
            .from(tasks)
            .where(
              and(
                eq(tasks.projectId, projectId),
                inArray(tasks.number, numbers),
              ),
            )
        : [],
      db
        .select({ id: sprints.id, name: sprints.name, status: sprints.status })
        .from(sprints)
        .where(eq(sprints.projectId, projectId)),
      db
        .select({ name: milestones.name })
        .from(milestones)
        .where(eq(milestones.projectId, projectId)),
      db
        .select({
          number: githubPullRequests.number,
          url: githubPullRequests.url,
        })
        .from(githubPullRequests)
        .where(
          inArray(
            githubPullRequests.repositoryId,
            db
              .select({ id: projectRepositories.repositoryId })
              .from(projectRepositories)
              .where(eq(projectRepositories.projectId, projectId)),
          ),
        ),
    ]);
    const taskByNumber = new Map(taskRows.map((t) => [t.number, t]));
    const label = (t: { number: number; title: string }) =>
      `${project.key}-${t.number} ${t.title}`;

    // Keep only references that point at real objects in this project.
    const references: CopilotReference[] = [];
    for (const r of reply.references) {
      if (r.kind === "task") {
        const t = taskByNumber.get(Number(r.ref.replace(/^\D+-/, "")));
        if (t) references.push({ kind: "task", label: label(t), href: board });
      } else if (r.kind === "pull_request") {
        const pr = prRows.find(
          (p) => p.number === Number(r.ref.replace(/^#/, "")),
        );
        if (pr)
          references.push({
            kind: "pull_request",
            label: `PR #${pr.number}`,
            href: pr.url,
            external: true,
          });
      } else if (r.kind === "sprint") {
        if (sprintRows.some((s) => s.name === r.ref))
          references.push({
            kind: "sprint",
            label: r.ref,
            href: `/app/projects/${projectId}/sprints`,
          });
      } else if (milestoneRows.some((m) => m.name === r.ref))
        references.push({
          kind: "milestone",
          label: r.ref,
          href: `/app/projects/${projectId}/roadmap`,
        });
    }
    const unique = [...new Map(references.map((r) => [r.label, r])).values()];

    // Actions become proposals tied to real ids; anything unresolvable is dropped.
    const actions: CopilotAction[] = [];
    for (const a of reply.actions) {
      const task = taskByNumber.get(a.taskNumber);
      if (a.type === "create_task" && a.title.trim())
        actions.push({
          type: "create_task",
          title: a.title.trim(),
          description: a.description,
          priority: a.priority,
        });
      else if (a.type === "update_priority" && task)
        actions.push({
          type: "update_priority",
          taskId: task.id,
          label: label(task),
          priority: a.priority,
        });
      else if (a.type === "add_to_sprint" && task) {
        const sprint = sprintRows.find(
          (s) => s.name === a.sprintName && s.status !== "completed",
        );
        if (sprint)
          actions.push({
            type: "add_to_sprint",
            taskId: task.id,
            label: label(task),
            sprintId: sprint.id,
            sprintName: sprint.name,
          });
      } else if (a.type === "open_task" && task)
        actions.push({ type: "open_task", label: label(task), href: board });
    }

    await db.insert(aiGenerations).values({
      userId: user.id,
      workspaceId: project.workspaceId,
      projectId,
      kind: "copilot",
      model: provider.model,
      input: { question },
      output: { answer: reply.answer, references: unique, actions },
      status: "succeeded",
    });
    return { answer: reply.answer, references: unique, actions };
  });
}
