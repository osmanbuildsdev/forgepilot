"use client";
import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import {
  Check,
  FolderKanban,
  LayoutDashboard,
  Sparkles,
  Users,
  Activity,
} from "lucide-react";
import { TaskCardContent } from "@/components/task-card";
import { Button } from "@/components/ui/button";
import type { Task } from "@/server/db/schema";

type PreviewTask = Pick<
  Task,
  "number" | "title" | "priority" | "dueDate" | "estimatePoints"
> & { labels?: { id: string; name: string; color: string }[]; who?: string };

const backend = { id: "be", name: "backend", color: "#2563eb" };
const web = { id: "web", name: "web", color: "#16a34a" };
const auth = { id: "auth", name: "auth", color: "#c2410c" };

const columns: [string, PreviewTask[]][] = [
  [
    "Yapılacak",
    [
      {
        number: 25,
        title: "Görev bağımlılık sistemini ekle",
        priority: "medium",
        dueDate: "2026-11-14",
        estimatePoints: 5,
        labels: [backend],
      },
      {
        number: 27,
        title: "Bildirim tercihleri ekranı",
        priority: "low",
        dueDate: null,
        estimatePoints: 2,
        labels: [web],
      },
    ],
  ],
  [
    "Devam ediyor",
    [
      {
        number: 21,
        title: "Kimlik doğrulama API'si",
        priority: "high",
        dueDate: "2026-11-06",
        estimatePoints: 8,
        labels: [auth, backend],
        who: "Deniz",
      },
      {
        number: 24,
        title: "Proje panosu arayüzü",
        priority: "medium",
        dueDate: "2026-11-10",
        estimatePoints: 5,
        labels: [web],
        who: "Ece",
      },
    ],
  ],
  [
    "İnceleme",
    [
      {
        number: 22,
        title: "Onboarding akışı",
        priority: "urgent",
        dueDate: "2026-11-04",
        estimatePoints: 3,
        labels: [web],
        who: "Mert",
      },
    ],
  ],
];

const suggestions = [
  ["Parola sıfırlama uç noktası", "Yüksek · 3 puan", true],
  ["Sıfırlama e-postası şablonu", "Normal · 2 puan", true],
  ["Token süresi dolma testleri", "Yüksek · 2 puan", false],
] as const;

export function ProductPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  // Two layers drift slightly apart while scrolling; disabled for reduced motion.
  const appX = useTransform(
    scrollYProgress,
    [0, 1],
    reduce ? [0, 0] : [16, -16],
  );
  const aiX = useTransform(
    scrollYProgress,
    [0, 1],
    reduce ? [0, 0] : [-20, 20],
  );

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <motion.div
        className="mini-app"
        style={{ x: appX }}
        aria-label="ForgePilot Kanban görünümü örneği"
        role="img"
      >
        <div className="mini-app-bar">
          <div className="crumbs">
            <span>Acme Labs</span>
            <span aria-hidden>/</span>
            <span>ForgePilot Mobile</span>
            <span aria-hidden>/</span>
            <strong>Kanban</strong>
          </div>
          <div className="row" style={{ gap: 4 }}>
            <span className="avatar">D</span>
            <span className="avatar">E</span>
            <span className="avatar">M</span>
          </div>
        </div>
        <div className="mini-app-body">
          <div className="mini-side">
            <span>
              <LayoutDashboard size={14} /> Genel bakış
            </span>
            <span className="active">
              <FolderKanban size={14} /> Projeler
            </span>
            <span>
              <Activity size={14} /> Aktivite
            </span>
            <span>
              <Users size={14} /> Üyeler
            </span>
            <span className="label">Projeler</span>
            <span className="active">
              <span className="dot" style={{ color: "var(--accent)" }} />
              ForgePilot Mobile
            </span>
            <span>
              <span className="dot" style={{ color: "var(--fg-subtle)" }} />
              Atlas Analytics
            </span>
          </div>
          <div className="mini-main">
            <div className="row between">
              <div>
                <span className="project-key">FORGE</span>
                <h2 style={{ fontSize: 15 }}>ForgePilot Mobile</h2>
              </div>
              <span className="badge">14 görev · 5 tamamlandı</span>
            </div>
            <div className="mini-board">
              {columns.map(([title, tasks]) => (
                <div className="column" key={title}>
                  <div className="column-heading">
                    <span>{title}</span>
                    <span className="subtle">{tasks.length}</span>
                  </div>
                  {tasks.map((t) => (
                    <div className="task-card" key={t.number}>
                      <TaskCardContent
                        task={t}
                        projectKey="FORGE"
                        assignee={t.who}
                        labels={t.labels}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
      <motion.aside
        className="ai-card"
        style={{ x: aiX }}
        aria-label="AI görev önerisi örneği"
      >
        <header>
          <Sparkles size={14} /> AI önerisi
          <span className="badge" style={{ marginLeft: "auto" }}>
            Onay bekliyor
          </span>
        </header>
        <p className="subtle" style={{ fontSize: 12, marginTop: 8 }}>
          &ldquo;Parola sıfırlama akışını planla&rdquo; isteği için 3 görev
        </p>
        <ul>
          {suggestions.map(([title, meta, on]) => (
            <li key={title}>
              <span className={`check ${on ? "on" : ""}`}>
                {on && <Check size={10} strokeWidth={3} />}
              </span>
              <span>
                {title}
                <small>{meta}</small>
              </span>
            </li>
          ))}
        </ul>
        <Button size="sm" style={{ width: "100%" }} tabIndex={-1}>
          2 görevi onayla ve kaydet
        </Button>
      </motion.aside>
    </div>
  );
}
