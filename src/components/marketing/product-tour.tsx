"use client";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import {
  Activity,
  AlertTriangle,
  Bot,
  Check,
  FileText,
  Gauge,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInView } from "./reveal";

// Static, illustrative data. Each panel mirrors how the real feature behaves.
const tabs = [
  { id: "health", label: "Sağlık skoru", icon: Activity },
  { id: "copilot", label: "Copilot", icon: Bot },
  { id: "docs", label: "Doküman şablonları", icon: FileText },
  { id: "sprint", label: "Sprint planı", icon: Gauge },
] as const;
type TabId = (typeof tabs)[number]["id"];

// Panels mount on tab change; arm after a tick so bars animate from zero.
function useArmed(active: boolean) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setArmed(true), 40);
    return () => clearTimeout(t);
  }, [active]);
  return armed;
}

const factors: [string, number, string][] = [
  ["Geciken görevler", 12, "3 görevin son tarihi geçti"],
  ["Sprint ilerlemesi", 6, "Sürenin %60'ı geçti, işin %42'si bitti"],
  ["Engelli görevler", 6, "FORGE-23, FORGE-21'i bekliyor"],
  ["İş yükü dağılımı", 4, "Açık puanların yarısı Deniz'de"],
  ["Milestone'lar", 0, "Beta takvimde"],
  ["Sahipsiz öncelikli işler", 0, "Hepsinin sahibi var"],
];

