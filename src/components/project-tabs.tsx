import Link from "next/link";

const tabs = [
  ["", "Genel bakış"],
  ["/board", "Kanban"],
  ["/sprints", "Sprintler"],
  ["/roadmap", "Yol haritası"],
  ["/docs", "Dokümanlar"],
  ["/settings", "Ayarlar"],
] as const;

export type ProjectTab = (typeof tabs)[number][0];

export function ProjectTabs({
  id,
  active,
}: {
  id: string;
  active: ProjectTab;
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
