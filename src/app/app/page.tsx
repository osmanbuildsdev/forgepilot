import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, FolderKanban, CircleCheck } from "lucide-react";
import {
  requireUser,
  projectSummaries,
  myOpenTasks,
  userWorkspaces,
} from "@/server/projects/service";
import { Button } from "@/components/ui/button";
import { TaskRow } from "@/components/task-row";

export default async function Page() {
  const user = await requireUser();
  const [spaces, projects, mine] = await Promise.all([
    userWorkspaces(user.id),
    projectSummaries(user.id),
    myOpenTasks(user.id, 8),
  ]);
  if (!spaces.length) redirect("/onboarding");
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const overdue = projects.reduce((n, p) => n + p.overdue, 0);
  const open = projects.reduce((n, p) => n + p.total - p.done, 0);
  return (
    <div className="stack">
      <header className="page-heading">
        <div>
          <span className="eyebrow">
            {now.toLocaleDateString("tr-TR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              timeZone: "Europe/Istanbul",
            })}
          </span>
          <h1 style={{ marginTop: 4 }}>Merhaba, {user.name.split(" ")[0]}</h1>
          <p className="muted">
            {mine.length
              ? `Sana atanmış ${mine.length} açık görev var.`
              : "Sana atanmış açık görev yok."}
          </p>
        </div>
        <Button asChild>
          <Link href="/app/projects/new">
            <Plus size={15} />
            Yeni proje
          </Link>
        </Button>
      </header>

      <div className="stats">
        <div className="panel stat">
          <span className="stat-label">Aktif projeler</span>
          <strong>{projects.length}</strong>
          <small>{spaces.length} çalışma alanında</small>
        </div>
        <div className="panel stat">
          <span className="stat-label">Açık görevler</span>
          <strong>{open}</strong>
          <small>tüm projelerde</small>
        </div>
        <div className="panel stat">
          <span className="stat-label">Geciken</span>
          <strong className={overdue ? "overdue" : ""}>{overdue}</strong>
          <small>son tarihi geçmiş ve bitmemiş</small>
        </div>
      </div>

      <div className="dash-grid">
        <section className="panel">
          <div className="panel-head">
            <h2>Görevlerim</h2>
            <Link href="/app/tasks">Tümü</Link>
          </div>
          {mine.length ? (
            <ul className="task-list">
              {mine.map((m) => (
                <TaskRow
                  key={m.task.id}
                  task={m.task}
                  projectId={m.projectId}
                  projectKey={m.projectKey}
                  today={today}
                />
              ))}
            </ul>
          ) : (
            <div className="empty" style={{ padding: "36px 16px" }}>
              <CircleCheck size={22} />
              <p className="muted">
                Sana atanmış açık görev yok. Bir görevi üstlenmek için görev
                formundan kendini ata.
              </p>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Projeler</h2>
            <Link href="/app/projects">Tümü</Link>
          </div>
          {projects.length ? (
            projects.slice(0, 6).map((p) => {
              const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
              return (
                <Link
                  key={p.id}
                  href={`/app/projects/${p.id}`}
                  className="project-line"
                >
                  <div className="row between">
                    <span className="row" style={{ gap: 8, minWidth: 0 }}>
                      <span className="project-chip">{p.key.slice(0, 2)}</span>
                      <strong className="truncate" style={{ fontWeight: 500 }}>
                        {p.name}
                      </strong>
                    </span>
                    <span className="subtle" style={{ fontSize: 12 }}>
                      {p.done}/{p.total}
                      {p.overdue > 0 && (
                        <span className="overdue"> · {p.overdue} geciken</span>
                      )}
                    </span>
                  </div>
                  <div className="progress">
                    <span style={{ width: `${pct}%` }} />
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="empty" style={{ padding: "36px 16px" }}>
              <FolderKanban size={22} />
              <p className="muted">İlk projeni oluşturarak başla.</p>
              <Button size="sm" asChild>
                <Link href="/app/projects/new">Proje oluştur</Link>
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
