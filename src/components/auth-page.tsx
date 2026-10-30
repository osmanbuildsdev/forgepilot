import Link from "next/link";
import { Activity, GitBranch, Sparkles } from "lucide-react";
import { Logo } from "@/components/logo";
import { AuthForm } from "@/components/auth-form";
import { ThemeToggle } from "@/components/theme-provider";
import { TaskCardContent } from "@/components/task-card";
import { configured } from "@/server/projects/service";

const recent = [
  ["Ece", "FORGE-24 görevini İncelemeye taşıdı", "4 dk"],
  ["Deniz", "3 AI önerisini onayladı", "18 dk"],
  ["Mert", "Atlas Analytics projesine katıldı", "1 sa"],
] as const;

export function AuthPage({ register = false }: { register?: boolean }) {
  const providers: ("google" | "github")[] = [];
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET)
    providers.push("github");
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    providers.push("google");
  return (
    <main className="auth-page">
      <div className="auth-main">
        <header>
          <Link href="/" aria-label="ForgePilot ana sayfa">
            <Logo />
          </Link>
          <ThemeToggle />
        </header>
        <section className="auth-form">
          <div className="auth-box">
            <h1>{register ? "Hesabını oluştur" : "Tekrar hoş geldin"}</h1>
            <p className="muted">
              {register
                ? "Çalışma alanını kur, ekibini davet et, ilk projeni başlat."
                : "Projelerine kaldığın yerden devam et."}
            </p>
            {configured() ? (
              <AuthForm register={register} providers={providers} />
            ) : (
              <div className="panel stack" style={{ marginTop: 28 }}>
                <p className="muted">
                  Giriş yapılabilmesi için önce PostgreSQL ve oturum ayarlarının
                  tamamlanması gerekiyor.
                </p>
                <Link className="button primary" href="/setup">
                  Kurulum adımlarını gör
                </Link>
              </div>
            )}
          </div>
        </section>
        <footer>
          <span>© 2026 ForgePilot</span>
          <Link href="/" className="subtle">
            Ana sayfaya dön
          </Link>
        </footer>
      </div>
      <aside className="auth-aside" aria-hidden="true">
        <div className="auth-aside-copy">
          <span className="eyebrow">Ekibin için tek bir çalışma yüzeyi</span>
          <h2 style={{ marginTop: 10 }}>
            Ne bitti, ne sürüyor, sırada ne var. Hepsi aynı yerde.
          </h2>
          <p>
            Görevler, ekip ve AI önerileri aynı veri modelinde. Karar her zaman
            sende kalır.
          </p>
        </div>
        <div className="mini-app">
          <div className="mini-app-bar">
            <div className="crumbs">
              <span>Acme Labs</span>
              <span>/</span>
              <strong>Genel bakış</strong>
            </div>
            <span className="badge">Örnek</span>
          </div>
          <div style={{ padding: 16, display: "grid", gap: 12 }}>
            <div className="task-card" style={{ margin: 0 }}>
              <TaskCardContent
                projectKey="FORGE"
                assignee="Ece"
                labels={[{ id: "w", name: "web", color: "#16a34a" }]}
                task={{
                  number: 24,
                  title: "Proje panosu arayüzü",
                  priority: "high",
                  dueDate: "2026-11-10",
                  estimatePoints: 5,
                }}
              />
            </div>
            <div className="panel" style={{ padding: 14 }}>
              <div className="row" style={{ gap: 8, marginBottom: 6 }}>
                <Activity size={14} className="subtle" />
                <h3 style={{ fontSize: 12 }}>Son hareketler</h3>
              </div>
              {recent.map(([who, what, when]) => (
                <div
                  key={what}
                  className="row between"
                  style={{ padding: "7px 0", fontSize: 12 }}
                >
                  <span className="row" style={{ gap: 8 }}>
                    <span className="avatar">{who[0]}</span>
                    <span>
                      <strong style={{ fontWeight: 500 }}>{who}</strong>{" "}
                      <span className="muted">{what}</span>
                    </span>
                  </span>
                  <span className="subtle">{when}</span>
                </div>
              ))}
            </div>
            <div className="row" style={{ gap: 8 }}>
              <span className="badge accent">
                <Sparkles size={12} /> AI önerileri onay bekler
              </span>
              <span className="badge">
                <GitBranch size={12} /> GitHub yakında
              </span>
            </div>
          </div>
        </div>
      </aside>
    </main>
  );
}
