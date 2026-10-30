"use client";
import { useCallback, useEffect, useState } from "react";
import {
  listComments,
  addComment,
  editComment,
  deleteComment,
} from "@/server/comments/actions";
import { Button } from "@/components/ui/button";

type Comment = Awaited<ReturnType<typeof listComments>>[number];

const timeFormat = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Istanbul",
});

export function TaskComments({
  projectId,
  taskId,
  viewerId,
  canWrite,
  canModerate,
}: {
  projectId: string;
  taskId: string;
  viewerId: string;
  canWrite: boolean;
  canModerate: boolean;
}) {
  const [items, setItems] = useState<Comment[] | null>(null);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setItems(await listComments(projectId, taskId));
    } catch {
      setError("Yorumlar yüklenemedi.");
      setItems([]);
    }
  }, [projectId, taskId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
      await load();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "İşlem tamamlanamadı.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="comments" aria-labelledby="comments-title">
      <h3 id="comments-title">
        Yorumlar{items && items.length > 0 && ` (${items.length})`}
      </h3>
      {items === null ? (
        <p className="subtle">Yükleniyor…</p>
      ) : items.length === 0 ? (
        <p className="subtle">Henüz yorum yok.</p>
      ) : (
        <ol className="comment-list">
          {items.map((c) => {
            const mine = c.authorId === viewerId;
            return (
              <li key={c.id} className="comment">
                <span className="avatar">
                  {(c.authorName ?? "?").charAt(0).toUpperCase()}
                </span>
                <div className="comment-body">
                  <div className="comment-meta">
                    <strong>{c.authorName ?? "Silinmiş kullanıcı"}</strong>
                    <time dateTime={c.createdAt}>
                      {timeFormat.format(new Date(c.createdAt))}
                    </time>
                    {c.editedAt && <span>· düzenlendi</span>}
                  </div>
                  {editing?.id === c.id ? (
                    <form
                      className="form-grid"
                      style={{ gap: 8 }}
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const ok = await run(() =>
                          editComment(projectId, c.id, editing.body),
                        );
                        if (ok) setEditing(null);
                      }}
                    >
                      <textarea
                        aria-label="Yorumu düzenle"
                        value={editing.body}
                        maxLength={5000}
                        onChange={(e) =>
                          setEditing({ id: c.id, body: e.target.value })
                        }
                        style={{ minHeight: 70 }}
                      />
                      <div className="row" style={{ gap: 6 }}>
                        <Button
                          size="sm"
                          disabled={busy || !editing.body.trim()}
                        >
                          Kaydet
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          type="button"
                          onClick={() => setEditing(null)}
                        >
                          Vazgeç
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <p className="comment-text">{c.body}</p>
                  )}
                  {editing?.id !== c.id &&
                    canWrite &&
                    (mine || canModerate) && (
                      <div className="comment-actions">
                        {mine && (
                          <button
                            type="button"
                            onClick={() =>
                              setEditing({ id: c.id, body: c.body })
                            }
                          >
                            Düzenle
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            if (window.confirm("Bu yorum silinsin mi?"))
                              void run(() => deleteComment(projectId, c.id));
                          }}
                        >
                          Sil
                        </button>
                      </div>
                    )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {canWrite && (
        <form
          className="form-grid"
          style={{ gap: 8 }}
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await run(() => addComment(projectId, taskId, draft));
            if (ok) setDraft("");
          }}
        >
          <textarea
            aria-label="Yorum yaz"
            placeholder="Bir yorum yaz…"
            value={draft}
            maxLength={5000}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey))
                e.currentTarget.form?.requestSubmit();
            }}
            style={{ minHeight: 70 }}
          />
          <div className="row between">
            <span className="subtle" style={{ fontSize: 11 }}>
              <kbd>Ctrl</kbd> + <kbd>Enter</kbd> ile gönder
            </span>
            <Button size="sm" disabled={busy || !draft.trim()}>
              Yorum ekle
            </Button>
          </div>
        </form>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </section>
  );
}
