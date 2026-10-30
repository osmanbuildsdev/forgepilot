"use client";
import { useRouter, useSearchParams } from "next/navigation";

// Filters live in the URL so a report can be shared or bookmarked.
export function ReportFilters({
  projects,
  projectId,
  days,
}: {
  projects: { id: string; name: string; key: string }[];
  projectId: string;
  days: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`/app/reports?${next}`);
  };
  return (
    <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
      <select
        aria-label="Proje"
        value={projectId}
        onChange={(e) => set("project", e.target.value)}
        style={{ width: "auto", height: 32 }}
      >
        <option value="">Tüm projeler</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.key} · {p.name}
          </option>
        ))}
      </select>
      <div className="segmented" role="group" aria-label="Zaman aralığı">
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            className={days === d ? "active" : ""}
            aria-pressed={days === d}
            onClick={() => set("days", String(d))}
          >
            {d} gün
          </button>
        ))}
      </div>
    </div>
  );
}
