import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { documents } from "@/server/db/schema";
import { currentUser, projectAccess } from "@/server/projects/service";

// Downloads the stored Markdown exactly as written: portable, no app markup.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const { documentId } = await params;
  if (!z.uuid().safeParse(documentId).success)
    return new Response("Not found", { status: 404 });
  const user = await currentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const [doc] = await db
    .select({
      projectId: documents.projectId,
      title: documents.title,
      content: documents.contentMarkdown,
    })
    .from(documents)
    .where(eq(documents.id, documentId));
  if (!doc) return new Response("Not found", { status: 404 });
  try {
    await projectAccess(doc.projectId, user.id);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  const base =
    doc.title
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .toLowerCase() || "document";
  return new Response(doc.content, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${base}.md"; filename*=UTF-8''${encodeURIComponent(doc.title)}.md`,
      "Cache-Control": "private, no-store",
    },
  });
}
