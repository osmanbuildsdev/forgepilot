"use server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { UserError, attempt } from "@/server/errors";
import { db } from "@/server/db";
import { documents, documentVersions } from "@/server/db/schema";
import { recordActivity } from "@/server/activity";
import { requireUser, projectAccess } from "@/server/projects/service";
import { parseMarkdown } from "@/features/docs/markdown";

// 500 KB of text is far beyond any real document and keeps parsing cheap.
const MAX_MARKDOWN = 500_000;
const markdown = z
  .string()
  .max(MAX_MARKDOWN, "Doküman en fazla 500 KB olabilir.");
const title = z.string().trim().min(1).max(200);

async function writer(projectId: string) {
  z.uuid().parse(projectId);
  const user = await requireUser();
  const project = await projectAccess(projectId, user.id, true);
  return { user, project };
}

export async function createDocument(projectId: string, input: unknown) {
  return attempt(async () => {
    const data = z
      .object({ title, content: markdown.default("") })
      .parse(input);
    const { user, project } = await writer(projectId);
    const content = data.content || `# ${data.title}\n\n`;
    return insertDocument({
      projectId,
      workspaceId: project.workspaceId,
      userId: user.id,
      title: data.title,
      content,
      sourceType: "manual",
      note: "Oluşturuldu",
    });
  });
}

export async function importMarkdown(projectId: string, input: unknown) {
  return attempt(async () => {
    const data = z
      .object({
        filename: z
          .string()
          .trim()
          .max(200)
          .refine(
            (f) => /\.(md|markdown)$/i.test(f),
            "Yalnızca .md veya .markdown dosyaları içe aktarılabilir.",
          ),
        content: markdown.refine(
          (c) => c.trim().length > 0,
          "Dosya boş görünüyor.",
        ),
      })
      .parse(input);
    if (data.content.includes("\u0000"))
      throw new UserError("Bu dosya metin değil, içe aktarılamaz.");
    const { user, project } = await writer(projectId);
    const structure = parseMarkdown(data.content);
    const fallback = data.filename.replace(/\.(md|markdown)$/i, "");
    return insertDocument({
      projectId,
      workspaceId: project.workspaceId,
      userId: user.id,
      title: (structure.title ?? fallback).slice(0, 200),
      content: data.content,
      sourceType: "markdown_import",
      sourceFilename: data.filename,
      note: `${data.filename} içe aktarıldı`,
    });
  });
}

async function insertDocument(d: {
  projectId: string;
  workspaceId: string;
  userId: string;
  title: string;
  content: string;
  sourceType:
    "manual" | "markdown_import" | "ai_generated" | "template_generated";
  sourceFilename?: string;
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

export async function saveDocument(
  projectId: string,
  documentId: string,
  input: unknown,
) {
  return attempt(async () => {
    z.uuid().parse(documentId);
    const data = z
      .object({
        title,
        content: markdown,
        // The version the editor started from; guards against lost updates.
        baseVersion: z.number().int().min(1),
        note: z.string().trim().max(200).default(""),
      })
      .parse(input);
    const { user } = await writer(projectId);
    const version = await db.transaction(async (tx) => {
      const [doc] = await tx
        .select()
        .from(documents)
        .where(
          and(eq(documents.id, documentId), eq(documents.projectId, projectId)),
        )
        .for("update");
      if (!doc) throw new UserError("Doküman bulunamadı.");
      if (doc.currentVersion !== data.baseVersion)
        throw new UserError(
          `Bu doküman sen düzenlerken güncellendi (sürüm ${doc.currentVersion}). Değişikliklerini kopyalayıp sayfayı yenile.`,
        );
      if (doc.title === data.title && doc.contentMarkdown === data.content)
        return doc.currentVersion;
      const next = doc.currentVersion + 1;
      await tx
        .update(documents)
        .set({
          title: data.title,
          contentMarkdown: data.content,
          structure: parseMarkdown(data.content),
          currentVersion: next,
          updatedBy: user.id,
          updatedAt: new Date(),
        })
        .where(eq(documents.id, documentId));
      await tx.insert(documentVersions).values({
        documentId,
        versionNumber: next,
        title: data.title,
        contentMarkdown: data.content,
        note: data.note,
        createdBy: user.id,
      });
      await recordActivity(tx, {
        projectId,
        type: "document.updated",
        actorId: user.id,
        message: `"${data.title}" dokümanı güncellendi (sürüm ${next}).`,
        metadata: { documentId, version: next },
      });
      return next;
    });
    revalidatePath("/app", "layout");
    return version;
  });
}

export async function deleteDocument(projectId: string, documentId: string) {
  return attempt(async () => {
    z.uuid().parse(documentId);
    await writer(projectId);
    const removed = await db
      .delete(documents)
      .where(
        and(eq(documents.id, documentId), eq(documents.projectId, projectId)),
      )
      .returning({ id: documents.id });
    if (!removed.length) throw new UserError("Doküman bulunamadı.");
    revalidatePath("/app", "layout");
  });
}

export async function restoreVersion(
  projectId: string,
  documentId: string,
  input: unknown,
) {
  return attempt(async () => {
    z.uuid().parse(documentId);
    const data = z
      .object({
        versionNumber: z.number().int().min(1),
        baseVersion: z.number().int().min(1),
      })
      .parse(input);
    const { user } = await writer(projectId);
    const next = await db.transaction(async (tx) => {
      const [doc] = await tx
        .select()
        .from(documents)
        .where(
          and(eq(documents.id, documentId), eq(documents.projectId, projectId)),
        )
        .for("update");
      if (!doc) throw new UserError("Doküman bulunamadı.");
      if (doc.currentVersion !== data.baseVersion)
        throw new UserError(
          "Doküman bu arada güncellendi. Sayfayı yenileyip tekrar dene.",
        );
      const [old] = await tx
        .select()
        .from(documentVersions)
        .where(
          and(
            eq(documentVersions.documentId, documentId),
            eq(documentVersions.versionNumber, data.versionNumber),
          ),
        );
      if (!old) throw new UserError("Sürüm bulunamadı.");
      // Restoring never rewrites history: it adds a new version on top.
      const version = doc.currentVersion + 1;
      await tx
        .update(documents)
        .set({
          title: old.title,
          contentMarkdown: old.contentMarkdown,
          structure: parseMarkdown(old.contentMarkdown),
          currentVersion: version,
          updatedBy: user.id,
          updatedAt: new Date(),
        })
        .where(eq(documents.id, documentId));
      await tx.insert(documentVersions).values({
        documentId,
        versionNumber: version,
        title: old.title,
        contentMarkdown: old.contentMarkdown,
        note: `Sürüm ${old.versionNumber} geri yüklendi`,
        createdBy: user.id,
      });
      await recordActivity(tx, {
        projectId,
        type: "document.updated",
        actorId: user.id,
        message: `"${old.title}" dokümanında sürüm ${old.versionNumber} geri yüklendi.`,
        metadata: { documentId, version, restoredFrom: old.versionNumber },
      });
      return version;
    });
    revalidatePath("/app", "layout");
    return next;
  });
}
