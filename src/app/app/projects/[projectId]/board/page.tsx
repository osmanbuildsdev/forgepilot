import { z } from "zod";
import { notFound } from "next/navigation";
import {
  requireUser,
  projectData,
  workspaceAccess,
  workspaceMembers,
} from "@/server/projects/service";
import { canWrite, canManageMembers } from "@/server/permissions";
import { ProjectHeader } from "@/components/project-header";
import { Board } from "@/features/tasks/board";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ sprint?: string }>;
}) {
  const { projectId } = await params;
  const { sprint } = await searchParams;
  if (!z.uuid().safeParse(projectId).success) notFound();
  const user = await requireUser();
  const data = await projectData(projectId, user.id);
  const [member, people] = await Promise.all([
    workspaceAccess(data.project.workspaceId, user.id),
    workspaceMembers(data.project.workspaceId),
  ]);
  return (
    <>
      <ProjectHeader project={data.project} active="/board" />
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
        sprints={data.sprints}
        milestones={data.milestones}
        initialSprint={
          sprint === "none" || data.sprints.some((s) => s.id === sprint)
            ? (sprint as string)
            : "all"
        }
      />
    </>
  );
}
