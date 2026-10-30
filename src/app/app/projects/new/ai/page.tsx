import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser, userWorkspaces } from "@/server/projects/service";
import { canWrite } from "@/server/permissions";
import { PlanGenerator } from "@/features/ai/plan-generator";

export const metadata: Metadata = { title: "AI ile proje oluştur" };

export default async function Page() {
  const user = await requireUser();
  const spaces = (await userWorkspaces(user.id)).filter((w) =>
    canWrite(w.role),
  );
  if (!spaces.length) redirect("/onboarding");
  const enabled = Boolean(process.env.GEMINI_API_KEY);
  return (
    <div style={{ maxWidth: 880 }}>
      <header className="page-heading">
        <div>
          <span className="eyebrow">AI proje üretici</span>
          <h1 style={{ marginTop: 4 }}>Fikrini bir proje planına dönüştür</h1>
          <p className="muted">
            Gemini; hedefleri, MVP kapsamını, milestone&apos;ları, sprintleri ve
            görevleri önerir. Hepsini düzenleyip onaylamadan hiçbir şey
            oluşturulmaz.
          </p>
        </div>
        <Link href="/app/projects/new" className="button ghost">
          Elle oluştur
        </Link>
      </header>
      {enabled ? (
        <PlanGenerator
          workspaces={spaces.map((w) => ({ id: w.id, name: w.name }))}
          today={new Date().toISOString().slice(0, 10)}
        />
      ) : (
        <div className="panel stack" style={{ gap: 10 }}>
          <h2>Gemini yapılandırılmamış</h2>
          <p className="muted">
            Bu özellik için sunucuda <code>GEMINI_API_KEY</code> tanımlı olmalı.
            Anahtarı <code>.env</code> dosyasına ekleyip sunucuyu yeniden
            başlattığında burada plan oluşturabilirsin.
          </p>
        </div>
      )}
    </div>
  );
}
