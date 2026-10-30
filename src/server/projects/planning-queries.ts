import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { milestones, sprints, tasks } from "@/server/db/schema";

// Plain database queries with no request context (no session, no Next.js
// navigation), so background jobs can use them too.

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
