"use client";
import { unwrap, errorMessage } from "@/lib/action-result";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Milestone as MilestoneIcon, Plus } from "lucide-react";
import {
  createMilestone,
  updateMilestone,
  deleteMilestone,
} from "@/server/planning/actions";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/modal";

type MilestoneRow = {
  id: string;
  name: string;
  description: string;
  dueDate: string | null;
  tasks: number;
  doneTasks: number;
  overdue: boolean;
};
type SprintBand = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: "planned" | "active" | "completed";
};

const fmt = (d: string, withYear = false) =>
  new Date(`${d}T00:00:00`).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  });

export function RoadmapPanel({
  projectId,
  milestones,
  sprints,
  canWrite,
  today,
}: {
  projectId: string;
  milestones: MilestoneRow[];
  sprints: SprintBand[];
  canWrite: boolean;
  today: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<MilestoneRow | "new" | null>(null);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await action();
      router.refresh();
      return true;
    } catch (e) {
      setError(errorMessage(e, "İşlem tamamlanamadı."));
      return false;
    } finally {
      setBusy(false);
    }
  }

  const timeline = sprints
    .filter(
      (s) => s.status !== "completed" || s.endDate >= addMonths(today, -2),
    )
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  return (
    <div className="stack">
      {error && !editing && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <section className="panel">
        <div className="panel-head">
          <h2>Milestone&apos;lar</h2>
          {canWrite && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditing("new")}
            >
              <Plus size={14} /> Milestone ekle
            </Button>
          )}
        </div>
        {milestones.length ? (
          <ol className="roadmap">
            {milestones.map((m) => {
              const pct = m.tasks
                ? Math.round((m.doneTasks / m.tasks) * 100)
                : 0;
              const complete = m.tasks > 0 && m.doneTasks === m.tasks;
              return (
                <li key={m.id} className={complete ? "complete" : ""}>
                  <div className="roadmap-date">
                    {m.dueDate ? fmt(m.dueDate, true) : "Tarihsiz"}
                  </div>
                  <div className="roadmap-marker" aria-hidden />
                  <div className="roadmap-body">
                    <div
                      className="row between"
                      style={{ alignItems: "flex-start" }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <h3>{m.name}</h3>
                        {m.description && (
                          <p
                            className="muted"
                            style={{ fontSize: 13, marginTop: 2 }}
                          >
                            {m.description}
                          </p>
                        )}
                      </div>
                      <span className="row" style={{ gap: 6 }}>
                        {complete ? (
                          <span className="badge live">Tamamlandı</span>
                        ) : m.overdue ? (
                          <span className="badge blocked">Gecikti</span>
                        ) : null}
                        {canWrite && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditing(m)}
                          >
                            Düzenle
                          </Button>
                        )}
                      </span>
                    </div>
                    <div className="row" style={{ gap: 10, marginTop: 10 }}>
                      <div className="progress" style={{ flex: 1 }}>
                        <span style={{ width: `${pct}%` }} />
                      </div>
                      <span
                        className="subtle"
                        style={{ fontSize: 12, whiteSpace: "nowrap" }}
                      >
                        {m.doneTasks}/{m.tasks} görev
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="empty" style={{ padding: "36px 20px" }}>
            <MilestoneIcon size={22} />
            <p className="muted">
              Henüz milestone yok. Sürümleri veya büyük hedefleri milestone
              olarak ekle, görevleri bunlara bağla.
            </p>
          </div>
        )}
      </section>

      {timeline.length > 0 && (
        <section className="panel">
          <div className="panel-head">
            <h2>Sprint takvimi</h2>
          </div>
          <ul className="sprint-list">
            {timeline.map((s) => (
              <li key={s.id}>
                <span>
                  <strong>{s.name}</strong>
                  <span className="subtle" style={{ fontSize: 12 }}>
                    {"  "}
                    {fmt(s.startDate)} – {fmt(s.endDate)}
                  </span>
                </span>
                <span
                  className={`badge ${s.status === "active" ? "accent" : ""}`}
                >
                  {
                    {
                      planned: "Planlandı",
                      active: "Aktif",
                      completed: "Tamamlandı",
                    }[s.status]
                  }
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {editing && (
        <Modal
          title={editing === "new" ? "Milestone ekle" : "Milestone'u düzenle"}
          onClose={() => {
            setEditing(null);
            setError("");
          }}
        >
          <form
            className="form-grid"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = Object.fromEntries(new FormData(e.currentTarget));
              const ok = await run(() =>
                editing === "new"
                  ? createMilestone(projectId, f).then(unwrap)
                  : updateMilestone(projectId, editing.id, f).then(unwrap),
              );
              if (ok) setEditing(null);
            }}
          >
            <label className="field">
              Ad
              <input
                name="name"
                required
                maxLength={120}
                placeholder="Örn. Genel beta"
                defaultValue={editing === "new" ? "" : editing.name}
              />
            </label>
            <label className="field">
              Açıklama
              <textarea
                name="description"
                maxLength={2000}
                style={{ minHeight: 80 }}
                defaultValue={editing === "new" ? "" : editing.description}
              />
            </label>
            <label className="field">
              Hedef tarih
              <input
                type="date"
                name="dueDate"
                defaultValue={editing === "new" ? "" : (editing.dueDate ?? "")}
              />
            </label>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="row between">
              {editing !== "new" ? (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={async () => {
                    if (
                      window.confirm(
                        "Milestone silinsin mi? Bağlı görevler silinmez, yalnızca bağlantı kaldırılır.",
                      )
                    ) {
                      const ok = await run(() =>
                        deleteMilestone(projectId, editing.id).then(unwrap),
                      );
                      if (ok) setEditing(null);
                    }
                  }}
                >
                  Sil
                </Button>
              ) : (
                <span />
              )}
              <Button disabled={busy}>Kaydet</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function addMonths(d: string, n: number) {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCMonth(x.getUTCMonth() + n);
  return x.toISOString().slice(0, 10);
}
