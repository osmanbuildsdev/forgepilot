// Deterministic Markdown understanding. Parsing never involves AI: the
// structure here is what templates, search and the AI layer build upon.
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import { toString } from "mdast-util-to-string";
import GithubSlugger from "github-slugger";
import { parse as parseYaml } from "yaml";
import type { Root, RootContent } from "mdast";

export type Section = {
  title: string;
  level: number;
  slug: string;
  children: Section[];
};

export type MarkdownStructure = {
  title: string | null;
  frontmatter: Record<string, unknown>;
  headings: { title: string; level: number; slug: string }[];
  sections: Section[];
  codeBlocks: { lang: string | null; lines: number }[];
  tables: number;
  lists: number;
  checklists: { total: number; done: number };
  links: string[];
  // Things that look like task keys (FORGE-24); resolved against the DB later.
  taskRefs: string[];
  words: number;
};

const parser = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkFrontmatter, ["yaml"]);

function readFrontmatter(tree: Root): Record<string, unknown> {
  const node = tree.children.find((n) => n.type === "yaml");
  if (!node || node.type !== "yaml") return {};
  try {
    const value = parseYaml(node.value);
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    // Broken frontmatter must not block the import; the body still parses.
    return {};
  }
}

export function parseMarkdown(markdown: string): MarkdownStructure {
  const tree = parser.parse(markdown) as Root;
  const frontmatter = readFrontmatter(tree);
  const slugger = new GithubSlugger();
  const headings: MarkdownStructure["headings"] = [];
  const codeBlocks: MarkdownStructure["codeBlocks"] = [];
  const links = new Set<string>();
  let tables = 0;
  let lists = 0;
  const checklists = { total: 0, done: 0 };
  const taskRefs = new Set<string>();

  const visit = (node: RootContent | Root) => {
    switch (node.type) {
      case "heading": {
        const title = toString(node).trim();
        headings.push({ title, level: node.depth, slug: slugger.slug(title) });
        break;
      }
      case "code":
        codeBlocks.push({
          lang: node.lang ?? null,
          lines: node.value ? node.value.split("\n").length : 0,
        });
        break;
      case "table":
        tables += 1;
        break;
      case "list":
        lists += 1;
        break;
      case "listItem":
        if (typeof node.checked === "boolean") {
          checklists.total += 1;
          if (node.checked) checklists.done += 1;
        }
        break;
      // Text nodes are scanned one by one; joining them first would glue a
      // heading to the next paragraph and hide keys at their boundary.
      case "text":
      case "inlineCode":
        for (const ref of node.value.match(/\b[A-Z][A-Z0-9]{1,9}-\d{1,7}\b/g) ??
          [])
          taskRefs.add(ref);
        break;
      case "link":
        links.add(node.url);
        break;
    }
    if ("children" in node) for (const child of node.children) visit(child);
  };
  visit(tree);

  // Nest headings into a tree: each heading owns the deeper ones after it.
  const sections: Section[] = [];
  const stack: Section[] = [];
  for (const h of headings) {
    const section: Section = { ...h, children: [] };
    while (stack.length && stack[stack.length - 1].level >= h.level)
      stack.pop();
    if (stack.length) stack[stack.length - 1].children.push(section);
    else sections.push(section);
    stack.push(section);
  }

  // A single top-level H1 is the document title; its children become sections.
  const h1s = sections.filter((s) => s.level === 1);
  const fmTitle =
    typeof frontmatter.title === "string" ? frontmatter.title.trim() : "";
  const title = fmTitle || (h1s.length === 1 ? h1s[0].title : null);
  const body = toString(tree);
  return {
    title,
    frontmatter,
    headings,
    sections:
      h1s.length === 1 && sections.length === 1 ? h1s[0].children : sections,
    codeBlocks,
    tables,
    lists,
    checklists,
    links: [...links].slice(0, 200),
    taskRefs: [...taskRefs].slice(0, 200),
    words: body.split(/\s+/).filter(Boolean).length,
  };
}

// Raw HTML in Markdown is dropped and the output sanitised; heading ids get
// a prefix so they cannot clash with ids used by the app itself.
const schema: typeof defaultSchema = {
  ...defaultSchema,
  clobberPrefix: "doc-",
  attributes: {
    ...defaultSchema.attributes,
    code: [
      ...(defaultSchema.attributes?.code ?? []),
      ["className", /^language-/],
    ],
  },
};

const renderer = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkFrontmatter, ["yaml"])
  .use(remarkRehype)
  .use(rehypeSlug)
  .use(rehypeSanitize, schema)
  .use(rehypeStringify);

export function renderMarkdown(markdown: string): string {
  return String(renderer.processSync(markdown));
}

// Anchor used in the rendered HTML for a heading slug.
export const headingAnchor = (slug: string) => `doc-${slug}`;
