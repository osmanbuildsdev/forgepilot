import { ProjectTabs, type ProjectTab } from "./project-tabs";

export function ProjectHeader({
  project,
  active,
  subtitle,
  actions,
}: {
  project: { id: string; key: string; name: string };
  active: ProjectTab;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <>
      <header className="page-heading">
        <div>
          <span className="project-key">{project.key}</span>
          <h1 style={{ marginTop: 6 }}>{project.name}</h1>
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>
        {actions}
      </header>
      <ProjectTabs id={project.id} active={active} />
    </>
  );
}
