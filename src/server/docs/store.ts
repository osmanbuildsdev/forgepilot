import "server-only";
import { revalidatePath } from "next/cache";
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
