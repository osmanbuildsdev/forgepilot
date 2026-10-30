"use client";
import { useState } from "react";
import { DocList, sourceLabels } from "@/components/doc-list";
import type { DocumentListItem } from "@/server/docs/queries";

type Item = DocumentListItem & { projectName: string; projectKey: string };

export function DocsBrowser({ items }: { items: Item[] }) {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("all");
  const [project, setProject] = useState("all");
  const projects = [...new Map(items.map((i) => [i.projectId, i.projectName]))];
  const q = query.trim().toLocaleLowerCase("tr-TR");
  const visible = items.filter(
    (i) =>
      (source === "all" || i.sourceType === source) &&
      (project === "all" || i.projectId === project) &&
      (!q || i.title.toLocaleLowerCase("tr-TR").includes(q)),
  );
  return (
    <section className="panel stack" style={{ gap: 14 }}>
      <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
        <input
          aria-label="Başlıkta ara"
          placeholder="Başlıkta ara…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: 1, minWidth: 200, height: 32 }}
        />
        <select
          aria-label="Proje"
          value={project}
          onChange={(e) => setProject(e.target.value)}
          style={{ width: "auto", height: 32 }}
        >
          <option value="all">Tüm projeler</option>
          {projects.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <select
          aria-label="Kaynak"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          style={{ width: "auto", height: 32 }}
        >
          <option value="all">Tüm kaynaklar</option>
          {Object.entries(sourceLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {visible.length ? (
        <DocList items={visible} />
      ) : (
        <p className="subtle">Filtrelere uyan doküman yok.</p>
      )}
    </section>
  );
}
