import Link from "next/link";
export function ProjectTabs({
  id,
  board = false,
}: {
  id: string;
  board?: boolean;
}) {
  return (
    <nav className="tabs">
      <Link href={`/app/projects/${id}`} className={!board ? "active" : ""}>
        Genel bakış
      </Link>
      <Link
        href={`/app/projects/${id}/board`}
        className={board ? "active" : ""}
      >
        Kanban
      </Link>
    </nav>
  );
}
