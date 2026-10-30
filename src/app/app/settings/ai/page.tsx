import type { Metadata } from "next";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { aiGenerations } from "@/server/db/schema";
import { requireUser } from "@/server/projects/service";

export const metadata: Metadata = { title: "AI" };

const kinds: Record<string, { label: string; limit: string }> = {
  project_plan: { label: "Proje planı", limit: "saatte 5" },
  doc_edit: { label: "Doküman düzenleme", limit: "saatte 20" },
  copilot: { label: "Copilot", limit: "saatte 30" },
  sprint_plan: { label: "Sprint planı", limit: "saatte 10" },
  dev_summary: { label: "Geliştirme özeti", limit: "saatte 10" },
  daily_brief: { label: "Günlük özet", limit: "günde 1 (önbellekli)" },
};

export default async function Page() {
  const user = await requireUser();
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const usage = await db
    .select({
      kind: aiGenerations.kind,
      total: sql<number>`count(*)::int`,
      applied: sql<number>`count(*) filter (where ${aiGenerations.status} = 'applied')::int`,
      failed: sql<number>`count(*) filter (where ${aiGenerations.status} = 'failed')::int`,
    })
    .from(aiGenerations)
    .where(
      and(
        eq(aiGenerations.userId, user.id),
        gte(aiGenerations.createdAt, start),
      ),
    )
    .groupBy(aiGenerations.kind);
  const enabled = Boolean(process.env.GEMINI_API_KEY);
  return (
    <div className="stack">
      <section className="panel stack" style={{ gap: 8 }}>
        <h2>Nasıl çalışır</h2>
        <ul className="check-list" style={{ marginTop: 4, fontSize: 13 }}>
          <li>
            AI önerir; görev, doküman ve sprint değişiklikleri sen onaylamadan
            uygulanmaz.
          </li>
          <li>
            Proje bilgileri veritabanından verilir; sağlık skoru ve kapasite
            AI&apos;a hesaplatılmaz.
          </li>
          <li>
            AI&apos;ın uydurduğu görev, PR veya sprint referansları sunucuda
            elenir.
          </li>
          <li>
            Her istek kaydedilir; aşağıda bu ayki kullanımını görebilirsin.
          </li>
        </ul>
        {!enabled && (
          <p className="muted" style={{ fontSize: 13 }}>
            Bu sunucuda <code>GEMINI_API_KEY</code> tanımlı değil; AI
            özellikleri kapalı.
          </p>
        )}
      </section>
      <section className="panel">
        <div className="panel-head">
          <h2>Bu ayki kullanımın</h2>
        </div>
        <table className="report-table">
          <thead>
            <tr>
              <th>Özellik</th>
              <th>İstek</th>
              <th>Uygulanan</th>
              <th>Başarısız</th>
              <th>Sınır</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(kinds).map(([kind, meta]) => {
              const row = usage.find((u) => u.kind === kind);
              return (
                <tr key={kind}>
                  <td>{meta.label}</td>
                  <td>{row?.total ?? 0}</td>
                  <td>{row?.applied ?? 0}</td>
                  <td>{row?.failed ?? 0}</td>
                  <td className="subtle">{meta.limit}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="subtle" style={{ fontSize: 12, marginTop: 10 }}>
          Görev önerileri (saatte 10) ayrıca sayılır ve bu tabloda yer almaz.
        </p>
      </section>
    </div>
  );
}
