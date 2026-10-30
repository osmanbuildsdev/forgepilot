import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import {
  requireUser,
  projectAccess,
  workspaceAccess,
} from "@/server/projects/service";
import { canManageMembers, canWrite } from "@/server/permissions";
import { ProjectTabs } from "@/components/project-tabs";
import { ProjectSettings } from "@/features/projects/project-settings";

export const metadata: Metadata = { title: "Proje ayarları" };

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  if (!z.uuid().safeParse(projectId).success) notFound();
  const user = await requireUser();
  const project = await projectAccess(projectId, user.id);
  const me = await workspaceAccess(project.workspaceId, user.id);
  return (
    <>
      <header className="page-heading">
        <div>
          <span className="project-key">{project.key}</span>
          <h1 style={{ marginTop: 6 }}>{project.name}</h1>
        </div>
      </header>
      <ProjectTabs id={projectId} active="/settings" />
      <ProjectSettings
        project={{
          id: project.id,
          name: project.name,
          key: project.key,
          description: project.description,
        }}
        canEdit={canWrite(me.role)}
        canDelete={canManageMembers(me.role)}
      />
    </>
  );
}
