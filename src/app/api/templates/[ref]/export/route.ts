import { currentUser } from "@/server/projects/service";
import { loadTemplate } from "@/server/docs/templates";

// Downloads a built-in ("builtin:<id>") or workspace template as Markdown.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ref: string }> },
) {
  const { ref } = await params;
  const decoded = decodeURIComponent(ref);
  if (!/^(builtin:[a-z-]+|[0-9a-f-]{36})$/.test(decoded))
    return new Response("Not found", { status: 404 });
  const user = await currentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  try {
    const template = await loadTemplate(decoded, user.id);
    const base =
      template.name
        .normalize("NFKD")
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .toLowerCase() || "template";
    return new Response(template.content, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${base}.md"; filename*=UTF-8''${encodeURIComponent(template.name)}.md`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
