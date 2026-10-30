import { db } from "@/server/db";
import { githubEvents } from "@/server/db/schema";
import { githubConfig, verifyWebhookSignature } from "@/server/github/security";
import { enqueue } from "@/server/jobs/queue";
import "@/server/github/jobs";

const MAX_BODY = 5 * 1024 * 1024;

// GitHub App webhook. The signature is checked against the raw body before
// anything is parsed; each delivery id is stored once, so retries and
// duplicates are harmless.
export async function POST(request: Request) {
  const { webhookSecret } = githubConfig();
  if (!webhookSecret)
    return Response.json(
      { error: "GitHub webhooks are not configured" },
      { status: 503 },
    );

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY)
    return Response.json({ error: "Payload too large" }, { status: 413 });
  const body = await request.text();
  if (body.length > MAX_BODY)
    return Response.json({ error: "Payload too large" }, { status: 413 });

  if (
    !verifyWebhookSignature(
      body,
      request.headers.get("x-hub-signature-256"),
      webhookSecret,
    )
  )
    return Response.json({ error: "Invalid signature" }, { status: 401 });

  const deliveryId = request.headers.get("x-github-delivery");
  const event = request.headers.get("x-github-event");
  if (!deliveryId || !event)
    return Response.json({ error: "Missing GitHub headers" }, { status: 400 });

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const installation = payload.installation as { id?: number } | undefined;
  const repository = payload.repository as { id?: number } | undefined;

  const [row] = await db
    .insert(githubEvents)
    .values({
      deliveryId,
      event,
      action: typeof payload.action === "string" ? payload.action : null,
      installationId: installation?.id ?? null,
      repositoryGithubId: repository?.id ?? null,
      payload,
    })
    .onConflictDoNothing()
    .returning({ id: githubEvents.id });
  if (!row) return Response.json({ duplicate: true });

  try {
    await enqueue("github.event", { eventId: row.id }, { jobId: row.id });
  } catch {
    // The failure is recorded on the event row and can be retried; GitHub
    // does not need to redeliver.
  }
  return Response.json({ received: true }, { status: 202 });
}
