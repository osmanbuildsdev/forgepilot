"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles, X } from "lucide-react";
import {
  generateProjectPlan,
  createProjectFromPlan,
} from "@/server/ai/actions";
import { unwrap, errorMessage } from "@/lib/action-result";
import type { ProjectPlan } from "./plan-schema";
import { Button } from "@/components/ui/button";
import { priorityLabels } from "@/components/task-card";

type ListKey =
  | "goals"
  | "mvpScope"
  | "functionalRequirements"
  | "suggestedStack"
  | "dependencies"
  | "risks"
  | "successCriteria";

const listSections: [ListKey, string][] = [
  ["goals", "Ürün hedefleri"],
  ["mvpScope", "MVP kapsamı"],
  ["functionalRequirements", "Fonksiyonel gereksinimler"],
  ["suggestedStack", "Önerilen teknoloji yığını"],
  ["dependencies", "Bağımlılıklar"],
  ["risks", "Riskler"],
  ["successCriteria", "Başarı kriterleri"],
];

// Suggests a project key from a name: "Atlas Analytics" -> "ATLAS".
function suggestKey(name: string) {
  const ascii = name
    .toLocaleUpperCase("tr-TR")
    .replace(
      /[ÇĞİÖŞÜ]/g,
      (c) => ({ Ç: "C", Ğ: "G", İ: "I", Ö: "O", Ş: "S", Ü: "U" })[c] ?? c,
    )
    .replace(/[^A-Z0-9 ]/g, "");
  const first = ascii.split(" ").find(Boolean) ?? "";
  const key = first.replace(/^[0-9]+/, "").slice(0, 6);
  return key.length >= 2 ? key : "PROJ";
}

