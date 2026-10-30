import Link from "next/link";
import { Logo } from "@/components/logo";
import { AuthForm } from "@/components/auth-form";
import { configured } from "@/server/projects/service";
export function AuthPage({ register = false }: { register?: boolean }) {
  const providers: ("google" | "github")[] = [];
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    providers.push("google");
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET)
    providers.push("github");
  return (
    <main className="auth-page">
      <aside className="auth-story">
        <Link href="/">
          <Logo />
        </Link>
        <div>
          <span className="eyebrow">Fikirlerini harekete geçir</span>
          <h1 style={{ marginTop: 20 }}>
            Sıradaki büyük şey,
            <br />
            küçük bir adımla başlar.
          </h1>
          <p>Projen için net bir plan, ekibin için ortak bir yön.</p>
        </div>
        <span className="muted">ForgePilot · Erken sürüm</span>
      </aside>
      <section className="auth-form">
        <div className="auth-box">
          <h1>{register ? "Üretmeye başlayalım." : "Tekrar hoş geldin."}</h1>
          <p className="muted">
            {register
              ? "Yeni çalışma alanın seni bekliyor."
              : "Kaldığın yerden devam et."}
          </p>
          {configured() ? (
            <AuthForm register={register} providers={providers} />
          ) : (
            <div className="panel stack" style={{ marginTop: 25 }}>
              <p>Önce PostgreSQL ve oturum ayarlarını tamamla.</p>
              <Link className="button primary" href="/setup">
                Kurulum adımları →
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
