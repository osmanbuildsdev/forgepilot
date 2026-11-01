import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/server/db";
import * as schema from "@/server/db/schema";
// The site origin, tolerant of trailing slashes and stray whitespace. On
// Vercel the production domain is also trusted, so a deployment never
// rejects its own sign-ups.
function origins() {
  const configured = process.env.BETTER_AUTH_URL?.trim().replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : undefined;
  return {
    baseURL: configured || vercel,
    trusted: [configured, vercel].filter((o): o is string => Boolean(o)),
  };
}

function createAuth() {
  const { baseURL, trusted } = origins();
  return betterAuth({
    baseURL,
    trustedOrigins: trusted,
    database: drizzleAdapter(db, { provider: "pg", schema }),
    emailAndPassword: { enabled: true, minPasswordLength: 12 },
    socialProviders: {
      ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
        ? {
            google: {
              clientId: process.env.GOOGLE_CLIENT_ID,
              clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            },
          }
        : {}),
      ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
        ? {
            github: {
              clientId: process.env.GITHUB_CLIENT_ID,
              clientSecret: process.env.GITHUB_CLIENT_SECRET,
            },
          }
        : {}),
    },
    rateLimit: { enabled: true, storage: "database" },
  });
}
let instance: ReturnType<typeof createAuth> | undefined;
export function getAuth() {
  if (
    !process.env.DATABASE_URL ||
    (process.env.BETTER_AUTH_SECRET?.length ?? 0) < 32
  ) {
    throw new Error(
      "PostgreSQL and a strong BETTER_AUTH_SECRET must be configured.",
    );
  }
  return (instance ??= createAuth());
}
