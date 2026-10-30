"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProject, createWorkspace } from "@/server/actions";
import { Button } from "@/components/ui/button";
export function WorkspaceForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  return (
    <form
      className="form-grid"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const f = new FormData(e.currentTarget);
        try {
          await createWorkspace(f.get("name"));
          router.push("/app/projects/new");
          router.refresh();
        } catch {
          setError("Çalışma alanı oluşturulamadı. Tekrar deneyin.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="field">
        Çalışma alanı adı
        <input
          name="name"
          placeholder="Örn. Acme Labs"
          minLength={2}
          maxLength={100}
          required
        />
      </label>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <Button disabled={busy}>
        {busy ? "Oluşturuluyor…" : "Çalışma alanını oluştur →"}
      </Button>
    </form>
  );
}
export function ProjectForm({
  workspaces,
}: {
  workspaces: { id: string; name: string }[];
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  return (
    <form
      className="form-grid"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const f = new FormData(e.currentTarget);
        try {
          const id = await createProject(Object.fromEntries(f));
          router.push(`/app/projects/${id}/board`);
          router.refresh();
        } catch {
          setError(
            "Proje oluşturulamadı. Proje anahtarının bu çalışma alanında benzersiz olduğundan ve yetkinizden emin olun.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="field">
        Çalışma alanı
        <select name="workspaceId">
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Proje adı
        <input
          name="name"
          placeholder="Örn. ForgePilot Mobile"
          minLength={2}
          maxLength={100}
          required
        />
      </label>
      <label className="field">
        Proje anahtarı
        <input
          name="key"
          placeholder="FORGE"
          pattern="[A-Z][A-Z0-9]{1,9}"
          minLength={2}
          maxLength={10}
          required
          onInput={(e) => {
            e.currentTarget.value = e.currentTarget.value.toUpperCase();
          }}
        />
        <span className="muted">
          2–10 karakter. Görevler FORGE-1 biçiminde numaralanır.
        </span>
      </label>
      <label className="field">
        Açıklama
        <textarea
          name="description"
          placeholder="Ne geliştiriyoruz, kimin için ve neden?"
          maxLength={5000}
        />
      </label>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <Button disabled={busy}>
        {busy ? "Oluşturuluyor…" : "Projeyi oluştur →"}
      </Button>
    </form>
  );
}
