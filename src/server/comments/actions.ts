"use server";
import { z } from "zod";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { taskComments, tasks, user as users } from "@/server/db/schema";
import { recordActivity } from "@/server/activity";
import {
  requireUser,
  projectAccess,
  workspaceAccess,
} from "@/server/projects/service";
import { canManageMembers } from "@/server/permissions";

const commentBody = z.string().trim().min(1).max(5000);

async function taskInProject(projectId: string, taskId: string) {
  const [task] = await db
    .select({ id: tasks.id, number: tasks.number })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.projectId, projectId)));
  if (!task) throw new Error("Görev bulunamadı.");
  return task;
}

export async function listComments(projectId: string, taskId: string) {
  z.uuid().parse(projectId);
  z.uuid().parse(taskId);
  const user = await requireUser();
  await projectAccess(projectId, user.id);
  await taskInProject(projectId, taskId);
  const rows = await db
    .select({
      id: taskComments.id,
      body: taskComments.body,
      createdAt: taskComments.createdAt,
      editedAt: taskComments.editedAt,
      authorId: taskComments.authorId,
      authorName: users.name,
    })
    .from(taskComments)
    .leftJoin(users, eq(users.id, taskComments.authorId))
    .where(eq(taskComments.taskId, taskId))
    .orderBy(asc(taskComments.createdAt))
    .limit(500);
  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    editedAt: r.editedAt?.toISOString() ?? null,
  }));
}

export async function addComment(
  projectId: string,
  taskId: string,
  input: unknown,
) {
  z.uuid().parse(projectId);
  z.uuid().parse(taskId);
  const body = commentBody.parse(input);
  const user = await requireUser();
  await projectAccess(projectId, user.id, true);
  const task = await taskInProject(projectId, taskId);
  await db.transaction(async (tx) => {
    const [comment] = await tx
      .insert(taskComments)
      .values({ taskId, authorId: user.id, body })
      .returning({ id: taskComments.id });
    await recordActivity(tx, {
      projectId,
      type: "comment.created",
      actorId: user.id,
      taskId,
      message: `#${task.number} görevine yorum eklendi.`,
      metadata: { commentId: comment.id },
    });
  });
}

export async function editComment(
  projectId: string,
  commentId: string,
  input: unknown,
) {
  z.uuid().parse(projectId);
  z.uuid().parse(commentId);
  const body = commentBody.parse(input);
  const user = await requireUser();
  await projectAccess(projectId, user.id, true);
  // Only the author may edit, and only comments on tasks of this project.
  const updated = await db
    .update(taskComments)
    .set({ body, editedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(taskComments.id, commentId),
        eq(taskComments.authorId, user.id),
        onTaskOf(projectId),
      ),
    )
    .returning({ id: taskComments.id });
  if (!updated.length) throw new Error("Yorum düzenlenemedi.");
}

export async function deleteComment(projectId: string, commentId: string) {
  z.uuid().parse(projectId);
  z.uuid().parse(commentId);
  const user = await requireUser();
  const project = await projectAccess(projectId, user.id, true);
  const me = await workspaceAccess(project.workspaceId, user.id);
  const [comment] = await db
    .select({ id: taskComments.id, authorId: taskComments.authorId })
    .from(taskComments)
    .innerJoin(tasks, eq(tasks.id, taskComments.taskId))
    .where(and(eq(taskComments.id, commentId), eq(tasks.projectId, projectId)));
  if (!comment) throw new Error("Yorum bulunamadı.");
  // Authors remove their own comments; owners and admins can moderate.
  if (comment.authorId !== user.id && !canManageMembers(me.role))
    throw new Error("Bu yorumu silme yetkiniz yok.");
  await db.delete(taskComments).where(eq(taskComments.id, commentId));
}

// Restricts a comment query to tasks that belong to the given project.
function onTaskOf(projectId: string) {
  return sql`${taskComments.taskId} in (select ${tasks.id} from ${tasks} where ${tasks.projectId} = ${projectId})`;
}
