"use client";
import { unwrap, errorMessage } from "@/lib/action-result";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarRange, Play, Plus, Flag } from "lucide-react";
import {
  createSprint,
  startSprint,
  completeSprint,
  deleteSprint,
} from "@/server/planning/actions";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/modal";

type SprintRow = {
  id: string;
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  status: "planned" | "active" | "completed";
  retrospective: string;
  committedPoints: number | null;
  completedPoints: number | null;
  completedTasks: number | null;
  tasks: number;
  doneTasks: number;
  points: number;
  donePoints: number;
};

const fmt = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
  });
const addDays = (d: string, n: number) => {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};
const daysBetween = (a: string, b: string) =>
  Math.round(
    (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000,
  );

export function SprintsPanel({
  projectId,
  sprints,
  canWrite,
  today,
}: {
  projectId: string;
  sprints: SprintRow[];
  canWrite: boolean;
  today: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [closing, setClosing] = useState<SprintRow | null>(null);

  const active = sprints.find((s) => s.status === "active");
  const planned = sprints
    .filter((s) => s.status === "planned")
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const completed = sprints.filter((s) => s.status === "completed");
  const recent = completed.slice(0, 3);
  const velocity = recent.length
    ? Math.round(
        recent.reduce((n, s) => n + (s.completedPoints ?? 0), 0) /
          recent.length,
      )
    : null;
  const lastEnd = sprints
    .map((s) => s.endDate)
    .sort()
    .at(-1);
  const nextStart = lastEnd && lastEnd >= today ? addDays(lastEnd, 1) : today;

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

  return (
    <div className="stack">
      <div className="stats">
        <div className="panel stat">
          <span className="stat-label">Ortalama hız</span>
          <strong>{velocity ?? "—"}</strong>
          <small>
            {velocity === null
              ? "Tamamlanmış sprint yok"
              : `son ${recent.length} sprintte tamamlanan puan`}
          </small>
        </div>
        <div className="panel stat">
          <span className="stat-label">Aktif sprint</span>
          <strong style={{ fontSize: 20, marginTop: 12 }}>
            {active?.name ?? "Yok"}
          </strong>
          <small>
            {active
              ? `${fmt(active.startDate)} – ${fmt(active.endDate)}`
              : "Planlanan bir sprinti başlat"}
          </small>
        </div>
        <div className="panel stat">
          <span className="stat-label">Planlanan</span>
          <strong>{planned.length}</strong>
          <small>{completed.length} sprint tamamlandı</small>
        </div>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {active ? (
        <ActiveSprint
          sprint={active}
          today={today}
          projectId={projectId}
          canWrite={canWrite}
          busy={busy}
          onComplete={() => setClosing(active)}
        />
      ) : (
        <div className="empty" style={{ padding: "36px 20px" }}>
          <CalendarRange size={22} />
          <p className="muted">
            Şu anda aktif sprint yok.
            {planned.length
              ? " Aşağıdan planlanmış bir sprinti başlatabilirsin."
              : " Yeni bir sprint planlayarak başla."}
          </p>
        </div>
      )}

      <section className="panel">
        <div className="panel-head">
          <h2>Planlanan sprintler</h2>
          {canWrite && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCreating(true)}
            >
              <Plus size={14} /> Sprint planla
            </Button>
          )}
        </div>
        {planned.length ? (
          <ul className="sprint-list">
            {planned.map((s) => (
              <li key={s.id}>
                <div style={{ minWidth: 0 }}>
                  <strong>{s.name}</strong>
                  <div className="subtle" style={{ fontSize: 12 }}>
                    {fmt(s.startDate)} – {fmt(s.endDate)} · {s.tasks} görev ·{" "}
                    {s.points} puan
                  </div>
                  {s.goal && <p className="muted sprint-goal">{s.goal}</p>}
                </div>
                {canWrite && (
                  <div className="row" style={{ gap: 6 }}>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            `${s.name} silinsin mi? Görevleri sprintten çıkarılır.`,
                          )
                        )
                          void run(() =>
                            deleteSprint(projectId, s.id).then(unwrap),
                          );
                      }}
                    >
                      Sil
                    </Button>
                    <Button
                      size="sm"
                      disabled={busy || Boolean(active)}
                      title={active ? "Önce aktif sprinti tamamla" : undefined}
                      onClick={() =>
                        run(() => startSprint(projectId, s.id).then(unwrap))
                      }
                    >
                      <Play size={13} /> Başlat
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="subtle" style={{ padding: "8px 0" }}>
            Planlanmış sprint yok.
          </p>
        )}
      </section>

      {completed.length > 0 && (
        <section className="panel">
          <div className="panel-head">
            <h2>Tamamlanan sprintler</h2>
          </div>
          <ul className="sprint-list">
            {completed.map((s) => (
              <li key={s.id}>
                <div style={{ minWidth: 0 }}>
                  <strong>{s.name}</strong>
                  <div className="subtle" style={{ fontSize: 12 }}>
                    {fmt(s.startDate)} – {fmt(s.endDate)} ·{" "}
                    {s.completedTasks ?? 0} görev tamamlandı
                  </div>
                  {s.retrospective && (
                    <p className="muted sprint-goal">{s.retrospective}</p>
                  )}
                </div>
                <span
                  className="badge mono"
                  title="Tamamlanan / taahhüt edilen puan"
                >
                  {s.completedPoints ?? 0}/{s.committedPoints ?? 0} p
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {creating && (
        <Modal title="Sprint planla" onClose={() => setCreating(false)}>
          <form
            className="form-grid"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = Object.fromEntries(new FormData(e.currentTarget));
              const ok = await run(() =>
                createSprint(projectId, f).then(unwrap),
              );
              if (ok) setCreating(false);
            }}
          >
            <label className="field">
              Ad
              <input
                name="name"
                required
                maxLength={80}
                defaultValue={`Sprint ${sprints.length + 1}`}
              />
            </label>
            <label className="field">
              Sprint hedefi
              <textarea
                name="goal"
                maxLength={1000}
                placeholder="Bu sprintin sonunda ne çalışıyor olacak?"
                style={{ minHeight: 80 }}
              />
            </label>
            <div className="row">
              <label className="field" style={{ flex: 1 }}>
                Başlangıç
                <input
                  type="date"
                  name="startDate"
                  required
                  defaultValue={nextStart}
                />
              </label>
              <label className="field" style={{ flex: 1 }}>
                Bitiş
                <input
                  type="date"
                  name="endDate"
                  required
                  defaultValue={addDays(nextStart, 13)}
                />
              </label>
            </div>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <Button disabled={busy}>Sprinti oluştur</Button>
          </form>
        </Modal>
      )}

      {closing && (
        <Modal
          title={`${closing.name} tamamlansın mı?`}
          onClose={() => setClosing(null)}
        >
          <form
            className="form-grid"
            onSubmit={async (e) => {
              e.preventDefault();
              const notes = new FormData(e.currentTarget).get("retrospective");
              const ok = await run(() =>
                completeSprint(projectId, closing.id, notes).then(unwrap),
              );
              if (ok) setClosing(null);
            }}
          >
            <p className="muted">
              {closing.doneTasks}/{closing.tasks} görev ve {closing.donePoints}/
              {closing.points} puan tamamlandı.{" "}
              {closing.tasks - closing.doneTasks > 0 &&
                `Bitmemiş ${closing.tasks - closing.doneTasks} görev sprintten çıkarılıp backlog havuzuna döner.`}
            </p>
            <label className="field">
              Retrospektif notları
              <textarea
                name="retrospective"
                maxLength={5000}
                placeholder="Ne iyi gitti, neyi değiştirmeliyiz?"
              />
            </label>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <Button disabled={busy}>
              <Flag size={14} /> Sprinti tamamla
            </Button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function ActiveSprint({
  sprint,
  today,
  projectId,
  canWrite,
  busy,
  onComplete,
}: {
  sprint: SprintRow;
  today: string;
  projectId: string;
  canWrite: boolean;
  busy: boolean;
  onComplete: () => void;
}) {
  const total = Math.max(daysBetween(sprint.startDate, sprint.endDate) + 1, 1);
  const elapsed = Math.min(
    Math.max(daysBetween(sprint.startDate, today) + 1, 0),
    total,
  );
  const timePct = Math.round((elapsed / total) * 100);
  const workPct = sprint.points
    ? Math.round((sprint.donePoints / sprint.points) * 100)
    : sprint.tasks
      ? Math.round((sprint.doneTasks / sprint.tasks) * 100)
      : 0;
  const left = daysBetween(today, sprint.endDate);
  // Behind when the share of finished work trails the share of elapsed time
  // by more than 15 points; a simple, explainable signal rather than a forecast.
  const behind = sprint.tasks > 0 && timePct - workPct > 15;
  return (
    <section className="panel active-sprint">
      <div className="panel-head">
        <div>
          <span className="badge accent">
            <span className="dot" /> Aktif
          </span>
          <h2 style={{ marginTop: 10 }}>{sprint.name}</h2>
          <p className="subtle" style={{ fontSize: 12 }}>
            {fmt(sprint.startDate)} – {fmt(sprint.endDate)} ·{" "}
            {left >= 0 ? `${left} gün kaldı` : `${-left} gün gecikti`}
          </p>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <Button size="sm" variant="outline" asChild>
            <Link href={`/app/projects/${projectId}/board?sprint=${sprint.id}`}>
              Panoda gör
            </Link>
          </Button>
          {canWrite && (
            <Button size="sm" disabled={busy} onClick={onComplete}>
              Tamamla
            </Button>
          )}
        </div>
      </div>
      {sprint.goal && <p className="muted">{sprint.goal}</p>}
      <div className="sprint-meters">
        <div>
          <div className="row between subtle" style={{ fontSize: 12 }}>
            <span>İş</span>
            <span>
              {sprint.points
                ? `${sprint.donePoints}/${sprint.points} puan`
                : `${sprint.doneTasks}/${sprint.tasks} görev`}
            </span>
          </div>
          <div className="progress">
            <span style={{ width: `${workPct}%` }} />
          </div>
        </div>
        <div>
          <div className="row between subtle" style={{ fontSize: 12 }}>
            <span>Zaman</span>
            <span>
              {elapsed}/{total} gün
            </span>
          </div>
          <div className="progress time">
            <span style={{ width: `${timePct}%` }} />
          </div>
        </div>
      </div>
      {behind && (
        <p className="overdue" style={{ fontSize: 13 }}>
          Sprint geride: sürenin %{timePct}&apos;i geçti, işin %{workPct}&apos;i
          tamamlandı.
        </p>
      )}
      {sprint.tasks === 0 && (
        <p className="subtle" style={{ fontSize: 13 }}>
          Bu sprinte henüz görev eklenmedi. Görev panelinden sprint seçerek
          ekleyebilirsin.
        </p>
      )}
    </section>
  );
}
