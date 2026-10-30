import "server-only";
import { and, desc, eq, gte, inArray, isNotNull, ne, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  members,
  projectHealthSnapshots,
  projects,
  taskDependencies,
  tasks,
} from "@/server/db/schema";
import { milestoneOverview, sprintOverview } from "@/server/projects/service";
import { computeHealth, type Health } from "@/features/health/score";

const isoDay = (d = new Date()) => d.toISOString().slice(0, 10);
const daysBetween = (a: string, b: string) =>
  Math.round(
    (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000,
  );
const open = ne(tasks.status, "done");

// Ids of open tasks that wait on at least one unfinished task.
function blockedTaskIds() {
  return sql`select d.task_id from ${taskDependencies} d
    join ${tasks} b on b.id = d.depends_on_id
    where b.status <> 'done'`;
}

export async function projectHealth(projectId: string): Promise<Health> {
  const today = isoDay();
  const [[counts], loads, sprintRows, milestoneRows] = await Promise.all([
    db
      .select({
        open: sql<number>`count(*) filter (where ${open})::int`,
        overdue: sql<number>`count(*) filter (where ${open} and ${tasks.dueDate} < ${today})::int`,
        blocked: sql<number>`count(*) filter (where ${open} and ${tasks.id} in (${blockedTaskIds()}))::int`,
        unassignedUrgent: sql<number>`count(*) filter (where ${open} and ${tasks.assigneeId} is null and ${tasks.priority} in ('high', 'urgent'))::int`,
      })
      .from(tasks)
      .where(eq(tasks.projectId, projectId)),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(tasks)
      .where(
        and(eq(tasks.projectId, projectId), open, isNotNull(tasks.assigneeId)),
      )
      .groupBy(tasks.assigneeId),
    sprintOverview(projectId),
    milestoneOverview(projectId),
  ]);

  const active = sprintRows.find((r) => r.sprint.status === "active");
  let activeSprint = null;
  if (active) {
    const { startDate, endDate, name } = active.sprint;
    const total = Math.max(daysBetween(startDate, endDate) + 1, 1);
    const elapsed = Math.min(
      Math.max(daysBetween(startDate, today) + 1, 0),
      total,
    );
    activeSprint = {
      name,
      tasks: active.tasks,
      timePct: Math.round((elapsed / total) * 100),
      workPct: active.points
        ? Math.round((active.donePoints / active.points) * 100)
        : active.tasks
          ? Math.round((active.doneTasks / active.tasks) * 100)
          : 0,
    };
  }

  const health = computeHealth({
    openTasks: counts.open,
    overdueTasks: counts.overdue,
    blockedTasks: counts.blocked,
    unassignedUrgent: counts.unassignedUrgent,
    activeSprint,
    overdueMilestones: milestoneRows
      .filter((m) => m.overdue)
      .map((m) => m.milestone.name),
    openByAssignee: loads.map((l) => l.n),
  });

  // One snapshot per project per day keeps a history without extra jobs.
  await db
    .insert(projectHealthSnapshots)
    .values({
      projectId,
      day: today,
      score: health.score,
      factors: health.factors,
    })
    .onConflictDoUpdate({
      target: [projectHealthSnapshots.projectId, projectHealthSnapshots.day],
      set: {
        score: health.score,
        factors: health.factors,
        updatedAt: new Date(),
      },
    });
  return health;
}

export async function healthHistory(projectId: string, days = 30) {
  return db
    .select({
      day: projectHealthSnapshots.day,
      score: projectHealthSnapshots.score,
    })
    .from(projectHealthSnapshots)
    .where(eq(projectHealthSnapshots.projectId, projectId))
    .orderBy(desc(projectHealthSnapshots.day))
    .limit(days);
}

const briefTask = {
  id: tasks.id,
  number: tasks.number,
  title: tasks.title,
  status: tasks.status,
  priority: tasks.priority,
  dueDate: tasks.dueDate,
  projectId: projects.id,
  projectKey: projects.key,
  projectName: projects.name,
};

// Facts for the user's daily brief, read straight from the database.
export async function dailyBrief(userId: string) {
  const today = isoDay();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const visible = db
    .select({ id: projects.id })
    .from(projects)
    .innerJoin(members, eq(members.workspaceId, projects.workspaceId))
    .where(eq(members.userId, userId));
  const mine = and(eq(tasks.assigneeId, userId), open);

  const [completed, inProgress, dueNow, blocked, projectIds] =
    await Promise.all([
      db
        .select({ ...briefTask, completedAt: tasks.completedAt })
        .from(tasks)
        .innerJoin(projects, eq(projects.id, tasks.projectId))
        .where(
          and(
            inArray(tasks.projectId, visible),
            eq(tasks.status, "done"),
            gte(tasks.completedAt, since),
          ),
        )
        .orderBy(desc(tasks.completedAt))
        .limit(8),
      db
        .select(briefTask)
        .from(tasks)
        .innerJoin(projects, eq(projects.id, tasks.projectId))
        .where(
          and(
            inArray(tasks.projectId, visible),
            mine,
            eq(tasks.status, "in_progress"),
          ),
        )
        .limit(8),
      db
        .select(briefTask)
        .from(tasks)
        .innerJoin(projects, eq(projects.id, tasks.projectId))
        .where(
          and(
            inArray(tasks.projectId, visible),
            mine,
            sql`${tasks.dueDate} <= ${today}`,
          ),
        )
        .orderBy(tasks.dueDate)
        .limit(8),
      db
        .select(briefTask)
        .from(tasks)
        .innerJoin(projects, eq(projects.id, tasks.projectId))
        .where(
          and(
            inArray(tasks.projectId, visible),
            mine,
            sql`${tasks.id} in (${blockedTaskIds()})`,
          ),
        )
        .limit(8),
      db
        .select({ id: projects.id, name: projects.name })
        .from(projects)
        .where(inArray(projects.id, visible))
        .orderBy(desc(projects.updatedAt))
        .limit(6),
    ]);

  const risks = (
    await Promise.all(
      projectIds.map(async ({ id, name }) => {
        const health = await projectHealth(id);
        return { projectId: id, projectName: name, health };
      }),
    )
  ).flatMap(({ projectId, projectName, health }) =>
    health.factors
      .filter((f) => f.level !== "healthy")
      .map((f) => ({
        projectId,
        projectName,
        level: f.level,
        detail: f.detail,
      })),
  );

  return { today, completed, inProgress, dueNow, blocked, risks };
}
export type DailyBrief = Awaited<ReturnType<typeof dailyBrief>>;
