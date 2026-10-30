# ForgePilot

AI destekli yazılım proje yönetimi. Bu depo ürünün **ilk uçtan uca geliştirme dilimini** içerir; tam ürün henüz tamamlanmış değildir.

## Mevcut kapsam

- Next.js App Router, React, strict TypeScript, Tailwind ve shadcn uyumlu Button bileşeni.
- Açık/koyu/sistem teması; tema tercihi tarayıcıda saklanır.
- Better Auth e-posta/parola oturumu; yapılandırıldığında Google/GitHub sosyal giriş.
- PostgreSQL + Drizzle şeması, migration ve isteğe bağlı örnek veri komutu.
- Çalışma alanı oluşturma, proje oluşturma/listeleme ve proje özeti.
- Görev oluşturma, düzenleme, silme ve dnd-kit Kanban; form üzerinden erişilebilir durum değiştirme.
- Çalışma alanı üyeliğine bağlı sunucu yetkilendirmesi. Viewer rolü yazamaz.
- Atomik görev numaralama, görev hareketleri ve görev sayısından hesaplanan ilerleme.
- Gemini ile görev önerileri; düzenleme ve açık onaydan sonra toplu kayıt.
- Eksik bağlantılar için kurulum ve hata durumları. Uygulama verileri mock dizilerde veya localStorage'da tutulmaz.

## Gereksinimler ve yerel kurulum

Node.js 22 LTS veya daha yeni desteklenen sürüm, npm ve PostgreSQL gerekir. Docker Compose yalnızca yerel PostgreSQL başlatmak için isteğe bağlıdır.

```powershell
npm install
Copy-Item .env.example .env
# .env içindeki DATABASE_URL, BETTER_AUTH_URL ve BETTER_AUTH_SECRET değerlerini düzenleyin.
docker compose up -d
npm run db:migrate
npm run dev
```

Docker yoksa kendi PostgreSQL sunucunuzun bağlantısını `DATABASE_URL` olarak kullanın. Compose parolası yalnızca yerel geliştirme içindir. Rastgele oturum sırrı üretmek için:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Uygulama: [localhost:3000](http://localhost:3000). İlk kayıt sonrasında çalışma alanı, proje ve görev oluşturun. Şema değişiklikleri için `npm run db:generate`, uygulamak için `npm run db:migrate` kullanın. Migration üretimi veritabanına bağlanmaz.

## Seed

Önce uygulamada kendi hesabınızı oluşturun. Seed, varsayılan parola veya anonim demo kullanıcı oluşturmaz.

```powershell
$env:SEED_USER_EMAIL = "your-registered-email@example.com"
npm run db:seed
```

Hesabınıza `Acme Labs · Seed` çalışma alanı ve dört örnek görev eklenir. Yeniden çalıştırmak aynı kullanıcı için ikinci bir örnek çalışma alanı oluşturmaz.

## Ortam değişkenleri

| Değişken | Kullanım |
| --- | --- |
| `DATABASE_URL` | PostgreSQL bağlantısı; gerekli |
| `BETTER_AUTH_SECRET` | Rastgele en az 32 karakter; gerekli |
| `BETTER_AUTH_URL` | Uygulama origin'i; yerelde `http://localhost:3000` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | İsteğe bağlı Google OAuth |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | İsteğe bağlı GitHub OAuth girişi |
| `GEMINI_API_KEY` | Görev önerileri için Gemini anahtarı |
| `GEMINI_MODEL` | Hesabınızın erişebildiği structured-output modeli; varsayılan `gemini-2.5-flash` |
| `SEED_USER_EMAIL` | Seed hedefi olan kayıtlı kullanıcı |

OAuth geri dönüş adresleri: `/api/auth/callback/google` ve `/api/auth/callback/github`. Provider konsolunda tam origin ile kaydedin. GitHub ile giriş, repository erişimi sağlayan GitHub App entegrasyonu değildir.

Gemini yalnızca butonla çağrılır. Proje adı/açıklaması ve en fazla 200 mevcut görev başlığı sağlayıcıya gönderilir. Yanıt Zod ile doğrulanır ve otomatik kaydedilmez. Kullanıcı başına saatte 10 deneme limiti PostgreSQL üzerinde atomik olarak uygulanır; başarısız sağlayıcı çağrıları da deneme sayılır. Anahtarlar client bundle'a eklenmez. `AIProvider` arayüzünün şu an yalnızca `generateTasks` yöntemi uygulanmıştır.

## Mimari

```text
src/app/                    Rotalar, sunucu sayfaları, auth endpoint'i
src/components/             Ortak arayüz, formlar, tema
src/features/tasks/         Kanban ve giriş/AI şemaları
src/server/auth/            Better Auth yapılandırması
src/server/db/              PostgreSQL havuzu ve Drizzle şeması
src/server/projects/        Üyelik kontrolleri ve veri sorguları
src/server/ai/              Gemini sağlayıcısı ve öneri işlemi
src/server/actions.ts       Yetkilendirilmiş veri mutasyonları
drizzle/                    SQL migration ve şema snapshot'ları
scripts/                    Migration ve seed komutları
```

Server Actions kullanıcı oturumunu doğrular, hedef projenin çalışma alanı üyeliğini kontrol eder ve girdileri Zod ile doğrular. Birden çok görevin kaydı ile görev sayacı ve hareket kaydı aynı transaction içindedir. Tema dışındaki kalıcı uygulama verileri PostgreSQL'dedir.

## Kontroller

```powershell
npm run typecheck
npm run build
```

Yerel HTTP kontrolünde `/` ve `/register` 200, eksik ayarlarda `/app` → `/setup` 307 ve auth endpoint'i 503 döndü. Ana sayfa ve kurulum durumu tarayıcıda incelendi. Gerçek veriyle Kanban sürükleme ve tüm ekranların masaüstü/mobil görsel testi henüz tamamlanmadı.

Kurulum denetiminde runtime bağımlılıklarında açık bildirilmedi; Drizzle Kit'in geliştirme araç zincirinde dört orta önem düzeyinde bağımlılık bildirimi vardı. Otomatik öneri eski Drizzle Kit sürümüne geçiş gerektirdiği için uygulanmadı.

## Sonraki aşamalar

İlerleme ve kabul kriterleri [BUILD_PLAN.md](BUILD_PLAN.md) dosyasındadır. Henüz uygulanmayanlar: parola sıfırlama/e-posta gönderimi, davetler ve rol yönetimi arayüzü, proje düzenleme/silme, özel Kanban kolonları, yorumlar/etiketler/atamalar, sprintler, AI proje üretimi, Markdown Docs/şablonlar/sürümler, GitHub App/webhook'lar, Redis/BullMQ worker'ları, sağlık skoru, günlük özet, arama, bildirimler ve raporlar.

GitHub App kurulumu ve Redis worker komutları bu aşamada mevcut değildir. `.env.example` içindeki ilgili alanlar sonraki aşamalar için ayrılmıştır. Bu entegrasyonları çalışıyor gibi göstermiyoruz. Üretime açmadan önce gerçek PostgreSQL üzerinde uçtan uca oturum/veri izolasyonu testleri, e-posta teslimatı ve operasyonel ayarlar tamamlanmalıdır.

## Ekran görüntüleri

Doğrulanmış tarayıcı görüntüleri sonraki görsel kontrol aşamasında eklenecek.

## Referanslar

- [Next.js kurulumu](https://nextjs.org/docs/app/getting-started/installation)
- [Better Auth kurulumu](https://better-auth.com/docs/installation)
- [Gemini structured outputs](https://ai.google.dev/gemini-api/docs/structured-output)
