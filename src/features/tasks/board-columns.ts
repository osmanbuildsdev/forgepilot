import type { Task } from "@/server/db/schema";

export const statuses = [
  ["backlog", "Backlog"],
  ["todo", "Yapılacak"],
  ["in_progress", "Devam ediyor"],
  ["review", "İnceleme"],
  ["done", "Tamamlandı"],
] as const;
export type Status = (typeof statuses)[number][0];
export type BoardColumn = {
  id: string;
  name: string;
  status: Status;
  custom: boolean;
};

// Without custom columns the board shows one column per status.
export const defaultColumns: BoardColumn[] = statuses.map(([status, name]) => ({
  id: status,
  name,
  status,
  custom: false,
}));

// A task sits in its own column when that column still matches its status,
// otherwise in the first column of its status.
export function columnOf(
  task: Pick<Task, "columnId" | "status">,
  columns: BoardColumn[],
) {
  return (
    columns.find((c) => c.id === task.columnId && c.status === task.status) ??
    columns.find((c) => c.status === task.status)
  );
}
