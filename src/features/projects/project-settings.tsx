"use client";
import { unwrap, errorMessage } from "@/lib/action-result";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProject, deleteProject } from "@/server/projects/actions";
import { Button } from "@/components/ui/button";

export function ProjectSettings({
  project,
  canEdit,
  canDelete,
}: {
  project: { id: string; name: string; key: string; description: string };
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState("");

  return (
    <div className="stack" style={{ maxWidth: 680 }}>
      <form
        className="panel form-grid"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setBusy(true);
          setError("");
          setSaved(false);
          try {
            await updateProject(project.id, {
              name: f.get("name"),
              description: f.get("description"),
            }).then(unwrap);
            setSaved(true);
            router.refresh();
          } catch (err) {
            setError(errorMessage(err, "Proje güncellenemedi."));
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2>Genel</h2>
        <label className="field">
          Proje adı
          <input
            name="name"
            defaultValue={project.name}
            minLength={2}
            maxLength={100}
            required
            readOnly={!canEdit}
          />
        </label>
        <label className="field">
          Proje anahtarı
          <input value={project.key} readOnly disabled />
          <span className="field-hint">
            Görev numaraları ({project.key}-24 gibi) bu anahtardan oluşur ve
            commit&apos;lerde kullanılabileceği için sonradan değiştirilemez.
          </span>
        </label>
        <label className="field">
          Açıklama
          <textarea
            name="description"
            defaultValue={project.description}
            maxLength={5000}
            readOnly={!canEdit}
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {canEdit && (
          <div className="row">
            <Button disabled={busy}>
              {busy ? "Kaydediliyor…" : "Değişiklikleri kaydet"}
            </Button>
            {saved && (
              <span className="subtle" role="status">
                Kaydedildi.
              </span>
            )}
          </div>
        )}
      </form>

      {canDelete && (
        <section className="panel danger-zone stack" style={{ gap: 14 }}>
          <div>
            <h2>Projeyi sil</h2>
            <p className="muted" style={{ marginTop: 6 }}>
              Proje; tüm görevleri, yorumları, etiketleri ve aktivite geçmişiyle
              birlikte kalıcı olarak silinir. Bu işlem geri alınamaz.
            </p>
          </div>
          <label className="field">
            Onaylamak için <code>{project.key}</code> yaz
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="off"
            />
          </label>
          <div>
            <Button
              type="button"
              className="danger"
              disabled={busy || confirm !== project.key}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await deleteProject(project.id, confirm).then(unwrap);
                  router.push("/app/projects");
                  router.refresh();
                } catch (err) {
                  setError(errorMessage(err, "Proje silinemedi."));
                  setBusy(false);
                }
              }}
            >
              Projeyi kalıcı olarak sil
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
