# ForgePilot — İlerleme Durumu

Ürün kapsamı ve plan: `BUILD_PLAN.md`. Her görev bittiğinde bu dosya güncellenir ve ayrı bir commit atılır.

Son güncelleme: 2026-10-31
Tahmini genel ilerleme: kapsamın kodu tamamlandı (~%90). Kalan iş gerçek servislerle (PostgreSQL, Gemini, GitHub App, Redis) uçtan uca doğrulama ve aşağıdaki açık maddeler.

## Yapılanlar

- [x] Next.js (App Router) + TypeScript + Tailwind kurulumu
- [x] Açık/koyu tema ve kalıcı tema seçimi
- [x] PostgreSQL şeması (users, sessions, accounts, workspaces, members, projects, tasks, activity_events), Drizzle migration ve seed
- [x] Better Auth: e-posta/şifre, isteğe bağlı Google/GitHub
- [x] Workspace → proje → görev akışı
- [x] Görev oluşturma / düzenleme / silme
- [x] Kanban (dnd-kit sürükle-bırak)
- [x] Proje genel bakış ve aktivite kayıtları
- [x] Gemini ile görev önerisi (onay öncesi DB'ye yazılmaz)
- [x] Sunucu tarafı yetki kontrolü (viewer yazamaz)
- [x] Basit landing sayfası, login/register
- [x] 5 adımlı onboarding: profil, çalışma alanı, ilk proje (elle / AI / GitHub reposundan), GitHub bağlantısı (kurulumdan sonra kaldığı yere döner), sonraki adımlar

## Yapılacaklar

### Altyapı / borç
- [x] Git deposu
- [x] GitHub uzak depo bağlantısı
- [ ] Gerçek PostgreSQL ile uçtan uca doğrulama
- [ ] Gerçek Gemini anahtarı ve OAuth ile doğrulama
- [x] `activity_events` tablosu tipli olaylara çevrildi (`type`, `source`, opsiyonel aktör, `task_id`, `metadata`)
- [x] Sunucu işlemleri sonuç nesnesi döndürüyor; kullanıcıya gösterilecek hatalar üretimde de görünür, beklenmeyen hatalar sızmaz
- [x] Alan modüllerine ayırma (`features/*`, `server/*`)
- [x] Dil kararı: arayüz Türkçe
- [x] README: kurulum, PostgreSQL, migration, seed, Gemini, GitHub App, Redis/worker, cron ve ortam değişkenleri
- [x] Gerçekçi örnek veri: "Acme Labs · Örnek" çalışma alanı (2 proje, sprintler, milestone'lar, bağımlılıklar, yorumlar, doküman); tekrar çalıştırmada kopya oluşturmaz

### Çekirdek proje yönetimi
- [x] Görev alanları: atama, son tarih, tahmin puanı (öncelik zaten vardı)
- [x] Etiketler (proje bazlı, görev başına çoklu seçim)
- [x] Yorumlar (ekle, düzenle, sil; yöneticiler moderasyon yapabilir) ve sağdan açılan görev paneli
- [x] Alt görevler (kontrol listesi) ve görev bağımlılıkları (döngü kontrolü, kartta "Engelli" rozeti)
- [x] Dosya ekleri: PostgreSQL'de saklanır (10 MB, görev başına 20 dosya), tür uzantıdan belirlenir, yalnızca güvenli görseller tarayıcıda açılır, indirme yanıtı sandbox'lı
- [x] Özel Kanban kolonları: her kolon bir duruma bağlı (raporlar ve sağlık skoru bozulmaz), ekle/yeniden adlandır/sırala/sil, varsayılana dön; silinen kolondaki görevler aynı durumun ilk kolonuna düşer
- [x] Proje ayarları: ad ve açıklama düzenleme, anahtarı yazarak onaylı silme (yalnızca sahip/yönetici)
- [x] Workspace üyeleri, davet bağlantısı, rol yönetimi (e-posta gönderimi henüz yok)
- [x] Sprintler (planla, başlat, tamamla; retrospektif, hız geçmişi, geride kalma uyarısı)
- [x] Milestone'lar ve yol haritası (görevlerden hesaplanan ilerleme, gecikme işareti)
- [x] Kanban'da sprint filtresi, görev formunda sprint ve milestone seçimi

### AI
- [x] AIProvider: görev önerisi, proje planı, özet, doküman, Copilot, sprint ve GitHub özeti için yapılandırılmış çıktı
- [x] AI proje üretici (`/app/projects/new/ai`): plan önizleme ve düzenleme, onayla proje + milestone + sprint + görev oluşturma
- [x] Günlük özet: veriden belirlenimci bölümler + günde bir kez önbelleğe alınan isteğe bağlı AI anlatımı
- [x] Copilot: proje bağlamıyla soru-cevap, gerçek nesnelere doğrulanmış referanslar, onay isteyen aksiyonlar (görev oluştur, öncelik değiştir, sprinte ekle, görevi aç)
- [x] AI sprint planlama: geçmiş hızdan hesaplanan kapasite, bağımlılık uyarıları, iş yükü dengesi; kullanıcı görevleri seçip onaylar
- [x] GitHub geliştirme özeti: son 7 günün commit/PR/CI verisinden alan bazında özet ve önerilen adım (aktivite yoksa AI çağrılmaz)
- [x] `ai_generations` kaydı ve saatlik kota (görev önerisi 10, proje planı 5)

### Docs / Markdown
- [x] remark parser, frontmatter, bölüm hiyerarşisi, görev referansları (deterministik, AI yok)
- [x] documents ve document_versions tabloları (şablon tabloları şablon işiyle gelecek)
- [x] .md içe aktarma (sürükle-bırak), editör + canlı önizleme + içindekiler, .md dışa aktarma, çakışma korumalı kayıt
- [x] Şablonlar: 10 yerleşik şablon, çalışma alanı şablonları (kopyala, düzenle, sil, .md indir), dokümanı şablon olarak kaydetme, yer tutucuların proje verisinden doldurulması
- [x] Doküman içi AI: boş bölümleri doldur, bölüm yaz, iyileştir, genişlet, kısalt, projeden güncelle; AI yalnızca bölüm gövdesi yazar, Markdown sunucuda yeniden kurulur, diff önizlemesinden sonra uygulanır
- [x] Şablondan oluşturup AI ile boş bölümleri doldurma akışı
- [x] Sürüm geçmişi, satır bazlı diff ve geri yükleme

### GitHub ve arka plan
- [x] GitHub App kurulum dönüşü (imzalı state + GitHub üzerinden sahiplik doğrulaması), installation ve repo kaydı, repo-proje bağlama (sunucu tarafı)
- [x] İmzalı (HMAC-SHA256) ve idempotent webhook, ham olay kaydı ve hata durumu
- [x] Commit, PR ve check kaydı; commit mesajı, PR başlığı/açıklaması ve dal adındaki görev anahtarlarıyla eşleme; birleşen PR için onay bekleyen tamamlanma önerisi
- [x] GitHub arayüzü: bağlantı sayfası ve kurulum rehberi, repo-proje bağlama, proje GitHub sekmesi (commit, PR, check durumu), görev panelinde commit/PR ve tamamlanma önerisi onayı
- [x] Redis + BullMQ kuyruğu ve worker (`npm run worker`); Redis yoksa işler anında çalışır
- [x] Zamanlanmış işler: son tarih yaklaşıyor / gecikti / sprint bitiyor bildirimleri, günlük sağlık kaydı, başarısız GitHub olaylarını yeniden deneme; Redis olmadan `/api/cron/<iş>` (CRON_SECRET)

### Analiz ve ürün
- [x] Algoritmik proje sağlık skoru (6 açıklanabilir faktör, günlük anlık görüntü, mini grafik)
- [x] Bildirimler: görev atama, atanmış göreve yorum, sprint başlangıcı, davetin kabulü; zil menüsü ve gelen kutusu (zamana bağlı bildirimler arka plan işiyle gelecek)
- [x] Ctrl+K komut paleti: görev (başlık veya FORGE-24), proje ve kişi araması, gezinme komutları, Türkçe ı/İ uyumlu arama (doküman araması Docs ile gelecek)
- [x] Raporlar (`/app/reports`): haftalık ilerleme, sprint tamamlama, ekip iş yükü, GitHub hareketi, geciken görevler; proje ve 7/30/90 gün filtresi; her grafikte ipucu ve tablo görünümü, renk paleti iki temada da doğrulandı
- [x] Ayarlar: profil (ad, parola, diğer oturumları kapatma), çalışma alanı (yeniden adlandırma, onaylı silme), üyeler, entegrasyon durumu, AI kullanımı, plan (ödeme yok, açıkça belirtiliyor)
- [ ] forgot-password (e-posta gönderimi gerektiriyor)
- [x] Landing sayfası yeniden tasarlandı (ürün önizlemesi, parallax, özellikler, iş akışı, GitHub, fiyatlandırma, footer)
- [x] Tasarım sistemi: renk tokenları, Geist fontu, açık/koyu tema, ortak bileşen stilleri
- [x] Giriş ve kayıt sayfaları yeniden tasarlandı
- [ ] Erişilebilirlik, mobil, reduced-motion

- [x] Uygulama kabuğu (kenar çubuğu, proje listesi, breadcrumb), dashboard ve Görevlerim sayfası

## Görev günlüğü

| Tarih | Görev | Not |
|---|---|---|
| 2026-10-30 | Git deposu kuruldu, ilerleme dosyası eklendi | İlk commit |
| 2026-10-30 | Aktivite olayları tipli hale getirildi | Migration 0001; GitHub ve AI olayları için aktör opsiyonel |
| 2026-10-30 | Görevlere atama, son tarih ve tahmin puanı eklendi | Migration 0002; atanan kişi çalışma alanı üyesi olmak zorunda |
| 2026-10-30 | Etiket sistemi eklendi | Migration 0003; labels ve task_labels tabloları |
| 2026-10-30 | Üye daveti ve rol yönetimi eklendi | Migration 0004; /app/settings/members ve /invite/[token]; davet bağlantısı elle iletilir |
| 2026-10-30 | Tasarım sistemi, landing, giriş ve kayıt sayfaları yenilendi | Gradyan yok, tek vurgu rengi; henüz olmayan özellikler "Yakında" olarak işaretli |
| 2026-10-30 | Uygulama içi arayüz yeni tasarıma geçirildi | Dashboard gerçek sayımlar gösteriyor; /app/tasks eklendi |
| 2026-10-30 | Görev yorumları ve görev detay paneli | Migration 0005; yorumlar aktivite geçmişine yazılır |
| 2026-10-30 | Alt görevler ve görev bağımlılıkları | Migration 0006; döngüler sunucuda engellenir |
| 2026-10-30 | Proje ayarları sekmesi | Proje anahtarı sabit; silme işlemi anahtar yazılarak onaylanır |
| 2026-10-30 | Sprint ve milestone yönetimi, yol haritası | Migration 0007; son tarih doğrulamasındaki hata da düzeltildi |
| 2026-10-30 | Sunucu işlemlerinde hata yönetimi | Next.js üretimde hata mesajlarını gizlediği için işlemler { ok, error } döndürüyor |
| 2026-10-30 | AI proje üretici | Migration 0008; canlı Gemini ile henüz denenmedi |
| 2026-10-30 | Proje sağlık skoru ve günlük özet | Migration 0009; görevlere tamamlanma zamanı ve task.completed olayı eklendi |
| 2026-10-30 | Bildirim merkezi | Migration 0010; kişi kendi işlemi için bildirim almaz |
| 2026-10-30 | Ctrl+K komut paleti ve arama | Türkçe noktalı/noktasız i araması için normalleştirme eklendi |
| 2026-10-30 | Markdown doküman sistemi (1. aşama) | Migration 0011; güvenli HTML önizleme, sürüm geçmişi ve geri yükleme |
| 2026-10-30 | Doküman sürümleri arası diff | Uzun değişmemiş bölümler daraltılır |
| 2026-10-30 | Doküman şablonları | Migration 0012; verisi olmayan yer tutucular tahmin edilmez, görünür kalır |
| 2026-10-30 | Doküman AI işlemleri | Başlıklar ve sıra korunur; uygulanan içerik sunucudaki öneriden alınır; canlı Gemini ile henüz denenmedi |
| 2026-10-30 | GitHub entegrasyonu (1. aşama, sunucu) | Migration 0013; AI veya GitHub görevi kendiliğinden kapatmaz |
| 2026-10-30 | GitHub arayüzü | Gerçek GitHub App ile henüz denenmedi; yerelde webhook için tünel gerekir |
| 2026-10-30 | Copilot | AI'ın uydurduğu görev, sprint veya PR referansları sunucuda düşürülür; canlı Gemini ile henüz denenmedi |
| 2026-10-30 | AI sprint planlama ve GitHub geliştirme özeti | Kapasite AI'a hesaplatılmaz; canlı Gemini ile henüz denenmedi |
| 2026-10-30 | Arka plan işleri ve zamanlanmış bildirimler | Worker Next.js dışında çalışacak şekilde ayrıldı; gerçek Redis ile henüz denenmedi |
| 2026-10-30 | Raporlar ve grafikler | Görsel kontrol, sunucudan istemciye fonksiyon geçirme hatasını yakaladı ve düzeltildi |
| 2026-10-30 | Ayarlar sayfaları | Ücretli plan veya ödeme taklidi yok |
| 2026-10-31 | 5 adımlı onboarding | GitHub kurulum dönüşü yalnızca uygulama içi adreslere izin verir |
| 2026-10-31 | Özel Kanban kolonları | Migration 0014; her durumun en az bir kolonu olması zorunlu |
| 2026-10-31 | Dosya ekleri | Migration 0015; SVG\/HTML gibi çalıştırılabilir türler reddedilir |
| 2026-10-31 | Örnek veri yenilendi | Tarihler bugüne göre hesaplanır; örnek ekip arkadaşları giriş yapamaz; GitHub verisi uydurulmaz |
| 2026-10-31 | README yeniden yazıldı | Redis compose'a isteğe bağlı profil olarak eklendi |
| 2026-10-31 | Landing sayfası genişletildi | Karşılaştırma tablosu, sekmeli ürün turu (sağlık skoru, Copilot, şablon, sprint), SSS; animasyonlar hareketi azalt ayarına uyar |
