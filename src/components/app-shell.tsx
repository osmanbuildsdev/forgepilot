"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  LogOut,
  Users,
  CircleCheck,
  Plus,
  Inbox,
  FileText,
} from "lucide-react";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-provider";
import { Button } from "./ui/button";
import { authClient } from "@/lib/auth-client";
import { NotificationBell } from "@/features/notifications/notification-bell";
import {
  CommandPalette,
  SearchTrigger,
} from "@/features/search/command-palette";

type ShellProject = { id: string; name: string; key: string };

const nav = [
  { href: "/app", label: "Genel bakış", icon: LayoutDashboard, exact: true },
  { href: "/app/tasks", label: "Görevlerim", icon: CircleCheck },
  { href: "/app/inbox", label: "Gelen kutusu", icon: Inbox },
  { href: "/app/projects", label: "Projeler", icon: FolderKanban, exact: true },
  { href: "/app/docs", label: "Dokümanlar", icon: FileText },
  { href: "/app/settings/members", label: "Üyeler", icon: Users },
];

function crumbs(path: string, projects: ShellProject[]) {
  if (path === "/app") return ["Genel bakış"];
  if (path.startsWith("/app/tasks")) return ["Görevlerim"];
  if (path.startsWith("/app/inbox")) return ["Gelen kutusu"];
  if (path.startsWith("/app/docs")) return ["Dokümanlar"];
  if (path.startsWith("/app/settings/members")) return ["Ayarlar", "Üyeler"];
  if (path === "/app/projects/new/ai")
    return ["Projeler", "Yeni proje", "AI ile"];
  if (path === "/app/projects/new") return ["Projeler", "Yeni proje"];
  const match = path.match(
    /^\/app\/projects\/([^/]+)(?:\/(board|sprints|roadmap|docs|settings))?/,
  );
  if (match) {
    const p = projects.find((x) => x.id === match[1]);
    const sub = {
      board: "Kanban",
      sprints: "Sprintler",
      roadmap: "Yol haritası",
      docs: "Dokümanlar",
      settings: "Ayarlar",
    }[match[2] ?? ""];
    return ["Projeler", p?.name ?? "Proje", ...(sub ? [sub] : [])];
  }
  return ["Projeler"];
}

export function AppShell({
  children,
  user,
  workspace,
  projects,
  unread,
}: {
  children: React.ReactNode;
  user: { name: string; email: string };
  workspace: string;
  projects: ShellProject[];
  unread: number;
}) {
  const path = usePathname();
  const router = useRouter();
  const trail = crumbs(path, projects);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/app" aria-label="Genel bakış">
          <Logo />
        </Link>
        <div className="workspace-name" title={workspace}>
          <span className="project-chip">
            {workspace.charAt(0).toUpperCase()}
          </span>
          <span className="truncate">{workspace}</span>
        </div>
        <nav aria-label="Uygulama menüsü">
          {nav.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? path === href : path.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={active ? "active" : ""}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div>
          <div className="row between sidebar-label">
            <span>Projeler</span>
            <Link
              href="/app/projects/new"
              aria-label="Yeni proje"
              className="subtle"
            >
              <Plus size={14} />
            </Link>
          </div>
          <nav aria-label="Projeler" style={{ marginTop: 6 }}>
            {projects.slice(0, 8).map((p) => {
              const active = path.startsWith(`/app/projects/${p.id}`);
              return (
                <Link
                  key={p.id}
                  href={`/app/projects/${p.id}/board`}
                  className={active ? "active" : ""}
                >
                  <span className="project-chip">{p.key.slice(0, 2)}</span>
                  <span className="truncate">{p.name}</span>
                </Link>
              );
            })}
            {!projects.length && (
              <span
                className="subtle"
                style={{ padding: "4px 10px", fontSize: 12 }}
              >
                Henüz proje yok
              </span>
            )}
          </nav>
        </div>
        <div className="sidebar-bottom">
          <div className="user-card">
            <span className="avatar">{user.name.charAt(0).toUpperCase()}</span>
            <span className="user-meta">
              <strong className="truncate">{user.name}</strong>
              <span className="subtle truncate">{user.email}</span>
            </span>
            <button
              className="icon-button"
              aria-label="Çıkış yap"
              title="Çıkış yap"
              onClick={async () => {
                await authClient.signOut();
                router.push("/login");
                router.refresh();
              }}
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <nav aria-label="Konum" className="breadcrumbs">
            {trail.map((c, i) => (
              <span key={i} className={i === trail.length - 1 ? "current" : ""}>
                {c}
              </span>
            ))}
          </nav>
          <div className="row" style={{ gap: 6 }}>
            <SearchTrigger />
            <NotificationBell unread={unread} />
            <ThemeToggle />
            <Button size="sm" variant="outline" asChild>
              <Link href="/app/projects/new">
                <Plus size={14} />
                Yeni proje
              </Link>
            </Button>
          </div>
        </header>
        <div className="app-content">{children}</div>
        <CommandPalette />
      </div>
    </div>
  );
}
