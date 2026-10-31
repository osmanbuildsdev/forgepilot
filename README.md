# ForgePilot

Yazılım ekipleri için proje yönetimi. Görevleri planla, sprintleri yürüt, GitHub
hareketini görevlerle eşleştir ve sırada ne olduğunu gör. AI (Gemini) öneri
yapar; görev, doküman ve sprint değişiklikleri kullanıcı onaylamadan
uygulanmaz.

> Durum: erken sürüm, aktif geliştirme. Ayrıntılı ilerleme için
> [PROGRESS.md](PROGRESS.md).

## Ekran görüntüleri

_Eklenecek._

## Özellikler

- **Çalışma alanları ve ekip:** davet bağlantıları, sahip / yönetici / üye / izleyici rolleri, sunucu tarafı yetki kontrolü
- **Görevler:** `FORGE-24` biçiminde anahtarlar, öncelik, atanan kişi, son tarih, puan, etiket, alt görev, bağımlılık (döngü kontrolü), yorum, dosya eki
- **Kanban:** sürükle-bırak, duruma bağlı özel kolonlar, sprint filtresi
- **Planlama:** sprintler (hız geçmişi, retrospektif), milestone'lar ve yol haritası
- **Dokümanlar:** Markdown içe aktarma, canlı önizleme, sürüm geçmişi ve diff, 10 hazır şablon, proje verisiyle doldurulan yer tutucular, `.md` dışa aktarma
- **AI (Gemini):** proje planı üretici, görev önerileri, doküman bölümlerini yazma / iyileştirme, Copilot, sprint planı önerisi, günlük özet, GitHub geliştirme özeti
- **Analiz:** algoritmik proje sağlık skoru (AI hesaplamaz), raporlar ve grafikler
- **GitHub:** GitHub App ile repo bağlama, imzalı webhook'lar, commit / PR / CI kaydı, görev eşleme, birleşen PR için onaylı tamamlanma önerisi
- **Diğer:** bildirimler, Ctrl+K arama ve komut paleti, 5 adımlı onboarding, açık / koyu tema

## Teknolojiler

Next.js (App Router) · React · TypeScript · Tailwind CSS · PostgreSQL · Drizzle ORM ·
Better Auth · Zod · Google Gemini (`@google/genai`) · BullMQ / Redis · remark ·
Recharts · dnd-kit · Framer Motion

## Mimari

```txt
src/
  app/                  Sayfalar (App Router) ve API uçları (webhook, cron, ekler, dışa aktarma)
  components/           Ortak arayüz bileşenleri
  features/             Alan bazlı istemci bileşenleri ve saf mantık
    ai/ docs/ github/ planning/ reports/ tasks/ ...
  lib/                  İstemci ve sunucuda ortak yardımcılar
  server/               Yalnızca sunucuda çalışan kod
    db/                 Drizzle şeması ve bağlantı
    ai/                 AIProvider arayüzü ve Gemini uygulaması, kota
    github/             Webhook işleme, kurulum doğrulama, eşleme
    jobs/               Kuyruk ve zamanlanmış işler
    ...                 Alan bazlı işlemler ve sorgular
drizzle/                SQL migration'ları
scripts/                migrate, seed, worker
```

Temel kurallar:

- Tüm kalıcı veri PostgreSQL'de. Sunucu işlemleri oturumu ve çalışma alanı üyeliğini her çağrıda doğrular; istemciden gelen `workspaceId` / `projectId` değerlerine güvenilmez.
- Sunucu işlemleri `{ ok, error }` döndürür. Kullanıcıya gösterilecek hatalar üretimde de görünür, beklenmeyen hatalar sızmaz.
- AI çıktısı Zod ile doğrulanır ve önce önizlenir. AI'ın uydurduğu görev, PR veya sprint referansları sunucuda elenir. Her AI çağrısı `ai_generations` tablosuna kaydedilir ve kullanıcı başına saatlik sınırlar uygulanır.
- Markdown ayrıştırma deterministiktir (remark). AI dokümanlarda yalnızca bölüm gövdelerini yazar; başlıklar ve sıra sunucuda korunur.

## Yerel kurulum

Gereksinimler: Node.js 22 veya üstü, npm, PostgreSQL 15 veya üstü. Docker isteğe bağlıdır.

```powershell
npm install
Copy-Item .env.example .env        # macOS/Linux: cp .env.example .env
# .env içinde DATABASE_URL, BETTER_AUTH_URL ve BETTER_AUTH_SECRET'ı doldur
docker compose up -d               # Docker yoksa kendi PostgreSQL'ini kullan
npm run db:migrate
npm run dev
```

