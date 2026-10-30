import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import {
  requireUser,
  projectAccess,
  workspaceAccess,
} from "@/server/projects/service";
import { getDocument, resolveTaskRefs } from "@/server/docs/queries";
import { canWrite } from "@/server/permissions";
import { DocEditor } from "@/features/docs/doc-editor";
import type { MarkdownStructure } from "@/features/docs/markdown";
import { DOC_ACTIONS, type DocAction } from "@/features/ai/doc-schema";

export const metadata: Metadata = { title: "Doküman" };

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string; documentId: string }>;
  searchParams: Promise<{ ai?: string }>;
}) {
  const { projectId, documentId } = await params;
  const { ai } = await searchParams;
  // ?ai=fill_empty opens the AI panel right after creating from a template.
  const initialAi = ai && ai in DOC_ACTIONS ? (ai as DocAction) : undefined;
  if (
    !z.uuid().safeParse(projectId).success ||
    !z.uuid().safeParse(documentId).success
  )
    notFound();
  const user = await requireUser();
  const project = await projectAccess(projectId, user.id);
  const doc = await getDocument(projectId, documentId).catch(() => null);
  if (!doc) notFound();
  const [me, references] = await Promise.all([
    workspaceAccess(project.workspaceId, user.id),
    resolveTaskRefs(
      project,
      (doc.structure as MarkdownStructure).taskRefs ?? [],
    ),
  ]);
  return (
    <div className="stack" style={{ gap: 16 }}>
      <Link
        href={`/app/projects/${projectId}/docs`}
        className="row subtle"
        style={{ gap: 6, fontSize: 13 }}
      >
        <ArrowLeft size={14} /> {project.name} dokümanları
      </Link>
      <DocEditor
        key={doc.id}
        projectId={projectId}
        projectKey={project.key}
        canWrite={canWrite(me.role)}
        references={references}
        aiEnabled={Boolean(process.env.GEMINI_API_KEY)}
        initialAi={initialAi}
        doc={{
          id: doc.id,
          title: doc.title,
          content: doc.contentMarkdown,
          version: doc.currentVersion,
        }}
      />
    </div>
  );
}
