"use server";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { attempt } from "@/server/errors";
import { db } from "@/server/db";
import { notifications } from "@/server/db/schema";
import { requireUser } from "@/server/projects/service";
import { recentNotifications, unreadCount } from "./service";

export async function listNotifications() {
  return attempt(async () => {
    const user = await requireUser();
    const [items, unread] = await Promise.all([
      recentNotifications(user.id),
      unreadCount(user.id),
    ]);
    return {
      unread,
      items: items.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        href: n.href,
        read: n.readAt !== null,
        createdAt: n.createdAt.toISOString(),
      })),
    };
  });
}

export async function markNotificationRead(id: string) {
  return attempt(async () => {
    z.uuid().parse(id);
    const user = await requireUser();
    // Scoped to the current user so ids from others cannot be touched.
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.userId, user.id),
          isNull(notifications.readAt),
        ),
      );
    revalidatePath("/app", "layout");
  });
}

export async function markAllNotificationsRead() {
  return attempt(async () => {
    const user = await requireUser();
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(eq(notifications.userId, user.id), isNull(notifications.readAt)),
      );
    revalidatePath("/app", "layout");
  });
}
