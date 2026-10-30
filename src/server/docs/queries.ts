import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/server/db";
import {
  documents,
  documentVersions,
  members,
  projects,
  tasks,
  user,
} from "@/server/db/schema";
import { UserError } from "@/server/errors";
import type { MarkdownStructure } from "@/features/docs/markdown";

const editor = alias(user, "editor");

const listColumns = {
  id: documents.id,
  title: documents.title,
  projectId: documents.projectId,
  sourceType: documents.sourceType,
  currentVersion: documents.currentVersion,
  updatedAt: documents.updatedAt,
  structure: documents.structure,
  updatedByName: editor.name,
};

function toListItem(row: {
  id: string;
  title: string;
  projectId: string;
  sourceType: string;
  currentVersion: number;
  updatedAt: Date;
  structure: unknown;
  updatedByName: string | null;
}) {
  const s = row.structure as MarkdownStructure;
  return {
    id: row.id,
    title: row.title,
    projectId: row.projectId,
    sourceType: row.sourceType,
    version: row.currentVersion,
    updatedAt: row.updatedAt.toISOString(),
    updatedBy: row.updatedByName,
    words: s?.words ?? 0,
    sections: s?.headings?.length ?? 0,
  };
}
export type DocumentListItem = ReturnType<typeof toListItem>;

export async function projectDocuments(projectId: string) {
  const rows = await db
    .select(listColumns)
    .from(documents)
    .leftJoin(editor, eq(editor.id, documents.updatedBy))
    .where(eq(documents.projectId, projectId))
    .orderBy(desc(documents.updatedAt));
  return rows.map(toListItem);
}

// Every document the user can read, across workspaces.
export async function userDocuments(userId: string) {
  const visible = db
    .select({ id: projects.id })
    .from(projects)
    .innerJoin(members, eq(members.workspaceId, projects.workspaceId))
    .where(eq(members.userId, userId));
  const rows = await db
    .select({
      ...listColumns,
      projectName: projects.name,
      projectKey: projects.key,
    })
    .from(documents)
    .innerJoin(projects, eq(projects.id, documents.projectId))
    .leftJoin(editor, eq(editor.id, documents.updatedBy))
    .where(inArray(documents.projectId, visible))
    .orderBy(desc(documents.updatedAt))
    .limit(300);
  return rows.map((r) => ({
    ...toListItem(r),
    projectName: r.projectName,
    projectKey: r.projectKey,
  }));
}

export async function getDocument(projectId: string, documentId: string) {
  const [doc] = await db
    .select()
    .from(documents)
    .where(
      and(eq(documents.id, documentId), eq(documents.projectId, projectId)),
    );
  if (!doc) throw new UserError("Doküman bulunamadı.");
  return doc;
}

export async function documentHistory(documentId: string) {
  return db
    .select({
      id: documentVersions.id,
      versionNumber: documentVersions.versionNumber,
      title: documentVersions.title,
      note: documentVersions.note,
      createdAt: documentVersions.createdAt,
      authorName: user.name,
    })
    .from(documentVersions)
    .leftJoin(user, eq(user.id, documentVersions.createdBy))
    .where(eq(documentVersions.documentId, documentId))
    .orderBy(desc(documentVersions.versionNumber));
}

// Task keys mentioned in a document that exist in this project. Matches are
// suggestions only; nothing is linked or changed automatically.
export async function resolveTaskRefs(
  project: { id: string; key: string },
  refs: string[],
) {
  const numbers = refs
    .filter((r) => r.startsWith(`${project.key}-`))
    .map((r) => Number(r.slice(project.key.length + 1)))
    .filter(Number.isInteger)
    .slice(0, 100);
  if (!numbers.length) return [];
  return db
    .select({
      id: tasks.id,
      number: tasks.number,
      title: tasks.title,
      status: tasks.status,
    })
    .from(tasks)
    .where(and(eq(tasks.projectId, project.id), inArray(tasks.number, numbers)))
    .orderBy(tasks.number);
}

export async function getVersion(documentId: string, versionNumber: number) {
  const [row] = await db
    .select()
    .from(documentVersions)
    .where(
      and(
        eq(documentVersions.documentId, documentId),
        eq(documentVersions.versionNumber, versionNumber),
      ),
    );
  return row ?? null;
}
