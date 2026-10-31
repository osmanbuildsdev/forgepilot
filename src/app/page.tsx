import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bell,
  Check,
  CircleCheck,
  Command,
  FileText,
  FolderKanban,
  GitCommitHorizontal,
  GitMerge,
  GitPullRequest,
  ListTree,
  Map as MapIcon,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/marketing/site-header";
import { ProductPreview } from "@/components/marketing/product-preview";
import { ProductTour } from "@/components/marketing/product-tour";
import { CountUp, Reveal } from "@/components/marketing/reveal";

const numbers: [number, string, string][] = [
  [0, "", "AI'ın onayın olmadan yaptığı değişiklik"],
  [6, "", "açıklanabilir sağlık skoru faktörü"],
  [10, "", "hazır doküman şablonu"],
  [4, "", "rol: sahip, yönetici, üye, izleyici"],
];

// Each row contrasts a common habit of PM tools with what ForgePilot does.
const contrasts: [string, string, string][] = [
  [
    "AI ile değişiklik",
    "AI görevleri ve metni doğrudan değiştirir; ne olduğunu sonradan fark edersin.",
    "AI yalnızca önerir. Görev, doküman ve sprint değişiklikleri önizlenir, sen onaylamadan yazılmaz.",
  ],
  [
    "Görev durumu",
    "Durum, birinin kartı taşımayı hatırlamasına bağlıdır.",
    "Commit, PR ve CI hareketi görevle eşleşir. Birleşen PR tamamlanma önerisi oluşturur, kanıtıyla birlikte.",
  ],
  [
    "Proje sağlığı",
    "Ya hiç yoktur ya da nasıl hesaplandığı belirsiz bir AI puanıdır.",
    "Altı ölçülebilir faktörden hesaplanan skor. Her puan kaybının nedeni görünür.",
  ],
  [
    "AI sohbet",
    "Asistan var olmayan görev veya PR'lardan söz edebilir.",
    "Copilot'un her referansı veritabanında doğrulanır; bulunamayan referans cevaptan çıkarılır.",
  ],
  [
    "Dokümanlar",
    "Ayrı bir araçta yaşar, projeyle bağı kopar.",
    "Markdown dokümanlar proje içinde; şablonlar proje verisiyle dolar, sürüm geçmişi ve diff hazır.",
  ],
  [
    "Dil",
    "Türkçe arayüz sonradan eklenmiştir; ı/İ aramada sorun çıkarır.",
    "Baştan Türkçe. Arama noktalı ve noktasız i farkını doğru yönetir.",
  ],
];

const features = [
  {
    icon: FolderKanban,
    title: "Kanban ve özel kolonlar",
    text: "Sürükle-bırak pano, duruma bağlı özel kolonlar ve sprint filtresi. Kolon adını değiştirmek raporları bozmaz.",
  },
  {
    icon: ListTree,
    title: "Ayrıntılı görevler",
    text: "FORGE-24 anahtarları, alt görevler, bağımlılıklar (döngü kontrolüyle), yorumlar, etiketler ve dosya ekleri.",
  },
  {
    icon: MapIcon,
    title: "Sprintler ve yol haritası",
    text: "Sprint planla, başlat, kapat. Hız geçmişi, retrospektif notları ve görevlerden hesaplanan milestone ilerlemesi.",
  },
  {
    icon: FileText,
    title: "Markdown dokümanlar",
    text: "İçe aktar, canlı önizle, sürümler arası diff gör, geri yükle. Şablonları proje verisiyle doldur, .md olarak dışa aktar.",
  },
  {
    icon: Sparkles,
    title: "AI proje planı",
    text: "Fikrini anlat; milestone, sprint ve görevlerden oluşan bir plan önizle, düzenle, tek onayla oluştur.",
  },
  {
    icon: BarChart3,
    title: "Raporlar",
    text: "Haftalık ilerleme, sprint tamamlama, ekip iş yükü ve GitHub hareketi. Her grafik tablo görünümüyle gelir.",
  },
  {
    icon: Bell,
    title: "Bildirim ve hatırlatmalar",
    text: "Atama, yorum, yaklaşan son tarih ve biten sprint bildirimleri. Kendi yaptığın işlem için bildirim almazsın.",
  },
  {
    icon: Command,
    title: "Ctrl+K komut paleti",
    text: "Görev, proje ve kişi ara; sayfalar arasında klavyeden geçiş yap. Anahtarla doğrudan göreve git.",
  },
  {
    icon: ShieldCheck,
    title: "Ekip ve yetki",
    text: "Davet bağlantıları ve dört rol. Her işlem çalışma alanı üyeliğine göre sunucuda doğrulanır.",
  },
];

