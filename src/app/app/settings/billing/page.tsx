import type { Metadata } from "next";
import { Check } from "lucide-react";
import { requireUser } from "@/server/projects/service";

export const metadata: Metadata = { title: "Plan" };

const plans = [
  {
    name: "Ücretsiz",
    note: "Erken sürüm boyunca",
    items: [
      "Projeler ve Kanban",
      "Ekip daveti ve roller",
      "AI özellikleri (saatlik sınırlarla)",
      "GitHub entegrasyonu",
    ],
    current: true,
  },
  {
    name: "Pro",
    note: "Bireysel geliştiriciler için",
    items: [
      "Sınırsız kişisel proje",
      "Daha yüksek AI sınırları",
      "Gelişmiş raporlar",
    ],
  },
  {
    name: "Ekip",
    note: "Küçük yazılım ekipleri için",
    items: ["Ortak çalışma alanları", "Ekip analitiği", "Öncelikli destek"],
  },
];

export default async function Page() {
  await requireUser();
  return (
    <div className="stack">
      <section className="panel">
        <h2>Mevcut plan: Ücretsiz (erken sürüm)</h2>
        <p className="muted" style={{ marginTop: 6 }}>
          Ödeme altyapısı henüz aktif değil; senden ücret alınmıyor ve kart
          bilgisi istenmiyor. Ücretli planlar açıldığında burada duyurulacak.
        </p>
      </section>
      <div className="pricing-grid">
        {plans.map((p) => (
          <article
            key={p.name}
            className={`plan ${p.current ? "featured" : ""}`}
          >
            <div>
              <h3>{p.name}</h3>
              <p className="subtle" style={{ fontSize: 13 }}>
                {p.note}
              </p>
            </div>
            <ul>
              {p.items.map((i) => (
                <li key={i}>
                  <Check size={14} /> {i}
                </li>
              ))}
            </ul>
            <span className={`badge ${p.current ? "accent" : ""}`}>
              {p.current ? "Mevcut plan" : "Yakında"}
            </span>
          </article>
        ))}
      </div>
    </div>
  );
}
