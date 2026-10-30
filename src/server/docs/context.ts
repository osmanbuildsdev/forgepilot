import "server-only";
import { and, desc, eq, gte, ne } from "drizzle-orm";
import { db } from "@/server/db";
import { documents, tasks } from "@/server/db/schema";
import { milestoneOverview, sprintOverview } from "@/server/projects/service";
import { placeholderValues } from "./templates";

// Facts about the project, read from the database, that the AI may use when
// writing documentation. Nothing here is generated.
export async function documentGenerationContext(
  projectId: string,
  excludeDocumentId?: string,
) {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const [values, open, recent, milestoneRows, sprintRows, docs] =
    await Promise.all([
      placeholderValues(projectId),
      db
        .select({
          number: tasks.number,
          title: tasks.title,
          status: tasks.status,
          priority: tasks.priority,
          dueDate: tasks.dueDate,
        })
        .from(tasks)
        .where(and(eq(tasks.projectId, projectId), ne(tasks.status, "done")))
        .orderBy(desc(tasks.updatedAt))
        .limit(40),
      db
        .select({ number: tasks.number, title: tasks.title })
        .from(tasks)
        .where(
          and(
            eq(tasks.projectId, projectId),
            eq(tasks.status, "done"),
            gte(tasks.completedAt, since),
          ),
        )
        .orderBy(desc(tasks.completedAt))
        .limit(20),
      milestoneOverview(projectId),
      sprintOverview(projectId),
      db
        .select({ id: documents.id, title: documents.title })
        .from(documents)
        .where(eq(documents.projectId, projectId))
        .orderBy(desc(documents.updatedAt))
        .limit(15),
    ]);
  const active = sprintRows.find((s) => s.sprint.status === "active");
  return {
    project: {
      name: values.project_name,
      description: values.project_description,
      workspace: values.workspace_name,
      progress: values.project_progress ?? "Henüz görev yok",
      team: values.team_members,
      techStack: values.tech_stack ?? null,
    },
    activeSprint: active
      ? {
          name: active.sprint.name,
          goal: active.sprint.goal,
          dates: `${active.sprint.startDate} – ${active.sprint.endDate}`,
          tasks: `${active.doneTasks}/${active.tasks} tamamlandı`,
        }
      : null,
    milestones: milestoneRows.map((m) => ({
      name: m.milestone.name,
      dueDate: m.milestone.dueDate,
      progress: `${m.doneTasks}/${m.tasks}`,
      overdue: Boolean(m.overdue),
    })),
    openTasks: open,
    completedLast14Days: recent,
    otherDocuments: docs
      .filter((d) => d.id !== excludeDocumentId)
      .map((d) => d.title),
  };
}
export type DocumentGenerationContext = Awaited<
  ReturnType<typeof documentGenerationContext>
>;
