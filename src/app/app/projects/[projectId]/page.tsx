import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser, projectData } from "@/server/projects/service";
import { projectHealth, healthHistory } from "@/server/insights/service";
import { ProjectHeader } from "@/components/project-header";
import { HealthCard } from "@/components/health-card";
import { Button } from "@/components/ui/button";

const timeFormat = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Istanbul",
});

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  if (!z.uuid().safeParse(projectId).success) notFound();
  const user = await requireUser();
  const data = await projectData(projectId, user.id);
  const [health, history] = await Promise.all([
    projectHealth(projectId),
    healthHistory(projectId),
  ]);
  const { project, tasks, events } = data;
  const done = tasks.filter((t) => t.status === "done").length;
  const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const activeSprint = data.sprints.find((s) => s.status === "active");
  return (
    <>
      <ProjectHeader
        project={project}
        active=""
        subtitle={
          project.description || "Projenin ilk adımını planlamaya başla."
        }
        actions={
          <Button asChild>
            <Link href={`/app/projects/${project.id}/board`}>
              Kanban&apos;ı aç
            </Link>
          </Button>
        }
      />
      <div className="stack">
        <div className="stats">
          <div className="panel stat">
            <span className="stat-label">İlerleme</span>
            <strong>%{progress}</strong>
            <small>
              {done}/{tasks.length} görev tamamlandı
            </small>
          </div>
          <div className="panel stat">
            <span className="stat-label">Devam eden</span>
            <strong>
              {tasks.filter((t) => t.status === "in_progress").length}
            </strong>
            <small>
              {tasks.filter((t) => t.status === "review").length} incelemede
            </small>
          </div>
          <div className="panel stat">
            <span className="stat-label">Aktif sprint</span>
            <strong style={{ fontSize: 20, marginTop: 12 }}>
              {activeSprint?.name ?? "Yok"}
            </strong>
            <small>
              <Link
                href={`/app/projects/${project.id}/sprints`}
                className="text-link"
              >
                Sprintleri gör
              </Link>
            </small>
          </div>
        </div>
        <div className="dash-grid">
          <HealthCard health={health} history={history} />
          <section className="panel">
            <div className="panel-head">
              <h2>Son hareketler</h2>
            </div>
            {events.length ? (
              events.map((e) => (
                <div className="activity-item" key={e.id}>
                  {e.message}
                  <time dateTime={e.createdAt.toISOString()}>
                    {timeFormat.format(e.createdAt)}
                    {e.source === "ai" && " · AI"}
                  </time>
                </div>
              ))
            ) : (
              <p className="muted" style={{ marginTop: 8 }}>
                Görev oluşturduğunda proje hareketleri burada görünecek.
              </p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
