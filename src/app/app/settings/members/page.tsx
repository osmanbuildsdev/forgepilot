import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WorkspacePicker } from "@/features/settings/workspace-picker";
import { requireUser, userWorkspaces } from "@/server/projects/service";
import { membersOverview } from "@/server/workspaces/queries";
import { assignableRoles } from "@/server/permissions";
import { MembersPanel } from "@/features/workspaces/members-panel";

export const metadata: Metadata = { title: "Üyeler" };

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
  const { people, pending } = await membersOverview(current.id);
  return (
    <div className="stack">
      <WorkspacePicker
        base="/app/settings/members"
        workspaces={spaces}
        current={current.id}
      />
      <p className="muted">
        {current.name} çalışma alanındaki kişiler ve bekleyen davetler.
      </p>
      <MembersPanel
        workspaceId={current.id}
        myUserId={user.id}
        myRole={current.role}
        assignable={assignableRoles(current.role)}
        people={people}
        pending={pending.map((p) => ({
          ...p,
          expiresAt: p.expiresAt.toISOString(),
        }))}
      />
    </div>
  );
}
