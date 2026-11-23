"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  FolderKanban,
  GitBranch,
  PenLine,
  Sparkles,
  Users,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { createProject, createWorkspace } from "@/server/actions";
import {
  connectRepository,
  createProjectFromRepository,
  githubInstallUrl,
} from "@/server/github/actions";
import { unwrap, errorMessage } from "@/lib/action-result";
import { Logo } from "@/components/logo";
import { projectFromRepo } from "@/features/github/repo-project";
import { Button } from "@/components/ui/button";

type Workspace = { id: string; name: string; role: string };
type Project = { id: string; name: string; key: string };

const STEPS = ["Profil", "Çalışma alanı", "İlk proje", "GitHub", "Hazır"];

export function OnboardingWizard({
  step,
  user,
  workspaces,
  workspace,
  project,
  mode,
  githubConfigured,
  repositories,
  aiEnabled,
  githubResult,
}: {
  step: number;
  user: { name: string };
  workspaces: Workspace[];
  workspace: Workspace | null;
  project: Project | null;
  mode: "import" | "default";
  githubConfigured: boolean;
  repositories: { id: string; fullName: string; linked: boolean }[];
  aiEnabled: boolean;
  githubResult: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const go = (next: number, extra: Record<string, string | undefined> = {}) => {
    const params = new URLSearchParams({ step: String(next) });
    const values = { workspace: workspace?.id, project: project?.id, ...extra };
    for (const [k, v] of Object.entries(values)) if (v) params.set(k, v);
    setError("");
    router.push(`/onboarding?${params}`);
  };

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    // Steps share one page, so busy must reset after success too or the
    // next step's button stays disabled.
    try {
      await action();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const canConnectGithub =
    workspace?.role === "owner" || workspace?.role === "admin";

  return (
    <main className="onboarding">
      <header className="row between">
        <Logo />
        <Link href="/app" className="subtle" style={{ fontSize: 13 }}>
          Atla ve uygulamaya git
        </Link>
      </header>
      <ol className="steps" aria-label="Adımlar">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={i + 1 === step ? "current" : i + 1 < step ? "done" : ""}
            aria-current={i + 1 === step ? "step" : undefined}
          >
            <span>{i + 1 < step ? <Check size={12} /> : i + 1}</span>
            {label}
          </li>
        ))}
      </ol>

      <section className="panel onboarding-card">
        {step === 1 && (
          <form
            className="form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              const name = String(
                new FormData(e.currentTarget).get("name"),
              ).trim();
              void run(async () => {
                if (name !== user.name) {
                  const r = await authClient.updateUser({
                    name: name.slice(0, 100),
                  });
                  if (r.error) throw new Error("Ad kaydedilemedi.");
                }
                go(2, { workspace: workspaces[0]?.id });
              });
            }}
          >
            <h1>Hoş geldin.</h1>
            <p className="muted">Ekip arkadaşların seni bu adla görecek.</p>
            <label className="field">
              Ad soyad
              <input
                name="name"
                defaultValue={user.name}
                required
                minLength={2}
                maxLength={100}
                autoComplete="name"
              />
            </label>
            <Button disabled={busy}>
              Devam <ArrowRight size={14} />
            </Button>
          </form>
        )}

        {step === 2 && (
          <div className="stack" style={{ gap: 18 }}>
            <div>
              <h1>Çalışma alanın</h1>
              <p className="muted">
                Projeler, ekip ve GitHub bağlantıları bir çalışma alanında
                toplanır.
              </p>
            </div>
            {workspaces.length > 0 && (
              <div className="stack" style={{ gap: 8 }}>
                {workspaces.map((w) => (
                  <button
                    key={w.id}
                    className="choice"
                    onClick={() =>
                      go(3, { workspace: w.id, project: undefined })
                    }
                  >
                    <Users size={16} />
                    <span>
                      <strong>{w.name}</strong>
                      <span className="subtle">
                        Bu çalışma alanıyla devam et
                      </span>
                    </span>
                    <ArrowRight size={14} className="subtle" />
                  </button>
                ))}
                <div className="or-divider">veya yeni oluştur</div>
              </div>
            )}
            <form
              className="form-grid"
              onSubmit={(e) => {
                e.preventDefault();
                const name = new FormData(e.currentTarget).get("name");
                void run(async () => {
                  const id = await createWorkspace(name).then(unwrap);
                  go(3, { workspace: id, project: undefined });
                });
              }}
            >
              <label className="field">
                Çalışma alanı adı
                <input
                  name="name"
                  placeholder="Örn. Acme Labs"
                  required
                  minLength={2}
                  maxLength={100}
                />
              </label>
              <Button disabled={busy}>Oluştur ve devam et</Button>
            </form>
          </div>
        )}

        {step === 3 && workspace && (
          <ProjectStep
            workspace={workspace}
            aiEnabled={aiEnabled}
            githubConfigured={githubConfigured}
            busy={busy}
            run={run}
            onCreated={(id) => go(4, { project: id })}
            onImport={() => go(4, { mode: "import", project: undefined })}
          />
        )}

        {step === 4 && workspace && (
          <div className="stack" style={{ gap: 18 }}>
            <div>
              <h1>GitHub {mode === "import" ? "" : "(isteğe bağlı)"}</h1>
              <p className="muted">
                {mode === "import"
                  ? "Projeyi oluşturacağın repoyu seç."
                  : project
                    ? `${project.name} projesine bir repo bağla; commit ve PR'lar görevlerle eşleşir.`
                    : "Repolarını bağla; commit ve PR'lar görevlerle eşleşir."}
              </p>
            </div>
            {githubResult === "connected" && (
              <p className="badge live">GitHub bağlandı</p>
            )}
            {githubResult && githubResult !== "connected" && (
              <p className="error" role="alert">
                GitHub bağlantısı tamamlanamadı. GitHub sayfasından tekrar
                deneyebilirsin.
              </p>
            )}
            {!githubConfigured ? (
              <p className="muted">
                Bu sunucuda GitHub App yapılandırılmamış. Daha sonra Ayarlar →
                Entegrasyonlar&apos;dan durumunu görebilirsin.
              </p>
            ) : repositories.length ? (
              <RepoPicker
                repositories={repositories}
                busy={busy}
                actionLabel={
                  mode === "import"
                    ? "Bu repodan proje oluştur"
                    : project
                      ? `${project.key} projesine bağla`
                      : null
                }
                onPick={(repo) =>
                  run(async () => {
                    if (mode === "import") {
                      const { name, key } = projectFromRepo(repo.fullName);
                      const id = await createProjectFromRepository(
                        workspace.id,
                        repo.id,
                        { name, key },
                      ).then(unwrap);
                      go(5, { project: id, mode: undefined });
                    } else if (project) {
                      await connectRepository(project.id, repo.id).then(unwrap);
                      go(5);
                    }
                  })
                }
              />
            ) : canConnectGithub ? (
              <Button
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const params = new URLSearchParams({
                      step: "4",
                      workspace: workspace.id,
                    });
                    if (project) params.set("project", project.id);
                    if (mode === "import") params.set("mode", "import");
                    window.location.href = await githubInstallUrl(
                      workspace.id,
                      `/onboarding?${params}`,
                    ).then(unwrap);
                  })
                }
              >
                <GitBranch size={14} /> GitHub&apos;ı bağla
              </Button>
            ) : (
              <p className="muted">
                GitHub bağlantısını çalışma alanı yöneticisi kurabilir.
              </p>
            )}
            <div className="row between">
              <Button
                variant="ghost"
                onClick={() => go(3, { project: undefined, mode: undefined })}
              >
                Geri
              </Button>
              {mode === "import" ? (
                <Button
                  variant="ghost"
                  onClick={() => go(3, { mode: undefined })}
                >
                  Başka bir yol seç
                </Button>
              ) : (
                <Button variant="outline" onClick={() => go(5)}>
                  {repositories.length ? "Şimdilik atla" : "Atla"}
                </Button>
              )}
            </div>
          </div>
        )}

        {step === 5 && workspace && (
          <div className="stack" style={{ gap: 18 }}>
            <div>
              <h1>Hazırsın.</h1>
              <p className="muted">Bir sonraki adım için birkaç öneri:</p>
            </div>
            <div className="stack" style={{ gap: 8 }}>
              {project && (
                <Link
                  className="choice"
                  href={`/app/projects/${project.id}/board`}
                >
                  <FolderKanban size={16} />
                  <span>
                    <strong>{project.name} panosunu aç</strong>
                    <span className="subtle">
                      Görevlerini oluştur ve sürükle-bırak ile ilerlet.
                    </span>
                  </span>
                  <ArrowRight size={14} className="subtle" />
                </Link>
              )}
              {aiEnabled && (
                <Link
                  className="choice"
                  href={
                    project
                      ? `/app/projects/${project.id}/board`
                      : "/app/projects/new/ai"
                  }
                >
                  <Sparkles size={16} />
                  <span>
                    <strong>
                      {project ? "AI ile görev planla" : "AI ile proje planla"}
                    </strong>
                    <span className="subtle">
                      {project
                        ? 'Panodaki "AI ile planla" düğmesini kullan.'
                        : "Fikrini anlat, planı düzenle ve onayla."}
                    </span>
                  </span>
                  <ArrowRight size={14} className="subtle" />
                </Link>
              )}
              {canConnectGithub && (
                <Link
                  className="choice"
                  href={`/app/settings/members?workspace=${workspace.id}`}
                >
                  <Users size={16} />
                  <span>
                    <strong>Ekibini davet et</strong>
                    <span className="subtle">
                      Davet bağlantısı oluştur ve görev ata.
                    </span>
                  </span>
                  <ArrowRight size={14} className="subtle" />
                </Link>
              )}
            </div>
            <Button asChild>
              <Link href="/app">Genel bakışa git</Link>
            </Button>
          </div>
        )}

        {error && (
          <p className="error" role="alert" style={{ marginTop: 14 }}>
            {error}
          </p>
        )}
      </section>
    </main>
  );
}

