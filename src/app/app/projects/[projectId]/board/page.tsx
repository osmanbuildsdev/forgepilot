import { z } from "zod";
import { notFound } from "next/navigation";
import {
  requireUser,
  projectData,
  workspaceAccess,
  workspaceMembers,
} from "@/server/projects/service";
import { canWrite, canManageMembers } from "@/server/permissions";
import { ProjectTabs } from "@/components/project-tabs";
import { Board } from "@/features/tasks/board";
export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  if (!z.uuid().safeParse(projectId).success) notFound();
  const user = await requireUser();
  const data = await projectData(projectId, user.id);
  const [member, people] = await Promise.all([
    workspaceAccess(data.project.workspaceId, user.id),
    workspaceMembers(data.project.workspaceId),
  ]);
  return (
    <>
      <header className="page-heading">
        <div>
          <span className="project-key">{data.project.key}</span>
          <h1 style={{ marginTop: 8 }}>{data.project.name}</h1>
          <p className="muted">Net öncelikler. Görünür ilerleme.</p>
        </div>
      </header>
      <ProjectTabs id={projectId} active="/board" />
      <Board
        projectId={projectId}
        projectKey={data.project.key}
        tasks={data.tasks}
        members={people}
        labels={data.labels}
        labelIdsByTask={data.labelIdsByTask}
        subtaskProgress={data.subtaskProgress}
        blockedBy={data.blockedBy}
        editable={canWrite(member.role)}
        aiEnabled={Boolean(process.env.GEMINI_API_KEY)}
        viewer={{ id: user.id, canModerate: canManageMembers(member.role) }}
      />
    </>
  );
}
