import type { Task } from "@/server/db/schema";
export function TaskCardContent({
  task,
  projectKey,
  assignee,
}: {
  task: Pick<Task, "number" | "title" | "priority"> &
    Partial<Pick<Task, "dueDate" | "estimatePoints">>;
  projectKey: string;
  assignee?: string;
}) {
  return (
    <>
      <span className="project-key">
        {projectKey}-{task.number}
      </span>
      <h3>{task.title}</h3>
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
