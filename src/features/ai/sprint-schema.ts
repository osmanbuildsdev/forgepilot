import { z } from "zod";

// AI picks tasks for a sprint by number and explains each pick.
export const sprintPlanDraft = z.object({
  summary: z.string().max(1200),
  picks: z
    .array(
      z.object({
        taskNumber: z.number().int(),
        reason: z.string().max(300),
      }),
    )
    .max(40),
});
export type SprintPlanDraft = z.infer<typeof sprintPlanDraft>;

// Development summary built only from GitHub activity that was provided.
export const devSummary = z.object({
  areas: z
    .array(
      z.object({
        name: z.string().max(80),
        status: z.string().max(400),
      }),
    )
    .max(8),
  recommendation: z.string().max(500),
  caveats: z.string().max(400),
});
export type DevSummary = z.infer<typeof devSummary>;
