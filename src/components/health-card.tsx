import type { Health, HealthLevel } from "@/features/health/score";

const levelLabels: Record<HealthLevel, string> = {
  healthy: "Sağlıklı",
  warning: "Dikkat",
  risk: "Risk",
};

export function HealthCard({
  health,
  history,
}: {
  health: Health;
  history: { day: string; score: number }[];
}) {
  // Oldest first for the sparkline; one point per stored day.
  const points = [...history].reverse();
  return (
    <section className="panel health-card" aria-labelledby="health-title">
      <div className="panel-head">
        <h2 id="health-title">Proje sağlığı</h2>
        <span className={`badge health-${health.level}`}>
          <span className="dot" /> {levelLabels[health.level]}
        </span>
      </div>
      <div className="health-score">
        <strong>{health.score}</strong>
        <span className="subtle">/ 100</span>
        {points.length > 1 && <Sparkline points={points.map((p) => p.score)} />}
      </div>
      <ul className="health-factors">
        {health.factors.map((f) => (
          <li key={f.key} className={`health-${f.level}`}>
            <span className="dot" aria-hidden />
            <span>
              <strong>{f.label}</strong>
              <span className="muted">{f.detail}</span>
            </span>
            <span className="mono subtle" title="Skordan düşülen puan">
              {f.penalty ? `−${f.penalty}` : "0"}
            </span>
          </li>
        ))}
      </ul>
      <p className="subtle" style={{ fontSize: 12 }}>
        Skor 100&apos;den başlar; her faktör açıklanan kurallara göre puan
        düşürür. AI bu sayıyı üretmez.
      </p>
    </section>
  );
}

function Sparkline({ points }: { points: number[] }) {
  const w = 96;
  const h = 28;
  const step = w / (points.length - 1);
  const d = points
    .map(
      (p, i) =>
        `${i ? "L" : "M"}${(i * step).toFixed(1)},${(h - (p / 100) * h).toFixed(1)}`,
    )
    .join(" ");
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={`Son ${points.length} günün skoru`}
      style={{ marginLeft: "auto" }}
    >
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth="1.5" />
    </svg>
  );
}
