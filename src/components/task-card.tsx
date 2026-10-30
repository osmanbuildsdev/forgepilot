import type { Task } from "@/server/db/schema";
export function TaskCardContent({
  task,
  projectKey,
}: {
  task: Pick<Task, "number" | "title" | "priority">;
  projectKey: string;
}) {
  return (
    <>
      <span className="project-key">
        {projectKey}-{task.number}
      </span>
      <h3>{task.title}</h3>
      <div className="row between">
        <span className={`priority ${task.priority}`}>{task.priority}</span>
        <span className="badge">Görev</span>
      </div>
    </>
  );
}
