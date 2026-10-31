"use server";
import { z } from "zod";
import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { UserError, attempt } from "@/server/errors";
import { db } from "@/server/db";
import {
  githubInstallations,
  projects,
  githubRepositories,
  projectRepositories,
  taskGithubLinks,
  tasks,
} from "@/server/db/schema";
import {
  requireUser,
  projectAccess,
  workspaceAccess,
} from "@/server/projects/service";
import { canManageMembers } from "@/server/permissions";
import { recordActivity } from "@/server/activity";
import {
  githubAppConfigured,
  githubConfig,
  signInstallState,
} from "./security";

const refresh = () => revalidatePath("/app", "layout");

export async function githubInstallUrl(workspaceId: string, returnTo?: string) {
  return attempt(async () => {
    z.uuid().parse(workspaceId);
    z.string().max(300).optional().parse(returnTo);
    if (!githubAppConfigured())
      throw new UserError("GitHub App bu sunucuda yapılandırılmamış.");
    const user = await requireUser();
    const me = await workspaceAccess(workspaceId, user.id);
    if (!canManageMembers(me.role))
      throw new UserError(
        "GitHub'ı yalnızca sahip veya yöneticiler bağlayabilir.",
      );
    const state = encodeURIComponent(
      signInstallState(workspaceId, user.id, returnTo),
    );
    return `https://github.com/apps/${githubConfig().slug}/installations/new?state=${state}`;
  });
}

// A repository can be connected only to projects in the workspace that
// owns its installation.
export async function connectRepository(
  projectId: string,
  repositoryId: string,
) {
  return attempt(async () => {
    z.uuid().parse(projectId);
    z.uuid().parse(repositoryId);
    const user = await requireUser();
    const project = await projectAccess(projectId, user.id, true);
    const [repo] = await db
      .select({
        id: githubRepositories.id,
        fullName: githubRepositories.fullName,
      })
      .from(githubRepositories)
      .innerJoin(
        githubInstallations,
        eq(githubInstallations.id, githubRepositories.installationId),
      )
      .where(
        and(
          eq(githubRepositories.id, repositoryId),
          eq(githubInstallations.workspaceId, project.workspaceId),
          isNull(githubRepositories.removedAt),
          isNull(githubInstallations.deletedAt),
        ),
      );
    if (!repo) throw new UserError("Bu repo bu çalışma alanına bağlı değil.");
    await db
      .insert(projectRepositories)
      .values({ projectId, repositoryId, connectedBy: user.id })
      .onConflictDoNothing();
    refresh();
  });
}

export async function disconnectRepository(
  projectId: string,
  repositoryId: string,
) {
  return attempt(async () => {
    z.uuid().parse(projectId);
    z.uuid().parse(repositoryId);
    const user = await requireUser();
    await projectAccess(projectId, user.id, true);
    await db
      .delete(projectRepositories)
      .where(
        and(
          eq(projectRepositories.projectId, projectId),
          eq(projectRepositories.repositoryId, repositoryId),
        ),
      );
    refresh();
  });
}

// Confirms or dismisses "this task may be complete". Only a person can mark
// the task done; the suggestion itself never changes the task.
export async function resolveCompletionSuggestion(
  projectId: string,
  linkId: string,
  decision: unknown,
) {
  return attempt(async () => {
    z.uuid().parse(projectId);
    z.uuid().parse(linkId);
    const choice = z.enum(["confirm", "dismiss"]).parse(decision);
    const user = await requireUser();
    await projectAccess(projectId, user.id, true);
    await db.transaction(async (tx) => {
      const [link] = await tx
        .select({
          id: taskGithubLinks.id,
          taskId: tasks.id,
          number: tasks.number,
          title: tasks.title,
          status: tasks.status,
          suggestion: taskGithubLinks.suggestion,
          ref: taskGithubLinks.ref,
        })
        .from(taskGithubLinks)
        .innerJoin(tasks, eq(tasks.id, taskGithubLinks.taskId))
        .where(
          and(eq(taskGithubLinks.id, linkId), eq(tasks.projectId, projectId)),
        )
        .for("update");
      if (!link || link.suggestion !== "pending")
        throw new UserError("Bu öneri bulunamadı ya da zaten yanıtlandı.");
      if (choice === "dismiss") {
        await tx
          .update(taskGithubLinks)
          .set({ suggestion: "dismissed", updatedAt: new Date() })
          .where(eq(taskGithubLinks.id, link.id));
        return;
      }
      // Confirming resolves every pending suggestion for the same task.
      await tx
        .update(taskGithubLinks)
        .set({ suggestion: "confirmed", updatedAt: new Date() })
        .where(
          and(
            eq(taskGithubLinks.taskId, link.taskId),
            eq(taskGithubLinks.suggestion, "pending"),
          ),
        );
      if (link.status !== "done") {
        await tx
          .update(tasks)
          .set({
            status: "done",
            completedAt: sql`coalesce(${tasks.completedAt}, now())`,
            updatedAt: new Date(),
          })
          .where(eq(tasks.id, link.taskId));
        await recordActivity(tx, {
          projectId,
          type: "task.completed",
          actorId: user.id,
          taskId: link.taskId,
          message: `#${link.number} tamamlandı (PR #${link.ref} birleştirildikten sonra onaylandı).`,
          metadata: { linkId: link.id },
        });
      }
    });
    refresh();
  });
}

// Creates a project for a repository and connects the two in one step.
export async function createProjectFromRepository(
  workspaceId: string,
  repositoryId: string,
  input: unknown,
) {
  return attempt(async () => {
    z.uuid().parse(workspaceId);
    z.uuid().parse(repositoryId);
    const data = z
      .object({
        name: z.string().trim().min(2).max(100),
        key: z
          .string()
          .regex(
            /^[A-Z][A-Z0-9]{1,9}$/,
            "Anahtar 2–10 büyük harf veya rakam olmalı.",
          ),
      })
      .parse(input);
    const user = await requireUser();
    await workspaceAccess(workspaceId, user.id, true);
    const [repo] = await db
      .select({
        id: githubRepositories.id,
        fullName: githubRepositories.fullName,
      })
      .from(githubRepositories)
      .innerJoin(
        githubInstallations,
        eq(githubInstallations.id, githubRepositories.installationId),
      )
      .where(
        and(
          eq(githubRepositories.id, repositoryId),
          eq(githubInstallations.workspaceId, workspaceId),
          isNull(githubRepositories.removedAt),
          isNull(githubInstallations.deletedAt),
        ),
      );
    if (!repo) throw new UserError("Bu repo bu çalışma alanına bağlı değil.");
    const [taken] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(eq(projects.workspaceId, workspaceId), eq(projects.key, data.key)),
      );
    if (taken)
      throw new UserError(
        `${data.key} anahtarı bu çalışma alanında zaten kullanılıyor.`,
      );
    const projectId = await db.transaction(async (tx) => {
      const [project] = await tx
        .insert(projects)
        .values({
          workspaceId,
          name: data.name,
          key: data.key,
          description: `${repo.fullName} reposu için proje.`,
          createdBy: user.id,
        })
        .returning({ id: projects.id });
      await tx
        .insert(projectRepositories)
        .values({ projectId: project.id, repositoryId, connectedBy: user.id });
      await recordActivity(tx, {
        projectId: project.id,
        type: "project.created",
        actorId: user.id,
        message: `Proje ${repo.fullName} reposundan oluşturuldu.`,
        metadata: { repositoryId },
      });
      return project.id;
    });
    refresh();
    return projectId;
  });
}
