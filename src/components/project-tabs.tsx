import Link from "next/link";

const tabs = [
  ["", "Genel bakış"],
  ["/board", "Kanban"],
  ["/settings", "Ayarlar"],
] as const;

export function ProjectTabs({
  id,
  active,
}: {
  id: string;
  active: (typeof tabs)[number][0];
}) {
  return (
    <nav className="tabs" aria-label="Proje sekmeleri">
      {tabs.map(([suffix, label]) => (
        <Link
          key={suffix}
          href={`/app/projects/${id}${suffix}`}
          className={active === suffix ? "active" : ""}
          aria-current={active === suffix ? "page" : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
