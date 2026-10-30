"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { generateDevSummary } from "@/server/github/ai-actions";
import { unwrap, errorMessage } from "@/lib/action-result";
import { Button } from "@/components/ui/button";

type Summary = {
  areas: { name: string; status: string }[];
  recommendation: string;
  caveats: string;
  counts: { commits: number; pullRequests: number; tasks: number };
  createdAt: string;
};

const timeFormat = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Istanbul",
});

export function DevSummaryPanel({
  projectId,
  summary,
  canGenerate,
}: {
  projectId: string;
  summary: Summary | null;
  canGenerate: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Geliştirme özeti</h2>
        {canGenerate && (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await generateDevSummary(projectId).then(unwrap);
                router.refresh();
              } catch (e) {
                setError(errorMessage(e, "Özet oluşturulamadı."));
              } finally {
                setBusy(false);
              }
            }}
          >
            <Sparkles size={13} />
            {busy ? "Hazırlanıyor…" : summary ? "Yenile" : "Son 7 günü özetle"}
          </Button>
        )}
      </div>
      {error && (
        <p className="error" role="alert" style={{ marginBottom: 10 }}>
          {error}
        </p>
      )}
      {summary ? (
        <div className="stack" style={{ gap: 12 }}>
          <p className="subtle" style={{ fontSize: 12 }}>
            {timeFormat.format(new Date(summary.createdAt))} · son 7 gün ·{" "}
            {summary.counts.commits} commit, {summary.counts.pullRequests} PR,{" "}
            {summary.counts.tasks} bağlı görev üzerinden
          </p>
          <dl className="dev-areas">
            {summary.areas.map((a) => (
              <div key={a.name}>
                <dt>{a.name}</dt>
                <dd>{a.status}</dd>
              </div>
            ))}
          </dl>
          {summary.recommendation && (
            <div className="ai-note" style={{ margin: 0 }}>
              <strong>Önerilen sonraki adım</strong>
              {summary.recommendation}
            </div>
          )}
          {summary.caveats && (
            <p className="subtle" style={{ fontSize: 12 }}>
              {summary.caveats}
            </p>
          )}
        </div>
      ) : (
        <p className="muted" style={{ fontSize: 13 }}>
          Bağlı repolardaki commit, PR ve CI sonuçlarından alan bazında bir özet
          çıkarılır. Yalnızca GitHub&apos;dan gelen veriler kullanılır.
        </p>
      )}
    </section>
  );
}
