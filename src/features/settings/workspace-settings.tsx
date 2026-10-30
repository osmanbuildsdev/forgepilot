"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { renameWorkspace, deleteWorkspace } from "@/server/workspaces/actions";
import { unwrap, errorMessage } from "@/lib/action-result";
import { Button } from "@/components/ui/button";

const roleLabels = {
  owner: "Sahip",
  admin: "Yönetici",
  member: "Üye",
  viewer: "İzleyici",
};

export function WorkspaceSettings({
  workspace,
  role,
  canEdit,
  counts,
}: {
  workspace: { id: string; name: string };
  role: keyof typeof roleLabels;
  canEdit: boolean;
  counts: { projects: number; members: number };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState("");

  return (
    <div className="stack">
      <form
        className="panel form-grid"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          setSaved(false);
          try {
            await renameWorkspace(
              workspace.id,
              new FormData(e.currentTarget).get("name"),
            ).then(unwrap);
            setSaved(true);
            router.refresh();
          } catch (err) {
            setError(errorMessage(err, "Kaydedilemedi."));
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="row between">
          <h2>Genel</h2>
          <span className="badge">Rolün: {roleLabels[role]}</span>
        </div>
        <label className="field">
          Çalışma alanı adı
          <input
            name="name"
            key={workspace.id}
            defaultValue={workspace.name}
            minLength={2}
            maxLength={100}
            required
            readOnly={!canEdit}
          />
        </label>
        <p className="subtle" style={{ fontSize: 12 }}>
          {counts.projects} proje · {counts.members} üye
        </p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {canEdit && (
          <div className="row">
            <Button disabled={busy}>{busy ? "Kaydediliyor…" : "Kaydet"}</Button>
            {saved && (
              <span className="subtle" role="status">
                Kaydedildi.
              </span>
            )}
          </div>
        )}
      </form>

      {role === "owner" && (
        <section className="panel danger-zone stack" style={{ gap: 14 }}>
          <div>
            <h2>Çalışma alanını sil</h2>
            <p className="muted" style={{ marginTop: 6 }}>
              {counts.projects} proje; tüm görevleri, dokümanları, sprintleri ve
              geçmişiyle birlikte kalıcı olarak silinir. GitHub bağlantısı
              kaldırılır. Bu işlem geri alınamaz.
            </p>
          </div>
          <label className="field">
            Onaylamak için <code>{workspace.name}</code> yaz
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
              disabled={busy || confirm !== workspace.name}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await deleteWorkspace(workspace.id, confirm).then(unwrap);
                  router.push("/app");
                  router.refresh();
                } catch (err) {
                  setError(errorMessage(err, "Silinemedi."));
                  setBusy(false);
                }
              }}
            >
              Çalışma alanını kalıcı olarak sil
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
