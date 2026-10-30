import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/server/db";
import * as schema from "@/server/db/schema";
function createAuth() {
  return betterAuth({
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
