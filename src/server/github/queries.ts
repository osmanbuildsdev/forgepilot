import "server-only";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { devSummary } from "@/features/ai/sprint-schema";
import {
  aiGenerations,
  githubCommits,
  githubInstallations,
  githubPullRequests,
  githubRepositories,
  members,
  projectRepositories,
  projects,
  taskGithubLinks,
  tasks,
} from "@/server/db/schema";

// Installations and repositories of every workspace the user belongs to.
export async function workspaceGithub(userId: string) {
  const mine = db
    .select({ id: members.workspaceId })
    .from(members)
    .where(eq(members.userId, userId));
  const installations = await db
    .select()
    .from(githubInstallations)
    .where(
      and(
        inArray(githubInstallations.workspaceId, mine),
        isNull(githubInstallations.deletedAt),
      ),
    )
    .orderBy(githubInstallations.accountLogin);
  if (!installations.length) return [];
  const ids = installations.map((i) => i.id);
  const [repos, links, openPrs] = await Promise.all([
    db
      .select()
      .from(githubRepositories)
      .where(
        and(
          inArray(githubRepositories.installationId, ids),
          isNull(githubRepositories.removedAt),
        ),
      )
      .orderBy(githubRepositories.fullName),
    db
      .select({
        repositoryId: projectRepositories.repositoryId,
        projectId: projects.id,
        projectName: projects.name,
      })
      .from(projectRepositories)
      .innerJoin(projects, eq(projects.id, projectRepositories.projectId)),
    db
      .select({
        repositoryId: githubPullRequests.repositoryId,
        n: sql<number>`count(*)::int`,
      })
      .from(githubPullRequests)
      .where(eq(githubPullRequests.state, "open"))
      .groupBy(githubPullRequests.repositoryId),
  ]);
  return installations.map((i) => ({
    id: i.id,
    accountLogin: i.accountLogin,
    accountType: i.accountType,
    workspaceId: i.workspaceId!,
    suspended: i.suspendedAt !== null,
    repositories: repos
      .filter((r) => r.installationId === i.id)
      .map((r) => ({
        id: r.id,
        fullName: r.fullName,
        htmlUrl: r.htmlUrl,
        private: r.private,
        defaultBranch: r.defaultBranch,
        lastActivityAt: r.lastActivityAt?.toISOString() ?? null,
        openPullRequests: openPrs.find((p) => p.repositoryId === r.id)?.n ?? 0,
        projects: links
          .filter((l) => l.repositoryId === r.id)
          .map((l) => ({ id: l.projectId, name: l.projectName })),
      })),
  }));
}

