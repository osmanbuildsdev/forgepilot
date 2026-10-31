"use server";
import { UserError, attempt } from "@/server/errors";
import { z } from "zod";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import {
  sprints,
  subtasks,
  taskAttachments,
  taskDependencies,
  tasks,
  user as users,
} from "@/server/db/schema";
import { canManageMembers } from "@/server/permissions";
import { recordActivity } from "@/server/activity";
import {
  requireUser,
  projectAccess,
  workspaceAccess,
} from "@/server/projects/service";
import { taskLinks } from "@/server/github/queries";

const subtaskTitle = z.string().trim().min(1).max(200);
const MAX_SUBTASKS = 50;

async function taskInProject(projectId: string, taskId: string) {
  const [task] = await db
    .select({ id: tasks.id, number: tasks.number })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.projectId, projectId)));
  if (!task) throw new UserError("Görev bulunamadı.");
  return task;
}

// Subtask ids are only trusted when they belong to a task of this project.
function subtaskOf(projectId: string, subtaskId: string) {
  return and(
    eq(subtasks.id, subtaskId),
    sql`${subtasks.taskId} in (select ${tasks.id} from ${tasks} where ${tasks.projectId} = ${projectId})`,
  );
}

async function access(projectId: string, write = false) {
  z.uuid().parse(projectId);
  const user = await requireUser();
  await projectAccess(projectId, user.id, write);
  return user;
}

export async function taskDetails(projectId: string, taskId: string) {
  return attempt(async () => {
    z.uuid().parse(taskId);
    await access(projectId);
    await taskInProject(projectId, taskId);
    const [items, blockers, github, attachments] = await Promise.all([
      db
        .select({ id: subtasks.id, title: subtasks.title, done: subtasks.done })
        .from(subtasks)
        .where(eq(subtasks.taskId, taskId))
        .orderBy(asc(subtasks.position), asc(subtasks.createdAt)),
      db
        .select({
          id: tasks.id,
          number: tasks.number,
          title: tasks.title,
          status: tasks.status,
        })
        .from(taskDependencies)
        .innerJoin(tasks, eq(tasks.id, taskDependencies.dependsOnId))
        .where(eq(taskDependencies.taskId, taskId))
        .orderBy(asc(tasks.number)),
      taskLinks(taskId),
      // Metadata only; the file itself is served by the download route.
      db
        .select({
          id: taskAttachments.id,
          filename: taskAttachments.filename,
          size: taskAttachments.size,
          contentType: taskAttachments.contentType,
          uploadedBy: taskAttachments.uploadedBy,
          uploaderName: users.name,
        })
        .from(taskAttachments)
        .leftJoin(users, eq(users.id, taskAttachments.uploadedBy))
        .where(eq(taskAttachments.taskId, taskId))
        .orderBy(asc(taskAttachments.createdAt)),
    ]);
    return { subtasks: items, blockers, github, attachments };
  });
}

export async function addSubtask(
  projectId: string,
  taskId: string,
  input: unknown,
) {
  return attempt(async () => {
    z.uuid().parse(taskId);
    const title = subtaskTitle.parse(input);
    await access(projectId, true);
    await taskInProject(projectId, taskId);
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(subtasks)
      .where(eq(subtasks.taskId, taskId));
    if (n >= MAX_SUBTASKS)
      throw new UserError(
        `Bir görevde en fazla ${MAX_SUBTASKS} alt görev olabilir.`,
      );
    await db.insert(subtasks).values({ taskId, title, position: n });
    revalidatePath("/app", "layout");
  });
}

export async function setSubtaskDone(
  projectId: string,
  subtaskId: string,
  done: boolean,
) {
  return attempt(async () => {
    z.uuid().parse(subtaskId);
    z.boolean().parse(done);
    await access(projectId, true);
    const updated = await db
      .update(subtasks)
      .set({ done, updatedAt: new Date() })
      .where(subtaskOf(projectId, subtaskId))
      .returning({ id: subtasks.id });
    if (!updated.length) throw new UserError("Alt görev bulunamadı.");
    revalidatePath("/app", "layout");
  });
}

export async function deleteSubtask(projectId: string, subtaskId: string) {
  return attempt(async () => {
    z.uuid().parse(subtaskId);
    await access(projectId, true);
    const removed = await db
      .delete(subtasks)
      .where(subtaskOf(projectId, subtaskId))
      .returning({ id: subtasks.id });
    if (!removed.length) throw new UserError("Alt görev bulunamadı.");
    revalidatePath("/app", "layout");
  });
}

