# ForgePilot — İlerleme Durumu

Ürün kapsamı ve plan: `BUILD_PLAN.md`. Her görev bittiğinde bu dosya güncellenir ve ayrı bir commit atılır.

Son güncelleme: 2026-10-30
Tahmini genel ilerleme: ~%10–12 (MVP listesi ~%40–45)

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
- [x] Basit landing sayfası, login/register, onboarding

## Yapılacaklar

### Altyapı / borç
- [x] Git deposu
- [ ] GitHub uzak depo bağlantısı
- [ ] Gerçek PostgreSQL ile uçtan uca doğrulama
- [ ] Gerçek Gemini anahtarı ve OAuth ile doğrulama
- [x] `activity_events` tablosu tipli olaylara çevrildi (`type`, `source`, opsiyonel aktör, `task_id`, `metadata`)
- [ ] Alan modüllerine ayır (`features/*`, `server/*`)
- [ ] Dil kararı (arayüz Türkçe mi İngilizce mi)

### Çekirdek proje yönetimi
- [x] Görev alanları: atama, son tarih, tahmin puanı (öncelik zaten vardı)
- [x] Etiketler (proje bazlı, görev başına çoklu seçim)
- [x] Yorumlar (ekle, düzenle, sil; yöneticiler moderasyon yapabilir) ve sağdan açılan görev paneli
- [x] Alt görevler (kontrol listesi) ve görev bağımlılıkları (döngü kontrolü, kartta "Engelli" rozeti)
- [ ] Dosya ekleri
- [ ] Özel Kanban kolonları
- [x] Proje ayarları: ad ve açıklama düzenleme, anahtarı yazarak onaylı silme (yalnızca sahip/yönetici)
- [x] Workspace üyeleri, davet bağlantısı, rol yönetimi (e-posta gönderimi henüz yok)
- [x] Sprintler (planla, başlat, tamamla; retrospektif, hız geçmişi, geride kalma uyarısı)
- [x] Milestone'lar ve yol haritası (görevlerden hesaplanan ilerleme, gecikme işareti)
- [x] Kanban'da sprint filtresi, görev formunda sprint ve milestone seçimi

### AI
- [ ] AIProvider genişletme (proje planı, özet, sağlık, sonraki adım)
- [ ] AI proje üretici (`/app/projects/new/ai`)
- [ ] Günlük özet (önbellekli)
- [ ] Copilot
- [ ] Sprint planlama
- [ ] `ai_generations` kaydı ve kota

### Docs / Markdown
- [ ] remark parser, frontmatter, bölüm hiyerarşisi
- [ ] documents / versions / templates / imports tabloları
- [ ] İçe aktarma, düzenleyici + önizleme, dışa aktarma
- [ ] Şablonlar ve AI ile şablon doldurma
- [ ] Diff ve sürüm geçmişi

### GitHub ve arka plan
- [ ] GitHub App, installation, repo bağlama
- [ ] İmzalı ve idempotent webhook
- [ ] Commit / PR / event tabloları, görev eşleme
- [ ] Redis + BullMQ worker

### Analiz ve ürün
- [ ] Algoritmik proje sağlık skoru
- [ ] Bildirimler
- [ ] Ctrl+K komut paleti ve arama
- [ ] Raporlar ve grafikler
- [ ] Ayarlar sayfaları, pricing, forgot-password
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
