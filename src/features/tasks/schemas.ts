import { z } from "zod";
// Fields the AI is allowed to propose; kept free of transforms so it can be
// converted to a JSON schema for structured output.
export const aiTaskInput = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(10000).default(""),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  status: z
    .enum(["backlog", "todo", "in_progress", "review", "done"])
    .default("backlog"),
});
const emptyToNull = (v: unknown) => (v === "" || v === undefined ? null : v);
export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => !Number.isNaN(Date.parse(v)), "Geçersiz tarih");
const optionalId = z.preprocess(emptyToNull, z.uuid().nullable());
export const taskInput = aiTaskInput.extend({
  assigneeId: z.preprocess(emptyToNull, z.string().min(1).nullable()),
  dueDate: z.preprocess(emptyToNull, isoDate.nullable()),
  estimatePoints: z.preprocess(
    emptyToNull,
    z.coerce.number().int().min(0).max(100).nullable(),
  ),
  sprintId: optionalId,
  milestoneId: optionalId,
  columnId: optionalId,
});
export const generatedTasks = z.object({
  tasks: z.array(aiTaskInput).min(1).max(15),
});
export const taskBatch = z.object({
  tasks: z.array(taskInput).min(1).max(15),
});
export const projectInput = z.object({
  workspaceId: z.uuid(),
  name: z.string().trim().min(2).max(100),
  key: z.string().regex(/^[A-Z][A-Z0-9]{1,9}$/),
  description: z.string().max(5000).default(""),
});
export const labelInput = z.object({
  name: z.string().trim().min(1).max(40),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#6b7280"),
});
export const taskLabelIds = z.array(z.uuid()).max(20);
export const sprintInput = z
  .object({
    name: z.string().trim().min(1).max(80),
    goal: z.string().trim().max(1000).default(""),
    startDate: isoDate,
    endDate: isoDate,
  })
  .refine((s) => s.endDate >= s.startDate, {
    message: "Bitiş tarihi başlangıçtan önce olamaz.",
    path: ["endDate"],
  });
export const milestoneInput = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).default(""),
  dueDate: z.preprocess(emptyToNull, isoDate.nullable()),
});
