import {
  requireUser,
  userProjects,
  userWorkspaces,
} from "@/server/projects/service";
import { AppShell } from "@/components/app-shell";
export const dynamic = "force-dynamic";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const [spaces, items] = await Promise.all([
    userWorkspaces(user.id),
    userProjects(user.id),
  ]);
  return (
    <AppShell
      user={{ name: user.name, email: user.email }}
      workspace={
        spaces.length === 1
          ? spaces[0].name
          : spaces.length
            ? `${spaces.length} çalışma alanı`
            : "Çalışma alanı yok"
      }
      projects={items.map(({ project: p }) => ({
        id: p.id,
        name: p.name,
        key: p.key,
      }))}
    >
      {children}
    </AppShell>
  );
}
