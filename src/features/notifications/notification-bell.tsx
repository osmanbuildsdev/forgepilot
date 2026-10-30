"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/server/notifications/actions";
import { unwrap, errorMessage, type ActionData } from "@/lib/action-result";

type Feed = ActionData<typeof listNotifications>;

export const relativeTime = (iso: string) => {
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (minutes < 1) return "şimdi";
  if (minutes < 60) return `${minutes} dk`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} sa`;
  return `${Math.round(hours / 24)} g`;
};

export function NotificationBell({ unread }: { unread: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [feed, setFeed] = useState<Feed | null>(null);
  const [error, setError] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    listNotifications()
      .then(unwrap)
      .then(setFeed)
      .catch((e) => setError(errorMessage(e, "Bildirimler yüklenemedi.")));
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (
        e instanceof KeyboardEvent
          ? e.key === "Escape"
          : !ref.current?.contains(e.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const count = feed?.unread ?? unread;

  return (
    <div className="popover-anchor" ref={ref}>
      <button
        className="icon-button bell"
        aria-label={count ? `Bildirimler, ${count} okunmamış` : "Bildirimler"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Bell size={16} />
        {count > 0 && (
          <span className="bell-count">{count > 9 ? "9+" : count}</span>
        )}
      </button>
      {open && (
        <div
          className="popover notifications"
          role="dialog"
          aria-label="Bildirimler"
        >
          <div className="popover-head">
            <strong>Bildirimler</strong>
            {count > 0 && (
              <button
                className="link-button"
                onClick={async () => {
                  await markAllNotificationsRead()
                    .then(unwrap)
                    .catch(() => {});
                  setFeed((f) =>
                    f
                      ? {
                          unread: 0,
                          items: f.items.map((i) => ({ ...i, read: true })),
                        }
                      : f,
                  );
                  router.refresh();
                }}
              >
                Tümünü okundu işaretle
              </button>
            )}
          </div>
          {error ? (
            <p className="error" style={{ padding: 14 }}>
              {error}
            </p>
          ) : !feed ? (
            <p className="subtle" style={{ padding: 14 }}>
              Yükleniyor…
            </p>
          ) : feed.items.length === 0 ? (
            <p className="subtle" style={{ padding: 14 }}>
              Henüz bildirim yok.
            </p>
          ) : (
            <ul>
              {feed.items.slice(0, 12).map((n) => (
                <li key={n.id} className={n.read ? "" : "unread"}>
                  <Link
                    href={n.href}
                    onClick={() => {
                      setOpen(false);
                      if (!n.read)
                        void markNotificationRead(n.id).then(() =>
                          router.refresh(),
                        );
                    }}
                  >
                    <span className="truncate">{n.title}</span>
                    {n.body && (
                      <span className="subtle truncate">{n.body}</span>
                    )}
                    <time dateTime={n.createdAt}>
                      {relativeTime(n.createdAt)}
                    </time>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/app/inbox"
            className="popover-foot"
            onClick={() => setOpen(false)}
          >
            Tümünü gör
          </Link>
        </div>
      )}
    </div>
  );
}
