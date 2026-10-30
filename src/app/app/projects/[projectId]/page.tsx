import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser, projectData } from "@/server/projects/service";
import { ProjectTabs } from "@/components/project-tabs";
import { Button } from "@/components/ui/button";
export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  if (!z.uuid().safeParse(projectId).success) notFound();
  const user = await requireUser();
  const { project, tasks, events } = await projectData(projectId, user.id);
  const done = tasks.filter((t) => t.status === "done").length;
  const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  return (
    <>
      <header className="page-heading">
        <div>
          <span className="project-key">{project.key}</span>
          <h1 style={{ marginTop: 8 }}>{project.name}</h1>
          <p className="muted">
            {project.description || "Projenin ilk adımını planlamaya başla."}
          </p>
        </div>
        <Button asChild>
          <Link href={`/app/projects/${project.id}/board`}>Kanban’ı aç →</Link>
        </Button>
      </header>
      <ProjectTabs id={project.id} />
      <div className="stack">
        <div className="stats">
          <div className="panel stat">
            <span className="muted">Toplam görev</span>
            <strong>{tasks.length}</strong>
          </div>
          <div className="panel stat">
            <span className="muted">Devam eden</span>
            <strong>
              {tasks.filter((t) => t.status === "in_progress").length}
            </strong>
          </div>
          <div className="panel stat">
            <span className="muted">Tamamlandı</span>
            <strong>{done}</strong>
          </div>
        </div>
        <div className="panel stack">
          <div className="row between">
            <h2>Proje ilerlemesi</h2>
            <span>{progress}%</span>
          </div>
          <div className="progress">
            <span style={{ width: `${progress}%` }} />
          </div>
          <p className="muted">
            {done} / {tasks.length} görev tamamlandı. Bu oran görev sayısından
            hesaplanır.
          </p>
        </div>
        <div className="panel">
          <h2>Son hareketler</h2>
          {events.length ? (
            events.map((e) => (
              <div className="activity-item" key={e.id}>
                {e.message}
                <time>
                  {e.createdAt.toLocaleString("tr-TR", {
                    timeZone: "Europe/Istanbul",
                  })}
                </time>
              </div>
            ))
          ) : (
            <p className="muted" style={{ marginTop: 15 }}>
              Görev oluşturduğunda proje hareketleri burada görünecek.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
