import { ListChecks, Lock } from "lucide-react";
import type { Task, Label } from "@/server/db/schema";

export const priorityLabels: Record<Task["priority"], string> = {
  low: "Düşük",
  medium: "Normal",
  high: "Yüksek",
  urgent: "Acil",
};

export function TaskCardContent({
  task,
  projectKey,
  assignee,
  labels = [],
  checklist,
  blocked = 0,
}: {
  task: Pick<Task, "number" | "title" | "priority"> &
    Partial<Pick<Task, "dueDate" | "estimatePoints">>;
  projectKey: string;
  assignee?: string;
  labels?: Pick<Label, "id" | "name" | "color">[];
  checklist?: { done: number; total: number };
  blocked?: number;
}) {
  return (
    <>
      <span className="project-key">
        {projectKey}-{task.number}
      </span>
      <h3>{task.title}</h3>
      {labels.length > 0 && (
        <div
          className="row"
          style={{ gap: 4, flexWrap: "wrap", marginBottom: 10 }}
        >
          {labels.map((l) => (
            <span key={l.id} className="badge">
              <span className="dot" style={{ color: l.color }} />
              {l.name}
            </span>
          ))}
        </div>
      )}
      <div className="row between">
        <span className={`priority ${task.priority}`}>
          {priorityLabels[task.priority]}
        </span>
        <span className="row" style={{ gap: 6 }}>
          {blocked > 0 && (
            <span
              className="badge blocked"
              title={`${blocked} açık görevi bekliyor`}
            >
              <Lock size={10} /> Engelli
            </span>
          )}
          {checklist && checklist.total > 0 && (
            <span className="badge" title="Alt görevler">
              <ListChecks size={11} /> {checklist.done}/{checklist.total}
            </span>
          )}
          {task.estimatePoints != null && (
            <span className="badge mono" title="Tahmini puan">
              {task.estimatePoints}p
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
