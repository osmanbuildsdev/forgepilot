"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, X } from "lucide-react";
import {
  taskDetails,
  addSubtask,
  setSubtaskDone,
  deleteSubtask,
  addDependency,
  removeDependency,
} from "@/server/tasks/actions";
import { Button } from "@/components/ui/button";

type Details = Awaited<ReturnType<typeof taskDetails>>;

export function TaskChecklist({
  projectId,
  projectKey,
  taskId,
  candidates,
  canWrite,
}: {
  projectId: string;
  projectKey: string;
  taskId: string;
  candidates: { id: string; number: number; title: string }[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [data, setData] = useState<Details | null>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setData(await taskDetails(projectId, taskId));
    } catch {
      setError("Görev ayrıntıları yüklenemedi.");
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
      // Card badges on the board depend on these counts.
      router.refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "İşlem tamamlanamadı.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (!data)
    return (
      <p className="subtle" style={{ marginTop: 24 }}>
        {error || "Yükleniyor…"}
      </p>
    );

  const done = data.subtasks.filter((s) => s.done).length;
  const linked = new Set(data.blockers.map((b) => b.id));
  const options = candidates.filter(
    (c) => c.id !== taskId && !linked.has(c.id),
  );

  return (
    <div className="detail-sections">
      <section aria-labelledby="subtasks-title">
        <div className="row between">
          <h3 id="subtasks-title">Alt görevler</h3>
          {data.subtasks.length > 0 && (
            <span className="subtle" style={{ fontSize: 12 }}>
              {done}/{data.subtasks.length}
            </span>
          )}
        </div>
        {data.subtasks.length > 0 && (
          <div className="progress" style={{ margin: "10px 0 6px" }}>
            <span
              style={{ width: `${(done / data.subtasks.length) * 100}%` }}
            />
          </div>
        )}
        <ul className="checklist">
          {data.subtasks.map((s) => (
            <li key={s.id}>
              <label>
                <input
                  type="checkbox"
                  checked={s.done}
                  disabled={!canWrite || busy}
                  onChange={(e) =>
                    run(() => setSubtaskDone(projectId, s.id, e.target.checked))
                  }
                />
                <span className={s.done ? "done" : ""}>{s.title}</span>
              </label>
              {canWrite && (
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`${s.title} alt görevini sil`}
                  disabled={busy}
                  onClick={() => run(() => deleteSubtask(projectId, s.id))}
                >
                  <X size={13} />
                </button>
              )}
            </li>
          ))}
        </ul>
        {canWrite && (
          <form
            className="row"
            style={{ gap: 6, marginTop: 6 }}
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await run(() => addSubtask(projectId, taskId, title));
              if (ok) setTitle("");
            }}
          >
            <input
              aria-label="Yeni alt görev"
              placeholder="Alt görev ekle…"
              value={title}
              maxLength={200}
              onChange={(e) => setTitle(e.target.value)}
              style={{ height: 32 }}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={busy || !title.trim()}
            >
              Ekle
            </Button>
          </form>
        )}
      </section>

      <section aria-labelledby="blockers-title">
        <h3 id="blockers-title">Beklediği görevler</h3>
        <p className="subtle" style={{ fontSize: 12, margin: "2px 0 8px" }}>
          Bu görev, aşağıdakiler tamamlanmadan bitirilmemeli.
        </p>
        {data.blockers.length > 0 && (
          <ul className="checklist">
            {data.blockers.map((b) => (
              <li key={b.id}>
                <span className="row" style={{ gap: 8, minWidth: 0 }}>
                  {b.status === "done" ? (
                    <span className="badge live">Bitti</span>
                  ) : (
                    <span className="badge">
                      <Lock size={11} /> Açık
                    </span>
                  )}
                  <span className="project-key">
                    {projectKey}-{b.number}
                  </span>
                  <span className="truncate">{b.title}</span>
                </span>
                {canWrite && (
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`${projectKey}-${b.number} bağımlılığını kaldır`}
                    disabled={busy}
                    onClick={() =>
                      run(() => removeDependency(projectId, taskId, b.id))
                    }
                  >
                    <X size={13} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {canWrite && options.length > 0 && (
          <select
            aria-label="Bekleyeceği görevi ekle"
            value=""
            disabled={busy}
            onChange={(e) => {
              const id = e.target.value;
              if (id) void run(() => addDependency(projectId, taskId, id));
            }}
            style={{ height: 32, marginTop: 4 }}
          >
            <option value="">Bekleyeceği bir görev seç…</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {projectKey}-{o.number} · {o.title}
              </option>
            ))}
          </select>
        )}
      </section>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </div>
  );
}
