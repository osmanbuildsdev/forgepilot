import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import {
  requireUser,
  projectAccess,
  workspaceAccess,
} from "@/server/projects/service";
import {
  getDocument,
  documentHistory,
  getVersion,
} from "@/server/docs/queries";
import { canWrite } from "@/server/permissions";
import { renderMarkdown } from "@/features/docs/markdown";
import { RestoreVersion } from "@/features/docs/restore-version";

export const metadata: Metadata = { title: "Doküman geçmişi" };

const timeFormat = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Istanbul",
});

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string; documentId: string }>;
  searchParams: Promise<{ v?: string }>;
}) {
  const { projectId, documentId } = await params;
  if (
    !z.uuid().safeParse(projectId).success ||
    !z.uuid().safeParse(documentId).success
  )
    notFound();
  const user = await requireUser();
  const project = await projectAccess(projectId, user.id);
  const doc = await getDocument(projectId, documentId).catch(() => null);
  if (!doc) notFound();
  const [me, versions] = await Promise.all([
    workspaceAccess(project.workspaceId, user.id),
    documentHistory(documentId),
  ]);
  const requested = Number((await searchParams).v);
  const selected = Number.isInteger(requested) ? requested : doc.currentVersion;
  const version = await getVersion(documentId, selected);
  const base = `/app/projects/${projectId}/docs/${documentId}`;
  return (
    <div className="stack" style={{ gap: 16 }}>
      <Link href={base} className="row subtle" style={{ gap: 6, fontSize: 13 }}>
        <ArrowLeft size={14} /> {doc.title}
      </Link>
      <header className="page-heading" style={{ marginBottom: 0 }}>
        <div>
          <h1>Sürüm geçmişi</h1>
          <p className="muted">
            Her kayıt yeni bir sürüm oluşturur. Geri yükleme de geçmişi silmez,
            üstüne yeni bir sürüm ekler.
          </p>
        </div>
      </header>
      <div className="history-layout">
        <ol className="version-list panel">
          {versions.map((v) => (
            <li
              key={v.id}
              className={v.versionNumber === selected ? "active" : ""}
            >
              <Link href={`${base}/history?v=${v.versionNumber}`}>
                <strong>
                  Sürüm {v.versionNumber}
                  {v.versionNumber === doc.currentVersion && (
                    <span className="badge accent" style={{ marginLeft: 6 }}>
                      Güncel
                    </span>
                  )}
                </strong>
                <span className="subtle">
                  {timeFormat.format(v.createdAt)}
                  {v.authorName ? ` · ${v.authorName}` : ""}
                </span>
                {v.note && <span className="muted">{v.note}</span>}
              </Link>
            </li>
          ))}
        </ol>
        <section className="panel">
          {version ? (
            <>
              <div className="panel-head">
                <h2>
                  {version.title}{" "}
                  <span className="subtle">
                    · sürüm {version.versionNumber}
                  </span>
                </h2>
                {canWrite(me.role) &&
                  version.versionNumber !== doc.currentVersion && (
                    <RestoreVersion
                      projectId={projectId}
                      documentId={documentId}
                      versionNumber={version.versionNumber}
                      baseVersion={doc.currentVersion}
                    />
                  )}
              </div>
              <article
                className="markdown"
                // Sanitised by renderMarkdown.
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(version.contentMarkdown),
                }}
              />
            </>
          ) : (
            <p className="subtle">Sürüm bulunamadı.</p>
          )}
        </section>
      </div>
    </div>
  );
}
