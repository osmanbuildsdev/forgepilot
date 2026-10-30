import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { members, projects } from "@/server/db/schema";
import { requireUser, userWorkspaces } from "@/server/projects/service";
import { canManageMembers } from "@/server/permissions";
import { WorkspacePicker } from "@/features/settings/workspace-picker";
import { WorkspaceSettings } from "@/features/settings/workspace-settings";

export const metadata: Metadata = { title: "Çalışma alanı" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string }>;
}) {
  const user = await requireUser();
  const spaces = await userWorkspaces(user.id);
  if (!spaces.length) redirect("/onboarding");
  const { workspace } = await searchParams;
  const current = spaces.find((w) => w.id === workspace) ?? spaces[0];
  const [[counts]] = await Promise.all([
    db
      .select({
        projects: sql<number>`(select count(*)::int from ${projects} where ${projects.workspaceId} = ${current.id})`,
        members: sql<number>`count(*)::int`,
      })
      .from(members)
      .where(eq(members.workspaceId, current.id)),
  ]);
  return (
    <div className="stack">
      <WorkspacePicker
        base="/app/settings/workspace"
        workspaces={spaces}
        current={current.id}
      />
      <WorkspaceSettings
        workspace={{ id: current.id, name: current.name }}
        role={current.role}
        canEdit={canManageMembers(current.role)}
        counts={counts}
      />
    </div>
  );
}
