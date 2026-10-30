import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/server/db";
import { rateLimit } from "@/server/db/schema";
import { UserError } from "@/server/errors";

// One atomic upsert enforces a per-user hourly budget across server instances.
export async function consumeHourlyQuota(
  key: string,
  limit: number,
  message: string,
) {
  const now = Date.now();
  const cutoff = now - 60 * 60 * 1000;
  const reserved = await db
    .insert(rateLimit)
    .values({ id: crypto.randomUUID(), key, count: 1, lastRequest: now })
    .onConflictDoUpdate({
      target: rateLimit.key,
      set: {
        count: sql`CASE WHEN ${rateLimit.lastRequest} < ${cutoff} THEN 1 ELSE ${rateLimit.count} + 1 END`,
        lastRequest: sql`CASE WHEN ${rateLimit.lastRequest} < ${cutoff} THEN ${now} ELSE ${rateLimit.lastRequest} END`,
      },
      setWhere: sql`${rateLimit.lastRequest} < ${cutoff} OR ${rateLimit.count} < ${limit}`,
    })
    .returning({ id: rateLimit.id });
  if (!reserved.length) throw new UserError(message);
}