Uygulama [localhost:3000](http://localhost:3000) adresinde açılır. Kayıt olduktan sonra onboarding seni çalışma alanı ve ilk projeye götürür.

Rastgele oturum sırrı üretmek için:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

### PostgreSQL ve migration'lar

- Şema: `src/server/db/schema.ts`
- Şema değişikliğinden sonra `npm run db:generate` yeni migration üretir (veritabanına bağlanmaz).
- `npm run db:migrate` bekleyen migration'ları uygular.

### Örnek veri (seed)

Önce uygulamada kendi hesabını oluştur. Seed varsayılan parola üretmez.

```powershell
$env:SEED_USER_EMAIL = "kayitli-adresin@example.com"   # macOS/Linux: export SEED_USER_EMAIL=...
npm run db:seed
```

Hesabına **"Acme Labs · Örnek"** çalışma alanı eklenir:

- iki proje (ForgePilot Mobile, Atlas Analytics)
- görevler, sprintler (biri tamamlanmış, biri aktif), milestone'lar, etiketler, bağımlılıklar, yorumlar ve bir doküman
- giriş yapamayan üç örnek ekip arkadaşı

Tarihler bugüne göre hesaplanır. Örnek veride GitHub hareketi yoktur. Komut ikinci kez çalıştırılırsa kopya oluşturmaz.

## Entegrasyonlar

Hepsi isteğe bağlıdır. Yapılandırılmamış bir entegrasyon arayüzde kapalı görünür ve nedenini söyler. Durumları **Ayarlar → Entegrasyonlar** altında görülebilir.

### Gemini

1. [Google AI Studio](https://aistudio.google.com/)'dan bir API anahtarı al.
2. `.env` içine `GEMINI_API_KEY` yaz. İstersen `GEMINI_MODEL` ile modeli değiştir (structured output destekleyen bir model olmalı).
3. Sunucuyu yeniden başlat.

Anahtar tarayıcıya gönderilmez. Kullanım ve sınırlar **Ayarlar → AI** altında görünür.

### Sosyal giriş

Google ve GitHub ile giriş için `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` ve `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` tanımla. Geri dönüş adresleri `<site>/api/auth/callback/google` ve `<site>/api/auth/callback/github`.

GitHub ile giriş, aşağıdaki GitHub App'ten ayrıdır.

### GitHub App (repo erişimi ve webhook'lar)

1. GitHub → Settings → Developer settings → GitHub Apps → **New GitHub App**.
2. **Setup URL:** `<site>/api/github/setup`. "Request user authorization (OAuth) during installation" seçeneğini aç.
3. **Webhook URL:** `<site>/api/github/webhook`. Güçlü bir webhook secret belirle.
4. **İzinler (salt okunur):** Contents, Metadata, Pull requests, Checks.
5. **Olaylar:** Push, Pull request, Check suite, Installation, Installation repositories.
6. Bir private key oluştur ve `.env` içine şunları yaz:
   - `GITHUB_APP_ID`
   - `GITHUB_APP_SLUG`
   - `GITHUB_APP_CLIENT_ID`
   - `GITHUB_APP_CLIENT_SECRET`
   - `GITHUB_APP_PRIVATE_KEY`
   - `GITHUB_WEBHOOK_SECRET`

GitHub localhost'a erişemez. Yerelde webhook almak için [smee.io](https://smee.io) gibi bir tünel kullan.

Webhook imzası doğrulanır ve her teslimat bir kez işlenir. Kurulumun kullanıcıya ait olduğu GitHub üzerinden doğrulanır. Birleşen PR görevi kapatmaz; yalnızca onay bekleyen bir öneri oluşturur.

### Redis ve zamanlanmış işler

Redis olmadan işler istek sırasında çalışır. Kuyruk kullanmak için:

```powershell
docker compose --profile queue up -d
# .env: REDIS_URL=redis://localhost:6379
npm run worker
```

Worker şunları zamanlanmış olarak yapar:

- son tarih ve gecikme hatırlatmaları
- biten sprint bildirimleri
- günlük sağlık skoru kaydı
- başarısız GitHub olaylarını yeniden deneme

Redis kullanmıyorsan aynı işler `CRON_SECRET` ile korunan `/api/cron/<iş>` ucundan tetiklenebilir. İşler: `reminders.due`, `reminders.sprint`, `health.snapshot`, `github.retry`.

```http
GET /api/cron/reminders.due
Authorization: Bearer <CRON_SECRET>
```

## Ortam değişkenleri

| Değişken | Gerekli | Kullanım |
| --- | --- | --- |
| `DATABASE_URL` | evet | PostgreSQL bağlantısı |
| `BETTER_AUTH_SECRET` | evet | En az 32 karakter rastgele değer |
| `BETTER_AUTH_URL` | evet | Uygulamanın origin'i, ör. `http://localhost:3000` |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | hayır | AI özellikleri |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | hayır | Google ile giriş |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | hayır | GitHub ile giriş |
| `GITHUB_APP_ID`, `GITHUB_APP_SLUG`, `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET` | hayır | GitHub entegrasyonu |
| `REDIS_URL` | hayır | BullMQ kuyruğu ve worker |
| `CRON_SECRET` | hayır | `/api/cron/<iş>` ucunu korur |
| `SEED_USER_EMAIL` | yalnızca seed | Örnek verinin ekleneceği kayıtlı hesap |

## Komutlar

| Komut | Ne yapar |
| --- | --- |
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` / `npm start` | Üretim derlemesi ve sunucusu |
| `npm run typecheck` | TypeScript kontrolü |
| `npm run db:generate` | Şemadan migration üretir |
| `npm run db:migrate` | Migration'ları uygular |
| `npm run db:seed` | Örnek veriyi ekler |
| `npm run worker` | Kuyruk worker'ı (`REDIS_URL` gerekir) |

## Bilinen eksikler

- Parola sıfırlama ve e-posta doğrulama: e-posta gönderimi henüz yok.
- Ödeme altyapısı: plan sayfası yalnızca bilgilendirme amaçlı.
- Yorumlarda @bahsetme yok.
- AI özellikleri ve GitHub App yalnızca otomatik testlerle doğrulandı. Gerçek anahtarlarla uçtan uca deneme yapılmadı.
