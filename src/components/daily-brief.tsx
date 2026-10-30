import Link from "next/link";
import {
  CheckCircle2,
  CircleDot,
  CalendarClock,
  Lock,
  TriangleAlert,
} from "lucide-react";
import type { DailyBrief } from "@/server/insights/service";
import type { BriefNarrative } from "@/features/ai/plan-schema";
import { BriefNarrativeButton } from "@/features/ai/brief-narrative-button";

type Item = DailyBrief["completed"][number] | DailyBrief["inProgress"][number];

function Section({
  title,
  icon,
  items,
  empty,
}: {
  title: string;
  icon: React.ReactNode;
  items: Item[];
  empty: string;
}) {
  return (
    <div className="brief-section">
      <h3>
        {icon} {title}
        {items.length > 0 && <span className="subtle"> {items.length}</span>}
      </h3>
      {items.length ? (
        <ul>
          {items.map((t) => (
            <li key={t.id}>
              <Link href={`/app/projects/${t.projectId}/board`}>
                <span className="project-key">
                  {t.projectKey}-{t.number}
                </span>{" "}
                {t.title}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="subtle">{empty}</p>
      )}
    </div>
  );
}

export function DailyBriefPanel({
  brief,
  narrative,
  aiEnabled,
}: {
  brief: DailyBrief;
  narrative: BriefNarrative | null;
  aiEnabled: boolean;
}) {
  return (
    <section className="panel daily-brief" aria-labelledby="brief-title">
      <div className="panel-head">
        <h2 id="brief-title">Günlük özet</h2>
        {!narrative && aiEnabled && <BriefNarrativeButton />}
      </div>
      {narrative && (
        <div className="ai-note" style={{ margin: "0 0 16px" }}>
          <strong>AI özeti</strong>
          <p>{narrative.headline}</p>
          {narrative.focus.length > 0 && (
            <ul>
              {narrative.focus.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          )}
          {narrative.watch.length > 0 && (
            <p className="subtle" style={{ marginTop: 6 }}>
              Dikkat: {narrative.watch.join(" · ")}
            </p>
          )}
        </div>
      )}
      <div className="brief-grid">
        <Section
          title="Son 24 saatte tamamlanan"
          icon={<CheckCircle2 size={14} />}
          items={brief.completed}
          empty="Son 24 saatte tamamlanan görev yok."
        />
        <Section
          title="Üzerinde çalıştıkların"
          icon={<CircleDot size={14} />}
          items={brief.inProgress}
          empty="Devam eden görevin yok."
        />
        <Section
          title="Bugün ve geciken"
          icon={<CalendarClock size={14} />}
          items={brief.dueNow}
          empty="Bugün son tarihi olan görevin yok."
        />
        <Section
          title="Engelli"
          icon={<Lock size={14} />}
          items={brief.blocked}
          empty="Bekleyen görevin yok."
        />
      </div>
      {brief.risks.length > 0 && (
        <div className="brief-section" style={{ marginTop: 8 }}>
          <h3>
            <TriangleAlert size={14} /> Riskler
          </h3>
          <ul>
            {brief.risks.slice(0, 6).map((r, i) => (
              <li key={i} className={`health-${r.level}`}>
                <Link href={`/app/projects/${r.projectId}`}>
                  <strong style={{ fontWeight: 500 }}>{r.projectName}:</strong>{" "}
                  {r.detail}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
