import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export const githubConfig = () => ({
  appId: process.env.GITHUB_APP_ID ?? "",
  slug: process.env.GITHUB_APP_SLUG ?? "",
  clientId: process.env.GITHUB_APP_CLIENT_ID ?? "",
  clientSecret: process.env.GITHUB_APP_CLIENT_SECRET ?? "",
  webhookSecret: process.env.GITHUB_WEBHOOK_SECRET ?? "",
});

// Everything needed to install the app and verify the installer.
export function githubAppConfigured() {
  const c = githubConfig();
  return Boolean(c.slug && c.clientId && c.clientSecret && c.webhookSecret);
}

const equal = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

// Verifies X-Hub-Signature-256 against the exact raw request body.
export function verifyWebhookSignature(
  body: string,
  header: string | null,
  secret: string,
) {
  if (!header?.startsWith("sha256=") || !secret) return false;
  const expected =
    "sha256=" + createHmac("sha256", secret).update(body, "utf8").digest("hex");
  return equal(expected, header);
}

// The install flow round-trips this value through GitHub. It binds the
// installation to the workspace and user that started it and expires.
type InstallState = { workspaceId: string; userId: string; exp: number };

const stateKey = () => {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET is required");
  return `github-install:${secret}`;
};

export function signInstallState(workspaceId: string, userId: string) {
  const payload = Buffer.from(
    JSON.stringify({
      workspaceId,
      userId,
      exp: Date.now() + 60 * 60 * 1000,
    } satisfies InstallState),
  ).toString("base64url");
  const sig = createHmac("sha256", stateKey())
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

export function readInstallState(value: string | null): InstallState | null {
  if (!value) return null;
  const [payload, sig] = value.split(".");
  if (!payload || !sig) return null;
  const expected = createHmac("sha256", stateKey())
    .update(payload)
    .digest("base64url");
  if (!equal(expected, sig)) return null;
  try {
    const state = JSON.parse(
      Buffer.from(payload, "base64url").toString(),
    ) as InstallState;
    return state.exp > Date.now() ? state : null;
  } catch {
    return null;
  }
}

// Task keys such as FORGE-24 in commit messages, PR titles, bodies and branch
// names. Branches often use lowercase ("forge-24-login"), so matching is
// case-insensitive and the result is upper-cased.
export function extractTaskKeys(...texts: (string | null | undefined)[]) {
  const keys = new Set<string>();
  for (const text of texts)
    for (const m of (text ?? "").matchAll(
      /\b([A-Za-z][A-Za-z0-9]{1,9})-(\d{1,7})\b/g,
    ))
      keys.add(`${m[1].toUpperCase()}-${Number(m[2])}`);
  return [...keys];
}
