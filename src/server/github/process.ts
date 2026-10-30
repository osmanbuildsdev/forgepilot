import "server-only";
import { z } from "zod";
import { and, eq, inArray, isNull, ne } from "drizzle-orm";
import { db } from "@/server/db";
import {
  githubCommits,
  githubEvents,
  githubInstallations,
  githubPullRequests,
  githubRepositories,
  projectRepositories,
  projects,
  taskGithubLinks,
  tasks,
} from "@/server/db/schema";
import { recordActivity } from "@/server/activity";
import { notify } from "@/server/notifications/service";
import { extractTaskKeys } from "./security";

// Only the fields we use are validated; GitHub sends many more.
const account = z.object({ login: z.string(), type: z.string() });
const repoRef = z.object({
  id: z.number(),
  full_name: z.string(),
  private: z.boolean().optional(),
  html_url: z.string().optional(),
  default_branch: z.string().optional(),
});
const installationPayload = z.object({
  action: z.string(),
  installation: z.object({ id: z.number(), account }),
  repositories: z.array(repoRef).optional(),
  repositories_added: z.array(repoRef).optional(),
  repositories_removed: z.array(repoRef).optional(),
});
const pushPayload = z.object({
  ref: z.string(),
  installation: z.object({ id: z.number() }).optional(),
  repository: repoRef,
  commits: z
    .array(
      z.object({
        id: z.string(),
        message: z.string(),
        timestamp: z.string(),
        url: z.string(),
        author: z
          .object({
            name: z.string().optional(),
            username: z.string().optional(),
          })
          .optional(),
      }),
    )
    .default([]),
});
const pullRequestPayload = z.object({
  action: z.string(),
  installation: z.object({ id: z.number() }).optional(),
  repository: repoRef,
  pull_request: z.object({
    number: z.number(),
    title: z.string(),
    body: z.string().nullable().optional(),
    state: z.enum(["open", "closed"]),
    merged: z.boolean().nullable().optional(),
    draft: z.boolean().optional(),
    html_url: z.string(),
    user: z.object({ login: z.string() }).nullable().optional(),
    head: z.object({ ref: z.string(), sha: z.string() }),
    created_at: z.string(),
    merged_at: z.string().nullable().optional(),
    closed_at: z.string().nullable().optional(),
  }),
});
const checkPayload = z.object({
  repository: repoRef,
  check_suite: z
    .object({
      head_sha: z.string(),
      conclusion: z.string().nullable(),
      status: z.string(),
    })
    .optional(),
  check_run: z
    .object({
      head_sha: z.string(),
      conclusion: z.string().nullable(),
      status: z.string(),
    })
    .optional(),
});

type Outcome = { status: "processed" | "ignored"; note?: string };

