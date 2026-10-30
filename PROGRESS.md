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
- [ ] `activity_events` tablosunu tipli olaylara çevir (`task.created` vb., aktörü opsiyonel)
- [ ] Alan modüllerine ayır (`features/*`, `server/*`)
- [ ] Dil kararı (arayüz Türkçe mi İngilizce mi)

### Çekirdek proje yönetimi
- [ ] Görev alanları: atama, etiket, öncelik, due date, tahmin puanı
- [ ] Yorumlar, alt görevler, bağımlılıklar, eklentiler
- [ ] Özel Kanban kolonları
- [ ] Proje düzenleme / silme
- [ ] Workspace üyeleri, davet, roller
- [ ] Milestone, sprint, roadmap

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
- [ ] Gerçek landing sayfası (parallax, bölümler, footer)
- [ ] Erişilebilirlik, mobil, reduced-motion

## Görev günlüğü

| Tarih | Görev | Not |
|---|---|---|
| 2026-10-30 | Git deposu kuruldu, ilerleme dosyası eklendi | İlk commit |
