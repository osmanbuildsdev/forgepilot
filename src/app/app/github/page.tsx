import type { Metadata } from "next";
import { GitBranch } from "lucide-react";
import {
  requireUser,
  userProjects,
  userWorkspaces,
} from "@/server/projects/service";
import { workspaceGithub } from "@/server/github/queries";
import { githubAppConfigured } from "@/server/github/security";
import { canManageMembers, canWrite } from "@/server/permissions";
import { GithubWorkspaces } from "@/features/github/github-workspaces";

export const metadata: Metadata = { title: "GitHub" };

const errors: Record<string, string> = {
  missing: "GitHub'dan dönüşte kurulum bilgisi eksikti. Tekrar dene.",
  state:
    "Kurulum isteği doğrulanamadı veya süresi doldu. Bağlantıyı bu sayfadan yeniden başlat.",
  permission:
    "GitHub'ı yalnızca çalışma alanı sahibi veya yöneticisi bağlayabilir.",
  config: "GitHub App istemci bilgileri sunucuda eksik.",
  ownership:
    "GitHub bu kurulumun senin hesabına ait olduğunu doğrulamadı. Kurulumu kendi hesabınla yaptığından emin ol.",
  taken: "Bu GitHub kurulumu zaten başka bir çalışma alanına bağlı.",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const user = await requireUser();
  const [spaces, installations, projectRows] = await Promise.all([
    userWorkspaces(user.id),
    workspaceGithub(user.id),
    userProjects(user.id),
  ]);
  const query = await searchParams;
  const configured = githubAppConfigured();
  return (
    <div className="stack">
      <header className="page-heading">
        <div>
          <h1>GitHub</h1>
          <p className="muted">
            Repoları projelere bağla. Commit mesajında, PR başlığında veya dal
            adında geçen görev anahtarları (ör. FORGE-24) görevlerle eşleşir.
          </p>
        </div>
      </header>
      {query.connected && (
        <p className="panel" role="status" style={{ padding: 14 }}>
          GitHub bağlandı. Repolar birkaç saniye içinde aşağıda görünür;
          görünmezse sayfayı yenile.
        </p>
      )}
      {query.error && (
        <p className="error panel" role="alert" style={{ padding: 14 }}>
          {errors[query.error] ?? "GitHub bağlantısı tamamlanamadı."}
        </p>
      )}
      {!configured ? (
        <section className="panel stack" style={{ gap: 12 }}>
          <div className="row" style={{ gap: 10 }}>
            <GitBranch size={18} />
            <h2>GitHub App henüz yapılandırılmamış</h2>
          </div>
          <p className="muted">
            Bu sunucu bir GitHub App ile çalışır. Kurulum bir kez, sunucuyu
            yöneten kişi tarafından yapılır:
          </p>
          <ol className="setup-steps">
            <li>
              GitHub → Settings → Developer settings → GitHub Apps →{" "}
              <em>New GitHub App</em>.
            </li>
            <li>
              Setup URL: <code>{"<site>"}/api/github/setup</code> ve{" "}
              <em>Request user authorization (OAuth) during installation</em>{" "}
              açık.
            </li>
            <li>
              Webhook URL: <code>{"<site>"}/api/github/webhook</code>, bir
              webhook secret belirle.
            </li>
            <li>
              İzinler (salt okunur): Contents, Metadata, Pull requests, Checks.
              Olaylar: Push, Pull request, Check suite, Installation.
            </li>
            <li>
              <code>.env</code> içine <code>GITHUB_APP_ID</code>,{" "}
              <code>GITHUB_APP_SLUG</code>, <code>GITHUB_APP_CLIENT_ID</code>,{" "}
              <code>GITHUB_APP_CLIENT_SECRET</code>,{" "}
              <code>GITHUB_APP_PRIVATE_KEY</code> ve{" "}
              <code>GITHUB_WEBHOOK_SECRET</code> değerlerini yaz, sunucuyu
              yeniden başlat.
            </li>
          </ol>
          <p className="subtle" style={{ fontSize: 12 }}>
            Yerelde webhook almak için smee.io gibi bir tünel gerekir; GitHub
            localhost&apos;a erişemez.
          </p>
        </section>
      ) : (
        <GithubWorkspaces
          workspaces={spaces.map((w) => ({
            id: w.id,
            name: w.name,
            canConnect: canManageMembers(w.role),
          }))}
          installations={installations}
          projects={projectRows
            .filter((p) =>
              spaces.some(
                (w) => w.id === p.project.workspaceId && canWrite(w.role),
              ),
            )
            .map((p) => ({
              id: p.project.id,
              name: p.project.name,
              workspaceId: p.project.workspaceId,
            }))}
        />
      )}
    </div>
  );
}
