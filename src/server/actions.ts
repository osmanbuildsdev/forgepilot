"use server";
import { notify } from "@/server/notifications/service";
import { UserError, attempt } from "@/server/errors";
import { z } from "zod";
import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import {
  workspaces,
  members,
  projects,
  tasks,
  labels,
  taskLabels,
} from "@/server/db/schema";
import { recordActivity } from "@/server/activity";
import {
  requireUser,
  workspaceAccess,
  projectAccess,
  assertAssignable,
  assertPlanningRefs,
} from "@/server/projects/service";
import {
  projectInput,
  taskInput,
  taskBatch,
  labelInput,
  taskLabelIds,
} from "@/features/tasks/schemas";
export async function createWorkspace(input: unknown) {
  return attempt(async () => {
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
  });
}
export async function createProject(input: unknown) {
  return attempt(async () => {
    const user = await requireUser();
    const data = projectInput.parse(input);
    await workspaceAccess(data.workspaceId, user.id, true);
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
    const [p] = await db
      .insert(projects)
      .values({ ...data, createdBy: user.id })
      .returning();
    revalidatePath("/app");
    return p.id;
  });
}
export async function saveTasks(projectId: string, input: unknown) {
  return attempt(async () => {
    z.uuid().parse(projectId);
    const data = taskBatch.parse(input);
    const user = await requireUser();
    const project = await projectAccess(projectId, user.id, true);
    for (const id of new Set(data.tasks.map((t) => t.assigneeId)))
      await assertAssignable(project.workspaceId, id);
    await assertPlanningRefs(projectId, data.tasks);
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
            completedAt: t.status === "done" ? new Date() : null,
            createdBy: user.id,
          })),
        )
        .returning({
          id: tasks.id,
          number: tasks.number,
          title: tasks.title,
          assigneeId: tasks.assigneeId,
        });
      await notify(
        tx,
        created
          .filter((t) => t.assigneeId)
          .map((t) => ({
            userId: t.assigneeId!,
            actorId: user.id,
            type: "task.assigned" as const,
            title: `${user.name} sana ${project.key}-${t.number} görevini atadı`,
            body: t.title,
            href: `/app/projects/${projectId}/board`,
            projectId,
            taskId: t.id,
          })),
      );
      await recordActivity(tx, {
        projectId,
        type: "task.created",
        actorId: user.id,
        message: `${data.tasks.length} görev oluşturuldu.`,
        metadata: { taskIds: created.map((t) => t.id) },
      });
    });
    revalidatePath("/app", "layout");
  });
}
export async function updateTask(
  projectId: string,
  taskId: string,
  input: unknown,
) {
  return attempt(async () => {
    z.uuid().parse(projectId);
    z.uuid().parse(taskId);
    const data = taskInput.parse(input);
    const user = await requireUser();
    const project = await projectAccess(projectId, user.id, true);
    await assertAssignable(project.workspaceId, data.assigneeId);
    const [current] = await db
      .select({
        sprintId: tasks.sprintId,
        status: tasks.status,
        assigneeId: tasks.assigneeId,
      })
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.projectId, projectId)));
    // A task may stay in the (possibly closed) sprint it already belongs to.
    await assertPlanningRefs(projectId, [data], current?.sprintId ?? null);
    await db.transaction(async (tx) => {
      const [t] = await tx
        .update(tasks)
        .set({
          ...data,
          completedAt:
            data.status === "done"
              ? sql`coalesce(${tasks.completedAt}, now())`
              : null,
          updatedAt: new Date(),
        })
        .where(and(eq(tasks.id, taskId), eq(tasks.projectId, projectId)))
        .returning();
      if (!t) throw new UserError("Görev bulunamadı.");
      const completed = t.status === "done" && current?.status !== "done";
      if (t.assigneeId && t.assigneeId !== current?.assigneeId)
        await notify(tx, [
          {
            userId: t.assigneeId,
            actorId: user.id,
            type: "task.assigned",
            title: `${user.name} sana ${project.key}-${t.number} görevini atadı`,
            body: t.title,
            href: `/app/projects/${projectId}/board`,
            projectId,
            taskId: t.id,
          },
        ]);
      await recordActivity(tx, {
        projectId,
        type: completed ? "task.completed" : "task.updated",
        actorId: user.id,
        taskId: t.id,
        message: `#${t.number} güncellendi: ${t.title} → ${t.status}`,
        metadata: {
          number: t.number,
          status: t.status,
          priority: t.priority,
          assigneeId: t.assigneeId,
        },
      });
    });
    revalidatePath("/app", "layout");
  });
}
export async function deleteTask(projectId: string, taskId: string) {
  return attempt(async () => {
    z.uuid().parse(projectId);
    z.uuid().parse(taskId);
    const user = await requireUser();
    await projectAccess(projectId, user.id, true);
    await db.transaction(async (tx) => {
      const [t] = await tx
        .delete(tasks)
        .where(and(eq(tasks.id, taskId), eq(tasks.projectId, projectId)))
        .returning();
      if (!t) throw new UserError("Görev bulunamadı.");
      await recordActivity(tx, {
        projectId,
        type: "task.deleted",
        actorId: user.id,
        message: `#${t.number} silindi: ${t.title}`,
        metadata: { number: t.number, title: t.title },
      });
    });
    revalidatePath("/app", "layout");
  });
}
export async function createLabel(projectId: string, input: unknown) {
  return attempt(async () => {
    z.uuid().parse(projectId);
    const data = labelInput.parse(input);
    const user = await requireUser();
    await projectAccess(projectId, user.id, true);
    const labelId = await db.transaction(async (tx) => {
      const created = await tx
        .insert(labels)
        .values({ ...data, projectId })
        .onConflictDoNothing()
        .returning({ id: labels.id });
      if (!created.length) throw new UserError("Bu etiket zaten var.");
      await recordActivity(tx, {
        projectId,
        type: "label.created",
        actorId: user.id,
        message: `"${data.name}" etiketi oluşturuldu.`,
      });
      return created[0].id;
    });
    revalidatePath("/app", "layout");
    return labelId;
  });
}
export async function setTaskLabels(
  projectId: string,
  taskId: string,
  input: unknown,
) {
  return attempt(async () => {
    z.uuid().parse(projectId);
    z.uuid().parse(taskId);
    const ids = [...new Set(taskLabelIds.parse(input))];
    const user = await requireUser();
    await projectAccess(projectId, user.id, true);
    await db.transaction(async (tx) => {
      const [task] = await tx
        .select({ id: tasks.id })
        .from(tasks)
        .where(and(eq(tasks.id, taskId), eq(tasks.projectId, projectId)));
      if (!task) throw new UserError("Görev bulunamadı.");
      const valid = ids.length
        ? await tx
            .select({ id: labels.id })
            .from(labels)
            .where(
              and(eq(labels.projectId, projectId), inArray(labels.id, ids)),
            )
        : [];
      if (valid.length !== ids.length) throw new UserError("Geçersiz etiket.");
      await tx.delete(taskLabels).where(eq(taskLabels.taskId, taskId));
      if (ids.length)
        await tx
          .insert(taskLabels)
          .values(ids.map((labelId) => ({ taskId, labelId })));
    });
    revalidatePath("/app", "layout");
  });
}
