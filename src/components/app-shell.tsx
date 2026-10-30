"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  LogOut,
  ArrowUpRight,
  Users,
} from "lucide-react";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-provider";
import { authClient } from "@/lib/auth-client";
export function AppShell({
  children,
  name,
  workspace,
}: {
  children: React.ReactNode;
  name: string;
  workspace: string;
}) {
  const path = usePathname();
  const router = useRouter();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/app">
          <Logo />
        </Link>
        <div className="workspace-name">{workspace}</div>
        <div>
          <p className="sidebar-label">Çalışma alanı</p>
          <nav style={{ marginTop: 10 }}>
            <Link href="/app" className={path === "/app" ? "active" : ""}>
              <LayoutDashboard size={17} />
              Genel bakış
            </Link>
            <Link
              href="/app/projects"
              className={path.startsWith("/app/projects") ? "active" : ""}
            >
              <FolderKanban size={17} />
              Projeler
            </Link>
            <Link
              href="/app/settings/members"
              className={path.startsWith("/app/settings") ? "active" : ""}
            >
              <Users size={17} />
              Üyeler
            </Link>
          </nav>
        </div>
        <div className="sidebar-bottom stack">
          <div className="panel" style={{ padding: 14 }}>
            <span className="eyebrow" style={{ fontSize: 9 }}>
              İlk adım, net bir plan
            </span>
            <p className="muted" style={{ marginTop: 7 }}>
              Bir proje aç ve ilk görevini oluştur.
            </p>
          </div>
          <Link href="/" className="row muted">
            ForgePilot hakkında <ArrowUpRight size={14} />
          </Link>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span className="muted" style={{ fontSize: 12 }}>
            Çalışma alanı <span style={{ margin: "0 10px" }}> / </span>{" "}
            {path.includes("/projects") ? "Projeler" : "Genel bakış"}
          </span>
          <div className="row">
            <ThemeToggle />
            <span className="avatar" title={name}>
              {name.charAt(0).toUpperCase()}
            </span>
            <button
              className="button ghost"
              aria-label="Çıkış yap"
              onClick={async () => {
                await authClient.signOut();
                router.push("/login");
                router.refresh();
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>
        <div className="app-content">{children}</div>
      </div>
    </div>
  );
}
