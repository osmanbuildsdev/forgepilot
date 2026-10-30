"use server";
import { z } from "zod";
import { and, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { milestones, sprints, tasks } from "@/server/db/schema";
import { recordActivity } from "@/server/activity";
import { requireUser, projectAccess } from "@/server/projects/service";
import { milestoneInput, sprintInput } from "@/features/tasks/schemas";

async function writer(projectId: string) {
  z.uuid().parse(projectId);
  const user = await requireUser();
  await projectAccess(projectId, user.id, true);
  return user;
}

const refresh = () => revalidatePath("/app", "layout");

export async function createSprint(projectId: string, input: unknown) {
  const data = sprintInput.parse(input);
  await writer(projectId);
  const [sprint] = await db
    .insert(sprints)
    .values({ ...data, projectId })
    .returning({ id: sprints.id });
  refresh();
  return sprint.id;
}

export async function updateSprint(
  projectId: string,
  sprintId: string,
  input: unknown,
) {
  z.uuid().parse(sprintId);
  const data = sprintInput.parse(input);
  await writer(projectId);
  const updated = await db
    .update(sprints)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(sprints.id, sprintId), eq(sprints.projectId, projectId)))
    .returning({ id: sprints.id });
  if (!updated.length) throw new Error("Sprint bulunamadı.");
  refresh();
}

export async function startSprint(projectId: string, sprintId: string) {
  z.uuid().parse(sprintId);
  const user = await writer(projectId);
  await db.transaction(async (tx) => {
    const [active] = await tx
      .select({ id: sprints.id })
      .from(sprints)
      .where(
        and(eq(sprints.projectId, projectId), eq(sprints.status, "active")),
      );
    if (active) throw new Error("Önce mevcut aktif sprinti tamamlamalısın.");
    const [sprint] = await tx
      .update(sprints)
      .set({ status: "active", updatedAt: new Date() })
      .where(
        and(
          eq(sprints.id, sprintId),
          eq(sprints.projectId, projectId),
          eq(sprints.status, "planned"),
        ),
      )
      .returning({ name: sprints.name });
    if (!sprint)
      throw new Error("Yalnızca planlanmış bir sprint başlatılabilir.");
    await recordActivity(tx, {
      projectId,
      type: "sprint.started",
      actorId: user.id,
      message: `${sprint.name} başladı.`,
      metadata: { sprintId },
    });
  });
  refresh();
}

export async function completeSprint(
  projectId: string,
  sprintId: string,
  retrospective: unknown,
) {
  z.uuid().parse(sprintId);
  const notes = z.string().trim().max(5000).default("").parse(retrospective);
  const user = await writer(projectId);
  await db.transaction(async (tx) => {
    const [sprint] = await tx
      .select()
      .from(sprints)
      .where(
        and(
          eq(sprints.id, sprintId),
          eq(sprints.projectId, projectId),
          eq(sprints.status, "active"),
        ),
      )
      .for("update");
    if (!sprint) throw new Error("Yalnızca aktif sprint tamamlanabilir.");
    const [totals] = await tx
      .select({
        committed: sql<number>`coalesce(sum(${tasks.estimatePoints}), 0)::int`,
        completed: sql<number>`coalesce(sum(${tasks.estimatePoints}) filter (where ${tasks.status} = 'done'), 0)::int`,
        doneTasks: sql<number>`count(*) filter (where ${tasks.status} = 'done')::int`,
      })
      .from(tasks)
      .where(eq(tasks.sprintId, sprintId));
    // Unfinished work goes back to the backlog pool instead of silently
    // inflating the closed sprint.
    const moved = await tx
      .update(tasks)
      .set({ sprintId: null, updatedAt: new Date() })
      .where(and(eq(tasks.sprintId, sprintId), ne(tasks.status, "done")))
      .returning({ id: tasks.id });
    await tx
      .update(sprints)
      .set({
        status: "completed",
        committedPoints: totals.committed,
        completedPoints: totals.completed,
        completedTasks: totals.doneTasks,
        retrospective: notes,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(sprints.id, sprintId));
    await recordActivity(tx, {
      projectId,
      type: "sprint.completed",
      actorId: user.id,
      message: `${sprint.name} tamamlandı: ${totals.completed}/${totals.committed} puan.`,
      metadata: {
        sprintId,
        completedPoints: totals.completed,
        committedPoints: totals.committed,
        returnedTasks: moved.length,
      },
    });
  });
  refresh();
}

export async function deleteSprint(projectId: string, sprintId: string) {
  z.uuid().parse(sprintId);
  await writer(projectId);
  const removed = await db
    .delete(sprints)
    .where(
      and(
        eq(sprints.id, sprintId),
        eq(sprints.projectId, projectId),
        eq(sprints.status, "planned"),
      ),
    )
    .returning({ id: sprints.id });
  if (!removed.length)
    throw new Error("Yalnızca henüz başlamamış sprintler silinebilir.");
  refresh();
}

export async function createMilestone(projectId: string, input: unknown) {
  const data = milestoneInput.parse(input);
  const user = await writer(projectId);
  await db.transaction(async (tx) => {
    await tx.insert(milestones).values({ ...data, projectId });
    await recordActivity(tx, {
      projectId,
      type: "milestone.created",
      actorId: user.id,
      message: `"${data.name}" milestone'u eklendi.`,
    });
  });
  refresh();
}

export async function updateMilestone(
  projectId: string,
  milestoneId: string,
  input: unknown,
) {
  z.uuid().parse(milestoneId);
  const data = milestoneInput.parse(input);
  await writer(projectId);
  const updated = await db
    .update(milestones)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(eq(milestones.id, milestoneId), eq(milestones.projectId, projectId)),
    )
    .returning({ id: milestones.id });
  if (!updated.length) throw new Error("Milestone bulunamadı.");
  refresh();
}

export async function deleteMilestone(projectId: string, milestoneId: string) {
  z.uuid().parse(milestoneId);
  await writer(projectId);
  const removed = await db
    .delete(milestones)
    .where(
      and(eq(milestones.id, milestoneId), eq(milestones.projectId, projectId)),
    )
    .returning({ id: milestones.id });
  if (!removed.length) throw new Error("Milestone bulunamadı.");
  refresh();
}
