import "server-only";
import { and, desc, eq, gte, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  activities,
  githubPullRequests,
  githubRepositories,
  projectRepositories,
  taskDependencies,
  tasks,
  user,
} from "@/server/db/schema";
import { milestoneOverview, sprintOverview } from "@/server/projects/service";
import { projectHealth } from "@/server/insights/service";

// Everything the Copilot may know about a project, read from the database.
export async function copilotContext(project: {
  id: string;
  key: string;
  name: string;
  description: string;
}) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeks = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const today = new Date().toISOString().slice(0, 10);
  const repoIds = db
    .select({ id: projectRepositories.repositoryId })
    .from(projectRepositories)
    .where(eq(projectRepositories.projectId, project.id));

  const [
    open,
    done,
    blockedRows,
    sprintRows,
    milestoneRows,
    health,
    pulls,
    recent,
  ] = await Promise.all([
    db
      .select({
        number: tasks.number,
        title: tasks.title,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        estimatePoints: tasks.estimatePoints,
        assignee: user.name,
        sprintId: tasks.sprintId,
      })
      .from(tasks)
      .leftJoin(user, eq(user.id, tasks.assigneeId))
      .where(and(eq(tasks.projectId, project.id), ne(tasks.status, "done")))
      .orderBy(
        sql`case ${tasks.priority} when 'urgent' then 0 when 'high' then 1 when 'medium' then 2 else 3 end`,
        tasks.number,
      )
      .limit(80),
    db
      .select({
        number: tasks.number,
        title: tasks.title,
        completedAt: tasks.completedAt,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.projectId, project.id),
          eq(tasks.status, "done"),
          gte(tasks.completedAt, twoWeeks),
        ),
      )
      .orderBy(desc(tasks.completedAt))
      .limit(30),
    db
      .select({ taskId: taskDependencies.taskId, number: tasks.number })
      .from(taskDependencies)
      .innerJoin(tasks, eq(tasks.id, taskDependencies.dependsOnId))
      .where(and(eq(tasks.projectId, project.id), ne(tasks.status, "done"))),
    sprintOverview(project.id),
    milestoneOverview(project.id),
    projectHealth(project.id),
    db
      .select({
        number: githubPullRequests.number,
        title: githubPullRequests.title,
        state: githubPullRequests.state,
        checkStatus: githubPullRequests.checkStatus,
        repo: githubRepositories.fullName,
      })
      .from(githubPullRequests)
      .innerJoin(
        githubRepositories,
        eq(githubRepositories.id, githubPullRequests.repositoryId),
      )
      .where(inArray(githubPullRequests.repositoryId, repoIds))
      .orderBy(desc(githubPullRequests.updatedAt))
      .limit(15),
    db
      .select({
        message: activities.message,
        at: activities.createdAt,
        source: activities.source,
      })
      .from(activities)
      .where(
        and(
          eq(activities.projectId, project.id),
          gte(activities.createdAt, weekAgo),
        ),
      )
      .orderBy(desc(activities.createdAt))
      .limit(40),
  ]);

  // Numbers of tasks that wait on unfinished work.
  const blockedTaskIds = new Set(blockedRows.map((b) => b.taskId));
  const blockedNumbers = (
    blockedTaskIds.size
      ? await db
          .select({ number: tasks.number })
          .from(tasks)
          .where(inArray(tasks.id, [...blockedTaskIds]))
      : []
  ).map((t) => t.number);
  const sprintName = new Map(
    sprintRows.map((s) => [s.sprint.id, s.sprint.name]),
  );
  return {
    today,
    project: {
      key: project.key,
      name: project.name,
      description: project.description,
    },
    health: {
      score: health.score,
      factors: health.factors
        .filter((f) => f.level !== "healthy")
        .map((f) => f.detail),
    },
    openTasks: open.map((t) => ({
      key: `${project.key}-${t.number}`,
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate,
      overdue: t.dueDate !== null && t.dueDate < today,
      points: t.estimatePoints,
      assignee: t.assignee,
      sprint: t.sprintId ? (sprintName.get(t.sprintId) ?? null) : null,
      blocked: blockedNumbers.includes(t.number),
    })),
    completedLast14Days: done.map((t) => ({
      key: `${project.key}-${t.number}`,
      title: t.title,
      completedAt: t.completedAt?.toISOString().slice(0, 10),
    })),
    sprints: sprintRows.map((s) => ({
      name: s.sprint.name,
      status: s.sprint.status,
      goal: s.sprint.goal,
      dates: `${s.sprint.startDate} – ${s.sprint.endDate}`,
      progress: `${s.doneTasks}/${s.tasks} görev, ${s.donePoints}/${s.points} puan`,
      velocity: s.sprint.completedPoints,
    })),
    milestones: milestoneRows.map((m) => ({
      name: m.milestone.name,
      dueDate: m.milestone.dueDate,
      progress: `${m.doneTasks}/${m.tasks}`,
      overdue: Boolean(m.overdue),
    })),
    pullRequests: pulls,
    activityLast7Days: recent.map((a) => ({
      at: a.at.toISOString().slice(0, 16).replace("T", " "),
      source: a.source,
      message: a.message,
    })),
  };
}
