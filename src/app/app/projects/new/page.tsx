import { redirect } from "next/navigation";
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
      <div className="panel">
        <ProjectForm workspaces={spaces} />
      </div>
    </div>
  );
}
