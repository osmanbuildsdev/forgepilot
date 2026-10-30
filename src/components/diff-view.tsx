import type { diffMarkdown } from "@/features/docs/diff";

export function DiffView({ diff }: { diff: ReturnType<typeof diffMarkdown> }) {
  if (!diff.added && !diff.removed)
    return <p className="subtle">Bu iki sürüm arasında içerik farkı yok.</p>;
  return (
    <div className="diff">
      <p className="diff-summary">
        <span className="diff-add">+{diff.added} eklendi</span>
        <span className="diff-del">−{diff.removed} silindi</span>
      </p>
      <pre aria-label="Satır satır fark">
        {diff.lines.map((line, i) =>
          line.kind === "gap" ? (
            <span key={i} className="diff-gap">
              ⋯ {line.count} değişmemiş satır
            </span>
          ) : (
            <span key={i} className={`diff-${line.kind}`}>
              <span className="diff-sign" aria-hidden>
                {line.kind === "added"
                  ? "+"
                  : line.kind === "removed"
                    ? "−"
                    : " "}
              </span>
              {line.text || " "}
            </span>
          ),
        )}
      </pre>
    </div>
  );
}
