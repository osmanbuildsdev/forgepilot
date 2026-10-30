import type { Metadata } from "next";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { requireUser } from "@/server/projects/service";
import { recentNotifications } from "@/server/notifications/service";
import { MarkAllRead } from "@/features/notifications/mark-all-read";

export const metadata: Metadata = { title: "Gelen kutusu" };

const timeFormat = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Istanbul",
});

export default async function Page() {
  const user = await requireUser();
  const items = await recentNotifications(user.id, 100);
  const unread = items.filter((n) => !n.readAt).length;
  return (
    <div className="stack" style={{ maxWidth: 820 }}>
      <header className="page-heading">
        <div>
          <h1>Gelen kutusu</h1>
          <p className="muted">
            Sana atanan işler, görevlerine gelen yorumlar ve ekip hareketleri.
          </p>
        </div>
        {unread > 0 && <MarkAllRead />}
      </header>
      <section className="panel">
        {items.length ? (
          <ul className="inbox-list">
            {items.map((n) => (
              <li key={n.id} className={n.readAt ? "" : "unread"}>
                <Link href={n.href}>
                  <span className="dot" aria-hidden />
                  <span style={{ minWidth: 0 }}>
                    <strong className="truncate">{n.title}</strong>
                    {n.body && <span className="muted truncate">{n.body}</span>}
                  </span>
                  <time dateTime={n.createdAt.toISOString()}>
                    {timeFormat.format(n.createdAt)}
                  </time>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty">
            <Inbox size={22} />
            <p className="muted">Henüz bildirim yok.</p>
          </div>
        )}
      </section>
    </div>
  );
}
