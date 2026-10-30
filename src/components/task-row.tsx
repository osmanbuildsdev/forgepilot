import Link from "next/link";
import type { Task } from "@/server/db/schema";
import { priorityLabels } from "./task-card";

const statusLabels: Record<Task["status"], string> = {
  backlog: "Backlog",
  todo: "Yapılacak",
  in_progress: "Devam ediyor",
  review: "İnceleme",
  done: "Tamamlandı",
};

export function TaskRow({
  task,
  projectId,
  projectKey,
  projectName,
  today,
}: {
  task: Task;
  projectId: string;
  projectKey: string;
  projectName?: string;
  today: string;
}) {
  const late = task.dueDate !== null && task.dueDate < today;
  return (
    <li>
      <Link
        className="task-row"
        href={`/app/projects/${projectId}/board`}
        title={`${projectKey}-${task.number} · ${task.title}`}
      >
        <span className="project-key">
          {projectKey}-{task.number}
        </span>
        <span className="truncate">
          {task.title}
          {projectName && <span className="subtle"> · {projectName}</span>}
        </span>
        <span className="meta">
          <span className={`priority ${task.priority}`}>
            {priorityLabels[task.priority]}
          </span>
          <span className="hide-sm">{statusLabels[task.status]}</span>
          {task.dueDate && (
            <span className={late ? "overdue" : ""}>
              {task.dueDate.slice(5).split("-").reverse().join(".")}
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}
