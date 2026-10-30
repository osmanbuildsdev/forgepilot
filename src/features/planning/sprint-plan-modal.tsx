"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import {
  proposeSprintPlan,
  applySprintPlan,
} from "@/server/planning/ai-actions";
import { unwrap, errorMessage, type ActionData } from "@/lib/action-result";
import { priorityLabels } from "@/components/task-card";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";

type Plan = ActionData<typeof proposeSprintPlan>;

export function SprintPlanModal({
  projectId,
  projectKey,
  sprint,
  onClose,
}: {
  projectId: string;
  projectKey: string;
  sprint: { id: string; name: string };
  onClose: () => void;
}) {
  const router = useRouter();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [applied, setApplied] = useState<number | null>(null);

  useEffect(() => {
    proposeSprintPlan(projectId, sprint.id)
      .then(unwrap)
      .then((p) => {
        setPlan(p);
        // Tasks with unmet prerequisites start unchecked.
        setSelected(
          new Set(p.picks.filter((x) => !x.warning).map((x) => x.taskId)),
        );
      })
      .catch((e) => setError(errorMessage(e, "Plan oluşturulamadı.")))
      .finally(() => setBusy(false));
  }, [projectId, sprint.id]);

  const chosen = plan?.picks.filter((p) => selected.has(p.taskId)) ?? [];
  const points = chosen.reduce((n, p) => n + (p.points ?? 0), 0);
  const unestimated = chosen.filter((p) => p.points === null).length;
  const over =
    plan?.capacity !== null &&
    plan?.capacity !== undefined &&
    points > plan.capacity;

  return (
    <Modal
      title={`${sprint.name} — AI planı`}
      onClose={onClose}
      variant="drawer"
    >
      {busy && !plan ? (
        <p className="muted">
          Backlog, bağımlılıklar, geçmiş hız ve iş yükü inceleniyor… (30–60 sn)
        </p>
      ) : applied !== null ? (
        <div className="stack" style={{ gap: 12 }}>
          <p>
            {applied} görev {sprint.name} sprintine eklendi.
          </p>
          <Button onClick={onClose}>Kapat</Button>
        </div>
      ) : plan ? (
        <div className="stack" style={{ gap: 16 }}>
          <div
            className="stats"
            style={{ gridTemplateColumns: "repeat(2, 1fr)" }}
          >
            <div className="panel stat" style={{ padding: 14 }}>
              <span className="stat-label">Kapasite (geçmiş hıza göre)</span>
              <strong style={{ fontSize: 22 }}>
                {plan.capacity === null ? "—" : `${plan.capacity} p`}
              </strong>
              <small>
                {plan.capacity === null
                  ? "Tamamlanmış sprint yok; tahmin edilemiyor"
                  : `sprintte zaten ${plan.pointsAlreadyInSprint} p var`}
              </small>
            </div>
            <div className="panel stat" style={{ padding: 14 }}>
              <span className="stat-label">Seçilen</span>
              <strong
                style={{ fontSize: 22 }}
                className={over ? "overdue" : ""}
              >
                {points} p
              </strong>
              <small>
                {chosen.length} görev
                {unestimated ? ` · ${unestimated} tahminsiz` : ""}
              </small>
            </div>
          </div>
          {plan.summary && (
            <p className="muted" style={{ fontSize: 13 }}>
              {plan.summary}
            </p>
          )}
          <ul className="plan-picks">
            {plan.picks.map((p) => (
              <li key={p.taskId}>
                <label>
                  <input
                    type="checkbox"
                    checked={selected.has(p.taskId)}
                    onChange={(e) => {
                      const next = new Set(selected);
                      if (e.target.checked) next.add(p.taskId);
                      else next.delete(p.taskId);
                      setSelected(next);
                    }}
                  />
                  <span style={{ minWidth: 0 }}>
                    <strong>
                      <span className="project-key">
                        {projectKey}-{p.number}
                      </span>{" "}
                      {p.title}
                    </strong>
                    <span className="subtle">
                      {priorityLabels[p.priority]} · {p.points ?? "?"} p
                      {p.assignee ? ` · ${p.assignee}` : " · atanmamış"}
                    </span>
                    {p.reason && <span className="muted">{p.reason}</span>}
                    {p.warning && (
                      <span className="overdue row" style={{ gap: 4 }}>
                        <TriangleAlert size={12} /> {p.warning}
                      </span>
                    )}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {over && (
            <p className="overdue" style={{ fontSize: 13 }}>
              Seçim geçmiş hıza göre kapasiteyi aşıyor.
            </p>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="row between">
            <Button variant="ghost" onClick={onClose}>
              Vazgeç
            </Button>
            <Button
              disabled={busy || !chosen.length}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  const n = await applySprintPlan(
                    projectId,
                    sprint.id,
                    plan.generationId,
                    chosen.map((c) => c.taskId),
                  ).then(unwrap);
                  setApplied(n);
                  router.refresh();
                } catch (e) {
                  setError(errorMessage(e, "Plan uygulanamadı."));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {chosen.length} görevi sprinte ekle
            </Button>
          </div>
        </div>
      ) : (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