function ProjectStep({
  workspace,
  aiEnabled,
  githubConfigured,
  busy,
  run,
  onCreated,
  onImport,
}: {
  workspace: Workspace;
  aiEnabled: boolean;
  githubConfigured: boolean;
  busy: boolean;
  run: (action: () => Promise<void>) => Promise<void>;
  onCreated: (id: string) => void;
  onImport: () => void;
}) {
  const [manual, setManual] = useState(false);
  if (manual)
    return (
      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          const f = Object.fromEntries(new FormData(e.currentTarget));
          void run(async () => {
            const id = await createProject({
              ...f,
              workspaceId: workspace.id,
            }).then(unwrap);
            onCreated(id);
          });
        }}
      >
        <h1>İlk projen</h1>
        <label className="field">
          Proje adı
          <input
            name="name"
            placeholder="Örn. ForgePilot Mobile"
            required
            minLength={2}
            maxLength={100}
          />
        </label>
        <label className="field">
          Proje anahtarı
          <input
            name="key"
            placeholder="FORGE"
            pattern="[A-Z][A-Z0-9]{1,9}"
            required
            minLength={2}
            maxLength={10}
            onInput={(e) => {
              e.currentTarget.value = e.currentTarget.value.toUpperCase();
            }}
          />
          <span className="field-hint">
            Görevler FORGE-1 biçiminde numaralanır.
          </span>
        </label>
        <label className="field">
          Açıklama
          <textarea
            name="description"
            maxLength={5000}
            style={{ minHeight: 80 }}
          />
        </label>
        <div className="row between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setManual(false)}
          >
            Geri
          </Button>
          <Button disabled={busy}>Oluştur ve devam et</Button>
        </div>
      </form>
    );
  return (
    <div className="stack" style={{ gap: 18 }}>
      <div>
        <h1>İlk projen</h1>
        <p className="muted">{workspace.name} içinde bir proje oluştur.</p>
      </div>
      <div className="stack" style={{ gap: 8 }}>
        <button className="choice" onClick={() => setManual(true)}>
          <PenLine size={16} />
          <span>
            <strong>Elle oluştur</strong>
            <span className="subtle">
              Ad ve anahtar ver, görevleri kendin ekle.
            </span>
          </span>
          <ArrowRight size={14} className="subtle" />
        </button>
        <Link
          className={`choice ${aiEnabled ? "" : "disabled"}`}
          href={aiEnabled ? "/app/projects/new/ai" : "#"}
          aria-disabled={!aiEnabled}
          onClick={(e) => !aiEnabled && e.preventDefault()}
        >
          <Sparkles size={16} />
          <span>
            <strong>AI ile oluştur</strong>
            <span className="subtle">
              {aiEnabled
                ? "Fikrini anlat; milestone, sprint ve görevleri Gemini önersin."
                : "Bu sunucuda Gemini yapılandırılmamış."}
            </span>
          </span>
          <ArrowRight size={14} className="subtle" />
        </Link>
        <button
          className={`choice ${githubConfigured ? "" : "disabled"}`}
          disabled={!githubConfigured}
          onClick={onImport}
        >
          <GitBranch size={16} />
          <span>
            <strong>GitHub reposundan</strong>
            <span className="subtle">
              {githubConfigured
                ? "Bir repoyu seç; proje ve bağlantı birlikte kurulur."
                : "Bu sunucuda GitHub App yapılandırılmamış."}
            </span>
          </span>
          <ArrowRight size={14} className="subtle" />
        </button>
      </div>
    </div>
  );
}

function RepoPicker({
  repositories,
  busy,
  actionLabel,
  onPick,
}: {
  repositories: { id: string; fullName: string; linked: boolean }[];
  busy: boolean;
  actionLabel: string | null;
  onPick: (repo: { id: string; fullName: string }) => void;
}) {
  if (!actionLabel)
    return (
      <p className="muted">
        {repositories.length} repo erişilebilir. Bir projeye GitHub sekmesinden
        bağlayabilirsin.
      </p>
    );
  return (
    <ul className="repo-list">
      {repositories.map((r) => (
        <li key={r.id}>
          <span className="row" style={{ gap: 8 }}>
            <GitBranch size={14} className="subtle" />
            <strong>{r.fullName}</strong>
            {r.linked && <span className="badge">başka projeye bağlı</span>}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => onPick(r)}
          >
            {actionLabel}
          </Button>
        </li>
      ))}
    </ul>
  );
}