const workflow: [string, string, string][] = [
  ["Fikir", "Ne geliştirmek istediğini birkaç cümleyle anlat.", "Proje oluşturucu"],
  ["AI planı", "Gemini fikri milestone, sprint ve görevlere böler.", "Plan önizleme"],
  ["Görevler", "Önerileri düzenle, onayla, panoya ekle.", "Kanban"],
  ["Sprint", "Geçmiş hızdan hesaplanan kapasiteyle planla.", "Sprint planlama"],
  ["Geliştirme", "Ekip görevleri sahiplenir, yorumlar, dosya ekler.", "Görev paneli"],
  ["GitHub hareketi", "Commit, PR ve CI sonuçları görevlere bağlanır.", "GitHub"],
  ["Analiz", "Sağlık skoru ve günlük özet riskleri öne çıkarır.", "Günlük özet"],
  ["Sıradaki adım", "Copilot neye odaklanman gerektiğini kanıtıyla söyler.", "Copilot"],
];

const faqs: [string, string][] = [
  [
    "AI verilerimi kendi başına değiştirir mi?",
    "Hayır. AI'ın ürettiği her plan, görev, doküman bölümü veya sprint önerisi önce önizlenir. Değişiklik yalnızca sen onayladığında ve sunucuda yeniden doğrulandıktan sonra kaydedilir.",
  ],
  [
    "AI anahtarı olmadan kullanabilir miyim?",
    "Evet. Görevler, sprintler, dokümanlar, raporlar ve GitHub entegrasyonu AI olmadan çalışır. AI özellikleri yapılandırılmadığında arayüzde kapalı görünür ve nedeni yazar.",
  ],
  [
    "GitHub entegrasyonu hangi izinleri istiyor?",
    "GitHub App salt okunur izinlerle çalışır: içerik, metadata, pull request ve check'ler. Webhook imzaları doğrulanır, her olay bir kez işlenir. ForgePilot depona yazmaz.",
  ],
  [
    "Verilerim nerede saklanıyor?",
    "Tüm veriler, dosya ekleri dahil, PostgreSQL'de saklanır. Kendi sunucunda çalıştırırsan veritabanı da senin kontrolündedir.",
  ],
  [
    "Kendi sunucumda çalıştırabilir miyim?",
    "Evet. Next.js ve PostgreSQL yeterli; Redis isteğe bağlı. Kurulum adımları ve ortam değişkenleri depodaki README'de.",
  ],
  [
    "Ücretli mi?",
    "Erken sürüm boyunca ücretsiz. Ödeme altyapısı henüz yok; ücretli planlar açıldığında önceden duyurulacak.",
  ],
];

const plans = [
  {
    name: "Ücretsiz",
    price: "₺0",
    note: "Erken sürüm boyunca",
    items: [
      "Tüm proje yönetimi özellikleri",
      "Markdown dokümanlar ve şablonlar",
      "GitHub entegrasyonu",
      "Saatlik sınırlarla AI özellikleri",
    ],
    cta: "Ücretsiz başla",
    featured: true,
  },
  {
    name: "Pro",
    price: "Yakında",
    note: "Bireysel geliştiriciler için",
    items: ["Daha yüksek AI kullanım sınırları", "Gelişmiş raporlar", "Öncelikli yeni özellikler"],
  },
  {
    name: "Ekip",
    price: "Yakında",
    note: "Küçük yazılım ekipleri için",
    items: ["Ekip analitiği", "Artırılmış AI kullanımı", "Öncelikli destek"],
  },
];

