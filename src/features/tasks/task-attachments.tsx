"use client";
import { useRef, useState } from "react";
import { Paperclip, X } from "lucide-react";
import { deleteAttachment } from "@/server/tasks/actions";
import { unwrap, errorMessage } from "@/lib/action-result";
import { Button } from "@/components/ui/button";

type Attachment = {
  id: string;
  filename: string;
  size: number;
  contentType: string;
  uploadedBy: string | null;
  uploaderName: string | null;
};

const MAX_BYTES = 4 * 1024 * 1024;
const sizeLabel = (n: number) =>
  n < 1024
    ? `${n} B`
    : n < 1024 * 1024
      ? `${Math.round(n / 1024)} KB`
      : `${(n / 1024 / 1024).toFixed(1)} MB`;

export function TaskAttachments({
  projectId,
  taskId,
  items,
  viewerId,
  canWrite,
  canModerate,
  onChange,
}: {
  projectId: string;
  taskId: string;
  items: Attachment[];
  viewerId: string;
  canWrite: boolean;
  canModerate: boolean;
  onChange: () => Promise<void> | void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError("");
    try {
      for (const file of files) {
        if (file.size > MAX_BYTES)
          throw new Error(`${file.name}: dosya 4 MB sınırını aşıyor.`);
        const body = new FormData();
        body.set("file", file);
        const response = await fetch(
          `/api/projects/${projectId}/tasks/${taskId}/attachments`,
          {
            method: "POST",
            body,
          },
        );
        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(data?.error ?? `${file.name} yüklenemedi.`);
        }
      }
      await onChange();
    } catch (e) {
      // Route handlers return readable messages; network errors do not.
      setError(
        e instanceof Error && !(e instanceof TypeError)
          ? e.message
          : "Yükleme başarısız. Bağlantını kontrol et.",
      );
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <section aria-labelledby="attachments-title">
      <div className="row between">
        <h3 id="attachments-title">Ekler</h3>
        {canWrite && (
          <>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => input.current?.click()}
            >
              <Paperclip size={13} /> {busy ? "Yükleniyor…" : "Dosya ekle"}
            </Button>
            <input
              ref={input}
              type="file"
              multiple
              hidden
              onChange={(e) => upload(e.target.files)}
            />
          </>
        )}
      </div>
      {items.length ? (
        <ul className="checklist">
          {items.map((a) => (
            <li key={a.id}>
              <a
                href={`/api/attachments/${a.id}`}
                target="_blank"
                rel="noreferrer"
                className="row"
                style={{ gap: 8, minWidth: 0 }}
              >
                <Paperclip size={13} className="subtle" />
                <span className="truncate">{a.filename}</span>
                <span
                  className="subtle"
                  style={{ fontSize: 11, whiteSpace: "nowrap" }}
                >
                  {sizeLabel(a.size)}
                  {a.uploaderName ? ` · ${a.uploaderName}` : ""}
                </span>
              </a>
              {canWrite && (a.uploadedBy === viewerId || canModerate) && (
                <button
                  className="icon-button"
                  aria-label={`${a.filename} dosyasını sil`}
                  disabled={busy}
                  onClick={async () => {
                    if (!window.confirm(`${a.filename} silinsin mi?`)) return;
                    setBusy(true);
                    setError("");
                    try {
                      await deleteAttachment(projectId, a.id).then(unwrap);
                      await onChange();
                    } catch (e) {
                      setError(errorMessage(e, "Dosya silinemedi."));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <X size={13} />
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="subtle" style={{ fontSize: 12, marginTop: 4 }}>
          {canWrite
            ? "Görsel, PDF, metin veya ofis dosyası ekleyebilirsin (en fazla 4 MB)."
            : "Ek yok."}
        </p>
      )}
      {error && (
        <p className="error" role="alert" style={{ fontSize: 12 }}>
          {error}
        </p>
      )}
    </section>
  );
}
