import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, and } from "drizzle-orm";
import {
  user,
  workspaces,
  members,
  projects,
  tasks,
  activities,
} from "../src/server/db/schema";
async function main() {
  if (!process.env.DATABASE_URL || !process.env.SEED_USER_EMAIL)
    throw new Error(
      "Set DATABASE_URL and SEED_USER_EMAIL to an existing registered account.",
    );
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  try {
    const [owner] = await db
      .select()
      .from(user)
      .where(eq(user.email, process.env.SEED_USER_EMAIL));
    if (!owner)
      throw new Error(
        "Register the seed user in the application first. No default passwords are created.",
      );
    await db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(workspaces)
        .innerJoin(members, eq(members.workspaceId, workspaces.id))
        .where(
          and(
            eq(members.userId, owner.id),
            eq(workspaces.name, "Acme Labs · Seed"),
          ),
        );
      if (existing.length) {
        console.log("Seed already exists.");
        return;
      }
      const [w] = await tx
        .insert(workspaces)
        .values({ name: "Acme Labs · Seed" })
        .returning();
      await tx
        .insert(members)
        .values({ workspaceId: w.id, userId: owner.id, role: "owner" });
      const [p] = await tx
        .insert(projects)
        .values({
          workspaceId: w.id,
          name: "ForgePilot Mobile",
          key: "MOBILE",
          description: "Mobil cihazlarda görev takibi için ilk çalışan sürüm.",
          createdBy: owner.id,
          nextTaskNumber: 4,
        })
        .returning();
      await tx.insert(tasks).values(
        [
          {
            title: "Mobil kimlik doğrulama akışını tasarla",
            status: "done" as const,
          },
          {
            title: "Proje listeleme ekranını geliştir",
            status: "in_progress" as const,
          },
          {
            title: "Görev ayrıntıları için kabul kriterlerini yaz",
            status: "todo" as const,
          },
          {
            title: "Erişilebilirlik kontrollerini planla",
            status: "backlog" as const,
          },
        ].map((t, i) => ({
          ...t,
          projectId: p.id,
          number: i + 1,
          createdBy: owner.id,
        })),
      );
      await tx
        .insert(activities)
        .values({
          projectId: p.id,
          actorId: owner.id,
          message: "Geliştirme örnek verileri seed komutuyla oluşturuldu.",
        });
    });
    console.log("Seed complete.");
  } finally {
    await pool.end();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