export function PlanGenerator({
  workspaces,
  today,
}: {
  workspaces: { id: string; name: string }[];
  today: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [workspaceId, setWorkspaceId] = useState(workspaces[0].id);
  const [result, setResult] = useState<{
    generationId: string;
    plan: ProjectPlan;
  } | null>(null);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [sprintWeeks, setSprintWeeks] = useState(2);

  const plan = result?.plan;
  const update = (next: Partial<ProjectPlan>) =>
    setResult((r) => (r ? { ...r, plan: { ...r.plan, ...next } } : r));

  // Removing a milestone or sprint shifts later indexes; tasks follow along.
  function removeLinked(kind: "milestone" | "sprint", index: number) {
    if (!plan) return;
    const field = kind === "milestone" ? "milestoneIndex" : "sprintIndex";
    const tasks = plan.tasks.map((t) => ({
      ...t,
      [field]:
        t[field] === index ? -1 : t[field] > index ? t[field] - 1 : t[field],
    }));
    if (kind === "milestone")
      update({
        milestones: plan.milestones.filter((_, i) => i !== index),
        tasks,
      });
    else update({ sprints: plan.sprints.filter((_, i) => i !== index), tasks });
  }

  if (!plan || !result)
    return (
      <form
        className="panel form-grid"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = Object.fromEntries(new FormData(e.currentTarget));
          setBusy(true);
          setError("");
          try {
            const r = await generateProjectPlan(workspaceId, f).then(unwrap);
            setResult(r);
            const firstLine = String(f.idea).split(/[.\n]/)[0].trim();
            const suggested = firstLine.slice(0, 60) || "Yeni proje";
            setName(suggested);
            setKey(suggestKey(suggested));
          } catch (err) {
            setError(errorMessage(err, "Plan oluşturulamadı. Tekrar dene."));
          } finally {
            setBusy(false);
          }
        }}
      >
        {workspaces.length > 1 && (
          <label className="field">
            Çalışma alanı
            <select
              value={workspaceId}
              onChange={(e) => setWorkspaceId(e.target.value)}
            >
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="field">
          Proje fikri
          <textarea
            name="idea"
            required
            minLength={20}
            maxLength={3000}
            style={{ minHeight: 130 }}
            placeholder="Örn. Küçük kafelerin stok ve sipariş takibini yapabileceği, mobil uyumlu bir web uygulaması. Sahip günlük satışları görmeli, personel siparişleri tabletten girmeli."
          />
          <span className="field-hint">
            Ne, kimin için ve neden? Ne kadar somut olursa plan o kadar iyi
            olur.
          </span>
        </label>
        <div className="row" style={{ flexWrap: "wrap" }}>
          <label className="field" style={{ flex: 1, minWidth: 200 }}>
            Ürün tipi
            <input
              name="productType"
              maxLength={100}
              placeholder="SaaS, mobil uygulama, iç araç…"
            />
          </label>
          <label className="field" style={{ flex: 1, minWidth: 200 }}>
            Hedef kullanıcılar
            <input
              name="targetUsers"
              maxLength={500}
              placeholder="Kafe sahipleri ve personeli"
            />
          </label>
        </div>
        <label className="field">
          Teknolojiler
          <input
            name="technologies"
            maxLength={500}
            placeholder="Next.js, PostgreSQL… (boş bırakırsan AI önerir)"
          />
        </label>
        <div className="row" style={{ flexWrap: "wrap" }}>
          <label className="field" style={{ width: 130 }}>
            Ekip (kişi)
            <input
              type="number"
              name="teamSize"
              min={1}
              max={50}
              defaultValue={2}
            />
          </label>
          <label className="field" style={{ width: 130 }}>
            Süre (hafta)
            <input
              type="number"
              name="timelineWeeks"
              min={1}
              max={52}
              defaultValue={8}
            />
          </label>
          <label className="field" style={{ flex: 1, minWidth: 160 }}>
            Karmaşıklık
            <select name="complexity" defaultValue="medium">
              <option value="low">Düşük</option>
              <option value="medium">Orta</option>
              <option value="high">Yüksek</option>
            </select>
          </label>
        </div>
        <label className="field">
          Notlar
          <textarea
            name="notes"
            maxLength={2000}
            style={{ minHeight: 70 }}
            placeholder="Kısıtlar, mevcut sistemler, öncelikler…"
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="row between">
          <span className="subtle" style={{ fontSize: 12 }}>
            Saatte en fazla 5 plan. Üretim 30–60 saniye sürebilir.
          </span>
          <Button size="lg" disabled={busy}>
            <Sparkles size={15} />
            {busy ? "Plan hazırlanıyor…" : "Planı oluştur"}
          </Button>
        </div>
      </form>
    );

  const points = plan.tasks.reduce((n, t) => n + t.estimatePoints, 0);

  return (
    <div className="stack">
      <section className="panel form-grid">
        <div className="row between">
          <h2>Proje</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (window.confirm("Bu plan silinip forma dönülsün mü?"))
                setResult(null);
            }}
          >
            <ArrowLeft size={14} /> Forma dön
          </Button>
        </div>
        <div className="row" style={{ flexWrap: "wrap" }}>
          <label className="field" style={{ flex: 2, minWidth: 220 }}>
            Proje adı
            <input
              value={name}
              maxLength={100}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="field" style={{ width: 140 }}>
            Anahtar
            <input
              value={key}
              maxLength={10}
              pattern="[A-Z][A-Z0-9]{1,9}"
              onChange={(e) => setKey(e.target.value.toUpperCase())}
            />
          </label>
          <label className="field" style={{ width: 160 }}>
            Başlangıç
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <label className="field" style={{ width: 130 }}>
            Sprint süresi
            <select
              value={sprintWeeks}
              onChange={(e) => setSprintWeeks(Number(e.target.value))}
            >
              {[1, 2, 3, 4].map((w) => (
                <option key={w} value={w}>
                  {w} hafta
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          Proje özeti
          <textarea
            value={plan.summary}
            maxLength={1500}
            onChange={(e) => update({ summary: e.target.value })}
          />
        </label>
        <label className="field">
          Teknik mimari
          <textarea
            value={plan.architecture}
            maxLength={2000}
            onChange={(e) => update({ architecture: e.target.value })}
          />
        </label>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Milestone&apos;lar ({plan.milestones.length})</h2>
        </div>
        <ul className="plan-list">
          {plan.milestones.map((m, i) => (
            <li key={i}>
              <span className="badge mono">{m.targetWeek}. hafta</span>
              <input
                aria-label={`Milestone ${i + 1}`}
                value={m.name}
                maxLength={120}
                onChange={(e) =>
                  update({
                    milestones: plan.milestones.map((x, j) =>
                      j === i ? { ...x, name: e.target.value } : x,
                    ),
                  })
                }
              />
              <RemoveButton
                label={`${m.name} milestone'unu çıkar`}
                disabled={plan.milestones.length === 1}
                onClick={() => removeLinked("milestone", i)}
              />
            </li>
          ))}
        </ul>
      </section>

      {plan.sprints.length > 0 && (
        <section className="panel">
          <div className="panel-head">
            <h2>Sprintler ({plan.sprints.length})</h2>
            <span className="subtle" style={{ fontSize: 12 }}>
              Her biri {sprintWeeks} hafta, başlangıçtan itibaren art arda
            </span>
          </div>
          <ul className="plan-list">
            {plan.sprints.map((s, i) => (
              <li key={i}>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <strong style={{ fontWeight: 500 }}>{s.name}</strong>
                  {s.goal && (
                    <span className="subtle" style={{ fontSize: 12 }}>
                      {" "}
                      · {s.goal}
                    </span>
                  )}
                </span>
                <RemoveButton
                  label={`${s.name} sprintini çıkar`}
                  onClick={() => removeLinked("sprint", i)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel">
        <div className="panel-head">
          <h2>
            Görevler ({plan.tasks.length} · {points} puan)
          </h2>
        </div>
        <ul className="plan-list">
          {plan.tasks.map((t, i) => (
            <li key={i}>
              <span className="project-key" style={{ width: 64 }}>
                {key || "KEY"}-{i + 1}
              </span>
              <input
                aria-label={`Görev ${i + 1}`}
                value={t.title}
                maxLength={200}
                onChange={(e) =>
                  update({
                    tasks: plan.tasks.map((x, j) =>
                      j === i ? { ...x, title: e.target.value } : x,
                    ),
                  })
                }
              />
              <span className={`priority ${t.priority} hide-sm`}>
                {priorityLabels[t.priority]}
              </span>
              <span className="badge mono">{t.estimatePoints}p</span>
              <span
                className="subtle hide-sm"
                style={{ fontSize: 11, width: 110 }}
              >
                {plan.milestones[t.milestoneIndex]?.name ?? "—"}
              </span>
              <RemoveButton
                label={`${t.title} görevini çıkar`}
                disabled={plan.tasks.length === 1}
                onClick={() =>
                  update({ tasks: plan.tasks.filter((_, j) => j !== i) })
                }
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="panel plan-sections">
        {listSections.map(([field, title]) =>
          plan[field].length ? (
            <details key={field} open={field === "goals" || field === "risks"}>
              <summary>
                {title} <span className="subtle">({plan[field].length})</span>
              </summary>
              <ul>
                {plan[field].map((item, i) => (
                  <li key={i}>
                    <span>{item}</span>
                    <RemoveButton
                      label="Maddeyi çıkar"
                      onClick={() =>
                        update({
                          [field]: plan[field].filter((_, j) => j !== i),
                        })
                      }
                    />
                  </li>
                ))}
              </ul>
            </details>
          ) : null,
        )}
      </section>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="panel row between" style={{ flexWrap: "wrap" }}>
        <p className="muted" style={{ fontSize: 13, maxWidth: 520 }}>
          Onayladığında proje; {plan.milestones.length} milestone,{" "}
          {plan.sprints.length} sprint ve {plan.tasks.length} görevle tek
          seferde oluşturulur. Plan metnin bu üretim kaydında saklanır.
        </p>
        <Button
          size="lg"
          disabled={
            busy ||
            name.trim().length < 2 ||
            !/^[A-Z][A-Z0-9]{1,9}$/.test(key) ||
            plan.tasks.some((t) => !t.title.trim()) ||
            plan.milestones.some((m) => !m.name.trim())
          }
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              const id = await createProjectFromPlan({
                generationId: result.generationId,
                workspaceId,
                name,
                key,
                startDate,
                sprintWeeks,
                plan,
              }).then(unwrap);
              router.push(`/app/projects/${id}/board`);
              router.refresh();
            } catch (err) {
              setError(errorMessage(err, "Proje oluşturulamadı."));
              setBusy(false);
            }
          }}
        >
          {busy ? "Oluşturuluyor…" : "Onayla ve projeyi oluştur"}
        </Button>
      </div>
    </div>
  );
}

function RemoveButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="icon-button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      <X size={14} />
    </button>
  );
}
