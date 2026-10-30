import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { FileText } from "lucide-react";
import {
  requireUser,
  projectAccess,
  workspaceAccess,
} from "@/server/projects/service";
import { projectDocuments } from "@/server/docs/queries";
import { canWrite } from "@/server/permissions";
import { ProjectHeader } from "@/components/project-header";
import { DocList } from "@/components/doc-list";
import { DocsToolbar } from "@/features/docs/docs-toolbar";

export const metadata: Metadata = { title: "Dokümanlar" };

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  if (!z.uuid().safeParse(projectId).success) notFound();
  const user = await requireUser();
  const project = await projectAccess(projectId, user.id);
  const [me, items] = await Promise.all([
    workspaceAccess(project.workspaceId, user.id),
    projectDocuments(projectId),
  ]);
  const editable = canWrite(me.role);
  return (
    <>
      <ProjectHeader
        project={project}
        active="/docs"
        subtitle="Gereksinimler, mimari notları ve kararlar; Markdown olarak, sürüm geçmişiyle."
      />
      <div className="stack">
        {editable && <DocsToolbar projectId={projectId} />}
        <section className="panel">
          {items.length ? (
            <DocList items={items} />
          ) : (
            <div className="empty">
              <FileText size={22} />
              <h2>Henüz doküman yok.</h2>
              <p className="muted">
                Mevcut Markdown dosyalarını içe aktar ya da sıfırdan yaz.
              </p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
