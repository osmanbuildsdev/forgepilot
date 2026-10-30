import "server-only";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { notifications } from "@/server/db/schema";

type Executor = Pick<typeof db, "insert">;

export type NotificationInput = {
  userId: string;
  actorId: string | null;
  type:
    | "task.assigned"
    | "comment.added"
    | "sprint.started"
    | "member.joined"
    | "task.completion_suggested"
    | "task.due_soon"
    | "task.overdue"
    | "sprint.ending";
  title: string;
  body?: string;
  href: string;
  projectId?: string | null;
  taskId?: string | null;
};

// Writes notifications inside the caller's transaction. People are never
// notified about their own actions, and each recipient gets one row.
export async function notify(executor: Executor, items: NotificationInput[]) {
  const seen = new Set<string>();
  const rows = items.filter((n) => {
    if (n.userId === n.actorId || seen.has(n.userId)) return false;
    seen.add(n.userId);
    return true;
  });
  if (!rows.length) return;
  await executor.insert(notifications).values(
    rows.map((n) => ({
      userId: n.userId,
      actorId: n.actorId,
      type: n.type,
      title: n.title,
      body: n.body ?? "",
      href: n.href,
      projectId: n.projectId ?? null,
      taskId: n.taskId ?? null,
    })),
  );
}

export async function unreadCount(userId: string) {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return row.n;
}

export async function recentNotifications(userId: string, limit = 30) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}
