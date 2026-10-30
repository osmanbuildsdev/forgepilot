import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { account } from "@/server/db/schema";
import { requireUser } from "@/server/projects/service";
import { ProfileSettings } from "@/features/settings/profile-settings";

export const metadata: Metadata = { title: "Profil" };

export default async function Page() {
  const user = await requireUser();
  // Accounts created only through GitHub or Google have no password to change.
  const accounts = await db
    .select({ providerId: account.providerId })
    .from(account)
    .where(eq(account.userId, user.id));
  return (
    <ProfileSettings
      name={user.name}
      email={user.email}
      hasPassword={accounts.some((a) => a.providerId === "credential")}
      providers={accounts
        .map((a) => a.providerId)
        .filter((p) => p !== "credential")}
    />
  );
}