export async function addDependency(
  projectId: string,
  taskId: string,
  dependsOnId: string,
) {
  return attempt(async () => {
    z.uuid().parse(taskId);
    z.uuid().parse(dependsOnId);
    if (taskId === dependsOnId)
      throw new UserError("Bir görev kendisine bağımlı olamaz.");
    const user = await access(projectId, true);
    await db.transaction(async (tx) => {
      // Serialises dependency changes per project so two concurrent requests
      // cannot each pass the cycle check and together create a loop.
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${"deps:" + projectId}))`,
      );
      const pair = await tx
        .select({ id: tasks.id, number: tasks.number })
        .from(tasks)
        .where(
          and(
            eq(tasks.projectId, projectId),
            inArray(tasks.id, [taskId, dependsOnId]),
          ),
        );
      if (pair.length !== 2) throw new UserError("Görev bulunamadı.");
      // Walk everything dependsOnId already waits on; reaching taskId means a cycle.
      const cycle = await tx.execute<{ found: boolean }>(sql`
      with recursive chain(id) as (
        select ${dependsOnId}::uuid
        union
        select d.depends_on_id from task_dependencies d
        join chain c on d.task_id = c.id
      )
      select exists(select 1 from chain where id = ${taskId}::uuid) as found
    `);
      if (cycle.rows[0]?.found)
        throw new UserError("Bu bağımlılık döngü oluşturur.");
      const inserted = await tx
        .insert(taskDependencies)
        .values({ taskId, dependsOnId })
        .onConflictDoNothing()
        .returning({ taskId: taskDependencies.taskId });
      if (!inserted.length) return;
      const task = pair.find((p) => p.id === taskId)!;
      const blocker = pair.find((p) => p.id === dependsOnId)!;
      await recordActivity(tx, {
        projectId,
        type: "task.updated",
        actorId: user.id,
        taskId,
        message: `#${task.number} artık #${blocker.number} görevini bekliyor.`,
        metadata: { dependsOnId },
      });
    });
    revalidatePath("/app", "layout");
  });
}

export async function removeDependency(
  projectId: string,
  taskId: string,
  dependsOnId: string,
) {
  return attempt(async () => {
    z.uuid().parse(taskId);
    z.uuid().parse(dependsOnId);
    await access(projectId, true);
    await taskInProject(projectId, taskId);
    await db
      .delete(taskDependencies)
      .where(
        and(
          eq(taskDependencies.taskId, taskId),
          eq(taskDependencies.dependsOnId, dependsOnId),
        ),
      );
    revalidatePath("/app", "layout");
  });
}

const priorityLabels = {
  low: "Düşük",
  medium: "Normal",
  high: "Yüksek",
  urgent: "Acil",
} as const;

// Single-field updates for callers that should not touch anything else
// (for example confirmed Copilot suggestions).
export async function setTaskPriority(
  projectId: string,
  taskId: string,
  priority: unknown,
) {
  return attempt(async () => {
    z.uuid().parse(taskId);
    const value = z.enum(["low", "medium", "high", "urgent"]).parse(priority);
    const user = await access(projectId, true);
    const task = await taskInProject(projectId, taskId);
    await db.transaction(async (tx) => {
      await tx
        .update(tasks)
        .set({ priority: value, updatedAt: new Date() })
        .where(eq(tasks.id, taskId));
      await recordActivity(tx, {
        projectId,
        type: "task.updated",
        actorId: user.id,
        taskId,
        message: `#${task.number} önceliği "${priorityLabels[value]}" yapıldı.`,
        metadata: { priority: value },
      });
    });
    revalidatePath("/app", "layout");
  });
}

export async function setTaskSprint(
  projectId: string,
  taskId: string,
  sprintId: string | null,
) {
  return attempt(async () => {
    z.uuid().parse(taskId);
    z.uuid().nullable().parse(sprintId);
    const user = await access(projectId, true);
    const task = await taskInProject(projectId, taskId);
    let name = "";
    if (sprintId) {
      const [sprint] = await db
        .select({ name: sprints.name, status: sprints.status })
        .from(sprints)
        .where(and(eq(sprints.id, sprintId), eq(sprints.projectId, projectId)));
      if (!sprint || sprint.status === "completed")
        throw new UserError("Sprint bulunamadı ya da kapanmış.");
      name = sprint.name;
    }
    await db.transaction(async (tx) => {
      await tx
        .update(tasks)
        .set({ sprintId, updatedAt: new Date() })
        .where(eq(tasks.id, taskId));
      await recordActivity(tx, {
        projectId,
        type: "task.updated",
        actorId: user.id,
        taskId,
        message: sprintId
          ? `#${task.number} ${name} sprintine eklendi.`
          : `#${task.number} sprintten çıkarıldı.`,
        metadata: { sprintId },
      });
    });
    revalidatePath("/app", "layout");
  });
}

// Uploaders remove their own files; owners and admins can remove any.
export async function deleteAttachment(
  projectId: string,
  attachmentId: string,
) {
  return attempt(async () => {
    z.uuid().parse(attachmentId);
    const user = await access(projectId, true);
    const [row] = await db
      .select({
        id: taskAttachments.id,
        uploadedBy: taskAttachments.uploadedBy,
        filename: taskAttachments.filename,
        taskId: tasks.id,
        number: tasks.number,
        workspaceId: sql<string>`(select workspace_id from projects where id = ${tasks.projectId})`,
      })
      .from(taskAttachments)
      .innerJoin(tasks, eq(tasks.id, taskAttachments.taskId))
      .where(
        and(
          eq(taskAttachments.id, attachmentId),
          eq(tasks.projectId, projectId),
        ),
      );
    if (!row) throw new UserError("Dosya bulunamadı.");
    if (row.uploadedBy !== user.id) {
      const me = await workspaceAccess(row.workspaceId, user.id);
      if (!canManageMembers(me.role))
        throw new UserError(
          "Bu dosyayı yalnızca ekleyen kişi veya yöneticiler silebilir.",
        );
    }
    await db.transaction(async (tx) => {
      await tx
        .delete(taskAttachments)
        .where(eq(taskAttachments.id, attachmentId));
      await recordActivity(tx, {
        projectId,
        type: "task.updated",
        actorId: user.id,
        taskId: row.taskId,
        message: `#${row.number} görevinden dosya silindi: ${row.filename}`,
      });
    });
    revalidatePath("/app", "layout");
  });
}
