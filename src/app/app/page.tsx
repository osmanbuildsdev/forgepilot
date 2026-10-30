import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, ArrowUpRight, FolderKanban } from "lucide-react";
import {
  requireUser,
  userProjects,
  userWorkspaces,
} from "@/server/projects/service";
import { Button } from "@/components/ui/button";
export default async function Page() {
  const user = await requireUser();
  const [spaces, items] = await Promise.all([
    userWorkspaces(user.id),
    userProjects(user.id),
  ]);
  if (!spaces.length) redirect("/onboarding");
  return (
    <div className="stack">
      <header className="page-heading">
        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            Üretmek için güzel bir gün
          </div>
          <h1>Merhaba, {user.name.split(" ")[0]}.</h1>
          <p className="muted">Büyük resmi gör. Bir sonraki adımını belirle.</p>
        </div>
        <Button asChild>
          <Link href="/app/projects/new">
            <Plus size={16} />
            Yeni proje
          </Link>
        </Button>
      </header>
      <div className="stats">
        <div className="panel stat">
          <span className="muted">Projeler</span>
          <strong>{items.length}</strong>
        </div>
        <div className="panel stat">
          <span className="muted">Çalışma alanları</span>
          <strong>{spaces.length}</strong>
        </div>
        <div className="panel stat">
          <span className="muted">Gemini</span>
          <strong style={{ fontSize: 20, marginTop: 18 }}>
            {process.env.GEMINI_API_KEY ? "Yapılandırıldı" : "Bağlı değil"}
          </strong>
        </div>
      </div>
      <div className="row between" style={{ marginTop: 15 }}>
        <h2>Projelerin</h2>
        <Link href="/app/projects" className="row muted">
          Tümünü gör <ArrowUpRight size={15} />
        </Link>
      </div>
      {items.length ? (
        <div className="project-grid">
          {items.map(({ project: p, workspace }) => (
            <Link
              className="panel project-card"
              key={p.id}
              href={`/app/projects/${p.id}`}
            >
              <div className="row between">
                <span className="project-key">{p.key}</span>
                <ArrowUpRight size={17} />
              </div>
              <h2 style={{ marginTop: 15 }}>{p.name}</h2>
              <p className="muted">
                {p.description ||
                  "İlk görevini ekleyerek projenin yönünü belirle."}
              </p>
              <span className="badge">{workspace}</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty">
          <FolderKanban size={30} />
          <h2>İlk projen için yer hazır.</h2>
          <p className="muted">
            Bir hedef belirle, görevlerine ayır ve geliştirmeye başla.
          </p>
          <Button asChild>
            <Link href="/app/projects/new">Proje oluştur</Link>
          </Button>
        </div>
      )}
      <div className="panel row between">
        <div>
          <h3>Her ekibe kendi alanı.</h3>
          <p className="muted">
            Başka bir proje grubu için yeni çalışma alanı oluşturabilirsin.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/onboarding">
            <Plus size={15} />
            Çalışma alanı
          </Link>
        </Button>
      </div>
    </div>
  );
}
