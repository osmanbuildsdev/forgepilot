import "server-only";
import { registerJob } from "@/server/jobs/queue";
import { processGithubEvent } from "./process";

registerJob("github.event", async ({ eventId }) => {
  await processGithubEvent(String(eventId));
});
