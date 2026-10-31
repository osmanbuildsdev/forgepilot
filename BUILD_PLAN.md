# ForgePilot geliştirme planı

Ürün kapsamı ve ilerleme için bkz. `PROGRESS.md`. Bu plan ilk uygulama dilimini tamamlanmış ürünle karıştırmaz.

## 1. Temel ve ilk akış

- [x] Next.js / TypeScript / Tailwind / tema ve ortak bileşenler
- [x] PostgreSQL şeması ve migration/seed araçları
- [x] Better Auth ve isteğe bağlı sosyal giriş yapılandırması
- [x] Çalışma alanı → proje → görev akışının kodu
- [x] Görev düzenleme/silme ve Kanban
- [x] Proje özeti ve kalıcı hareket kayıtları
- [x] Gemini görev önerileri ve onay ekranı
- [x] TypeScript ve üretim derlemesi; eksik yapılandırma HTTP/tarayıcı kontrolü
- [ ] Gerçek PostgreSQL ile kayıt/giriş ve veri kalıcılığı uçtan uca doğrulaması
- [ ] Gerçek Gemini anahtarı ve OAuth sağlayıcıları ile doğrulama

Kabul: iki farklı kullanıcının çalışma alanları birbirinden yalıtılmış olmalı; viewer yazamamalı; görev taşıma sayfa yenilemesinden sonra korunmalı; Gemini önerileri onay öncesi veritabanına yazılmamalı.

## 2. Çekirdek proje yönetimi — tamamlandı

Proje düzenleme/silme, davet/roller, atama, yorumlar, etiketler, özel kolonlar, bağımlılıklar, milestone ve sprint yönetimi. Önce yetki testleri; sonra arayüz ve gerçek veri akışları.

## 3. AI proje planlama — tamamlandı

AIProvider'ı proje üretimi, özet, sağlık açıklaması ve sonraki adımlarla genişlet. Üretim kayıtları ve kullanım kotası ekle. Planı önizlet; onaydan sonra proje/sprint/görev/dokümanları transaction ile oluştur. Günlük özeti önbellekle.

## 4. Markdown Docs — tamamlandı

Deterministik remark parser, güvenli preview, frontmatter, bölüm hiyerarşisi, documents/versions/templates/imports şeması. İçe aktarma → düzenleme → dışa aktarma akışından sonra şablon doldurma ve AI değişiklik önizlemesi. Tek bir Docs veri modeli kullan.

## 5. GitHub ve arka plan işleri — tamamlandı

GitHub App, installation ve repository yetkilendirmesi, imzalı/idempotent webhook alımı, PostgreSQL event kayıtları, Redis/BullMQ worker ve retry stratejisi. Görev anahtarı ile commit/PR bağlantısı. AI görevleri kendiliğinden kapatmamalı.

## 6. Analiz ve ürün kalitesi — büyük ölçüde tamamlandı (erişilebilirlik ve mobil gözden geçirmesi açık)

Algoritmik sağlık skoru, günlük özet, bildirimler, arama, sprint raporları, ekip iş yükü. Erişilebilirlik, mobil görünüm, reduced-motion uyumlu animasyonlar ve gerçek kullanım verileriyle pazarlama sayfasının geliştirilmesi.

## Yayın öncesi

Gerçek PostgreSQL entegrasyon testleri, iki kullanıcıyla izolasyon testi, OAuth callback ve e-posta akışları, AI/webhook kota ve tekrar işleme testleri, yedekleme, hata izleme ve prod secret yapılandırması. Yerel geliştirme aşamasında yayın yapılmaz.
