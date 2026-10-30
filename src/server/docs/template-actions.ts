"use server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { UserError, attempt } from "@/server/errors";
import { db } from "@/server/db";
import { documentTemplates } from "@/server/db/schema";
import {
  requireUser,
  projectAccess,
  workspaceAccess,
} from "@/server/projects/service";
import { parseMarkdown } from "@/features/docs/markdown";
import { findBuiltin } from "@/features/docs/builtin-templates";
import { resolvePlaceholders } from "@/features/docs/placeholders";
import { getDocument } from "./queries";
import { insertDocument } from "./store";
import { loadTemplate, placeholderValues } from "./templates";

const templateFields = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).default(""),
});
const templateRef = z
  .string()
  .regex(/^(builtin:[a-z-]+|[0-9a-f-]{36})$/, "Geçersiz şablon.");
const refresh = () => revalidatePath("/app", "layout");

async function insertTemplate(t: {
  workspaceId: string;
  userId: string;
  name: string;
  description: string;
  content: string;
  origin: string | null;
}) {
  const [row] = await db
    .insert(documentTemplates)
    .values({
      workspaceId: t.workspaceId,
      name: t.name,
      description: t.description,
      contentMarkdown: t.content,
      parsedStructure: parseMarkdown(t.content),
      origin: t.origin,
      createdBy: t.userId,
    })
    .returning({ id: documentTemplates.id });
  refresh();
  return row.id;
}

// Writable template in a workspace the user can edit.
async function editableTemplate(templateId: string) {
  z.uuid().parse(templateId);
  const user = await requireUser();
  const [row] = await db
    .select()
    .from(documentTemplates)
    .where(eq(documentTemplates.id, templateId));
  if (!row) throw new UserError("Şablon bulunamadı.");
  await workspaceAccess(row.workspaceId, user.id, true);
  return { user, row };
}

export async function duplicateBuiltin(workspaceId: string, builtinId: string) {
  return attempt(async () => {
    z.uuid().parse(workspaceId);
    const builtin = findBuiltin(builtinId);
    if (!builtin) throw new UserError("Şablon bulunamadı.");
    const user = await requireUser();
    await workspaceAccess(workspaceId, user.id, true);
    return insertTemplate({
      workspaceId,
      userId: user.id,
      name: `${builtin.name} (kopya)`,
      description: builtin.description,
      content: builtin.content,
      origin: `builtin:${builtin.id}`,
    });
  });
}

export async function saveDocumentAsTemplate(
  projectId: string,
  documentId: string,
  input: unknown,
) {
  return attempt(async () => {
    z.uuid().parse(projectId);
    z.uuid().parse(documentId);
    const data = templateFields.parse(input);
    const user = await requireUser();
    const project = await projectAccess(projectId, user.id, true);
    const doc = await getDocument(projectId, documentId);
    return insertTemplate({
      workspaceId: project.workspaceId,
      userId: user.id,
      ...data,
      content: doc.contentMarkdown,
      origin: doc.id,
    });
  });
}

export async function updateTemplate(templateId: string, input: unknown) {
  return attempt(async () => {
    const data = templateFields
      .extend({ content: z.string().min(1).max(200_000) })
      .parse(input);
    await editableTemplate(templateId);
    await db
      .update(documentTemplates)
      .set({
        name: data.name,
        description: data.description,
        contentMarkdown: data.content,
        parsedStructure: parseMarkdown(data.content),
        updatedAt: new Date(),
      })
      .where(eq(documentTemplates.id, templateId));
    refresh();
  });
}

export async function deleteTemplate(templateId: string) {
  return attempt(async () => {
    const { row } = await editableTemplate(templateId);
    await db
      .delete(documentTemplates)
      .where(
        and(
          eq(documentTemplates.id, templateId),
          eq(documentTemplates.workspaceId, row.workspaceId),
        ),
      );
    refresh();
  });
}

// Creates a project document from a template with placeholders filled from
// project data. Placeholders without data stay visible in the result.
export async function createFromTemplate(projectId: string, input: unknown) {
  return attempt(async () => {
    z.uuid().parse(projectId);
    const data = z
      .object({
        template: templateRef,
        title: z.string().trim().max(200).default(""),
      })
      .parse(input);
    const user = await requireUser();
    const project = await projectAccess(projectId, user.id, true);
    const template = await loadTemplate(data.template, user.id);
    if (template.workspaceId && template.workspaceId !== project.workspaceId)
      throw new UserError("Bu şablon başka bir çalışma alanına ait.");
    const { content, unresolved } = resolvePlaceholders(
      template.content,
      await placeholderValues(projectId),
    );
    const title =
      data.title ||
      parseMarkdown(content).title ||
      `${template.name} — ${project.name}`;
    const id = await insertDocument({
      projectId,
      workspaceId: project.workspaceId,
      userId: user.id,
      title: title.slice(0, 200),
      content,
      sourceType: "template_generated",
      templateRef: template.ref,
      note: `"${template.name}" şablonundan oluşturuldu`,
    });
    return { id, unresolved };
  });
}
