import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import {
  requireUser,
  userProjects,
  userWorkspaces,
} from "@/server/projects/service";
import { canWrite } from "@/server/permissions";
import { CopilotChat } from "@/features/ai/copilot-chat";

export const metadata: Metadata = { title: "Copilot" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const user = await requireUser();
  const [spaces, items] = await Promise.all([
    userWorkspaces(user.id),
    userProjects(user.id),
  ]);
  const { project } = await searchParams;
  const writable = new Set(
    spaces.filter((w) => canWrite(w.role)).map((w) => w.id),
  );
  const projects = items.map(({ project: p }) => ({
    id: p.id,
    name: p.name,
    key: p.key,
    canWrite: writable.has(p.workspaceId),
  }));
  return (
    <div className="stack" style={{ maxWidth: 900 }}>
      <header className="page-heading">
        <div>
          <h1>Copilot</h1>
          <p className="muted">
            Projenin görevleri, sprintleri, milestone&apos;ları ve GitHub
            hareketleri üzerinden soru sor. Önerdiği değişiklikler sen
            onaylamadan uygulanmaz.
          </p>
        </div>
      </header>
      {!process.env.GEMINI_API_KEY ? (
        <div className="panel stack" style={{ gap: 8 }}>
          <h2>Gemini yapılandırılmamış</h2>
          <p className="muted">
            Copilot için sunucuda <code>GEMINI_API_KEY</code> tanımlı olmalı.
          </p>
        </div>
      ) : projects.length ? (
        <CopilotChat
          projects={projects}
          initialProject={
            projects.some((p) => p.id === project) ? project! : projects[0].id
          }
        />
      ) : (
        <div className="empty">
          <Sparkles size={22} />
          <p className="muted">
            Copilot bir proje üzerinde çalışır. Önce bir proje oluştur.
          </p>
          <Link href="/app/projects/new" className="button primary">
            Proje oluştur
          </Link>
        </div>
      )}
    </div>
  );
}
