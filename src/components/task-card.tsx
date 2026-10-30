import type { Task, Label } from "@/server/db/schema";
export function TaskCardContent({
  task,
  projectKey,
  assignee,
  labels = [],
}: {
  task: Pick<Task, "number" | "title" | "priority"> &
    Partial<Pick<Task, "dueDate" | "estimatePoints">>;
  projectKey: string;
  assignee?: string;
  labels?: Label[];
}) {
  return (
    <>
      <span className="project-key">
        {projectKey}-{task.number}
      </span>
      <h3>{task.title}</h3>
      {labels.length > 0 && (
        <div className="row" style={{ gap: 4, flexWrap: "wrap" }}>
          {labels.map((l) => (
            <span
              key={l.id}
              className="badge"
              style={{ borderColor: l.color, color: l.color }}
            >
              {l.name}
            </span>
          ))}
        </div>
      )}
      <div className="row between">
        <span className={`priority ${task.priority}`}>{task.priority}</span>
        <span className="row" style={{ gap: 6 }}>
          {task.estimatePoints != null && (
            <span className="badge" title="Tahmini puan">
              {task.estimatePoints} p
            </span>
          )}
          {task.dueDate && (
            <span className="badge" title="Son tarih">
              {task.dueDate.slice(5).split("-").reverse().join(".")}
            </span>
          )}
          {assignee && (
            <span className="avatar" title={assignee}>
              {assignee.charAt(0).toUpperCase()}
            </span>
          )}
        </span>
      </div>
    </>
  );
}
