// Splits a Markdown document into heading-delimited sections using the real
// parser, so "#" lines inside code blocks are never mistaken for headings.
// Joining the parts back yields the original text byte for byte.
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import { toString } from "mdast-util-to-string";
import type { Root } from "mdast";

export type DocSection = {
  id: number;
  level: number;
  title: string;
  // "Ürün > Problem": where the section sits in the outline.
  path: string;
  heading: string;
  body: string;
};

export type SplitDocument = {
  // Text before the first heading; null when the document starts with one.
  preamble: string | null;
  sections: DocSection[];
};

const parser = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkFrontmatter, ["yaml"]);

export function splitSections(markdown: string): SplitDocument {
  const tree = parser.parse(markdown) as Root;
  const lines = markdown.split("\n");
  const headings = tree.children
    .filter((n) => n.type === "heading" && n.position)
    .map((n) => ({
      level: n.type === "heading" ? n.depth : 0,
      title: toString(n).trim(),
      start: n.position!.start.line - 1,
      end: n.position!.end.line - 1,
    }));
  const preambleEnd = headings.length ? headings[0].start : lines.length;
  const trail: string[] = [];
  const sections = headings.map((h, i) => {
    const next = i + 1 < headings.length ? headings[i + 1].start : lines.length;
    trail.length = Math.max(0, h.level - 1);
    trail[h.level - 1] = h.title;
    return {
      id: i,
      level: h.level,
      title: h.title,
      path: trail.filter(Boolean).join(" > "),
      heading: lines.slice(h.start, h.end + 1).join("\n"),
      body: lines.slice(h.end + 1, next).join("\n"),
    };
  });
  return {
    preamble: preambleEnd > 0 ? lines.slice(0, preambleEnd).join("\n") : null,
    sections,
  };
}

export function joinSections(doc: SplitDocument) {
  return [
    ...(doc.preamble === null ? [] : [doc.preamble]),
    ...doc.sections.map((s) => `${s.heading}\n${s.body}`),
  ].join("\n");
}

// A section counts as empty when it has no text besides blank lines,
// unfilled placeholders or an empty checklist item.
export function isEmptySection(body: string) {
  return (
    body
      .replace(/\{\{\s*[a-z_]+\s*\}\}/g, "")
      .replace(/^\s*[-*]\s*\[ \]\s*$/gm, "")
      .replace(/^\s*\d+\.\s*$/gm, "")
      .trim() === ""
  );
}

// Replaces the bodies of the given sections, keeping headings, order and the
// blank-line rhythm around each body.
export function replaceBodies(doc: SplitDocument, bodies: Map<number, string>) {
  return joinSections({
    preamble: doc.preamble,
    sections: doc.sections.map((s) => {
      const next = bodies.get(s.id);
      if (next === undefined) return s;
      // Keep the original blank lines before the next heading.
      const trailing = s.body.match(/\n*$/)?.[0] || "\n";
      return { ...s, body: `\n${next.trim()}${trailing}` };
    }),
  });
}
