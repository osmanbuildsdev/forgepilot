"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FilePlus, Upload } from "lucide-react";
import { createDocument, importMarkdown } from "@/server/docs/actions";
import { unwrap, errorMessage, ActionError } from "@/lib/action-result";
import { Button } from "@/components/ui/button";

const MAX_BYTES = 500_000;

export function DocsToolbar({ projectId }: { projectId: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  async function importFiles(files: FileList | File[]) {
    setError("");
    const list = [...files];
    if (!list.length) return;
    setBusy(true);
    let lastId = "";
    try {
      for (const file of list) {
        // Checked here for fast feedback; the server validates again.
        if (!/\.(md|markdown)$/i.test(file.name))
          throw new ActionError(
            `${file.name}: yalnızca .md veya .markdown dosyaları desteklenir.`,
          );
        if (file.size > MAX_BYTES)
          throw new ActionError(`${file.name}: dosya 500 KB sınırını aşıyor.`);
        lastId = await importMarkdown(projectId, {
          filename: file.name,
          content: await file.text(),
        }).then(unwrap);
      }
      if (list.length === 1)
        router.push(`/app/projects/${projectId}/docs/${lastId}`);
      else router.refresh();
    } catch (e) {
      setError(errorMessage(e, "İçe aktarılamadı. Bağlantını kontrol et."));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="stack" style={{ gap: 10 }}>
      <div
        className={`dropzone ${dragging ? "over" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void importFiles(e.dataTransfer.files);
        }}
      >
        <Upload size={18} className="subtle" />
        <span>
          <strong>Markdown dosyalarını buraya bırak</strong>
          <span className="subtle">
            .md / .markdown · en fazla 500 KB · başlıklar, tablolar ve kod
            blokları korunur
          </span>
        </span>
        <span className="row" style={{ gap: 6, marginLeft: "auto" }}>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            Dosya seç
          </Button>
          <Button
            size="sm"
            disabled={busy}
            onClick={async () => {
              const title = window.prompt("Doküman başlığı");
              if (!title?.trim()) return;
              setBusy(true);
              setError("");
              try {
                const id = await createDocument(projectId, { title }).then(
                  unwrap,
                );
                router.push(`/app/projects/${projectId}/docs/${id}`);
              } catch (e) {
                setError(errorMessage(e, "Doküman oluşturulamadı."));
                setBusy(false);
              }
            }}
          >
            <FilePlus size={14} /> Yeni doküman
          </Button>
        </span>
        <input
          ref={input}
          type="file"
          accept=".md,.markdown,text/markdown"
          multiple
          hidden
          onChange={(e) => e.target.files && importFiles(e.target.files)}
        />
      </div>
      {busy && (
        <p className="subtle" style={{ fontSize: 12 }}>
          İşleniyor…
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
