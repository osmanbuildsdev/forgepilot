import "server-only";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { and, eq, desc } from "drizzle-orm";
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
export async function projectData(projectId: string, userId: string) {
  const project = await projectAccess(projectId, userId);
  const [items, events, projectLabels, links] = await Promise.all([
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
  ]);
  const labelIdsByTask: Record<string, string[]> = {};
  for (const l of links) (labelIdsByTask[l.taskId] ??= []).push(l.labelId);
  return {
    project,
    tasks: items,
    events,
    labels: projectLabels,
    labelIdsByTask,
  };
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
