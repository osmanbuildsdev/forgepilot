import type { Metadata } from "next";
import { CircleCheck } from "lucide-react";
import { requireUser, myOpenTasks } from "@/server/projects/service";
import { TaskRow } from "@/components/task-row";

export const metadata: Metadata = { title: "Görevlerim" };

export default async function Page() {
  const user = await requireUser();
  const mine = await myOpenTasks(user.id, 200);
  const today = new Date().toISOString().slice(0, 10);
  const overdue = mine.filter(
    (m) => m.task.dueDate !== null && m.task.dueDate < today,
  ).length;
  return (
    <div className="stack">
      <header className="page-heading">
        <div>
          <h1>Görevlerim</h1>
          <p className="muted">
            Sana atanmış, henüz tamamlanmamış görevler. Önce aciliyete, sonra
            son tarihe göre sıralı.
          </p>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <span className="badge">{mine.length} açık</span>
          {overdue > 0 && (
            <span className="badge overdue">{overdue} geciken</span>
          )}
        </div>
      </header>
      <section className="panel">
        {mine.length ? (
          <ul className="task-list">
            {mine.map((m) => (
              <TaskRow
                key={m.task.id}
                task={m.task}
                projectId={m.projectId}
                projectKey={m.projectKey}
                projectName={m.projectName}
                today={today}
              />
            ))}
          </ul>
        ) : (
          <div className="empty">
            <CircleCheck size={24} />
            <h2>Açık görevin yok.</h2>
            <p className="muted">
              Projelerdeki görevlere kendini atadığında burada listelenir.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
