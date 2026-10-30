import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { requireUser } from "@/server/projects/service";
import { RANGES, reportData, type Range } from "@/server/reports/queries";
import { ColumnChart, BarList } from "@/features/reports/charts";
import { ReportFilters } from "@/features/reports/report-filters";
import { priorityLabels } from "@/components/task-card";

export const metadata: Metadata = { title: "Raporlar" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; days?: string }>;
}) {
  const user = await requireUser();
  const query = await searchParams;
  const days = (RANGES as readonly number[]).includes(Number(query.days))
    ? (Number(query.days) as Range)
    : 30;
  const data = await reportData(user.id, {
    projectId: query.project ?? null,
    days,
  });
  const projectId = data.projects.some((p) => p.id === query.project)
    ? query.project!
    : "";

  return (
    <div className="stack">
      <header className="page-heading" style={{ marginBottom: 0 }}>
        <div>
          <h1>Raporlar</h1>
          <p className="muted">
            İlerleme, hız, iş yükü ve GitHub hareketi. Sayılar doğrudan proje
            verilerinden hesaplanır.
          </p>
        </div>
      </header>
      <ReportFilters
        projects={data.projects}
        projectId={projectId}
        days={days}
      />

      {!data.totals ? (
        <div className="empty">
          <BarChart3 size={22} />
          <p className="muted">Rapor için önce bir proje oluştur.</p>
        </div>
      ) : (
        <>
          <div
            className="stats"
            style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}
          >
            <div className="panel stat">
              <span className="stat-label">Tamamlanan</span>
              <strong>{data.totals.completed}</strong>
              <small>
                son {days} günde · {data.totals.completedPoints} puan
              </small>
            </div>
            <div className="panel stat">
              <span className="stat-label">Açılan</span>
              <strong>{data.totals.created}</strong>
              <small>son {days} günde</small>
            </div>
            <div className="panel stat">
              <span className="stat-label">Geciken</span>
              <strong className={data.totals.overdue ? "overdue" : ""}>
                {data.totals.overdue}
              </strong>
              <small>{data.totals.open} açık görevden</small>
            </div>
            <div className="panel stat">
              <span className="stat-label">Ortalama hız</span>
              <strong>{data.totals.velocity ?? "—"}</strong>
              <small>
                {data.totals.velocity === null
                  ? "bu aralıkta tamamlanan sprint yok"
                  : "tamamlanan sprint başına puan"}
              </small>
            </div>
          </div>

          <section className="panel">
            <div className="panel-head">
              <h2>Haftalık ilerleme</h2>
              <span className="subtle" style={{ fontSize: 12 }}>
                görev sayısı, hafta başına
              </span>
            </div>
            <ColumnChart
              data={data.weeks}
              xKey="week"
              xLabel="Hafta"
              xFormat="week"
              series={[
                { key: "created", label: "Açılan", color: "series-2" },
                { key: "completed", label: "Tamamlanan", color: "series-1" },
              ]}
            />
          </section>

          <div className="dash-grid">
            <section className="panel">
              <div className="panel-head">
                <h2>Sprint tamamlama</h2>
                <span className="subtle" style={{ fontSize: 12 }}>
                  puan
                </span>
              </div>
              {data.sprints.length ? (
                <ColumnChart
                  data={data.sprints}
                  xKey="name"
                  xLabel="Sprint"
                  series={[
                    {
                      key: "committed",
                      label: "Taahhüt edilen",
                      color: "series-2",
                    },
                    {
                      key: "completed",
                      label: "Tamamlanan",
                      color: "series-1",
                    },
                  ]}
                />
              ) : (
                <p className="subtle">Bu aralıkta tamamlanan sprint yok.</p>
              )}
            </section>
            <section className="panel">
              <div className="panel-head">
                <h2>Ekip iş yükü</h2>
                <span className="subtle" style={{ fontSize: 12 }}>
                  açık görev
                </span>
              </div>
              {data.workload.length ? (
                <BarList
                  data={data.workload.map((w) => ({
                    name: w.name,
                    open: w.open,
                  }))}
                  labelKey="name"
                  labelHeader="Kişi"
                  series={{
                    key: "open",
                    label: "Açık görev",
                    color: "series-1",
                  }}
                />
              ) : (
                <p className="subtle">Açık görev yok.</p>
              )}
            </section>
          </div>

          <section className="panel">
            <div className="panel-head">
              <h2>GitHub hareketi</h2>
              <span className="subtle" style={{ fontSize: 12 }}>
                hafta başına
              </span>
            </div>
            {data.github ? (
              <ColumnChart
                data={data.weeks}
                xKey="week"
                xLabel="Hafta"
                xFormat="week"
                series={[
                  { key: "commits", label: "Commit", color: "series-1" },
                  { key: "merged", label: "Birleşen PR", color: "series-2" },
                ]}
              />
            ) : (
              <p className="subtle">
                Bu projelere bağlı repo yok.{" "}
                <Link href="/app/github" className="text-link">
                  GitHub&apos;ı bağla
                </Link>
              </p>
            )}
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Geciken görevler</h2>
            </div>
            {data.overdue.length ? (
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Görev</th>
                    <th>Son tarih</th>
                    <th>Öncelik</th>
                    <th>Atanan</th>
                  </tr>
                </thead>
                <tbody>
                  {data.overdue.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <Link href={`/app/projects/${t.projectId}/board`}>
                          <span className="project-key">
                            {t.projectKey}-{t.number}
                          </span>{" "}
                          {t.title}
                        </Link>
                      </td>
                      <td className="overdue">{t.dueDate}</td>
                      <td>{priorityLabels[t.priority]}</td>
                      <td>{t.assignee ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="subtle">Geciken görev yok.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
