import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import {
  requireUser,
  projectAccess,
  workspaceAccess,
  sprintOverview,
} from "@/server/projects/service";
import { canWrite } from "@/server/permissions";
import { ProjectHeader } from "@/components/project-header";
import { SprintsPanel } from "@/features/planning/sprints-panel";

export const metadata: Metadata = { title: "Sprintler" };

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  if (!z.uuid().safeParse(projectId).success) notFound();
  const user = await requireUser();
  const project = await projectAccess(projectId, user.id);
  const [me, rows] = await Promise.all([
    workspaceAccess(project.workspaceId, user.id),
    sprintOverview(projectId),
  ]);
  return (
    <>
      <ProjectHeader
        project={project}
        active="/sprints"
        subtitle="Zaman kutulu çalışma dönemleri, hedefleri ve gerçekleşen hız."
      />
      <SprintsPanel
        projectId={projectId}
        canWrite={canWrite(me.role)}
        today={new Date().toISOString().slice(0, 10)}
        projectKey={project.key}
        aiEnabled={canWrite(me.role) && Boolean(process.env.GEMINI_API_KEY)}
        sprints={rows.map((r) => ({
          id: r.sprint.id,
          name: r.sprint.name,
          goal: r.sprint.goal,
          startDate: r.sprint.startDate,
          endDate: r.sprint.endDate,
          status: r.sprint.status,
          retrospective: r.sprint.retrospective,
          committedPoints: r.sprint.committedPoints,
          completedPoints: r.sprint.completedPoints,
          completedTasks: r.sprint.completedTasks,
          tasks: r.tasks,
          doneTasks: r.doneTasks,
          points: r.points,
          donePoints: r.donePoints,
        }))}
      />
    </>
  );
}
