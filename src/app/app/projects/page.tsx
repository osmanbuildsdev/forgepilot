import Link from "next/link";
import { requireUser, userProjects } from "@/server/projects/service";
import { Button } from "@/components/ui/button";
export default async function Page() {
  const user = await requireUser();
  const items = await userProjects(user.id);
  return (
    <>
      <header className="page-heading">
        <div>
          <h1>Projeler</h1>
          <p className="muted">Fikirlerin için ortak bir başlangıç noktası.</p>
        </div>
        <Button asChild>
          <Link href="/app/projects/new">+ Yeni proje</Link>
        </Button>
      </header>
      <div className="project-grid">
        {items.map(({ project: p, workspace }) => (
          <Link
            className="panel project-card"
            key={p.id}
            href={`/app/projects/${p.id}`}
          >
            <span className="project-key">{p.key}</span>
            <h2 style={{ marginTop: 12 }}>{p.name}</h2>
            <p className="muted">
              {p.description || "Henüz açıklama eklenmedi."}
            </p>
            <span className="badge">{workspace}</span>
          </Link>
        ))}
      </div>
      {!items.length && (
        <div className="empty">
          <h2>Henüz proje yok.</h2>
          <p className="muted">
            İlk projeni oluşturmak için yukarıdaki düğmeyi kullan.
          </p>
        </div>
      )}
    </>
  );
}
