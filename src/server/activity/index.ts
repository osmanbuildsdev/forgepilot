import { activities } from "@/server/db/schema";
import type { ActivitySource, ActivityType } from "@/server/db/schema";
import type { db } from "@/server/db";

type Executor = Pick<typeof db, "insert">;

export type ActivityInput = {
  projectId: string;
  type: ActivityType;
  message: string;
  actorId?: string | null;
  taskId?: string | null;
  source?: ActivitySource;
  metadata?: Record<string, unknown>;
};

export async function recordActivity(executor: Executor, input: ActivityInput) {
  await executor.insert(activities).values({
    projectId: input.projectId,
    type: input.type,
    message: input.message,
    actorId: input.actorId ?? null,
    taskId: input.taskId ?? null,
    source: input.source ?? "user",
    metadata: input.metadata ?? {},
  });
}
