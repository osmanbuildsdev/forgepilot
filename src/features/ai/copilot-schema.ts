import { z } from "zod";

// Flat shapes (no unions) so the schema converts cleanly for structured
// output. Unused fields are sent as empty values and ignored by the server.
export const copilotReply = z.object({
  answer: z.string().max(6000),
  references: z
    .array(
      z.object({
        kind: z.enum(["task", "pull_request", "milestone", "sprint"]),
        // Task or PR number, or the milestone/sprint name.
        ref: z.string().max(200),
      }),
    )
    .max(20),
  actions: z
    .array(
      z.object({
        type: z.enum([
          "create_task",
          "update_priority",
          "add_to_sprint",
          "open_task",
        ]),
        taskNumber: z.number().int(),
        title: z.string().max(200),
        description: z.string().max(4000),
        priority: z.enum(["low", "medium", "high", "urgent"]),
        sprintName: z.string().max(80),
      }),
    )
    .max(6),
});
export type CopilotReply = z.infer<typeof copilotReply>;

export const copilotQuestion = z.object({
  question: z.string().trim().min(2).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(6000),
      }),
    )
    .max(8)
    .default([]),
});

// What the client receives: every reference and action is resolved to a real
// object in the project; anything the AI made up has been dropped.
export type CopilotAction =
  | {
      type: "create_task";
      title: string;
      description: string;
      priority: "low" | "medium" | "high" | "urgent";
    }
  | {
      type: "update_priority";
      taskId: string;
      label: string;
      priority: "low" | "medium" | "high" | "urgent";
    }
  | {
      type: "add_to_sprint";
      taskId: string;
      label: string;
      sprintId: string;
      sprintName: string;
    }
  | { type: "open_task"; label: string; href: string };

export type CopilotReference = {
  kind: string;
  label: string;
  href: string;
  external?: boolean;
};
