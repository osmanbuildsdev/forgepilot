import "server-only";
import { and, eq, gte, isNotNull, like, lt, ne, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  githubEvents,
  notifications,
  projects,
  sprints,
  tasks,
} from "@/server/db/schema";
import { notify } from "@/server/notifications/service";
import { projectHealth } from "@/server/insights/service";
import { processGithubEvent } from "@/server/github/process";
import { registerJob } from "./queue";

const isoDay = (offset = 0) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};

// Has this person already been told this about this task?
async function alreadyNotified(
  userId: string,
  taskId: string,
  type: string,
  since?: Date,
) {
  const [row] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.taskId, taskId),
        eq(notifications.type, type),
        ...(since ? [gte(notifications.createdAt, since)] : []),
      ),
    )
    .limit(1);
  return Boolean(row);
}

// "Due tomorrow" and "overdue" reminders for assigned, unfinished tasks.
// Each task triggers at most one reminder of each kind per due date.
export async function sendDueReminders() {
  const tomorrow = isoDay(1);
  const today = isoDay();
  const rows = await db
    .select({
      id: tasks.id,
      number: tasks.number,
      title: tasks.title,
      dueDate: tasks.dueDate,
      assigneeId: tasks.assigneeId,
      projectId: projects.id,
      key: projects.key,
    })
    .from(tasks)
    .innerJoin(projects, eq(projects.id, tasks.projectId))
    .where(
      and(
        ne(tasks.status, "done"),
        isNotNull(tasks.assigneeId),
        isNotNull(tasks.dueDate),
        sql`${tasks.dueDate} <= ${tomorrow}`,
      ),
    )
    .limit(2000);
  let sent = 0;
  for (const t of rows) {
    const overdue = t.dueDate! < today;
    const type = overdue ? "task.overdue" : "task.due_soon";
    // A due-soon reminder counts for the current due date only; if the date
    // moves, the person may be reminded again.
    const since = overdue ? undefined : new Date(`${t.dueDate}T00:00:00Z`);
    if (since) since.setUTCDate(since.getUTCDate() - 3);
    if (await alreadyNotified(t.assigneeId!, t.id, type, since)) continue;
    await notify(db, [
      {
        userId: t.assigneeId!,
        actorId: null,
        type,
        title: overdue
          ? `${t.key}-${t.number} gecikti`
          : `${t.key}-${t.number} yarın teslim`,
        body: t.title,
        href: `/app/projects/${t.projectId}/board`,
        projectId: t.projectId,
        taskId: t.id,
      },
    ]);
    sent += 1;
  }
  return sent;
}

// Tells people with open work in a sprint that ends tomorrow.
export async function sendSprintEndingReminders() {
  const tomorrow = isoDay(1);
  const ending = await db
    .select({
      id: sprints.id,
      name: sprints.name,
      projectId: sprints.projectId,
    })
    .from(sprints)
    .where(and(eq(sprints.status, "active"), eq(sprints.endDate, tomorrow)));
  let sent = 0;
  for (const s of ending) {
    const href = `/app/projects/${s.projectId}/board?sprint=${s.id}`;
    const people = await db
      .selectDistinct({ id: tasks.assigneeId })
      .from(tasks)
      .where(
        and(
          eq(tasks.sprintId, s.id),
          ne(tasks.status, "done"),
          isNotNull(tasks.assigneeId),
        ),
      );
    for (const p of people) {
      const [seen] = await db
        .select({ id: notifications.id })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, p.id!),
            eq(notifications.type, "sprint.ending"),
            like(notifications.href, `%sprint=${s.id}`),
          ),
        )
        .limit(1);
      if (seen) continue;
      await notify(db, [
        {
          userId: p.id!,
          actorId: null,
          type: "sprint.ending",
          title: `${s.name} yarın bitiyor`,
          body: "Bu sprintte sana atanmış açık görevler var.",
          href,
          projectId: s.projectId,
        },
      ]);
      sent += 1;
    }
  }
  return sent;
}

// One health snapshot per project per day, even for projects nobody opened.
export async function snapshotAllHealth() {
  const rows = await db.select({ id: projects.id }).from(projects);
  for (const p of rows) await projectHealth(p.id);
  return rows.length;
}

// Webhook deliveries that failed are retried a few times.
export async function retryFailedGithubEvents() {
  const failed = await db
    .select({ id: githubEvents.id })
    .from(githubEvents)
    .where(
      and(
        eq(githubEvents.status, "failed"),
        lt(githubEvents.attempts, 5),
        gte(
          githubEvents.createdAt,
          new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        ),
      ),
    )
    .limit(100);
  let retried = 0;
  for (const e of failed) {
    try {
      await processGithubEvent(e.id);
      retried += 1;
    } catch {
      // The attempt count and error are stored on the event row.
    }
  }
  return retried;
}

// Scheduled jobs and when they run (cron, UTC).
export const SCHEDULE = {
  "reminders.due": { cron: "0 6 * * *", run: sendDueReminders },
  "reminders.sprint": { cron: "15 6 * * *", run: sendSprintEndingReminders },
  "health.snapshot": { cron: "30 2 * * *", run: snapshotAllHealth },
  "github.retry": { cron: "*/15 * * * *", run: retryFailedGithubEvents },
} as const;
export type ScheduledJob = keyof typeof SCHEDULE;

for (const [name, job] of Object.entries(SCHEDULE))
  registerJob(name, async () => {
    await job.run();
  });
