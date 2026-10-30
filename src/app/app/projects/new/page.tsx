import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles, ArrowRight } from "lucide-react";
import { requireUser, userWorkspaces } from "@/server/projects/service";
import { canWrite } from "@/server/permissions";
import { ProjectForm } from "@/components/create-forms";
export default async function Page() {
  const user = await requireUser();
  const spaces = (await userWorkspaces(user.id)).filter((w) =>
    canWrite(w.role),
  );
  if (!spaces.length) redirect("/onboarding");
  return (
    <div style={{ maxWidth: 650 }}>
      <header className="page-heading">
        <div>
          <span className="eyebrow">Fikirden plana</span>
          <h1 style={{ marginTop: 12 }}>Yeni proje oluştur.</h1>
          <p className="muted">Bir isim, net bir hedef ve ilk adım.</p>
        </div>
      </header>
      <Link href="/app/projects/new/ai" className="panel choice-card">
        <span className="feature-icon">
          <Sparkles size={16} />
        </span>
        <span style={{ flex: 1 }}>
          <strong>AI ile planla</strong>
          <span className="muted">
            Fikrini anlat; milestone, sprint ve görevleri Gemini önersin, sen
            düzenleyip onayla.
          </span>
        </span>
        <ArrowRight size={16} className="subtle" />
      </Link>
      <div className="or-divider">veya elle oluştur</div>
      <div className="panel">
        <ProjectForm workspaces={spaces} />
      </div>
    </div>
  );
}
