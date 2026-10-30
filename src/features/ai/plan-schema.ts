import { z } from "zod";

// What the user tells the generator. Plain strings, validated on the server.
export const planRequest = z.object({
  idea: z.string().trim().min(20).max(3000),
  productType: z.string().trim().max(100).default(""),
  targetUsers: z.string().trim().max(500).default(""),
  teamSize: z.coerce.number().int().min(1).max(50).default(1),
  technologies: z.string().trim().max(500).default(""),
  timelineWeeks: z.coerce.number().int().min(1).max(52).default(8),
  complexity: z.enum(["low", "medium", "high"]).default("medium"),
  notes: z.string().trim().max(2000).default(""),
});
export type PlanRequest = z.infer<typeof planRequest>;

const text = (max: number) => z.string().trim().min(1).max(max);
const list = (max: number, items: number) => z.array(text(max)).max(items);

// The structured plan Gemini must return. Kept free of transforms and
// defaults so it converts cleanly to a JSON schema for structured output.
export const projectPlan = z.object({
  summary: text(1500),
  goals: list(300, 8),
  mvpScope: list(300, 12),
  functionalRequirements: list(400, 20),
  architecture: text(2000),
  suggestedStack: list(120, 15),
  milestones: z
    .array(
      z.object({
        name: text(120),
        description: z.string().max(600),
        // Weeks after project start when the milestone should be reached.
        targetWeek: z.number().int().min(1).max(52),
      }),
    )
    .min(1)
    .max(8),
  sprints: z
    .array(z.object({ name: text(80), goal: z.string().max(400) }))
    .max(12),
  tasks: z
    .array(
      z.object({
        title: text(200),
        description: z.string().max(4000),
        priority: z.enum(["low", "medium", "high", "urgent"]),
        estimatePoints: z.number().int().min(0).max(21),
        // Indexes into milestones / sprints above; -1 when not linked.
        milestoneIndex: z.number().int().min(-1).max(7),
        sprintIndex: z.number().int().min(-1).max(11),
      }),
    )
    .min(1)
    .max(60),
  dependencies: list(300, 15),
  risks: list(300, 10),
  successCriteria: list(300, 10),
});
export type ProjectPlan = z.infer<typeof projectPlan>;

// What the user approves: the (possibly edited) plan plus project identity.
export const planApproval = z.object({
  generationId: z.uuid(),
  workspaceId: z.uuid(),
  name: z.string().trim().min(2).max(100),
  key: z.string().regex(/^[A-Z][A-Z0-9]{1,9}$/),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((v) => !Number.isNaN(Date.parse(v))),
  sprintWeeks: z.number().int().min(1).max(4),
  plan: projectPlan,
});

// A short narrative on top of the deterministic daily brief.
export const briefNarrative = z.object({
  headline: z.string().trim().min(1).max(240),
  focus: z.array(z.string().trim().min(1).max(240)).max(4),
  watch: z.array(z.string().trim().min(1).max(240)).max(4),
});
export type BriefNarrative = z.infer<typeof briefNarrative>;
