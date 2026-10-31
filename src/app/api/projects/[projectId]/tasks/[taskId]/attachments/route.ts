import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { taskAttachments, tasks } from "@/server/db/schema";
import { currentUser, projectAccess } from "@/server/projects/service";
import { recordActivity } from "@/server/activity";
import {
  ALLOWED_EXTENSIONS,
  MAX_ATTACHMENTS_PER_TASK,
  MAX_ATTACHMENT_BYTES,
  attachmentType,
  cleanFilename,
} from "@/server/attachments/rules";

const fail = (error: string, status: number) =>
  Response.json({ error }, { status });

// Uploads go through a route handler because server actions limit request
// bodies to 1 MB.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string; taskId: string }> },
) {
  const { projectId, taskId } = await params;
  if (
    !z.uuid().safeParse(projectId).success ||
    !z.uuid().safeParse(taskId).success
  )
    return fail("Görev bulunamadı.", 404);
  const user = await currentUser();
  if (!user) return fail("Oturum açmalısın.", 401);
  try {
    await projectAccess(projectId, user.id, true);
  } catch {
    return fail("Bu projeye dosya ekleme yetkin yok.", 403);
  }
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_ATTACHMENT_BYTES + 64 * 1024)
    return fail("Dosya en fazla 10 MB olabilir.", 413);

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return fail("Dosya okunamadı.", 400);
  }
  if (!(file instanceof File)) return fail("Dosya bulunamadı.", 400);
  if (file.size === 0) return fail("Dosya boş.", 400);
  if (file.size > MAX_ATTACHMENT_BYTES)
    return fail("Dosya en fazla 10 MB olabilir.", 413);
  const filename = cleanFilename(file.name);
  const contentType = attachmentType(filename);
  if (!contentType)
    return fail(
      `Bu dosya türü desteklenmiyor. İzin verilenler: ${ALLOWED_EXTENSIONS.join(", ")}`,
      415,
    );

  const [task] = await db
    .select({ id: tasks.id, number: tasks.number })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.projectId, projectId)));
  if (!task) return fail("Görev bulunamadı.", 404);
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(taskAttachments)
    .where(eq(taskAttachments.taskId, taskId));
  if (n >= MAX_ATTACHMENTS_PER_TASK)
    return fail(
      `Bir görevde en fazla ${MAX_ATTACHMENTS_PER_TASK} dosya olabilir.`,
      409,
    );

  const data = Buffer.from(await file.arrayBuffer());
  const row = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(taskAttachments)
      .values({
        taskId,
        uploadedBy: user.id,
        filename,
        contentType,
        size: data.length,
        data,
      })
      .returning({
        id: taskAttachments.id,
        filename: taskAttachments.filename,
        size: taskAttachments.size,
        contentType: taskAttachments.contentType,
      });
    await recordActivity(tx, {
      projectId,
      type: "task.updated",
      actorId: user.id,
      taskId,
      message: `#${task.number} görevine dosya eklendi: ${filename}`,
      metadata: { attachmentId: created.id },
    });
    return created;
  });
  return Response.json(row, { status: 201 });
}
