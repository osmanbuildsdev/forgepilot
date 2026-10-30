import "server-only";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { and, eq, desc, inArray, ne, sql } from "drizzle-orm";
import { getAuth } from "@/server/auth";
import { db } from "@/server/db";
import {
  members,
  projects,
  workspaces,
  tasks,
  activities,
  user,
  labels,
  taskLabels,
  subtasks,
  taskDependencies,
  sprints,
  milestones,
} from "@/server/db/schema";
import { canWrite } from "@/server/permissions";
export function configured() {
  return Boolean(
    process.env.DATABASE_URL &&
    (process.env.BETTER_AUTH_SECRET?.length ?? 0) >= 32,
  );
}
export async function currentUser() {
  if (!configured()) redirect("/setup");
  const s = await getAuth().api.getSession({ headers: await headers() });
  return s?.user ?? null;
}
export async function requireUser() {
  const u = await currentUser();
  if (!u) redirect("/login");
  return u;
}
export async function workspaceAccess(
  workspaceId: string,
  userId: string,
  write = false,
) {
  const [member] = await db
    .select()
    .from(members)
    .where(
      and(eq(members.workspaceId, workspaceId), eq(members.userId, userId)),
    );
  if (!member || (write && !canWrite(member.role)))
    throw new Error("Bu işlem için çalışma alanı yetkiniz yok.");
  return member;
}
export async function projectAccess(
  projectId: string,
  userId: string,
  write = false,
) {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId));
  if (!project) notFound();
  await workspaceAccess(project.workspaceId, userId, write);
  return project;
}
export async function userWorkspaces(userId: string) {
  return db
    .select({ id: workspaces.id, name: workspaces.name, role: members.role })
    .from(workspaces)
    .innerJoin(members, eq(members.workspaceId, workspaces.id))
    .where(eq(members.userId, userId));
}
export async function userProjects(userId: string) {
  return db
    .select({ project: projects, workspace: workspaces.name })
    .from(projects)
    .innerJoin(members, eq(members.workspaceId, projects.workspaceId))
    .innerJoin(workspaces, eq(workspaces.id, projects.workspaceId))
    .where(eq(members.userId, userId))
    .orderBy(desc(projects.createdAt));
}
// Per-project task counts for every project the user can see.
export async function projectSummaries(userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  return db
    .select({
      id: projects.id,
      name: projects.name,
      key: projects.key,
      description: projects.description,
      workspace: workspaces.name,
      total: sql<number>`count(${tasks.id})::int`,
      done: sql<number>`count(${tasks.id}) filter (where ${tasks.status} = 'done')::int`,
      active: sql<number>`count(${tasks.id}) filter (where ${tasks.status} = 'in_progress')::int`,
      overdue: sql<number>`count(${tasks.id}) filter (where ${tasks.status} <> 'done' and ${tasks.dueDate} < ${today})::int`,
    })
    .from(projects)
    .innerJoin(members, eq(members.workspaceId, projects.workspaceId))
    .innerJoin(workspaces, eq(workspaces.id, projects.workspaceId))
    .leftJoin(tasks, eq(tasks.projectId, projects.id))
    .where(eq(members.userId, userId))
    .groupBy(projects.id, workspaces.name)
    .orderBy(desc(projects.createdAt));
}
// Open tasks assigned to the user, most urgent first.
export async function myOpenTasks(userId: string, limit = 50) {
  return db
    .select({
      task: tasks,
      projectId: projects.id,
      projectKey: projects.key,
      projectName: projects.name,
    })
    .from(tasks)
    .innerJoin(projects, eq(projects.id, tasks.projectId))
    .innerJoin(
      members,
      and(
        eq(members.workspaceId, projects.workspaceId),
        eq(members.userId, userId),
      ),
    )
    .where(and(eq(tasks.assigneeId, userId), ne(tasks.status, "done")))
    .orderBy(
      sql`case ${tasks.priority} when 'urgent' then 0 when 'high' then 1 when 'medium' then 2 else 3 end`,
      sql`${tasks.dueDate} asc nulls last`,
      tasks.number,
    )
    .limit(limit);
}
export async function projectData(projectId: string, userId: string) {
  const project = await projectAccess(projectId, userId);
  const [items, events, projectLabels, links, checklist, blockers] =
    await Promise.all([
      db
        .select()
        .from(tasks)
        .where(eq(tasks.projectId, projectId))
        .orderBy(tasks.number),
      db
        .select()
        .from(activities)
        .where(eq(activities.projectId, projectId))
        .orderBy(desc(activities.createdAt))
        .limit(15),
      db
        .select()
        .from(labels)
        .where(eq(labels.projectId, projectId))
        .orderBy(labels.name),
      db
        .select({ taskId: taskLabels.taskId, labelId: taskLabels.labelId })
        .from(taskLabels)
        .innerJoin(tasks, eq(tasks.id, taskLabels.taskId))
        .where(eq(tasks.projectId, projectId)),
      db
        .select({
          taskId: subtasks.taskId,
          total: sql<number>`count(*)::int`,
          done: sql<number>`count(*) filter (where ${subtasks.done})::int`,
        })
        .from(subtasks)
        .innerJoin(tasks, eq(tasks.id, subtasks.taskId))
        .where(eq(tasks.projectId, projectId))
        .groupBy(subtasks.taskId),
      // Dependencies whose blocking task is not finished yet.
      db
        .select({
          taskId: taskDependencies.taskId,
          open: sql<number>`count(*)::int`,
        })
        .from(taskDependencies)
        .innerJoin(tasks, eq(tasks.id, taskDependencies.dependsOnId))
        .where(and(eq(tasks.projectId, projectId), ne(tasks.status, "done")))
        .groupBy(taskDependencies.taskId),
    ]);
  const labelIdsByTask: Record<string, string[]> = {};
  for (const l of links) (labelIdsByTask[l.taskId] ??= []).push(l.labelId);
  return {
    project,
    tasks: items,
    events,
    labels: projectLabels,
    labelIdsByTask,
    subtaskProgress: Object.fromEntries(
      checklist.map((c) => [c.taskId, { done: c.done, total: c.total }]),
    ) as Record<string, { done: number; total: number }>,
    blockedBy: Object.fromEntries(
      blockers.map((b) => [b.taskId, b.open]),
    ) as Record<string, number>,
    ...(await planningOptions(projectId)),
  };
}
// Lightweight lists for selects (task form, board filter).
export async function planningOptions(projectId: string) {
  const [sprintRows, milestoneRows] = await Promise.all([
    db
      .select({ id: sprints.id, name: sprints.name, status: sprints.status })
      .from(sprints)
      .where(eq(sprints.projectId, projectId))
      .orderBy(desc(sprints.startDate)),
    db
      .select({ id: milestones.id, name: milestones.name })
      .from(milestones)
      .where(eq(milestones.projectId, projectId))
      .orderBy(sql`${milestones.dueDate} asc nulls last`),
  ]);
  return { sprints: sprintRows, milestones: milestoneRows };
}
// Sprints and milestones referenced by tasks must belong to the same project;
// a closed sprint cannot receive new work.
export async function assertPlanningRefs(
  projectId: string,
  refs: { sprintId: string | null; milestoneId: string | null }[],
  keepSprintId: string | null = null,
) {
  const sprintIds = [
    ...new Set(
      refs
        .map((r) => r.sprintId)
        .filter((x): x is string => x !== null && x !== keepSprintId),
    ),
  ];
  const milestoneIds = [
    ...new Set(refs.map((r) => r.milestoneId).filter((x) => x !== null)),
  ];
  if (sprintIds.length) {
    const found = await db
      .select({ id: sprints.id })
      .from(sprints)
      .where(
        and(
          eq(sprints.projectId, projectId),
          inArray(sprints.id, sprintIds),
          ne(sprints.status, "completed"),
        ),
      );
    if (found.length !== sprintIds.length)
      throw new Error("Seçilen sprint bu projeye ait değil veya kapanmış.");
  }
  if (milestoneIds.length) {
    const found = await db
      .select({ id: milestones.id })
      .from(milestones)
      .where(
        and(
          eq(milestones.projectId, projectId),
          inArray(milestones.id, milestoneIds),
        ),
      );
    if (found.length !== milestoneIds.length)
      throw new Error("Seçilen milestone bu projeye ait değil.");
  }
}
// Sprints with live task statistics, newest first.
export async function sprintOverview(projectId: string) {
  return db
    .select({
      sprint: sprints,
      tasks: sql<number>`count(${tasks.id})::int`,
      doneTasks: sql<number>`count(${tasks.id}) filter (where ${tasks.status} = 'done')::int`,
      points: sql<number>`coalesce(sum(${tasks.estimatePoints}), 0)::int`,
      donePoints: sql<number>`coalesce(sum(${tasks.estimatePoints}) filter (where ${tasks.status} = 'done'), 0)::int`,
    })
    .from(sprints)
    .leftJoin(tasks, eq(tasks.sprintId, sprints.id))
    .where(eq(sprints.projectId, projectId))
    .groupBy(sprints.id)
    .orderBy(desc(sprints.startDate), desc(sprints.createdAt));
}
export async function milestoneOverview(projectId: string) {
  const today = new Date().toISOString().slice(0, 10);
  return db
    .select({
      milestone: milestones,
      tasks: sql<number>`count(${tasks.id})::int`,
      doneTasks: sql<number>`count(${tasks.id}) filter (where ${tasks.status} = 'done')::int`,
      overdue: sql<boolean>`(${milestones.dueDate} < ${today} and count(${tasks.id}) filter (where ${tasks.status} <> 'done') > 0)`,
    })
    .from(milestones)
    .leftJoin(tasks, eq(tasks.milestoneId, milestones.id))
    .where(eq(milestones.projectId, projectId))
    .groupBy(milestones.id)
    .orderBy(sql`${milestones.dueDate} asc nulls last`, milestones.createdAt);
}
export async function workspaceMembers(workspaceId: string) {
  return db
    .select({ id: user.id, name: user.name })
    .from(members)
    .innerJoin(user, eq(user.id, members.userId))
    .where(eq(members.workspaceId, workspaceId))
    .orderBy(user.name);
}
export async function assertAssignable(
  workspaceId: string,
  assigneeId: string | null,
) {
  if (!assigneeId) return;
  const [m] = await db
    .select({ id: members.id })
    .from(members)
    .where(
      and(eq(members.workspaceId, workspaceId), eq(members.userId, assigneeId)),
    );
  if (!m) throw new Error("Atanan kişi bu çalışma alanının üyesi değil.");
}