function HealthPanel({ active: visible }: { active: boolean }) {
  const active = useArmed(visible);
  const score = 100 - factors.reduce((s, [, p]) => s + p, 0);
  return (
    <div className="tour-grid">
      <div className="tour-copy">
        <h3>Skoru AI değil, formül hesaplar.</h3>
        <p>
          Altı ölçülebilir faktör, her biri için kaç puan düşüldüğü ve nedeni.
          Skor her gün kaydedilir, eğilimi grafikte görürsün. AI yalnızca bu
          sonucu okunur bir özete çevirir.
        </p>
      </div>
      <div className="tour-card">
        <div className="health-head">
          <div
            className="health-ring"
            style={{ "--score": active ? score : 0 } as CSSProperties}
          >
            <strong>{score}</strong>
          </div>
          <div>
            <span className="badge health-warning">Dikkat</span>
            <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
              ForgePilot Mobile · bugün
            </p>
          </div>
        </div>
        <ul className="factor-list">
          {factors.map(([label, penalty, reason], i) => (
            <li key={label}>
              <div className="factor-row">
                <span>{label}</span>
                <span className={penalty ? "factor-penalty" : "subtle"}>
                  {penalty ? `−${penalty}` : "0"}
                </span>
              </div>
              <div className="factor-bar">
                <span
                  style={{
                    width: active ? `${(penalty / 20) * 100}%` : 0,
                    transitionDelay: `${i * 70}ms`,
                  }}
                />
              </div>
              <small className="subtle">{reason}</small>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function CopilotPanel() {
  return (
    <div className="tour-grid">
      <div className="tour-copy">
        <h3>Uydurma referans yok.</h3>
        <p>
          Copilot projenin gerçek verisiyle cevap verir. Cevaptaki her görev,
          sprint ve PR veritabanında kontrol edilir; bulunamayan referans
          kullanıcıya hiç ulaşmaz. Önerdiği değişiklikler senin onayını bekler.
        </p>
      </div>
      <div className="tour-card chat">
        <div className="chat-msg me">Bu sprint risk altında mı?</div>
        <div className="chat-msg bot">
          <p>
            Evet, kısmen. Sprint 4&apos;te 18 puanın 7&apos;si bitti ve iki gün
            kaldı. <code>FORGE-21</code> açık PR&apos;ı yüzünden{" "}
            <code>FORGE-23</code> bekliyor.
          </p>
          <div className="ref-chips">
            <span className="ref ok">
              <Check size={12} /> FORGE-21
            </span>
            <span className="ref ok">
              <Check size={12} /> FORGE-23
            </span>
            <span className="ref ok">
              <Check size={12} /> Sprint 4
            </span>
            <span className="ref dropped" title="Projede yok, yanıttan çıkarıldı">
              <X size={12} /> FORGE-99
            </span>
          </div>
          <div className="chat-action">
            <span>
              <strong>Önerilen işlem:</strong> FORGE-23 önceliğini yükselt
            </span>
            <div className="row">
              <Button size="sm" tabIndex={-1}>
                Onayla
              </Button>
              <Button size="sm" variant="ghost" tabIndex={-1}>
                Vazgeç
              </Button>
            </div>
          </div>
        </div>
        <p className="caption">Üstü çizili referans projede bulunmadığı için atıldı.</p>
      </div>
    </div>
  );
}

const template: (string | [string, string | null])[] = [
  "# ",
  ["project_name", "ForgePilot Mobile"],
  "\n\nEkip: ",
  ["team_members", "Deniz, Ece, Mert"],
  "\nAktif sprint: ",
  ["current_sprint", "Sprint 4 (12–26 Kas)"],
  "\nİlerleme: ",
  ["project_progress", "%58 · 14/24 görev"],
  "\nTeknolojiler: ",
  ["tech_stack", null],
];

function DocsPanel({ active: visible }: { active: boolean }) {
  const active = useArmed(visible);
  let slot = 0;
  return (
    <div className="tour-grid">
      <div className="tour-copy">
        <h3>Şablonlar proje verisiyle dolar.</h3>
        <p>
          Yer tutucular önce projedeki gerçek veriyle doldurulur. Verisi
          olmayan alan tahmin edilmez, görünür kalır. AI yalnızca bölüm
          gövdelerini yazar; başlıklar ve sıra korunur, her değişiklik diff
          olarak önizlenir.
        </p>
      </div>
      <div className="tour-card">
        <pre className="md-sample">
          {template.map((part, i) => {
            if (typeof part === "string") return <span key={i}>{part}</span>;
            const [name, value] = part;
            const delay = slot++ * 350;
            if (value === null)
              return (
                <span key={i} className="ph-missing" title="Veri yok, olduğu gibi bırakıldı">
                  {`{{${name}}}`}
                </span>
              );
            return (
              <span
                key={i}
                className={`ph ${active ? "filled" : ""}`}
                style={{ "--ph-delay": `${delay}ms` } as CSSProperties}
              >
                <span className="ph-token">{`{{${name}}}`}</span>
                <span className="ph-value">{value}</span>
              </span>
            );
          })}
        </pre>
        <p className="caption">
          <AlertTriangle size={12} /> <code>tech_stack</code> için veri yok;
          tahmin yerine boş bırakıldı.
        </p>
      </div>
    </div>
  );
}

const picks: [string, string, number, string, boolean][] = [
  ["FORGE-21", "Kimlik doğrulama API'si", 8, "Deniz", true],
  ["FORGE-24", "Push bildirimleri", 5, "Ece", true],
  ["FORGE-26", "Çevrimdışı önbellek", 3, "Mert", true],
  ["FORGE-25", "Bağımlılık sistemi", 5, "Deniz", false],
];

function SprintPanel({ active: visible }: { active: boolean }) {
  const active = useArmed(visible);
  const used = picks.filter((p) => p[4]).reduce((s, p) => s + p[2], 0);
  const capacity = 18;
  return (
    <div className="tour-grid">
      <div className="tour-copy">
        <h3>Kapasite tahminle değil, geçmişle.</h3>
        <p>
          Kapasite son sprintlerin gerçek hızından hesaplanır. AI görev seçimi
          önerir; bağımlılık çakışmalarını ve kişi başı yükü gösterir. Sprinte
          neyin gireceğine sen karar verirsin.
        </p>
      </div>
      <div className="tour-card">
        <div className="factor-row">
          <span>Sprint 5 · kapasite</span>
          <span>
            <strong>{used}</strong>
            <span className="subtle"> / {capacity} puan</span>
          </span>
        </div>
        <div className="factor-bar big">
          <span style={{ width: active ? `${(used / capacity) * 100}%` : 0 }} />
        </div>
        <small className="subtle">Son 3 sprintin ortalama hızı: 18 puan</small>
        <ul className="pick-list">
          {picks.map(([key, title, pts, who, on]) => (
            <li key={key} className={on ? "" : "off"}>
              <span className={`pick-box ${on ? "on" : ""}`}>{on && <Check size={11} />}</span>
              <span className="project-key">{key}</span>
              <span className="pick-title">{title}</span>
              <span className="subtle">{who}</span>
              <span className="pick-pts">{pts}</span>
            </li>
          ))}
        </ul>
        <div className="tour-warn">
          <AlertTriangle size={13} /> FORGE-25, FORGE-21 bitmeden başlayamaz;
          bir sonraki sprinte bırakıldı.
        </div>
      </div>
    </div>
  );
}

export function ProductTour() {
  const [tab, setTab] = useState<TabId>("health");
  const [ref, inView] = useInView<HTMLDivElement>();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  function onKey(e: KeyboardEvent, i: number) {
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (i + dir + tabs.length) % tabs.length;
    setTab(tabs[next].id);
    buttons.current[next]?.focus();
  }

  return (
    <div className="tour" ref={ref}>
      <div className="tour-tabs" role="tablist" aria-label="Ürün turu">
        {tabs.map(({ id, label, icon: Icon }, i) => (
          <button
            key={id}
            ref={(el) => {
              buttons.current[i] = el;
            }}
            role="tab"
            id={`tour-tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`tour-panel-${id}`}
            tabIndex={tab === id ? 0 : -1}
            className="tour-tab"
            onClick={() => setTab(id)}
            onKeyDown={(e) => onKey(e, i)}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        key={tab}
        id={`tour-panel-${tab}`}
        aria-labelledby={`tour-tab-${tab}`}
        className="tour-panel"
      >
        {tab === "health" && <HealthPanel active={inView} />}
        {tab === "copilot" && <CopilotPanel />}
        {tab === "docs" && <DocsPanel active={inView} />}
        {tab === "sprint" && <SprintPanel active={inView} />}
      </div>
    </div>
  );
}
