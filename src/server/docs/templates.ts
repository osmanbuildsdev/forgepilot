import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  aiGenerations,
  documentTemplates,
  members,
  milestones,
  projects,
  sprints,
  tasks,
  user,
  workspaces,
} from "@/server/db/schema";
import { UserError } from "@/server/errors";
import { findBuiltin } from "@/features/docs/builtin-templates";
import type { Placeholder } from "@/features/docs/placeholders";

export async function userTemplates(userId: string) {
  const mine = db
    .select({ id: members.workspaceId })
    .from(members)
    .where(eq(members.userId, userId));
  return db
    .select({
      id: documentTemplates.id,
      name: documentTemplates.name,
      description: documentTemplates.description,
      workspaceId: documentTemplates.workspaceId,
      workspaceName: workspaces.name,
      updatedAt: documentTemplates.updatedAt,
      origin: documentTemplates.origin,
    })
    .from(documentTemplates)
    .innerJoin(workspaces, eq(workspaces.id, documentTemplates.workspaceId))
    .where(inArray(documentTemplates.workspaceId, mine))
    .orderBy(desc(documentTemplates.updatedAt));
}

// Resolves "builtin:<id>" or a workspace template the user can read.
export async function loadTemplate(ref: string, userId: string) {
  if (ref.startsWith("builtin:")) {
    const builtin = findBuiltin(ref.slice("builtin:".length));
    if (!builtin) throw new UserError("Şablon bulunamadı.");
    return {
      ref,
      name: builtin.name,
      content: builtin.content,
      workspaceId: null,
    };
  }
  const [row] = await db
    .select({
      id: documentTemplates.id,
      name: documentTemplates.name,
      content: documentTemplates.contentMarkdown,
      workspaceId: documentTemplates.workspaceId,
    })
    .from(documentTemplates)
    .innerJoin(
      members,
      and(
        eq(members.workspaceId, documentTemplates.workspaceId),
        eq(members.userId, userId),
      ),
    )
    .where(eq(documentTemplates.id, ref));
  if (!row) throw new UserError("Şablon bulunamadı.");
  return {
    ref: row.id,
    name: row.name,
    content: row.content,
    workspaceId: row.workspaceId,
  };
}

const longDate = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Istanbul",
});
const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("tr-TR", { timeZone: "UTC" });

// Facts for placeholders, read from the database. Missing facts are left
// out so the placeholder stays visible instead of being guessed.
export async function placeholderValues(projectId: string) {
  const [project] = await db
    .select({
      name: projects.name,
      description: projects.description,
      workspaceId: projects.workspaceId,
      workspaceName: workspaces.name,
    })
    .from(projects)
    .innerJoin(workspaces, eq(workspaces.id, projects.workspaceId))
    .where(eq(projects.id, projectId));
  const [[counts], active, team, ms, plan] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)::int`,
        done: sql<number>`count(*) filter (where ${tasks.status} = 'done')::int`,
      })
      .from(tasks)
      .where(eq(tasks.projectId, projectId)),
    db
      .select({ name: sprints.name })
      .from(sprints)
      .where(
        and(eq(sprints.projectId, projectId), eq(sprints.status, "active")),
      ),
    db
      .select({ name: user.name })
      .from(members)
      .innerJoin(user, eq(user.id, members.userId))
      .where(eq(members.workspaceId, project.workspaceId))
      .orderBy(user.name),
    db
      .select({ name: milestones.name, dueDate: milestones.dueDate })
      .from(milestones)
      .where(eq(milestones.projectId, projectId))
      .orderBy(sql`${milestones.dueDate} asc nulls last`),
    // The stack suggested by the AI plan this project was created from, if any.
    db
      .select({ output: aiGenerations.output })
      .from(aiGenerations)
      .where(
        and(
          eq(aiGenerations.projectId, projectId),
          eq(aiGenerations.kind, "project_plan"),
          eq(aiGenerations.status, "applied"),
        ),
      )
      .limit(1),
  ]);
  const stack = (plan[0]?.output as { suggestedStack?: unknown } | undefined)
    ?.suggestedStack;
  const values: Partial<Record<Placeholder, string>> = {
    project_name: project.name,
    project_description: project.description,
    workspace_name: project.workspaceName,
    current_sprint: active[0]?.name,
    project_progress: counts.total
      ? `%${Math.round((counts.done / counts.total) * 100)} (${counts.done}/${counts.total} görev)`
      : undefined,
    team_members: team.map((t) => t.name).join(", "),
    created_date: longDate.format(new Date()),
    milestones: ms.length
      ? ms
          .map(
            (m) =>
              `- ${m.name}${m.dueDate ? ` — ${shortDate(m.dueDate)}` : ""}`,
          )
          .join("\n")
      : undefined,
    tech_stack:
      Array.isArray(stack) && stack.length
        ? stack.map((s) => `- ${String(s)}`).join("\n")
        : undefined,
  };
  return values;
}
