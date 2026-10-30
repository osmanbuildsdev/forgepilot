import Link from "next/link";
import { FileText } from "lucide-react";

export const sourceLabels: Record<string, string> = {
  manual: "Elle",
  markdown_import: "İçe aktarıldı",
  ai_generated: "AI",
  template_generated: "Şablondan",
};

const dateFormat = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Istanbul",
});

export function DocList({
  items,
}: {
  items: {
    id: string;
    title: string;
    projectId: string;
    sourceType: string;
    version: number;
    updatedAt: string;
    updatedBy: string | null;
    words: number;
    sections: number;
    projectName?: string;
  }[];
}) {
  return (
    <ul className="doc-list">
      {items.map((d) => (
        <li key={d.id}>
          <Link href={`/app/projects/${d.projectId}/docs/${d.id}`}>
            <FileText size={16} className="subtle" />
            <span style={{ minWidth: 0 }}>
              <strong className="truncate">{d.title}</strong>
              <span className="subtle truncate">
                {d.projectName ? `${d.projectName} · ` : ""}
                {d.sections} bölüm · {d.words} kelime · sürüm {d.version}
              </span>
            </span>
            <span className="row hide-sm" style={{ gap: 8 }}>
              <span
                className={`badge ${d.sourceType === "ai_generated" ? "accent" : ""}`}
              >
                {sourceLabels[d.sourceType] ?? d.sourceType}
              </span>
              <span
                className="subtle"
                style={{ fontSize: 12, whiteSpace: "nowrap" }}
              >
                {dateFormat.format(new Date(d.updatedAt))}
                {d.updatedBy ? ` · ${d.updatedBy}` : ""}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
