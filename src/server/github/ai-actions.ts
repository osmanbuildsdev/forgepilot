"use server";
import { z } from "zod";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { UserError, attempt } from "@/server/errors";
import { db } from "@/server/db";
import {
  aiGenerations,
  githubCommits,
  githubPullRequests,
  githubRepositories,
  projectRepositories,
  taskGithubLinks,
  tasks,
} from "@/server/db/schema";
import { requireUser, projectAccess } from "@/server/projects/service";
import { getAIProvider } from "@/server/ai/provider";
import { consumeHourlyQuota } from "@/server/ai/quota";

const WINDOW_DAYS = 7;

export async function generateDevSummary(projectId: string) {
  return attempt(async () => {
    z.uuid().parse(projectId);
    const user = await requireUser();
    const project = await projectAccess(projectId, user.id, true);
    const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const repoIds = (
      await db
        .select({ id: projectRepositories.repositoryId })
        .from(projectRepositories)
        .where(eq(projectRepositories.projectId, projectId))
    ).map((r) => r.id);
    if (!repoIds.length) throw new UserError("Bu projeye bağlı repo yok.");

    const [commits, pulls, linked] = await Promise.all([
      db
        .select({
          sha: githubCommits.sha,
          message: githubCommits.message,
          author: githubCommits.authorLogin,
          branch: githubCommits.branch,
          repo: githubRepositories.fullName,
        })
        .from(githubCommits)
        .innerJoin(
          githubRepositories,
          eq(githubRepositories.id, githubCommits.repositoryId),
        )
        .where(
          and(
            inArray(githubCommits.repositoryId, repoIds),
            gte(githubCommits.committedAt, since),
          ),
        )
        .orderBy(desc(githubCommits.committedAt))
        .limit(80),
      db
        .select({
          number: githubPullRequests.number,
          title: githubPullRequests.title,
          state: githubPullRequests.state,
          checkStatus: githubPullRequests.checkStatus,
          draft: githubPullRequests.draft,
        })
        .from(githubPullRequests)
        .where(
          and(
            inArray(githubPullRequests.repositoryId, repoIds),
            gte(githubPullRequests.updatedAt, since),
          ),
        )
        .orderBy(desc(githubPullRequests.updatedAt))
        .limit(30),
      db
        .selectDistinct({
          number: tasks.number,
          title: tasks.title,
          status: tasks.status,
        })
        .from(taskGithubLinks)
        .innerJoin(tasks, eq(tasks.id, taskGithubLinks.taskId))
        .where(
          and(
            eq(tasks.projectId, projectId),
            gte(taskGithubLinks.updatedAt, since),
          ),
        )
        .limit(40),
    ]);
    // Without activity there is nothing to summarise; the AI is not asked.
    if (!commits.length && !pulls.length)
      throw new UserError(
        `Son ${WINDOW_DAYS} günde bağlı repolarda hareket yok.`,
      );

    await consumeHourlyQuota(
      `ai:devsummary:${user.id}`,
      10,
      "Saatlik geliştirme özeti sınırına ulaştın. Daha sonra tekrar dene.",
    );
    const provider = getAIProvider();
    const summary = await provider.summarizeDevelopment({
      project: { key: project.key, name: project.name },
      windowDays: WINDOW_DAYS,
      commits: commits.map((c) => ({
        sha: c.sha.slice(0, 7),
        message: c.message.slice(0, 300),
        author: c.author,
        branch: c.branch,
        repo: c.repo,
      })),
      pullRequests: pulls,
      linkedTasks: linked.map((t) => ({
        key: `${project.key}-${t.number}`,
        title: t.title,
        status: t.status,
      })),
    });
    const output = {
      ...summary,
      counts: {
        commits: commits.length,
        pullRequests: pulls.length,
        tasks: linked.length,
      },
    };
    await db.insert(aiGenerations).values({
      userId: user.id,
      workspaceId: project.workspaceId,
      projectId,
      kind: "dev_summary",
      model: provider.model,
      input: { windowDays: WINDOW_DAYS },
      output,
      status: "succeeded",
    });
    return output;
  });
}
