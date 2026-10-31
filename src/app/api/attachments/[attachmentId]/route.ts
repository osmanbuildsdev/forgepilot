import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { taskAttachments, tasks } from "@/server/db/schema";
import { currentUser, projectAccess } from "@/server/projects/service";
import { isInline } from "@/server/attachments/rules";

// Serves an attachment to members of its project. Only plain image types are
// shown inline; everything else is a download, and the response is sandboxed
// so an uploaded file can never run as part of the app.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ attachmentId: string }> },
) {
  const { attachmentId } = await params;
  if (!z.uuid().safeParse(attachmentId).success)
    return new Response("Not found", { status: 404 });
  const user = await currentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const [row] = await db
    .select({
      filename: taskAttachments.filename,
      contentType: taskAttachments.contentType,
      data: taskAttachments.data,
      projectId: tasks.projectId,
    })
    .from(taskAttachments)
    .innerJoin(tasks, eq(tasks.id, taskAttachments.taskId))
    .where(eq(taskAttachments.id, attachmentId));
  if (!row) return new Response("Not found", { status: 404 });
  try {
    await projectAccess(row.projectId, user.id);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  const ascii = row.filename.replace(/[^\x20-\x7e]/g, "_");
  const disposition = isInline(row.contentType) ? "inline" : "attachment";
  return new Response(new Uint8Array(row.data), {
    headers: {
      "Content-Type": row.contentType,
      "Content-Disposition": `${disposition}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(row.filename)}`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; sandbox",
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
}
