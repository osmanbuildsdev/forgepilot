import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser, userWorkspaces } from "@/server/projects/service";
import { membersOverview } from "@/server/workspaces/queries";
import { assignableRoles } from "@/server/permissions";
import { MembersPanel } from "@/features/workspaces/members-panel";

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
      <header className="page-heading">
        <div>
          <h1>Üyeler</h1>
          <p className="muted">
            {current.name} çalışma alanındaki kişiler ve bekleyen davetler.
          </p>
        </div>
      </header>
      {spaces.length > 1 && (
        <nav className="tabs">
          {spaces.map((w) => (
            <Link
              key={w.id}
              href={`/app/settings/members?workspace=${w.id}`}
              className={w.id === current.id ? "active" : ""}
            >
              {w.name}
            </Link>
          ))}
        </nav>
      )}
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
