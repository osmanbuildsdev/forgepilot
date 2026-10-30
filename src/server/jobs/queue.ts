import "server-only";

// Background work goes through this function. Without REDIS_URL jobs run
// inline so local development needs no extra services; a BullMQ worker can
// take over the same handlers when Redis is configured.
type Handler = (payload: Record<string, unknown>) => Promise<void>;
const handlers = new Map<string, Handler>();

export function registerJob(name: string, handler: Handler) {
  handlers.set(name, handler);
}

export async function enqueue(name: string, payload: Record<string, unknown>) {
  const handler = handlers.get(name);
  if (!handler) throw new Error(`No handler registered for job "${name}"`);
  await handler(payload);
}