export async function processGithubEvent(eventId: string) {
  const [row] = await db
    .select()
    .from(githubEvents)
    .where(eq(githubEvents.id, eventId));
  if (!row || row.status === "processed") return;
  try {
    const outcome = await handle(row.event, row.payload);
    await db
      .update(githubEvents)
      .set({
        status: outcome.status,
        error: outcome.note ?? null,
        attempts: row.attempts + 1,
        processedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(githubEvents.id, eventId));
  } catch (error) {
    await db
      .update(githubEvents)
      .set({
        status: "failed",
        error: error instanceof Error ? error.message.slice(0, 500) : "unknown",
        attempts: row.attempts + 1,
        updatedAt: new Date(),
      })
      .where(eq(githubEvents.id, eventId));
    throw error;
  }
}

async function handle(event: string, payload: unknown): Promise<Outcome> {
  switch (event) {
    case "installation":
    case "installation_repositories":
      return handleInstallation(payload);
    case "push":
      return handlePush(payload);
    case "pull_request":
      return handlePullRequest(payload);
    case "check_suite":
    case "check_run":
      return handleCheck(payload);
    default:
      return { status: "ignored", note: `Unhandled event: ${event}` };
  }
}

async function upsertInstallation(i: {
  id: number;
  account: { login: string; type: string };
}) {
  const [row] = await db
    .insert(githubInstallations)
    .values({
      installationId: i.id,
      accountLogin: i.account.login,
      accountType: i.account.type,
    })
    .onConflictDoUpdate({
      target: githubInstallations.installationId,
      set: {
        accountLogin: i.account.login,
        accountType: i.account.type,
        updatedAt: new Date(),
      },
    })
    .returning();
  return row;
}

async function upsertRepositories(
  installationRowId: string,
  repos: z.infer<typeof repoRef>[],
) {
  for (const r of repos)
    await db
      .insert(githubRepositories)
      .values({
        installationId: installationRowId,
        githubId: r.id,
        fullName: r.full_name,
        private: r.private ?? false,
        htmlUrl: r.html_url ?? `https://github.com/${r.full_name}`,
        defaultBranch: r.default_branch ?? null,
      })
      .onConflictDoUpdate({
        target: githubRepositories.githubId,
        set: {
          installationId: installationRowId,
          fullName: r.full_name,
          private: r.private ?? false,
          removedAt: null,
          updatedAt: new Date(),
        },
      });
}

async function markRemoved(githubIds: number[]) {
  if (githubIds.length)
    await db
      .update(githubRepositories)
      .set({ removedAt: new Date(), updatedAt: new Date() })
      .where(inArray(githubRepositories.githubId, githubIds));
}

async function handleInstallation(payload: unknown): Promise<Outcome> {
  const p = installationPayload.safeParse(payload);
  if (!p.success)
    return { status: "ignored", note: "Unexpected installation payload" };
  const { action, installation } = p.data;
  const row = await upsertInstallation(installation);
  if (action === "deleted") {
    await db
      .update(githubInstallations)
      .set({ deletedAt: new Date(), workspaceId: null, updatedAt: new Date() })
      .where(eq(githubInstallations.id, row.id));
    await db
      .update(githubRepositories)
      .set({ removedAt: new Date() })
      .where(eq(githubRepositories.installationId, row.id));
    return { status: "processed" };
  }
  if (action === "suspend" || action === "unsuspend")
    await db
      .update(githubInstallations)
      .set({
        suspendedAt: action === "suspend" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(githubInstallations.id, row.id));
  if (action === "created" || action === "new_permissions_accepted")
    await db
      .update(githubInstallations)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(eq(githubInstallations.id, row.id));
  await upsertRepositories(row.id, [
    ...(p.data.repositories ?? []),
    ...(p.data.repositories_added ?? []),
  ]);
  await markRemoved((p.data.repositories_removed ?? []).map((r) => r.id));
  return { status: "processed" };
}

// The repository row for an event, only if its installation is active.
async function activeRepository(repo: z.infer<typeof repoRef>) {
  const [row] = await db
    .select({ id: githubRepositories.id })
    .from(githubRepositories)
    .innerJoin(
      githubInstallations,
      eq(githubInstallations.id, githubRepositories.installationId),
    )
    .where(
      and(
        eq(githubRepositories.githubId, repo.id),
        isNull(githubRepositories.removedAt),
        isNull(githubInstallations.deletedAt),
        isNull(githubInstallations.suspendedAt),
      ),
    );
  if (row)
    await db
      .update(githubRepositories)
      .set({
        lastActivityAt: new Date(),
        fullName: repo.full_name,
        ...(repo.default_branch ? { defaultBranch: repo.default_branch } : {}),
        ...(repo.html_url ? { htmlUrl: repo.html_url } : {}),
      })
      .where(eq(githubRepositories.id, row.id));
  return row?.id ?? null;
}

// Tasks referenced by key in projects connected to this repository.
async function referencedTasks(repositoryId: string, keys: string[]) {
  if (!keys.length) return [];
  const linked = await db
    .select({ projectId: projects.id, key: projects.key })
    .from(projectRepositories)
    .innerJoin(projects, eq(projects.id, projectRepositories.projectId))
    .where(eq(projectRepositories.repositoryId, repositoryId));
  const found: {
    id: string;
    number: number;
    title: string;
    status: string;
    projectId: string;
    projectKey: string;
    assigneeId: string | null;
    createdBy: string;
  }[] = [];
  for (const project of linked) {
    const numbers = keys
      .filter((k) => k.startsWith(`${project.key}-`))
      .map((k) => Number(k.slice(project.key.length + 1)));
    if (!numbers.length) continue;
    const rows = await db
      .select({
        id: tasks.id,
        number: tasks.number,
        title: tasks.title,
        status: tasks.status,
        assigneeId: tasks.assigneeId,
        createdBy: tasks.createdBy,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.projectId, project.projectId),
          inArray(tasks.number, numbers),
        ),
      );
    found.push(
      ...rows.map((r) => ({
        ...r,
        projectId: project.projectId,
        projectKey: project.key,
      })),
    );
  }
  return found;
}

async function handlePush(payload: unknown): Promise<Outcome> {
  const p = pushPayload.safeParse(payload);
  if (!p.success) return { status: "ignored", note: "Unexpected push payload" };
  const repositoryId = await activeRepository(p.data.repository);
  if (!repositoryId)
    return { status: "ignored", note: "Repository not connected" };
  const branch = p.data.ref.startsWith("refs/heads/")
    ? p.data.ref.slice(11)
    : null;
  for (const c of p.data.commits.slice(0, 100)) {
    await db
      .insert(githubCommits)
      .values({
        repositoryId,
        sha: c.id,
        message: c.message.slice(0, 5000),
        authorName: c.author?.name ?? null,
        authorLogin: c.author?.username ?? null,
        branch,
        url: c.url,
        committedAt: new Date(c.timestamp),
      })
      .onConflictDoNothing();
    const summary = c.message.split("\n")[0].slice(0, 200);
    for (const task of await referencedTasks(
      repositoryId,
      extractTaskKeys(c.message),
    )) {
      const [link] = await db
        .insert(taskGithubLinks)
        .values({
          taskId: task.id,
          repositoryId,
          kind: "commit",
          ref: c.id,
          title: summary,
          url: c.url,
        })
        .onConflictDoNothing()
        .returning({ id: taskGithubLinks.id });
      if (link)
        await recordActivity(db, {
          projectId: task.projectId,
          type: "github.commit",
          source: "github",
          taskId: task.id,
          message: `${task.projectKey}-${task.number}: commit ${c.id.slice(0, 7)} — ${summary}`,
          metadata: {
            sha: c.id,
            url: c.url,
            author: c.author?.username ?? c.author?.name,
          },
        });
    }
  }
  return { status: "processed" };
}

async function handlePullRequest(payload: unknown): Promise<Outcome> {
  const p = pullRequestPayload.safeParse(payload);
  if (!p.success)
    return { status: "ignored", note: "Unexpected pull_request payload" };
  const repositoryId = await activeRepository(p.data.repository);
  if (!repositoryId)
    return { status: "ignored", note: "Repository not connected" };
  const pr = p.data.pull_request;
  const state = pr.merged ? "merged" : pr.state;
  const values = {
    title: pr.title.slice(0, 500),
    body: (pr.body ?? "").slice(0, 10000),
    state,
    draft: pr.draft ?? false,
    authorLogin: pr.user?.login ?? null,
    url: pr.html_url,
    headRef: pr.head.ref,
    headSha: pr.head.sha,
    openedAt: new Date(pr.created_at),
    mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
    closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
  } as const;
  await db
    .insert(githubPullRequests)
    .values({ repositoryId, number: pr.number, ...values })
    .onConflictDoUpdate({
      target: [githubPullRequests.repositoryId, githubPullRequests.number],
      set: { ...values, updatedAt: new Date() },
    });

  const justMerged = p.data.action === "closed" && state === "merged";
  const label = `PR #${pr.number}`;
  for (const task of await referencedTasks(
    repositoryId,
    extractTaskKeys(pr.title, pr.body, pr.head.ref),
  )) {
    const [existing] = await db
      .select()
      .from(taskGithubLinks)
      .where(
        and(
          eq(taskGithubLinks.taskId, task.id),
          eq(taskGithubLinks.repositoryId, repositoryId),
          eq(taskGithubLinks.kind, "pull_request"),
          eq(taskGithubLinks.ref, String(pr.number)),
        ),
      );
    // A merged PR only suggests completion; people decide.
    const suggest =
      justMerged &&
      task.status !== "done" &&
      (existing?.suggestion ?? "none") === "none";
    if (existing)
      await db
        .update(taskGithubLinks)
        .set({
          title: values.title,
          state,
          url: pr.html_url,
          ...(suggest ? { suggestion: "pending" as const } : {}),
          updatedAt: new Date(),
        })
        .where(eq(taskGithubLinks.id, existing.id));
    else
      await db.insert(taskGithubLinks).values({
        taskId: task.id,
        repositoryId,
        kind: "pull_request",
        ref: String(pr.number),
        title: values.title,
        url: pr.html_url,
        state,
        suggestion: suggest ? "pending" : "none",
      });

    const key = `${task.projectKey}-${task.number}`;
    if (!existing || justMerged || p.data.action === "reopened")
      await recordActivity(db, {
        projectId: task.projectId,
        type: suggest ? "github.suggestion" : "github.pull_request",
        source: "github",
        taskId: task.id,
        message: suggest
          ? `${label} birleştirildi. ${key} tamamlanmış olabilir; onay bekliyor.`
          : `${key}: ${label} ${state === "merged" ? "birleştirildi" : state === "open" ? "açık" : "kapatıldı"} — ${values.title}`,
        metadata: { number: pr.number, url: pr.html_url, state },
      });
    if (suggest)
      await notify(db, [
        {
          userId: task.assigneeId ?? task.createdBy,
          actorId: null,
          type: "task.completion_suggested",
          title: `${key} tamamlanmış olabilir`,
          body: `${label} birleştirildi: ${values.title}`,
          href: `/app/projects/${task.projectId}/board`,
          projectId: task.projectId,
          taskId: task.id,
        },
      ]);
  }
  return { status: "processed" };
}

async function handleCheck(payload: unknown): Promise<Outcome> {
  const p = checkPayload.safeParse(payload);
  const check = p.success
    ? (p.data.check_suite ?? p.data.check_run)
    : undefined;
  if (!p.success || !check)
    return { status: "ignored", note: "Unexpected check payload" };
  if (check.status !== "completed")
    return { status: "ignored", note: "Check not completed" };
  const repositoryId = await activeRepository(p.data.repository);
  if (!repositoryId)
    return { status: "ignored", note: "Repository not connected" };
  await db
    .update(githubPullRequests)
    .set({ checkStatus: check.conclusion ?? "neutral", updatedAt: new Date() })
    .where(
      and(
        eq(githubPullRequests.repositoryId, repositoryId),
        eq(githubPullRequests.headSha, check.head_sha),
        ne(githubPullRequests.state, "merged"),
      ),
    );
  return { status: "processed" };
}
