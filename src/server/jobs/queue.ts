import "server-only";
import type { Queue } from "bullmq";

// Background work goes through this module. With REDIS_URL jobs are queued in
// BullMQ and processed by `npm run worker`, with retries. Without it they run
// inline, so local development needs no extra services.
type Handler = (payload: Record<string, unknown>) => Promise<void>;
const handlers = new Map<string, Handler>();

export const QUEUE_NAME = "forgepilot";

export function registerJob(name: string, handler: Handler) {
  handlers.set(name, handler);
}

export async function runJob(
  name: string,
  payload: Record<string, unknown> = {},
) {
  const handler = handlers.get(name);
  if (!handler) throw new Error(`No handler registered for job "${name}"`);
  await handler(payload);
}

export const redisConnection = () => {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  // BullMQ needs this for blocking commands used by workers.
  return { url, maxRetriesPerRequest: null };
};

let queue: Queue | null = null;
async function getQueue() {
  const connection = redisConnection();
  if (!connection) return null;
  if (!queue) {
    const { Queue } = await import("bullmq");
    queue = new Queue(QUEUE_NAME, { connection });
  }
  return queue;
}

export async function enqueue(
  name: string,
  payload: Record<string, unknown>,
  options: { jobId?: string } = {},
) {
  const q = await getQueue();
  if (!q) return runJob(name, payload);
  await q.add(name, payload, {
    // A stable id makes enqueueing the same work twice a no-op.
    jobId: options.jobId,
    attempts: 5,
    backoff: { type: "exponential", delay: 5_000 },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  });
}
