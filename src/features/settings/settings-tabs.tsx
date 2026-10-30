"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  ["profile", "Profil"],
  ["workspace", "Çalışma alanı"],
  ["members", "Üyeler"],
  ["integrations", "Entegrasyonlar"],
  ["ai", "AI"],
  ["billing", "Plan"],
] as const;

export function SettingsTabs() {
  const path = usePathname();
  return (
    <nav
      className="tabs"
      aria-label="Ayar sekmeleri"
      style={{ marginBottom: 0 }}
    >
      {tabs.map(([slug, label]) => {
        const href = `/app/settings/${slug}`;
        const active = path.startsWith(href);
        return (
          <Link
            key={slug}
            href={href}
            className={active ? "active" : ""}
            aria-current={active ? "page" : undefined}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
