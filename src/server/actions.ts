"use server";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { workspaces, members, projects, tasks } from "@/server/db/schema";
import { recordActivity } from "@/server/activity";
import {
  requireUser,
  workspaceAccess,
  projectAccess,
} from "@/server/projects/service";
import {
  projectInput,
  taskInput,
  generatedTasks,
} from "@/features/tasks/schemas";
export async function createWorkspace(input: unknown) {
  const user = await requireUser();
  const name = z.string().trim().min(2).max(100).parse(input);
  const workspace = await db.transaction(async (tx) => {
    const [w] = await tx.insert(workspaces).values({ name }).returning();
    await tx
      .insert(members)
      .values({ workspaceId: w.id, userId: user.id, role: "owner" });
    return w;
  });
  revalidatePath("/app");
  return workspace.id;
}
export async function createProject(input: unknown) {
  const user = await requireUser();
  const data = projectInput.parse(input);
  await workspaceAccess(data.workspaceId, user.id, true);
  const [p] = await db
    .insert(projects)
    .values({ ...data, createdBy: user.id })
    .returning();
  revalidatePath("/app");
  return p.id;
}
export async function saveTasks(projectId: string, input: unknown) {
  z.uuid().parse(projectId);
  const data = generatedTasks.parse(input);
  const user = await requireUser();
  await projectAccess(projectId, user.id, true);
  await db.transaction(async (tx) => {
    const [p] = await tx
      .update(projects)
      .set({
        nextTaskNumber: sql`${projects.nextTaskNumber} + ${data.tasks.length}`,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId))
      .returning();
    const created = await tx
      .insert(tasks)
      .values(
        data.tasks.map((t, i) => ({
          ...t,
          projectId,
          number: p.nextTaskNumber - data.tasks.length + i + 1,
          createdBy: user.id,
        })),
      )
      .returning({ id: tasks.id, number: tasks.number });
    await recordActivity(tx, {
      projectId,
      type: "task.created",
      actorId: user.id,
      message: `${data.tasks.length} görev oluşturuldu.`,
      metadata: { taskIds: created.map((t) => t.id) },
    });
  });
  revalidatePath("/app", "layout");
}
export async function updateTask(
  projectId: string,
  taskId: string,
  input: unknown,
) {
  z.uuid().parse(projectId);
  z.uuid().parse(taskId);
  const data = taskInput.parse(input);
  const user = await requireUser();
  await projectAccess(projectId, user.id, true);
  await db.transaction(async (tx) => {
    const [t] = await tx
      .update(tasks)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(tasks.id, taskId), eq(tasks.projectId, projectId)))
      .returning();
    if (!t) throw new Error("Görev bulunamadı.");
    await recordActivity(tx, {
      projectId,
      type: "task.updated",
      actorId: user.id,
      taskId: t.id,
      message: `#${t.number} güncellendi: ${t.title} → ${t.status}`,
      metadata: { number: t.number, status: t.status, priority: t.priority },
    });
  });
  revalidatePath("/app", "layout");
}
export async function deleteTask(projectId: string, taskId: string) {
  z.uuid().parse(projectId);
  z.uuid().parse(taskId);
  const user = await requireUser();
  await projectAccess(projectId, user.id, true);
  await db.transaction(async (tx) => {
    const [t] = await tx
      .delete(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.projectId, projectId)))
      .returning();
    if (!t) throw new Error("Görev bulunamadı.");
    await recordActivity(tx, {
      projectId,
      type: "task.deleted",
      actorId: user.id,
      message: `#${t.number} silindi: ${t.title}`,
      metadata: { number: t.number, title: t.title },
    });
  });
  revalidatePath("/app", "layout");
}
