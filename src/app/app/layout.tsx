import { requireUser, userWorkspaces } from "@/server/projects/service";
import { AppShell } from "@/components/app-shell";
export const dynamic = "force-dynamic";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const spaces = await userWorkspaces(user.id);
  return (
    <AppShell
      name={user.name}
      workspace={
        spaces.length === 1 ? spaces[0].name : `${spaces.length} çalışma alanı`
      }
    >
      {children}
    </AppShell>
  );
}
