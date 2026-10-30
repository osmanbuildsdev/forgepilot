// Background worker: `npm run worker`. Requires REDIS_URL and the same
// environment as the web app. Processes queued jobs (e.g. GitHub webhooks)
// and registers the scheduled jobs.
import "dotenv/config";
import { Queue, Worker } from "bullmq";
import {
  QUEUE_NAME,
  SCHEDULE,
  redisConnection,
  runJob,
} from "../src/server/jobs/index";

async function main() {
  const connection = redisConnection();
  if (!connection) {
    console.error("REDIS_URL is not set; the worker has nothing to do.");
    process.exitCode = 1;
    return;
  }
  const queue = new Queue(QUEUE_NAME, { connection });
  for (const [name, job] of Object.entries(SCHEDULE))
    await queue.upsertJobScheduler(
      name,
      { pattern: job.cron, tz: "UTC" },
      { name },
    );

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      await runJob(job.name, (job.data ?? {}) as Record<string, unknown>);
    },
    { connection, concurrency: 4 },
  );
  worker.on("completed", (job) => console.log(`✓ ${job.name} ${job.id}`));
  worker.on("failed", (job, error) =>
    console.error(`✗ ${job?.name} ${job?.id}: ${error.message}`),
  );
  console.log(
    `Worker listening on "${QUEUE_NAME}" with ${Object.keys(SCHEDULE).length} schedules.`,
  );

  const shutdown = async () => {
    await worker.close();
    await queue.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
