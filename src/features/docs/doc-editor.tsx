"use client";
import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, History, Trash2 } from "lucide-react";
import { saveDocument, deleteDocument } from "@/server/docs/actions";
import { unwrap, errorMessage } from "@/lib/action-result";
import { parseMarkdown, renderMarkdown, headingAnchor } from "./markdown";
import { Button } from "@/components/ui/button";

type Mode = "split" | "edit" | "preview";

export function DocEditor({
  projectId,
  projectKey,
  doc,
  canWrite,
  references,
}: {
  projectId: string;
  projectKey: string;
  doc: { id: string; title: string; content: string; version: number };
  canWrite: boolean;
  references: { id: string; number: number; title: string; status: string }[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(doc.title);
  const [content, setContent] = useState(doc.content);
  const [version, setVersion] = useState(doc.version);
  const [saved, setSaved] = useState({
    title: doc.title,
    content: doc.content,
  });
  const [mode, setMode] = useState<Mode>(canWrite ? "split" : "preview");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  // Rendering is deferred so typing stays responsive on long documents.
  const deferred = useDeferredValue(content);
  const html = useMemo(() => renderMarkdown(deferred), [deferred]);
  const structure = useMemo(() => parseMarkdown(deferred), [deferred]);
  const dirty = title !== saved.title || content !== saved.content;

  async function save() {
    if (!dirty || busy || !canWrite) return;
    setBusy(true);
    setError("");
    try {
      const next = await saveDocument(projectId, doc.id, {
        title,
        content,
        baseVersion: version,
      }).then(unwrap);
      setVersion(next);
      setSaved({ title, content });
      setStatus(`Kaydedildi · sürüm ${next}`);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e, "Kaydedilemedi. Bağlantını kontrol et."));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
      }
    };
    const onLeave = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onLeave);
    };
  });

  return (
    <div className="doc-editor">
      <div className="doc-toolbar">
        <input
          className="doc-title"
          aria-label="Doküman başlığı"
          value={title}
          maxLength={200}
          readOnly={!canWrite}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="segmented" role="group" aria-label="Görünüm">
          {(canWrite
            ? ([
                ["edit", "Kaynak"],
                ["split", "Yan yana"],
                ["preview", "Önizleme"],
              ] as const)
            : ([["preview", "Önizleme"]] as const)
          ).map(([m, label]) => (
            <button
              key={m}
              className={mode === m ? "active" : ""}
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="row" style={{ gap: 6, marginLeft: "auto" }}>
          <span className="subtle" role="status" style={{ fontSize: 12 }}>
            {dirty
              ? "Kaydedilmemiş değişiklikler"
              : status || `Sürüm ${version}`}
          </span>
          <Button size="sm" variant="ghost" asChild>
            <Link href={`/app/projects/${projectId}/docs/${doc.id}/history`}>
              <History size={14} /> Geçmiş
            </Link>
          </Button>
          <Button size="sm" variant="ghost" asChild>
            <a href={`/api/docs/${doc.id}/export`}>
              <Download size={14} /> .md
            </a>
          </Button>
          {canWrite && (
            <Button size="sm" disabled={!dirty || busy} onClick={save}>
              {busy ? "Kaydediliyor…" : "Kaydet"}
            </Button>
          )}
        </span>
      </div>
      {error && (
        <p className="error" role="alert" style={{ marginBottom: 12 }}>
          {error}
        </p>
      )}
      <div className={`doc-body mode-${mode}`}>
        <aside className="doc-toc" aria-label="İçindekiler">
          <h3>İçindekiler</h3>
          {structure.headings.length ? (
            <ol>
              {structure.headings.map((h, i) => (
                <li
                  key={`${h.slug}-${i}`}
                  style={{ paddingLeft: (h.level - 1) * 10 }}
                >
                  <a
                    href={`#${headingAnchor(h.slug)}`}
                    onClick={(e) => {
                      e.preventDefault();
                      if (mode === "edit") setMode("split");
                      requestAnimationFrame(() =>
                        document
                          .getElementById(headingAnchor(h.slug))
                          ?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          }),
                      );
                    }}
                  >
                    {h.title || "—"}
                  </a>
                </li>
              ))}
            </ol>
          ) : (
            <p className="subtle">Başlık eklediğinde burada listelenir.</p>
          )}
          {references.length > 0 && (
            <div className="doc-refs">
              <h3>Bahsedilen görevler</h3>
              <ul>
                {references.map((r) => (
                  <li key={r.id}>
                    <Link href={`/app/projects/${projectId}/board`}>
                      <span className="project-key">
                        {projectKey}-{r.number}
                      </span>{" "}
                      {r.title}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="subtle" style={{ fontSize: 11 }}>
                Yalnızca öneri; görevler değiştirilmez.
              </p>
            </div>
          )}
          <dl className="doc-stats">
            <dt>Kelime</dt>
            <dd>{structure.words}</dd>
            <dt>Tablo</dt>
            <dd>{structure.tables}</dd>
            <dt>Kod bloğu</dt>
            <dd>{structure.codeBlocks.length}</dd>
            {structure.checklists.total > 0 && (
              <>
                <dt>Kontrol listesi</dt>
                <dd>
                  {structure.checklists.done}/{structure.checklists.total}
                </dd>
              </>
            )}
          </dl>
          {canWrite && (
            <button
              className="link-button danger-link"
              onClick={async () => {
                if (
                  !window.confirm(
                    `"${doc.title}" ve tüm sürümleri silinsin mi?`,
                  )
                )
                  return;
                try {
                  await deleteDocument(projectId, doc.id).then(unwrap);
                  router.push(`/app/projects/${projectId}/docs`);
                } catch (e) {
                  setError(errorMessage(e, "Doküman silinemedi."));
                }
              }}
            >
              <Trash2 size={12} /> Dokümanı sil
            </button>
          )}
        </aside>
        {mode !== "preview" && (
          <textarea
            className="doc-source"
            aria-label="Markdown kaynağı"
            spellCheck={false}
            value={content}
            maxLength={500_000}
            onChange={(e) => setContent(e.target.value)}
          />
        )}
        {mode !== "edit" && (
          <article
            className="doc-preview markdown"
            // Output of renderMarkdown is sanitised: raw HTML is dropped.
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </div>
    </div>
  );
}
