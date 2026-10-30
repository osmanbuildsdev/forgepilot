import type { Metadata } from "next";
import Link from "next/link";
import { FolderKanban, Plus } from "lucide-react";
import { requireUser, projectSummaries } from "@/server/projects/service";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Projeler" };

export default async function Page() {
  const user = await requireUser();
  const items = await projectSummaries(user.id);
  return (
    <>
      <header className="page-heading">
        <div>
          <h1>Projeler</h1>
          <p className="muted">
            Erişimin olan tüm çalışma alanlarındaki projeler.
          </p>
        </div>
        <Button asChild>
          <Link href="/app/projects/new">
            <Plus size={15} />
            Yeni proje
          </Link>
        </Button>
      </header>
      {items.length ? (
        <div className="project-grid">
          {items.map((p) => {
            const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
            return (
              <Link
                className="panel project-card stack"
                style={{ gap: 14 }}
                key={p.id}
                href={`/app/projects/${p.id}`}
              >
                <div className="row between">
                  <span className="row" style={{ gap: 8 }}>
                    <span className="project-chip">{p.key.slice(0, 2)}</span>
                    <span className="project-key">{p.key}</span>
                  </span>
                  <span className="badge">{p.workspace}</span>
                </div>
                <div>
                  <h2>{p.name}</h2>
                  <p className="muted" style={{ margin: "6px 0 0" }}>
                    {p.description || "Henüz açıklama eklenmedi."}
                  </p>
                </div>
                <div className="progress">
                  <span style={{ width: `${pct}%` }} />
                </div>
                <div className="row subtle" style={{ fontSize: 12, gap: 14 }}>
                  <span>{p.total} görev</span>
                  <span>{p.active} devam ediyor</span>
                  <span>%{pct} tamamlandı</span>
                  {p.overdue > 0 && (
                    <span className="overdue">{p.overdue} geciken</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="empty">
          <FolderKanban size={24} />
          <h2>Henüz proje yok.</h2>
          <p className="muted">
            Bir proje oluştur, görevlere ayır ve ekibinle ilerlemeye başla.
          </p>
          <Button asChild>
            <Link href="/app/projects/new">Proje oluştur</Link>
          </Button>
        </div>
      )}
    </>
  );
}
