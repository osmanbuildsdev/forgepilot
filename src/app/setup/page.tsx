import Link from "next/link";
import { Logo } from "@/components/logo";
export default function Setup() {
  return (
    <main
      style={{ maxWidth: 760, margin: "70px auto", padding: 24 }}
      className="stack"
    >
      <Link href="/">
        <Logo />
      </Link>
      <div className="panel stack">
        <span className="eyebrow">Geliştirme ortamı</span>
        <h1>Çalışma alanının temelini hazırlayalım.</h1>
        <p className="muted">
          ForgePilot verilerini PostgreSQL’de saklar. Uygulamayı kullanmak için
          veritabanı ve oturum ayarları gereklidir.
        </p>
        <ol className="stack">
          <li>
            <code>.env.example</code> dosyasını <code>.env</code> olarak
            kopyala.
          </li>
          <li>
            <code>DATABASE_URL</code> ve en az 32 karakterlik rastgele{" "}
            <code>BETTER_AUTH_SECRET</code> ayarla.
          </li>
          <li>
            Docker kuruluysa <code>docker compose up -d</code> çalıştır veya
            mevcut PostgreSQL bağlantını kullan.
          </li>
          <li>
            <code>npm run db:migrate</code> komutunu çalıştır.
          </li>
          <li>
            Sunucuyu yeniden başlat: <code>npm run dev</code>.
          </li>
        </ol>
        <p className="muted">
          Gemini ve sosyal giriş isteğe bağlıdır. Ayrıntılar README dosyasında.
        </p>
        <Link className="button primary" href="/register">
          Kayıt sayfasına git →
        </Link>
      </div>
    </main>
  );
}