export async function projectGithub(projectId: string, workspaceId: string) {
  const connected = await db
    .select({
      id: githubRepositories.id,
      fullName: githubRepositories.fullName,
      htmlUrl: githubRepositories.htmlUrl,
      defaultBranch: githubRepositories.defaultBranch,
      lastActivityAt: githubRepositories.lastActivityAt,
    })
    .from(projectRepositories)
    .innerJoin(
      githubRepositories,
      eq(githubRepositories.id, projectRepositories.repositoryId),
    )
    .where(eq(projectRepositories.projectId, projectId))
    .orderBy(githubRepositories.fullName);
  const repoIds = connected.map((r) => r.id);
  const [available, commits, pulls, suggestions] = await Promise.all([
    db
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
          eq(githubInstallations.workspaceId, workspaceId),
          isNull(githubInstallations.deletedAt),
          isNull(githubRepositories.removedAt),
        ),
      )
      .orderBy(githubRepositories.fullName),
    repoIds.length
      ? db
          .select({
            id: githubCommits.id,
            sha: githubCommits.sha,
            message: githubCommits.message,
            author: sql<
              string | null
            >`coalesce(${githubCommits.authorLogin}, ${githubCommits.authorName})`,
            branch: githubCommits.branch,
            url: githubCommits.url,
            committedAt: githubCommits.committedAt,
            repo: githubRepositories.fullName,
          })
          .from(githubCommits)
          .innerJoin(
            githubRepositories,
            eq(githubRepositories.id, githubCommits.repositoryId),
          )
          .where(inArray(githubCommits.repositoryId, repoIds))
          .orderBy(desc(githubCommits.committedAt))
          .limit(25)
      : [],
    repoIds.length
      ? db
          .select({
            id: githubPullRequests.id,
            number: githubPullRequests.number,
            title: githubPullRequests.title,
            state: githubPullRequests.state,
            draft: githubPullRequests.draft,
            checkStatus: githubPullRequests.checkStatus,
            author: githubPullRequests.authorLogin,
            url: githubPullRequests.url,
            updatedAt: githubPullRequests.updatedAt,
            repo: githubRepositories.fullName,
          })
          .from(githubPullRequests)
          .innerJoin(
            githubRepositories,
            eq(githubRepositories.id, githubPullRequests.repositoryId),
          )
          .where(inArray(githubPullRequests.repositoryId, repoIds))
          .orderBy(desc(githubPullRequests.updatedAt))
          .limit(20)
      : [],
    pendingSuggestions(projectId),
  ]);
  return {
    connected: connected.map((r) => ({
      ...r,
      lastActivityAt: r.lastActivityAt?.toISOString() ?? null,
    })),
    available: available.filter((a) => !repoIds.includes(a.id)),
    commits: commits.map((c) => ({
      ...c,
      committedAt: c.committedAt.toISOString(),
    })),
    pulls: pulls.map((p) => ({ ...p, updatedAt: p.updatedAt.toISOString() })),
    suggestions,
  };
}

export async function pendingSuggestions(projectId: string) {
  return db
    .select({
      id: taskGithubLinks.id,
      ref: taskGithubLinks.ref,
      title: taskGithubLinks.title,
      url: taskGithubLinks.url,
      taskNumber: tasks.number,
      taskTitle: tasks.title,
    })
    .from(taskGithubLinks)
    .innerJoin(tasks, eq(tasks.id, taskGithubLinks.taskId))
    .where(
      and(
        eq(tasks.projectId, projectId),
        eq(taskGithubLinks.suggestion, "pending"),
      ),
    )
    .orderBy(desc(taskGithubLinks.updatedAt));
}

export async function taskLinks(taskId: string) {
  return db
    .select({
      id: taskGithubLinks.id,
      kind: taskGithubLinks.kind,
      ref: taskGithubLinks.ref,
      title: taskGithubLinks.title,
      url: taskGithubLinks.url,
      state: taskGithubLinks.state,
      suggestion: taskGithubLinks.suggestion,
      repo: githubRepositories.fullName,
    })
    .from(taskGithubLinks)
    .innerJoin(
      githubRepositories,
      eq(githubRepositories.id, taskGithubLinks.repositoryId),
    )
    .where(eq(taskGithubLinks.taskId, taskId))
    .orderBy(desc(taskGithubLinks.createdAt))
    .limit(30);
}

// The most recent development summary for the project, if any.
export async function latestDevSummary(projectId: string) {
  const [row] = await db
    .select({
      output: aiGenerations.output,
      createdAt: aiGenerations.createdAt,
    })
    .from(aiGenerations)
    .where(
      and(
        eq(aiGenerations.projectId, projectId),
        eq(aiGenerations.kind, "dev_summary"),
        eq(aiGenerations.status, "succeeded"),
      ),
    )
    .orderBy(desc(aiGenerations.createdAt))
    .limit(1);
  const parsed = devSummary
    .extend({
      counts: z.object({
        commits: z.number(),
        pullRequests: z.number(),
        tasks: z.number(),
      }),
    })
    .safeParse(row?.output);
  return parsed.success
    ? { ...parsed.data, createdAt: row.createdAt.toISOString() }
    : null;
}
