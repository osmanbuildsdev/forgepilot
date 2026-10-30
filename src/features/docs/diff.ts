import { diffLines } from "diff";

export type DiffLine = {
  kind: "added" | "removed" | "same";
  text: string;
};

export type DocumentDiff = {
  lines: DiffLine[];
  added: number;
  removed: number;
};

// Line-based diff of two Markdown documents. Unchanged runs longer than
// `context` lines on each side are collapsed so the changes stay readable.
export function diffMarkdown(before: string, after: string, context = 3) {
  const lines: (DiffLine | { kind: "gap"; count: number })[] = [];
  let added = 0;
  let removed = 0;
  const parts = diffLines(before, after);
  parts.forEach((part, index) => {
    const rows = part.value.replace(/\n$/, "").split("\n");
    if (part.added || part.removed) {
      const kind = part.added ? "added" : "removed";
      for (const text of rows) lines.push({ kind, text });
      if (part.added) added += rows.length;
      else removed += rows.length;
      return;
    }
    const first = index === 0;
    const last = index === parts.length - 1;
    const head = first ? 0 : context;
    const tail = last ? 0 : context;
    if (rows.length <= head + tail) {
      for (const text of rows) lines.push({ kind: "same", text });
      return;
    }
    for (const text of rows.slice(0, head)) lines.push({ kind: "same", text });
    lines.push({ kind: "gap", count: rows.length - head - tail });
    for (const text of rows.slice(rows.length - tail))
      lines.push({ kind: "same", text });
  });
  return { lines, added, removed };
}
