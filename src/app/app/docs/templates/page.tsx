import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  requireUser,
  userProjects,
  userWorkspaces,
} from "@/server/projects/service";
import { userTemplates } from "@/server/docs/templates";
import { canWrite } from "@/server/permissions";
import { builtinTemplates } from "@/features/docs/builtin-templates";
import { parseMarkdown } from "@/features/docs/markdown";
import { findPlaceholders } from "@/features/docs/placeholders";
import { TemplateGallery } from "@/features/docs/template-gallery";

export const metadata: Metadata = { title: "Şablonlar" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const user = await requireUser();
  const [spaces, projectRows, templates] = await Promise.all([
    userWorkspaces(user.id),
    userProjects(user.id),
    userTemplates(user.id),
  ]);
  const writable = new Set(
    spaces.filter((w) => canWrite(w.role)).map((w) => w.id),
  );
  const { project } = await searchParams;
  const describe = (content: string) => ({
    sections: parseMarkdown(content).headings.length,
    placeholders: findPlaceholders(content),
  });
  return (
    <div className="stack">
      <Link
        href="/app/docs"
        className="row subtle"
        style={{ gap: 6, fontSize: 13 }}
      >
        <ArrowLeft size={14} /> Dokümanlar
      </Link>
      <header className="page-heading" style={{ marginBottom: 0 }}>
        <div>
          <h1>Şablonlar</h1>
          <p className="muted">
            Bir şablonu kullandığında <code>{"{{project_name}}"}</code> gibi yer
            tutucular projenin gerçek verileriyle doldurulur. Verisi olmayanlar
            olduğu gibi kalır.
          </p>
        </div>
      </header>
      <TemplateGallery
        defaultProject={
          projectRows.some((p) => p.project.id === project) ? project! : ""
        }
        projects={projectRows
          .filter((p) => writable.has(p.project.workspaceId))
          .map((p) => ({
            id: p.project.id,
            name: p.project.name,
            workspaceId: p.project.workspaceId,
          }))}
        workspaces={spaces
          .filter((w) => writable.has(w.id))
          .map((w) => ({ id: w.id, name: w.name }))}
        builtins={builtinTemplates.map((t) => ({
          ref: `builtin:${t.id}`,
          id: t.id,
          name: t.name,
          description: t.description,
          content: t.content,
          ...describe(t.content),
        }))}
        custom={templates.map((t) => ({
          ref: t.id,
          id: t.id,
          name: t.name,
          description: t.description,
          workspaceId: t.workspaceId,
          workspaceName: t.workspaceName,
          editable: writable.has(t.workspaceId),
        }))}
      />
    </div>
  );
}
