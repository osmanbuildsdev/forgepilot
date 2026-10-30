import Link from "next/link";
import {
  ArrowRight,
  Check,
  LayoutGrid,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { TaskCardContent } from "@/components/task-card";
export default function Home() {
  return (
    <main className="marketing">
      <nav>
        <Link href="/">
          <Logo />
        </Link>
        <div className="row nav-links">
          <a href="#product">Ürün</a>
          <a href="#features">Özellikler</a>
          <span className="badge">Erken sürüm</span>
        </div>
        <div className="row">
          <ThemeToggle />
          <Link href="/login">Giriş yap</Link>
          <Button asChild>
            <Link href="/register">
              Başla <ArrowRight size={15} />
            </Link>
          </Button>
        </div>
      </nav>
      <section className="hero" id="product">
        <div>
          <div className="eyebrow">Daha az dağınıklık. Daha çok üretim.</div>
          <h1>
            Fikrini planla.
            <br />
            Birlikte geliştir.
            <br />
            <span>İleriye taşı.</span>
          </h1>
          <p>
            Projelerin, görevlerin ve bir sonraki adımın tek bir yerde.
            ForgePilot ile yazılım geliştirmeye odaklan.
          </p>
          <div className="row">
            <Button asChild>
              <Link href="/register">
                Çalışma alanını oluştur <ArrowRight size={16} />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/app">Uygulamayı aç</Link>
            </Button>
          </div>
          <p className="hero-note">
            İlk sürüm · Gerçek proje verileri · Yapılandırılabilir Gemini
            desteği
          </p>
        </div>
        <div className="product-preview" aria-label="Örnek proje önizlemesi">
          <div className="row between preview-toolbar">
            <Logo />
            <span className="badge">Örnek görünüm</span>
          </div>
          <div className="row between">
            <h2>İlk ürün lansmanı</h2>
            <span className="badge green">Planlama</span>
          </div>
          <p className="muted" style={{ fontSize: 12, margin: "8px 0 20px" }}>
            Fikirden ilk çalışan sürüme.
          </p>
          <div className="task-card">
            <TaskCardContent
              projectKey="SHIP"
              task={{
                number: 1,
                title: "Ürünün temel akışını tanımla",
                priority: "high",
              }}
            />
          </div>
          <div className="task-card">
            <TaskCardContent
              projectKey="SHIP"
              task={{
                number: 2,
                title: "İlk kullanıcı deneyimini geliştir",
                priority: "medium",
              }}
            />
          </div>
          <div
            className="row"
            style={{ marginTop: 20, color: "var(--accent)", fontSize: 12 }}
          >
            <Check size={15} /> Her büyük proje, net bir sonraki adımla başlar.
          </div>
        </div>
      </section>
      <section id="features" className="feature-strip">
        <div>
          <LayoutGrid size={21} />
          <h3 style={{ marginTop: 15 }}>İşin tamamını gör</h3>
          <p>
            Çalışma alanları, projeler ve sürükle-bırak Kanban ile görevlerini
            düzenle.
          </p>
        </div>
        <div>
          <Sparkles size={21} />
          <h3 style={{ marginTop: 15 }}>Birlikte düşün</h3>
          <p>
            Gemini ile görev önerileri hazırla. Düzenle, gözden geçir ve
            onayladıklarını kaydet.
          </p>
        </div>
        <div>
          <ShieldCheck size={21} />
          <h3 style={{ marginTop: 15 }}>Sağlam bir temel</h3>
          <p>
            PostgreSQL üzerinde kalıcı veriler, oturum yönetimi ve çalışma alanı
            yetkilendirmesi.
          </p>
        </div>
      </section>
      <footer className="marketing-footer">
        <Logo />
        <span>Geliştirenler için, odaklanarak tasarlandı.</span>
        <Link href="/setup">Yerel kurulum</Link>
      </footer>
    </main>
  );
}
