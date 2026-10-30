import Link from "next/link";
import {
  ArrowRight,
  Check,
  FolderKanban,
  GitCommitHorizontal,
  GitMerge,
  GitPullRequest,
  History,
  ShieldCheck,
  Sparkles,
  Tags,
  UserPlus,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/marketing/site-header";
import { ProductPreview } from "@/components/marketing/product-preview";

// Only features that exist in the product today. Everything else is listed
// separately as roadmap so the page never advertises what isn't built.
const features = [
  {
    icon: FolderKanban,
    title: "Kanban panosu",
    text: "Görevleri sürükleyip bırak. Durum değişiklikleri anında kaydedilir ve aktivite geçmişine yazılır.",
  },
  {
    icon: Sparkles,
    title: "AI görev önerileri",
    text: "Ne yapmak istediğini yaz; Gemini kabul kriterleriyle birlikte görev önersin. Sen onaylamadan hiçbir şey kaydedilmez.",
  },
  {
    icon: Tags,
    title: "Akıllı görevler",
    text: "FORGE-24 biçiminde benzersiz anahtarlar, öncelik, etiket, atanan kişi, son tarih ve tahmin puanı.",
  },
  {
    icon: UserPlus,
    title: "Ekip çalışma alanları",
    text: "Tek kullanımlık bağlantılarla ekip arkadaşlarını davet et. Sahip, yönetici, üye ve izleyici rolleri.",
  },
  {
    icon: ShieldCheck,
    title: "Sunucu tarafı yetki",
    text: "Her işlem çalışma alanı üyeliğine göre sunucuda doğrulanır. İzleyiciler okur, yazamaz.",
  },
  {
    icon: History,
    title: "Aktivite geçmişi",
    text: "Kim neyi ne zaman değiştirdi; görev oluşturma, güncelleme ve silme olayları kalıcı olarak saklanır.",
  },
];

const roadmap = [
  "GitHub senkronizasyonu",
  "AI günlük özet",
  "Sprint planlama",
  "Proje sağlık skoru",
  "Markdown dokümanlar",
  "Raporlar",
];

const workflow: [string, string, boolean][] = [
  ["Fikir", "Ne geliştirmek istediğini birkaç cümleyle anlat.", true],
  ["AI planı", "Gemini fikri somut görevlere böler.", true],
  ["Görevler", "Önerileri düzenle, onayla, panoya ekle.", true],
  ["Sprint", "Görevleri zaman kutularına yerleştir.", false],
  ["Geliştirme", "Ekip görevleri sahiplenir ve ilerletir.", true],
  ["GitHub aktivitesi", "Commit ve PR'lar görevlere bağlanır.", false],
  ["AI analizi", "Gerçek veriden ilerleme ve risk çıkarımı.", false],
  ["Sıradaki adım", "Neye odaklanman gerektiği netleşir.", false],
];

const plans = [
  {
    name: "Ücretsiz",
    price: "₺0",
    note: "Erken sürüm boyunca",
    items: [
      "Projeler ve Kanban panosu",
      "Etiket, atama, son tarih, puan",
      "Saatte 10 AI öneri isteği",
      "Ekip daveti ve roller",
    ],
    cta: "Ücretsiz başla",
    featured: true,
  },
  {
    name: "Pro",
    price: "Yakında",
    note: "Bireysel geliştiriciler için",
    items: [
      "Sınırsız kişisel proje",
      "GitHub zekâsı",
      "Gelişmiş AI özellikleri",
      "Raporlar",
    ],
  },
  {
    name: "Ekip",
    price: "Yakında",
    note: "Küçük yazılım ekipleri için",
    items: [
      "Ortak çalışma alanları",
      "Ekip analitiği",
      "Artırılmış AI kullanımı",
      "Öncelikli destek",
    ],
  },
];

export default function Home() {
  return (
    <main className="marketing">
      <SiteHeader />

      <section className="hero">
        <div className="container">
          <span className="hero-badge">
            <span className="badge accent">Yeni</span>
            Erken sürüm açık · Ücretsiz
          </span>
          <h1>
            Projeleri netlikle yönet.{" "}
            <span className="quiet">Karmaşayı yapay zekâ toplasın.</span>
          </h1>
          <p className="hero-lead">
            ForgePilot, yazılım ekiplerinin işi planlamasına, görevleri
            yönetmesine ve sırada ne olduğunu görmesine yardım eder. AI önerir;
            karar her zaman senin.
          </p>
          <div className="hero-actions">
            <Button size="lg" asChild>
              <Link href="/register">
                Projeni oluştur <ArrowRight size={15} />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#product">Ürünü incele</a>
            </Button>
          </div>
          <div className="hero-meta">
            <span>
              <Check size={13} /> Kredi kartı gerekmez
            </span>
            <span>
              <Check size={13} /> Veriler PostgreSQL&apos;de kalıcı
            </span>
            <span>
              <Check size={13} /> Açık ve koyu tema
            </span>
          </div>
        </div>
      </section>

      <section className="showcase" id="product" aria-label="Ürün önizlemesi">
        <div className="container">
          <ProductPreview />
        </div>
      </section>

      <section className="section" id="features">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Özellikler</span>
            <h2>Bugün çalışan, abartısız bir temel.</h2>
            <p>
              Burada gördüğün her özellik üründe gerçekten var. Henüz
              geliştirilenleri ayrı listeliyoruz.
            </p>
          </div>
          <div className="feature-grid">
            {features.map(({ icon: Icon, title, text }) => (
              <article className="feature" key={title}>
                <span className="feature-icon">
                  <Icon size={16} />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
          <div className="roadmap-list">
            <span className="badge">Yol haritası</span>
            {roadmap.map((r, i) => (
              <span key={r}>
                {r}
                {i < roadmap.length - 1 && (
                  <span className="subtle" aria-hidden>
                    {"  ·"}
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="workflow-title">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">İş akışı</span>
            <h2 id="workflow-title">Fikirden bir sonraki adıma.</h2>
            <p>
              ForgePilot&apos;un hedeflediği döngü bu. Hangi adımın bugün
              çalıştığını açıkça işaretledik.
            </p>
          </div>
          <ol className="workflow">
            {workflow.map(([title, text, live]) => (
              <li key={title}>
                <h3>{title}</h3>
                <p>{text}</p>
                <span className="state">
                  {live ? (
                    <span className="badge live">
                      <span className="dot" /> Kullanılabilir
                    </span>
                  ) : (
                    <span className="badge">Yakında</span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section" id="github">
        <div className="container split">
          <div className="section-head">
            <span className="eyebrow">
              GitHub entegrasyonu · Geliştiriliyor
            </span>
            <h2>Commit&apos;ler görevlerle konuşur.</h2>
            <p>
              Depo bağlandığında commit ve pull request&apos;ler ilgili görevle
              eşleşir. AI ilerlemeyi yalnızca gerçek GitHub verisinden yorumlar.
            </p>
            <ul className="check-list">
              <li>
                <Check size={15} /> Commit mesajındaki veya PR başlığındaki
                görev anahtarıyla (FORGE-24) otomatik eşleşme
              </li>
              <li>
                <Check size={15} /> İmzalı webhook&apos;lar ve depo bazlı erişim
              </li>
              <li>
                <Check size={15} /> AI görevi asla kendiliğinden kapatmaz;
                yalnızca öneride bulunur
              </li>
            </ul>
          </div>
          <div>
            <div className="event-card">
              <header>
                <div>
                  <span className="project-key">FORGE-24</span>
                  <h3>Kimlik doğrulama sistemi</h3>
                </div>
                <span className="badge">Devam ediyor</span>
              </header>
              <ul className="event-list">
                <li>
                  <GitCommitHorizontal size={15} />
                  <span>
                    Commit algılandı
                    <br />
                    <code>feat(auth): add JWT login FORGE-24</code>
                  </span>
                  <time>2 sa önce</time>
                </li>
                <li>
                  <GitPullRequest size={15} />
                  <span>
                    PR #18 açıldı · <code>auth/jwt-login</code>
                  </span>
                  <time>1 sa önce</time>
                </li>
                <li>
                  <GitMerge size={15} />
                  <span>PR #18 birleştirildi</span>
                  <time>12 dk önce</time>
                </li>
              </ul>
              <div className="ai-note">
                <strong>
                  <Sparkles size={13} /> AI önerisi
                </strong>
                Kimlik doğrulama büyük ölçüde tamamlanmış görünüyor. Yenileme
                token&apos;ı testleri hâlâ eksik.
                <div className="row">
                  <Button size="sm" variant="outline" tabIndex={-1}>
                    Kanıtı incele
                  </Button>
                  <Button size="sm" variant="ghost" tabIndex={-1}>
                    Yoksay
                  </Button>
                </div>
              </div>
            </div>
            <p className="caption">
              Örnek görünüm. GitHub entegrasyonu şu anda geliştirme aşamasında.
            </p>
          </div>
        </div>
      </section>

      <section className="section" id="pricing">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Fiyatlandırma</span>
            <h2>Erken sürümde ücretsiz.</h2>
            <p>
              Ücretli planlar entegrasyonlar tamamlandığında açılacak. Ödeme
              altyapısı henüz aktif değil.
            </p>
          </div>
          <div className="pricing-grid">
            {plans.map((p) => (
              <article
                key={p.name}
                className={`plan ${p.featured ? "featured" : ""}`}
              >
                <div>
                  <h3>{p.name}</h3>
                  <p className="subtle" style={{ fontSize: 13 }}>
                    {p.note}
                  </p>
                </div>
                <div className="plan-price">{p.price}</div>
                <ul>
                  {p.items.map((i) => (
                    <li key={i}>
                      <Check size={14} /> {i}
                    </li>
                  ))}
                </ul>
                {p.cta ? (
                  <Button asChild>
                    <Link href="/register">{p.cta}</Link>
                  </Button>
                ) : (
                  <Button variant="outline" disabled>
                    Yakında
                  </Button>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-band">
        <div className="container">
          <h2>İlk projeni beş dakikada kur.</h2>
          <p>
            Çalışma alanını oluştur, ekibini davet et ve ilk görevlerini AI ile
            planla.
          </p>
          <div className="row" style={{ justifyContent: "center" }}>
            <Button size="lg" asChild>
              <Link href="/register">
                Ücretsiz başla <ArrowRight size={15} />
              </Link>
            </Button>
            <Button size="lg" variant="ghost" asChild>
              <Link href="/login">Giriş yap</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <Logo />
              <p className="muted" style={{ marginTop: 12, maxWidth: 260 }}>
                Yazılım ekipleri için proje yönetimi. Planla, geliştir, sıradaki
                adımı gör.
              </p>
            </div>
            <div>
              <h4>Ürün</h4>
              <ul>
                <li>
                  <a href="#features">Özellikler</a>
                </li>
                <li>
                  <a href="#github">GitHub entegrasyonu</a>
                </li>
                <li>
                  <a href="#pricing">Fiyatlandırma</a>
                </li>
              </ul>
            </div>
            <div>
              <h4>Geliştiriciler</h4>
              <ul>
                <li>
                  <Link href="/setup">Yerel kurulum</Link>
                </li>
                <li>
                  <a
                    href="https://github.com/LordAurora/forgepilot"
                    target="_blank"
                    rel="noreferrer"
                  >
                    GitHub
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4>Kaynaklar</h4>
              <ul>
                <li>
                  <a href="#product">Ürün turu</a>
                </li>
                <li>
                  <Link href="/login">Giriş yap</Link>
                </li>
              </ul>
            </div>
            <div>
              <h4>Yasal</h4>
              <ul>
                <li className="subtle">Gizlilik (hazırlanıyor)</li>
                <li className="subtle">Koşullar (hazırlanıyor)</li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 ForgePilot</span>
            <span>Erken sürüm · Geliştirme aşamasında</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
