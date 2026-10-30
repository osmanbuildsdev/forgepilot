"use client";
import { useDeferredValue, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { updateTemplate } from "@/server/docs/template-actions";
import { unwrap, errorMessage } from "@/lib/action-result";
import { renderMarkdown } from "./markdown";
import { PLACEHOLDERS, findPlaceholders } from "./placeholders";
import { Button } from "@/components/ui/button";

export function TemplateEditor({
  template,
  canWrite,
}: {
  template: { id: string; name: string; description: string; content: string };
  canWrite: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description);
  const [content, setContent] = useState(template.content);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const deferred = useDeferredValue(content);
  const html = useMemo(() => renderMarkdown(deferred), [deferred]);
  const used = findPlaceholders(deferred);
  const unknown = used.filter(
    (p) => !(PLACEHOLDERS as readonly string[]).includes(p),
  );

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="doc-toolbar" style={{ marginBottom: 0 }}>
        <input
          className="doc-title"
          aria-label="Şablon adı"
          value={name}
          maxLength={120}
          readOnly={!canWrite}
          onChange={(e) => setName(e.target.value)}
        />
        {canWrite && (
          <span className="row" style={{ gap: 8 }}>
            {message && (
              <span className="subtle" role="status" style={{ fontSize: 12 }}>
                {message}
              </span>
            )}
            <Button
              size="sm"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                setMessage("");
                try {
                  await updateTemplate(template.id, {
                    name,
                    description,
                    content,
                  }).then(unwrap);
                  setMessage("Kaydedildi");
                  router.refresh();
                } catch (e) {
                  setError(errorMessage(e, "Şablon kaydedilemedi."));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Kaydediliyor…" : "Kaydet"}
            </Button>
          </span>
        )}
      </div>
      <input
        aria-label="Açıklama"
        placeholder="Kısa açıklama"
        value={description}
        maxLength={500}
        readOnly={!canWrite}
        onChange={(e) => setDescription(e.target.value)}
      />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="doc-body mode-split">
        <aside className="doc-toc">
          <h3>Otomatik alanlar</h3>
          <ul>
            {PLACEHOLDERS.map((p) => (
              <li key={p}>
                <code
                  style={{ fontSize: 11, opacity: used.includes(p) ? 1 : 0.55 }}
                >
                  {`{{${p}}}`}
                </code>
              </li>
            ))}
          </ul>
          {unknown.length > 0 && (
            <p className="error" style={{ fontSize: 12 }}>
              Tanınmayan: {unknown.map((u) => `{{${u}}}`).join(", ")}. Bunlar
              doldurulmaz.
            </p>
          )}
        </aside>
        <textarea
          className="doc-source"
          aria-label="Şablon içeriği"
          spellCheck={false}
          value={content}
          readOnly={!canWrite}
          maxLength={200_000}
          onChange={(e) => setContent(e.target.value)}
        />
        <article
          className="doc-preview markdown"
          // Sanitised by renderMarkdown.
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}
