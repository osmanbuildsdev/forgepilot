import "server-only";
import { and, desc, eq, gte, inArray, isNotNull, ne, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  githubCommits,
  githubPullRequests,
  members,
  projectRepositories,
  projects,
  sprints,
  tasks,
  user,
} from "@/server/db/schema";

export const RANGES = [7, 30, 90] as const;
export type Range = (typeof RANGES)[number];

// Monday-based week starts (UTC) covering the range, oldest first.
function weekStarts(days: number) {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  start.setUTCDate(start.getUTCDate() - days + 1);
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  const weeks: string[] = [];
  for (const d = new Date(start); d <= now; d.setUTCDate(d.getUTCDate() + 7))
    weeks.push(d.toISOString().slice(0, 10));
  return weeks;
}

const week = (column: Parameters<typeof sql>[1]) =>
  sql<string>`to_char(date_trunc('week', ${column} at time zone 'UTC'), 'YYYY-MM-DD')`;

export async function reportData(
  userId: string,
  filter: { projectId: string | null; days: Range },
) {
  const visible = await db
    .select({ id: projects.id, name: projects.name, key: projects.key })
    .from(projects)
    .innerJoin(members, eq(members.workspaceId, projects.workspaceId))
    .where(eq(members.userId, userId))
    .orderBy(projects.name);
  const scope = filter.projectId
    ? visible.filter((p) => p.id === filter.projectId)
    : visible;
  const ids = scope.map((p) => p.id);
  const since = new Date(Date.now() - filter.days * 24 * 60 * 60 * 1000);
  const today = new Date().toISOString().slice(0, 10);
  const weeks = weekStarts(filter.days);
  if (!ids.length)
    return {
      projects: visible,
      weeks: [],
      totals: null,
      sprints: [],
      workload: [],
      overdue: [],
      github: null,
    };

  const inScope = inArray(tasks.projectId, ids);
  const repoIds = db
    .select({ id: projectRepositories.repositoryId })
    .from(projectRepositories)
    .where(inArray(projectRepositories.projectId, ids));

  const [
    completed,
    created,
    sprintRows,
    workload,
    overdue,
    commits,
    merged,
    connected,
  ] = await Promise.all([
    db
      .select({
        week: week(tasks.completedAt),
        n: sql<number>`count(*)::int`,
        points: sql<number>`coalesce(sum(${tasks.estimatePoints}), 0)::int`,
      })
      .from(tasks)
      .where(
        and(inScope, eq(tasks.status, "done"), gte(tasks.completedAt, since)),
      )
      .groupBy(sql`1`),
    db
      .select({ week: week(tasks.createdAt), n: sql<number>`count(*)::int` })
      .from(tasks)
      .where(and(inScope, gte(tasks.createdAt, since)))
      .groupBy(sql`1`),
    db
      .select({
        name: sprints.name,
        project: projects.key,
        committed: sprints.committedPoints,
        completed: sprints.completedPoints,
        completedAt: sprints.completedAt,
      })
      .from(sprints)
      .innerJoin(projects, eq(projects.id, sprints.projectId))
      .where(
        and(
          inArray(sprints.projectId, ids),
          eq(sprints.status, "completed"),
          gte(sprints.completedAt, since),
        ),
      )
      .orderBy(sprints.completedAt)
      .limit(12),
    db
      .select({
        name: sql<string>`coalesce(${user.name}, 'Atanmamış')`,
        open: sql<number>`count(*)::int`,
        overdue: sql<number>`count(*) filter (where ${tasks.dueDate} < ${today})::int`,
        points: sql<number>`coalesce(sum(${tasks.estimatePoints}), 0)::int`,
      })
      .from(tasks)
      .leftJoin(user, eq(user.id, tasks.assigneeId))
      .where(and(inScope, ne(tasks.status, "done")))
      .groupBy(user.name)
      .orderBy(desc(sql`count(*)`)),
    db
      .select({
        id: tasks.id,
        number: tasks.number,
        title: tasks.title,
        dueDate: tasks.dueDate,
        priority: tasks.priority,
        projectId: projects.id,
        projectKey: projects.key,
        assignee: user.name,
      })
      .from(tasks)
      .innerJoin(projects, eq(projects.id, tasks.projectId))
      .leftJoin(user, eq(user.id, tasks.assigneeId))
      .where(
        and(
          inScope,
          ne(tasks.status, "done"),
          sql`${tasks.dueDate} < ${today}`,
        ),
      )
      .orderBy(tasks.dueDate)
      .limit(25),
    db
      .select({
        week: week(githubCommits.committedAt),
        n: sql<number>`count(*)::int`,
      })
      .from(githubCommits)
      .where(
        and(
          inArray(githubCommits.repositoryId, repoIds),
          gte(githubCommits.committedAt, since),
        ),
      )
      .groupBy(sql`1`),
    db
      .select({
        week: week(githubPullRequests.mergedAt),
        n: sql<number>`count(*)::int`,
      })
      .from(githubPullRequests)
      .where(
        and(
          inArray(githubPullRequests.repositoryId, repoIds),
          isNotNull(githubPullRequests.mergedAt),
          gte(githubPullRequests.mergedAt, since),
        ),
      )
      .groupBy(sql`1`),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(projectRepositories)
      .where(inArray(projectRepositories.projectId, ids)),
  ]);

  const pick = (rows: { week: string; n: number }[], w: string) =>
    rows.find((r) => r.week === w)?.n ?? 0;
  const velocity = sprintRows.filter((s) => s.completed !== null);
  return {
    projects: visible,
    weeks: weeks.map((w) => ({
      week: w,
      completed: pick(completed, w),
      created: pick(created, w),
      commits: pick(commits, w),
      merged: pick(merged, w),
    })),
    totals: {
      completed: completed.reduce((n, r) => n + r.n, 0),
      completedPoints: completed.reduce((n, r) => n + r.points, 0),
      created: created.reduce((n, r) => n + r.n, 0),
      overdue: workload.reduce((n, r) => n + r.overdue, 0),
      open: workload.reduce((n, r) => n + r.open, 0),
      velocity: velocity.length
        ? Math.round(
            velocity.reduce((n, s) => n + (s.completed ?? 0), 0) /
              velocity.length,
          )
        : null,
    },
    sprints: sprintRows.map((s) => ({
      name: scope.length > 1 ? `${s.project} · ${s.name}` : s.name,
      committed: s.committed ?? 0,
      completed: s.completed ?? 0,
    })),
    workload,
    overdue,
    github: connected[0].n ? { repositories: connected[0].n } : null,
  };
}
export type ReportData = Awaited<ReturnType<typeof reportData>>;