export default function Home() {
  return (
    <main className="marketing">
      <SiteHeader />

      <section className="hero">
        <div className="container">
          <span className="hero-badge hero-in">
            <span className="badge accent">Yeni</span>
            GitHub, Copilot ve dokümanlar yayında
          </span>
          <h1 className="hero-in" style={{ animationDelay: "60ms" }}>
            Projeleri netlikle yönet.{" "}
            <span className="quiet">Karmaşayı yapay zekâ toplasın.</span>
          </h1>
          <p className="hero-lead hero-in" style={{ animationDelay: "120ms" }}>
            ForgePilot görevleri, sprintleri, dokümanları ve GitHub hareketini
            tek yerde birleştirir. AI önerir ve kanıtını gösterir; karar her
            zaman senin.
          </p>
          <div className="hero-actions hero-in" style={{ animationDelay: "180ms" }}>
            <Button size="lg" asChild>
              <Link href="/register">
                Projeni oluştur <ArrowRight size={15} />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#tour">Ürün turuna bak</a>
            </Button>
          </div>
          <div className="hero-meta hero-in" style={{ animationDelay: "240ms" }}>
            <span>
              <Check size={13} /> Kredi kartı gerekmez
            </span>
            <span>
              <Check size={13} /> Onaysız AI değişikliği yok
            </span>
            <span>
              <Check size={13} /> Kendi sunucunda çalıştırılabilir
            </span>
          </div>
        </div>
      </section>

      <section className="showcase" id="product" aria-label="Ürün önizlemesi">
        <div className="container">
          <ProductPreview />
        </div>
      </section>

      <section className="numbers" aria-label="Kısaca ForgePilot">
        <div className="container numbers-grid">
          {numbers.map(([value, suffix, label], i) => (
            <Reveal key={label} className="number" delay={i * 80}>
              <strong>
                <CountUp value={value} suffix={suffix} />
              </strong>
              <span>{label}</span>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="section" id="why" aria-labelledby="why-title">
        <div className="container">
          <Reveal className="section-head">
            <span className="eyebrow">Neden ForgePilot</span>
            <h2 id="why-title">Bildiğin proje yönetimi, eksik parçaları tamamlanmış hâliyle.</h2>
            <p>
              Çoğu araç görevi kaydeder ve orada bırakır. ForgePilot işin
              gerçekte nerede olduğunu kod hareketinden, ölçülebilir verilerden
              ve doğrulanmış AI çıktısından çıkarır.
            </p>
          </Reveal>
          <div className="contrast" role="table" aria-label="Karşılaştırma">
            <div className="contrast-row contrast-head" role="row">
              <span role="columnheader" />
              <span role="columnheader">Alışılmış araçlarda</span>
              <span role="columnheader">ForgePilot&apos;ta</span>
            </div>
            {contrasts.map(([topic, usual, ours], i) => (
              <Reveal key={topic} className="contrast-row" delay={i * 60}>
                <span className="contrast-topic" role="rowheader">
                  {topic}
                </span>
                <span className="contrast-usual" role="cell">
                  <X size={14} aria-hidden /> {usual}
                </span>
                <span className="contrast-ours" role="cell">
                  <CircleCheck size={14} aria-hidden /> {ours}
                </span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="tour" aria-labelledby="tour-title">
        <div className="container">
          <Reveal className="section-head">
            <span className="eyebrow">Ürün turu</span>
            <h2 id="tour-title">Farkı yakından gör.</h2>
            <p>
              Diğer araçlarda bulamayacağın dört parça. Sekmeler arasında
              gezin; örnekler ürünün gerçek davranışını yansıtır.
            </p>
          </Reveal>
          <Reveal>
            <ProductTour />
          </Reveal>
        </div>
      </section>

      <section className="section" id="features">
        <div className="container">
          <Reveal className="section-head">
            <span className="eyebrow">Özellikler</span>
            <h2>Bir ekibin ihtiyaç duyduğu her şey.</h2>
            <p>
              Burada listelenen her özellik üründe bugün çalışıyor. Ayrı bir
              doküman aracına, rapor eklentisine veya entegrasyon servisine
              gerek yok.
            </p>
          </Reveal>
          <div className="feature-grid">
            {features.map(({ icon: Icon, title, text }, i) => (
              <Reveal as="article" className="feature" key={title} delay={(i % 3) * 70}>
                <span className="feature-icon">
                  <Icon size={16} />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="workflow-title">
        <div className="container">
          <Reveal className="section-head">
            <span className="eyebrow">İş akışı</span>
            <h2 id="workflow-title">Fikirden bir sonraki adıma.</h2>
            <p>
              Döngünün her adımı üründe bir ekrana karşılık gelir. Bir adımda
              ürettiğin veri sonraki adımı besler.
            </p>
          </Reveal>
          <ol className="workflow">
            {workflow.map(([title, text, where], i) => (
              <Reveal as="li" key={title} delay={(i % 4) * 70}>
                <h3>{title}</h3>
                <p>{text}</p>
                <span className="state">
                  <span className="badge live">
                    <span className="dot" /> {where}
                  </span>
                </span>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section className="section" id="github">
        <div className="container split">
          <Reveal className="section-head">
            <span className="eyebrow">GitHub entegrasyonu</span>
            <h2>Commit&apos;ler görevlerle konuşur.</h2>
            <p>
              Depoyu bağladığında commit, pull request ve CI sonuçları ilgili
              görevle eşleşir. İlerleme, birinin kartı taşımasını beklemeden
              görünür olur.
            </p>
            <ul className="check-list">
              <li>
                <Check size={15} /> Commit mesajı, PR başlığı veya dal adındaki
                görev anahtarıyla (FORGE-24) eşleşme
              </li>
              <li>
                <Check size={15} /> İmzalı webhook&apos;lar, salt okunur izinler,
                her olay bir kez işlenir
              </li>
              <li>
                <Check size={15} /> Birleşen PR görevi kapatmaz; kanıtlı bir
                tamamlanma önerisi oluşturur
              </li>
              <li>
                <Check size={15} /> Son yedi günün hareketinden AI geliştirme
                özeti
              </li>
            </ul>
          </Reveal>
          <Reveal delay={120}>
            <div className="event-card">
              <header>
                <div>
                  <span className="project-key">FORGE-24</span>
                  <h3>Kimlik doğrulama sistemi</h3>
                </div>
                <span className="badge">Devam ediyor</span>
              </header>
              <ul className="event-list">
                <Reveal as="li" delay={250}>
                  <GitCommitHorizontal size={15} />
                  <span>
                    Commit algılandı
                    <br />
                    <code>feat(auth): add JWT login FORGE-24</code>
                  </span>
                  <time>2 sa önce</time>
                </Reveal>
                <Reveal as="li" delay={450}>
                  <GitPullRequest size={15} />
                  <span>
                    PR #18 açıldı · <code>FORGE-24-jwt-login</code>
                  </span>
                  <time>1 sa önce</time>
                </Reveal>
                <Reveal as="li" delay={650}>
                  <GitMerge size={15} />
                  <span>PR #18 birleştirildi · CI başarılı</span>
                  <time>12 dk önce</time>
                </Reveal>
              </ul>
              <Reveal className="ai-note" delay={850}>
                <strong>
                  <Sparkles size={13} /> Tamamlanma önerisi
                </strong>
                PR #18 birleştirildi ve kontroller geçti. FORGE-24&apos;ü
                tamamlandı olarak işaretlemek ister misin?
                <div className="row">
                  <Button size="sm" tabIndex={-1}>
                    Onayla
                  </Button>
                  <Button size="sm" variant="ghost" tabIndex={-1}>
                    Yoksay
                  </Button>
                </div>
              </Reveal>
            </div>
            <p className="caption">Örnek görünüm.</p>
          </Reveal>
        </div>
      </section>

      <section className="section" id="pricing">
        <div className="container">
          <Reveal className="section-head">
            <span className="eyebrow">Fiyatlandırma</span>
            <h2>Erken sürümde ücretsiz.</h2>
            <p>
              Ödeme altyapısı henüz aktif değil. Ücretli planlar açıldığında
              önceden duyurulacak.
            </p>
          </Reveal>
          <div className="pricing-grid">
            {plans.map((p, i) => (
              <Reveal
                as="article"
                key={p.name}
                className={`plan ${p.featured ? "featured" : ""}`}
                delay={i * 80}
              >
                <div>
                  <h3>{p.name}</h3>
                  <p className="subtle" style={{ fontSize: 13 }}>
                    {p.note}
                  </p>
                </div>
                <div className="plan-price">{p.price}</div>
                <ul>
                  {p.items.map((item) => (
                    <li key={item}>
                      <Check size={14} /> {item}
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
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="faq" aria-labelledby="faq-title">
        <div className="container faq-layout">
          <Reveal className="section-head">
            <span className="eyebrow">SSS</span>
            <h2 id="faq-title">Sık sorulan sorular.</h2>
            <p>Cevabını bulamadığın bir şey varsa depoda bir issue aç.</p>
          </Reveal>
          <div className="faq">
            {faqs.map(([q, a], i) => (
              <Reveal key={q} delay={i * 50}>
                <details>
                  <summary>{q}</summary>
                  <p>{a}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-band">
        <Reveal className="container">
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
        </Reveal>
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
                  <a href="#tour">Ürün turu</a>
                </li>
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
                  <a href="#why">Neden ForgePilot</a>
                </li>
                <li>
                  <a href="#faq">SSS</a>
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
            <span>Erken sürüm</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
