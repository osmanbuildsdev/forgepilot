import "server-only";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { UserError } from "@/server/errors";
import { db } from "@/server/db";
import { documents, documentVersions } from "@/server/db/schema";
import { recordActivity } from "@/server/activity";
import { parseMarkdown } from "@/features/docs/markdown";

// Creates a document with its first version and an activity entry. Callers
// are responsible for authorisation.
export async function insertDocument(d: {
  projectId: string;
  workspaceId: string;
  userId: string;
  title: string;
  content: string;
  sourceType:
    "manual" | "markdown_import" | "ai_generated" | "template_generated";
  sourceFilename?: string;
  templateRef?: string;
  note: string;
}) {
  const id = await db.transaction(async (tx) => {
    const [doc] = await tx
      .insert(documents)
      .values({
        workspaceId: d.workspaceId,
        projectId: d.projectId,
        title: d.title,
        contentMarkdown: d.content,
        structure: parseMarkdown(d.content),
        sourceType: d.sourceType,
        sourceFilename: d.sourceFilename ?? null,
        templateRef: d.templateRef ?? null,
        createdBy: d.userId,
        updatedBy: d.userId,
      })
      .returning({ id: documents.id });
    await tx.insert(documentVersions).values({
      documentId: doc.id,
      versionNumber: 1,
      title: d.title,
      contentMarkdown: d.content,
      note: d.note,
      createdBy: d.userId,
    });
    await recordActivity(tx, {
      projectId: d.projectId,
      type: "document.created",
      actorId: d.userId,
      message: `"${d.title}" dokümanı eklendi.`,
      metadata: { documentId: doc.id, source: d.sourceType },
    });
    return doc.id;
  });
  revalidatePath("/app", "layout");
  return id;
}

// Saves a new version if the content changed. `baseVersion` is the version
// the change was based on; a mismatch means someone else saved in between.
export async function writeVersion(v: {
  projectId: string;
  documentId: string;
  userId: string;
  title?: string;
  content: string;
  baseVersion: number;
  note: string;
}) {
  const version = await db.transaction(async (tx) => {
    const [doc] = await tx
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.id, v.documentId),
          eq(documents.projectId, v.projectId),
        ),
      )
      .for("update");
    if (!doc) throw new UserError("Doküman bulunamadı.");
    if (doc.currentVersion !== v.baseVersion)
      throw new UserError(
        `Bu doküman sen düzenlerken güncellendi (sürüm ${doc.currentVersion}). Değişikliklerini kopyalayıp sayfayı yenile.`,
      );
    const title = v.title ?? doc.title;
    if (doc.title === title && doc.contentMarkdown === v.content)
      return doc.currentVersion;
    const next = doc.currentVersion + 1;
    await tx
      .update(documents)
      .set({
        title,
        contentMarkdown: v.content,
        structure: parseMarkdown(v.content),
        currentVersion: next,
        updatedBy: v.userId,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, v.documentId));
    await tx.insert(documentVersions).values({
      documentId: v.documentId,
      versionNumber: next,
      title,
      contentMarkdown: v.content,
      note: v.note,
      createdBy: v.userId,
    });
    await recordActivity(tx, {
      projectId: v.projectId,
      type: "document.updated",
      actorId: v.userId,
      message: `"${title}" dokümanı güncellendi (sürüm ${next}).`,
      metadata: { documentId: v.documentId, version: next },
    });
    return next;
  });
  revalidatePath("/app", "layout");
  return version;
}
