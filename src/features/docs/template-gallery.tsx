"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Copy,
  Download,
  FileText,
  Pencil,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  createFromTemplate,
  duplicateBuiltin,
  deleteTemplate,
} from "@/server/docs/template-actions";
import { unwrap, errorMessage } from "@/lib/action-result";
import { renderMarkdown } from "./markdown";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/modal";

type Builtin = {
  ref: string;
  id: string;
  name: string;
  description: string;
  content: string;
  sections: number;
  placeholders: string[];
};
type Custom = {
  ref: string;
  id: string;
  name: string;
  description: string;
  workspaceId: string;
  workspaceName: string;
  editable: boolean;
};
type Target = { ref: string; name: string; workspaceId: string | null };

export function TemplateGallery({
  builtins,
  custom,
  projects,
  workspaces,
  defaultProject,
  aiEnabled,
}: {
  builtins: Builtin[];
  custom: Custom[];
  projects: { id: string; name: string; workspaceId: string }[];
  workspaces: { id: string; name: string }[];
  defaultProject: string;
  aiEnabled: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<Builtin | null>(null);
  const [copying, setCopying] = useState<Builtin | null>(null);
  const [using, setUsing] = useState<Target | null>(null);
  const [created, setCreated] = useState<{
    projectId: string;
    id: string;
    unresolved: string[];
  } | null>(null);

  async function run<T>(action: () => Promise<T>) {
    setBusy(true);
    setError("");
    try {
      return await action();
    } catch (e) {
      setError(errorMessage(e));
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function duplicate(t: Builtin, workspaceId: string) {
    const id = await run(() =>
      duplicateBuiltin(workspaceId, t.id).then(unwrap),
    );
    if (id) router.push(`/app/docs/templates/${id}`);
  }

  const eligible = using
    ? projects.filter(
        (p) => !using.workspaceId || p.workspaceId === using.workspaceId,
      )
    : [];

  return (
    <div className="stack">
      {error && !using && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {custom.length > 0 && (
        <section className="panel">
          <div className="panel-head">
            <h2>Çalışma alanı şablonları</h2>
          </div>
          <ul className="doc-list">
            {custom.map((t) => (
              <li key={t.id} className="template-row">
                <FileText size={16} className="subtle" />
                <span style={{ minWidth: 0 }}>
                  <strong className="truncate">{t.name}</strong>
                  <span className="subtle truncate">
                    {t.workspaceName}
                    {t.description ? ` · ${t.description}` : ""}
                  </span>
                </span>
                <span className="row" style={{ gap: 4 }}>
                  <Button
                    size="sm"
                    onClick={() =>
                      setUsing({
                        ref: t.ref,
                        name: t.name,
                        workspaceId: t.workspaceId,
                      })
                    }
                  >
                    Kullan
                  </Button>
                  <a
                    className="icon-button"
                    href={`/api/templates/${t.id}/export`}
                    aria-label={`${t.name} indir`}
                    title=".md indir"
                  >
                    <Download size={14} />
                  </a>
                  {t.editable && (
                    <>
                      <Link
                        className="icon-button"
                        href={`/app/docs/templates/${t.id}`}
                        aria-label={`${t.name} düzenle`}
                        title="Düzenle"
                      >
                        <Pencil size={14} />
                      </Link>
                      <button
                        className="icon-button"
                        aria-label={`${t.name} sil`}
                        title="Sil"
                        disabled={busy}
                        onClick={async () => {
                          if (
                            !window.confirm(
                              `"${t.name}" şablonu silinsin mi? Bu şablondan oluşturulmuş dokümanlar etkilenmez.`,
                            )
                          )
                            return;
                          await run(() => deleteTemplate(t.id).then(unwrap));
                          router.refresh();
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 style={{ marginBottom: 12 }}>Hazır şablonlar</h2>
        <div className="template-grid">
          {builtins.map((t) => (
            <article key={t.id} className="panel template-card">
              <div>
                <h3>{t.name}</h3>
                <p className="muted">{t.description}</p>
              </div>
              <p className="subtle" style={{ fontSize: 12 }}>
                {t.sections} bölüm
                {t.placeholders.length > 0 &&
                  ` · ${t.placeholders.length} otomatik alan`}
              </p>
              <div className="row" style={{ gap: 4 }}>
                <Button
                  size="sm"
                  disabled={!projects.length}
                  title={
                    projects.length
                      ? undefined
                      : "Yazma yetkin olan bir proje yok"
                  }
                  onClick={() =>
                    setUsing({ ref: t.ref, name: t.name, workspaceId: null })
                  }
                >
                  Kullan
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPreview(t)}>
                  Önizle
                </Button>
                <span style={{ marginLeft: "auto" }} className="row">
                  {workspaces.length > 0 && (
                    <button
                      className="icon-button"
                      aria-label={`${t.name} çoğalt`}
                      title="Çalışma alanına kopyala ve düzenle"
                      disabled={busy}
                      onClick={() =>
                        workspaces.length === 1
                          ? duplicate(t, workspaces[0].id)
                          : setCopying(t)
                      }
                    >
                      <Copy size={14} />
                    </button>
                  )}
                  <a
                    className="icon-button"
                    href={`/api/templates/${t.ref}/export`}
                    aria-label={`${t.name} indir`}
                    title=".md indir"
                  >
                    <Download size={14} />
                  </a>
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {preview && (
        <Modal title={preview.name} onClose={() => setPreview(null)}>
          <article
            className="markdown"
            // Sanitised by renderMarkdown.
            dangerouslySetInnerHTML={{
              __html: renderMarkdown(preview.content),
            }}
          />
        </Modal>
      )}

      {copying && (
        <Modal
          title={`"${copying.name}" şablonunu kopyala`}
          onClose={() => setCopying(null)}
        >
          <form
            className="form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              void duplicate(
                copying,
                String(new FormData(e.currentTarget).get("workspaceId")),
              );
            }}
          >
            <label className="field">
              Çalışma alanı
              <select name="workspaceId" defaultValue={workspaces[0]?.id}>
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <Button disabled={busy}>Kopyala ve düzenle</Button>
          </form>
        </Modal>
      )}

      {using && (
        <Modal
          title={
            created ? "Doküman oluşturuldu" : `"${using.name}" şablonunu kullan`
          }
          onClose={() => {
            setUsing(null);
            setCreated(null);
            setError("");
          }}
        >
          {created ? (
            <div className="stack" style={{ gap: 14 }}>
              {created.unresolved.length ? (
                <p className="muted">
                  Şu alanlar için projede veri yoktu, dokümanda olduğu gibi
                  bırakıldı:{" "}
                  {created.unresolved.map((u) => (
                    <code key={u} style={{ marginRight: 6 }}>{`{{${u}}}`}</code>
                  ))}
                </p>
              ) : (
                <p className="muted">
                  Tüm otomatik alanlar proje verisiyle dolduruldu.
                </p>
              )}
              <div className="row" style={{ gap: 8 }}>
                <Button variant={aiEnabled ? "outline" : "default"} asChild>
                  <Link
                    href={`/app/projects/${created.projectId}/docs/${created.id}`}
                  >
                    Dokümanı aç
                  </Link>
                </Button>
                {aiEnabled && (
                  <Button asChild>
                    <Link
                      href={`/app/projects/${created.projectId}/docs/${created.id}?ai=fill_empty`}
                    >
                      <Sparkles size={14} /> Boş bölümleri AI ile doldur
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <form
              className="form-grid"
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const projectId = String(f.get("projectId"));
                const result = await run(() =>
                  createFromTemplate(projectId, {
                    template: using.ref,
                    title: f.get("title"),
                  }).then(unwrap),
                );
                if (result) setCreated({ projectId, ...result });
              }}
            >
              <label className="field">
                Proje
                <select
                  name="projectId"
                  defaultValue={defaultProject || eligible[0]?.id}
                  required
                >
                  {eligible.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Başlık
                <input
                  name="title"
                  maxLength={200}
                  placeholder="Boş bırakırsan şablondaki başlık kullanılır"
                />
              </label>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <Button disabled={busy || !eligible.length}>
                {busy ? "Oluşturuluyor…" : "Doküman oluştur"}
              </Button>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
