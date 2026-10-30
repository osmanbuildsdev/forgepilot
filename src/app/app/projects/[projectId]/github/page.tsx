import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { GitCommitHorizontal, GitPullRequest } from "lucide-react";
import {
  requireUser,
  projectAccess,
  workspaceAccess,
} from "@/server/projects/service";
import { projectGithub, latestDevSummary } from "@/server/github/queries";
import { DevSummaryPanel } from "@/features/github/dev-summary";
import { canWrite } from "@/server/permissions";
import { ProjectHeader } from "@/components/project-header";
import { ProjectRepos } from "@/features/github/project-repos";
import { SuggestionButtons } from "@/features/github/suggestion-buttons";

export const metadata: Metadata = { title: "GitHub" };

const timeFormat = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Istanbul",
});
const stateLabels = { open: "Açık", closed: "Kapalı", merged: "Birleştirildi" };
const checkLabels: Record<string, string> = {
  success: "Kontroller geçti",
  failure: "Kontroller başarısız",
  cancelled: "Kontroller iptal",
  timed_out: "Kontroller zaman aşımı",
  neutral: "Kontroller nötr",
};

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  if (!z.uuid().safeParse(projectId).success) notFound();
  const user = await requireUser();
  const project = await projectAccess(projectId, user.id);
  const [me, data] = await Promise.all([
    workspaceAccess(project.workspaceId, user.id),
    projectGithub(projectId, project.workspaceId),
  ]);
  const summary = await latestDevSummary(projectId);
  const editable = canWrite(me.role);
  return (
    <>
      <ProjectHeader
        project={project}
        active="/github"
        subtitle={`Commit ve PR'larda ${project.key}-24 gibi anahtarlar geçtiğinde görevlerle eşleşir.`}
      />
      <div className="stack">
        {data.suggestions.length > 0 && (
          <section className="panel">
            <div className="panel-head">
              <h2>Onay bekleyen tamamlanma önerileri</h2>
            </div>
            <ul className="sprint-list">
              {data.suggestions.map((s) => (
                <li
                  key={s.id}
                  style={{ alignItems: "flex-start", flexWrap: "wrap" }}
                >
                  <span style={{ minWidth: 0 }}>
                    <strong>
                      {project.key}-{s.taskNumber} {s.taskTitle}
                    </strong>
                    <span
                      className="subtle"
                      style={{ display: "block", fontSize: 12 }}
                    >
                      <a href={s.url} target="_blank" rel="noreferrer">
                        PR #{s.ref}
                      </a>{" "}
                      birleştirildi: {s.title}
                    </span>
                  </span>
                  {editable && (
                    <SuggestionButtons projectId={projectId} linkId={s.id} />
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
        <ProjectRepos
          projectId={projectId}
          connected={data.connected}
          available={data.available}
          editable={editable}
        />
        {data.connected.length > 0 && (
          <DevSummaryPanel
            projectId={projectId}
            summary={summary}
            canGenerate={editable && Boolean(process.env.GEMINI_API_KEY)}
          />
        )}
        {data.connected.length > 0 && (
          <div className="dash-grid">
            <section className="panel">
              <div className="panel-head">
                <h2>Pull request&apos;ler</h2>
              </div>
              {data.pulls.length ? (
                <ul className="event-list" style={{ padding: 0 }}>
                  {data.pulls.map((p) => (
                    <li key={p.id}>
                      <GitPullRequest size={15} />
                      <span style={{ minWidth: 0 }}>
                        <a href={p.url} target="_blank" rel="noreferrer">
                          #{p.number} {p.title}
                        </a>
                        <span
                          className="subtle"
                          style={{ display: "block", fontSize: 12 }}
                        >
                          {p.repo} · {p.author ?? "—"} · {stateLabels[p.state]}
                          {p.draft ? " · taslak" : ""}
                          {p.checkStatus
                            ? ` · ${checkLabels[p.checkStatus] ?? p.checkStatus}`
                            : ""}
                        </span>
                      </span>
                      <time>{timeFormat.format(new Date(p.updatedAt))}</time>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="subtle">Henüz pull request kaydı yok.</p>
              )}
            </section>
            <section className="panel">
              <div className="panel-head">
                <h2>Son commit&apos;ler</h2>
              </div>
              {data.commits.length ? (
                <ul className="event-list" style={{ padding: 0 }}>
                  {data.commits.map((c) => (
                    <li key={c.id}>
                      <GitCommitHorizontal size={15} />
                      <span style={{ minWidth: 0 }}>
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate"
                        >
                          {c.message.split("\n")[0]}
                        </a>
                        <span
                          className="subtle"
                          style={{ display: "block", fontSize: 12 }}
                        >
                          <code>{c.sha.slice(0, 7)}</code> · {c.author ?? "—"}
                          {c.branch ? ` · ${c.branch}` : ""}
                        </span>
                      </span>
                      <time>{timeFormat.format(new Date(c.committedAt))}</time>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="subtle">
                  Henüz commit kaydı yok. Bağlantıdan sonraki push&apos;lar
                  burada görünür.
                </p>
              )}
            </section>
          </div>
        )}
        {!data.connected.length && !data.available.length && (
          <p className="muted">
            Bu çalışma alanında bağlanabilir repo yok.{" "}
            <Link href="/app/github" className="text-link">
              GitHub sayfasından
            </Link>{" "}
            bağlantı kurabilirsin.
          </p>
        )}
      </div>
    </>
  );
}
