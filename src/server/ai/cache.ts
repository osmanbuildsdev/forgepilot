import "server-only";
import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "@/server/db";
import { aiGenerations } from "@/server/db/schema";
import { briefNarrative, type BriefNarrative } from "@/features/ai/plan-schema";

// Today's narrative for the user, if one was already generated (UTC day).
export async function cachedBriefNarrative(
  userId: string,
): Promise<BriefNarrative | null> {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const [row] = await db
    .select({ output: aiGenerations.output })
    .from(aiGenerations)
    .where(
      and(
        eq(aiGenerations.userId, userId),
        eq(aiGenerations.kind, "daily_brief"),
        eq(aiGenerations.status, "succeeded"),
        gte(aiGenerations.createdAt, start),
      ),
    )
    .orderBy(desc(aiGenerations.createdAt))
    .limit(1);
  const parsed = briefNarrative.safeParse(row?.output);
  return parsed.success ? parsed.data : null;
}
