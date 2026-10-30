"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GitBranch, Lock } from "lucide-react";
import { githubInstallUrl, connectRepository } from "@/server/github/actions";
import { unwrap, errorMessage } from "@/lib/action-result";
import { Button } from "@/components/ui/button";

type Installation = {
  id: string;
  accountLogin: string;
  workspaceId: string;
  suspended: boolean;
  repositories: {
    id: string;
    fullName: string;
    htmlUrl: string;
    private: boolean;
    defaultBranch: string | null;
    lastActivityAt: string | null;
    openPullRequests: number;
    projects: { id: string; name: string }[];
  }[];
};

const dateFormat = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Istanbul",
});

export function GithubWorkspaces({
  workspaces,
  installations,
  projects,
}: {
  workspaces: { id: string; name: string; canConnect: boolean }[];
  installations: Installation[];
  projects: { id: string; name: string; workspaceId: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await action();
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {workspaces.map((w) => {
        const mine = installations.filter((i) => i.workspaceId === w.id);
        const choices = projects.filter((p) => p.workspaceId === w.id);
        return (
          <section key={w.id} className="panel stack" style={{ gap: 14 }}>
            <div className="panel-head" style={{ marginBottom: 0 }}>
              <h2>{w.name}</h2>
              {w.canConnect && (
                <Button
                  size="sm"
                  variant={mine.length ? "outline" : "default"}
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setError("");
                    try {
                      window.location.href = await githubInstallUrl(w.id).then(
                        unwrap,
                      );
                    } catch (e) {
                      setError(errorMessage(e));
                      setBusy(false);
                    }
                  }}
                >
                  <GitBranch size={14} />
                  {mine.length
                    ? "Başka hesap veya repo ekle"
                    : "GitHub'ı bağla"}
                </Button>
              )}
            </div>
            {!mine.length && (
              <p className="muted">
                {w.canConnect
                  ? "Henüz GitHub bağlı değil. Bağladığında hangi repolara erişim vereceğini GitHub'da sen seçersin."
                  : "Henüz GitHub bağlı değil. Bağlantıyı çalışma alanı yöneticisi kurabilir."}
              </p>
            )}
            {mine.map((i) => (
              <div key={i.id} className="stack" style={{ gap: 8 }}>
                <p className="subtle" style={{ fontSize: 12 }}>
                  @{i.accountLogin}
                  {i.suspended && " · askıya alınmış"}
                </p>
                {i.repositories.length ? (
                  <ul className="repo-list">
                    {i.repositories.map((r) => {
                      const available = choices.filter(
                        (p) => !r.projects.some((x) => x.id === p.id),
                      );
                      return (
                        <li key={r.id}>
                          <div style={{ minWidth: 0 }}>
                            <a
                              href={r.htmlUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="row"
                              style={{ gap: 6 }}
                            >
                              {r.private && (
                                <Lock size={12} className="subtle" />
                              )}
                              <strong className="truncate">{r.fullName}</strong>
                            </a>
                            <span className="subtle" style={{ fontSize: 12 }}>
                              {r.defaultBranch ?? "—"} · {r.openPullRequests}{" "}
                              açık PR ·{" "}
                              {r.lastActivityAt
                                ? `son hareket ${dateFormat.format(new Date(r.lastActivityAt))}`
                                : "henüz hareket yok"}
                            </span>
                            {r.projects.length > 0 && (
                              <span
                                className="row"
                                style={{
                                  gap: 4,
                                  flexWrap: "wrap",
                                  marginTop: 4,
                                }}
                              >
                                {r.projects.map((p) => (
                                  <Link
                                    key={p.id}
                                    href={`/app/projects/${p.id}/github`}
                                    className="badge"
                                  >
                                    {p.name}
                                  </Link>
                                ))}
                              </span>
                            )}
                          </div>
                          {available.length > 0 && (
                            <select
                              aria-label={`${r.fullName} reposunu projeye bağla`}
                              value=""
                              disabled={busy}
                              onChange={(e) => {
                                const projectId = e.target.value;
                                if (projectId)
                                  void run(() =>
                                    connectRepository(projectId, r.id).then(
                                      unwrap,
                                    ),
                                  );
                              }}
                              style={{ width: "auto", height: 30 }}
                            >
                              <option value="">Projeye bağla…</option>
                              {available.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="muted" style={{ fontSize: 13 }}>
                    Bu kurulumda erişilebilir repo yok. GitHub&apos;da kurulum
                    ayarlarından repo ekleyebilirsin.
                  </p>
                )}
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
