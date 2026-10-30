import { z } from "zod";
export const taskInput = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(10000).default(""),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  status: z
    .enum(["backlog", "todo", "in_progress", "review", "done"])
    .default("backlog"),
});
export const generatedTasks = z.object({
  tasks: z.array(taskInput).min(1).max(15),
});
export const projectInput = z.object({
  workspaceId: z.uuid(),
  name: z.string().trim().min(2).max(100),
  key: z.string().regex(/^[A-Z][A-Z0-9]{1,9}$/),
  description: z.string().max(5000).default(""),
});
