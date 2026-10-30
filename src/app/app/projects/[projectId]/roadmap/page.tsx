import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import {
  requireUser,
  projectAccess,
  workspaceAccess,
  milestoneOverview,
  sprintOverview,
} from "@/server/projects/service";
import { canWrite } from "@/server/permissions";
import { ProjectHeader } from "@/components/project-header";
import { RoadmapPanel } from "@/features/planning/roadmap-panel";

export const metadata: Metadata = { title: "Yol haritası" };

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  if (!z.uuid().safeParse(projectId).success) notFound();
  const user = await requireUser();
  const project = await projectAccess(projectId, user.id);
  const [me, rows, sprintRows] = await Promise.all([
    workspaceAccess(project.workspaceId, user.id),
    milestoneOverview(projectId),
    sprintOverview(projectId),
  ]);
  return (
    <>
      <ProjectHeader
        project={project}
        active="/roadmap"
        subtitle="Milestone'lar, hedef tarihleri ve gerçek ilerleme."
      />
      <RoadmapPanel
        projectId={projectId}
        canWrite={canWrite(me.role)}
        today={new Date().toISOString().slice(0, 10)}
        milestones={rows.map((r) => ({
          id: r.milestone.id,
          name: r.milestone.name,
          description: r.milestone.description,
          dueDate: r.milestone.dueDate,
          tasks: r.tasks,
          doneTasks: r.doneTasks,
          overdue: Boolean(r.overdue),
        }))}
        sprints={sprintRows.map((r) => ({
          id: r.sprint.id,
          name: r.sprint.name,
          startDate: r.sprint.startDate,
          endDate: r.sprint.endDate,
          status: r.sprint.status,
        }))}
      />
    </>
  );
}
