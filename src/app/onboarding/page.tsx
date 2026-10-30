import { requireUser } from "@/server/projects/service";
import { WorkspaceForm } from "@/components/create-forms";
import { Logo } from "@/components/logo";
export const dynamic = "force-dynamic";
export default async function Page() {
  await requireUser();
  return (
    <main
      className="stack"
      style={{ maxWidth: 550, margin: "80px auto", padding: 24 }}
    >
      <Logo />
      <div className="panel stack">
        <span className="eyebrow">İlk adım</span>
        <h1>Birlikte çalışacağın yer.</h1>
        <p className="muted">
          Projelerini bir çalışma alanında bir araya getir. Sonraki adımda ilk
          projeni oluşturacağız.
        </p>
        <WorkspaceForm />
      </div>
    </main>
  );
}
