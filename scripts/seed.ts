// `npm run db:seed` — adds clearly labelled demo data for local development.
// Register an account in the app first and set SEED_USER_EMAIL to it.
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq } from "drizzle-orm";
import * as schema from "../src/server/db/schema";
import { DEMO_WORKSPACE, seedDemo } from "./seed-data";

async function main() {
  if (!process.env.DATABASE_URL || !process.env.SEED_USER_EMAIL)
    throw new Error(
      "Set DATABASE_URL and SEED_USER_EMAIL to an existing registered account.",
    );
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });
  try {
    const [owner] = await db
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.email, process.env.SEED_USER_EMAIL));
    if (!owner)
      throw new Error(
        "Register the seed user in the application first. No default passwords are created.",
      );
    const result = await seedDemo(db, owner.id);
    console.log(
      result.created
        ? `Seed complete: workspace "${DEMO_WORKSPACE}" with 2 projects.`
        : `"${DEMO_WORKSPACE}" already exists for this user; nothing to do.`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
