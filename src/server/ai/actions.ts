"use server";
import { z } from "zod";
import {
  projectData,
  requireUser,
  projectAccess,
} from "@/server/projects/service";
import { GeminiProvider } from "./provider";
import { db } from "@/server/db";
import { rateLimit } from "@/server/db/schema";
import { sql } from "drizzle-orm";
export async function generateTaskDraft(
  projectId: string,
  instruction: string,
) {
  z.uuid().parse(projectId);
  z.string().trim().min(10).max(2000).parse(instruction);
  const user = await requireUser();
  await projectAccess(projectId, user.id, true);
  // One atomic upsert enforces a per-user hourly budget across server instances.
  const now = Date.now();
  const cutoff = now - 60 * 60 * 1000;
  const reserved = await db
    .insert(rateLimit)
    .values({
      id: crypto.randomUUID(),
      key: `ai:tasks:${user.id}`,
      count: 1,
      lastRequest: now,
    })
    .onConflictDoUpdate({
      target: rateLimit.key,
      set: {
        count: sql`CASE WHEN ${rateLimit.lastRequest} < ${cutoff} THEN 1 ELSE ${rateLimit.count} + 1 END`,
        lastRequest: sql`CASE WHEN ${rateLimit.lastRequest} < ${cutoff} THEN ${now} ELSE ${rateLimit.lastRequest} END`,
      },
      setWhere: sql`${rateLimit.lastRequest} < ${cutoff} OR ${rateLimit.count} < 10`,
    })
    .returning({ id: rateLimit.id });
  if (!reserved.length)
    throw new Error(
      "Saatlik AI öneri sınırına ulaştınız. Daha sonra tekrar deneyin.",
    );
  const data = await projectData(projectId, user.id);
  return new GeminiProvider().generateTasks({
    name: data.project.name,
    description: data.project.description,
    existingTasks: data.tasks.map((t) => t.title).slice(0, 200),
    instruction,
  });
}
