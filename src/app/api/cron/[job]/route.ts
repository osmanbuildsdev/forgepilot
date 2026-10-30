import { timingSafeEqual } from "node:crypto";
import { SCHEDULE, type ScheduledJob } from "@/server/jobs/scheduled";

// Runs a scheduled job on demand, for setups without the Redis worker
// (e.g. Vercel Cron or a system crontab). Protected by CRON_SECRET.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ job: string }> },
) {
  const secret = process.env.CRON_SECRET;
  if (!secret)
    return Response.json({ error: "CRON_SECRET is not set" }, { status: 503 });
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (given.length !== expected.length || !timingSafeEqual(given, expected))
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { job } = await params;
  if (!(job in SCHEDULE))
    return Response.json({ error: "Unknown job" }, { status: 404 });
  const result = await SCHEDULE[job as ScheduledJob].run();
  return Response.json({ job, result });
}
