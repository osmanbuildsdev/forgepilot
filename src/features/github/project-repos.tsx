"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GitBranch, X } from "lucide-react";
import {
  connectRepository,
  disconnectRepository,
} from "@/server/github/actions";
import { unwrap, errorMessage } from "@/lib/action-result";

export function ProjectRepos({
  projectId,
  connected,
  available,
  editable,
}: {
  projectId: string;
  connected: {
    id: string;
    fullName: string;
    htmlUrl: string;
    defaultBranch: string | null;
    lastActivityAt: string | null;
  }[];
  available: { id: string; fullName: string }[];
  editable: boolean;
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
  if (!connected.length && !available.length) return null;
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Bağlı repolar</h2>
        {editable && available.length > 0 && (
          <select
            aria-label="Repo bağla"
            value=""
            disabled={busy}
            onChange={(e) => {
              const id = e.target.value;
              if (id)
                void run(() => connectRepository(projectId, id).then(unwrap));
            }}
            style={{ width: "auto", height: 30 }}
          >
            <option value="">Repo bağla…</option>
            {available.map((r) => (
              <option key={r.id} value={r.id}>
                {r.fullName}
              </option>
            ))}
          </select>
        )}
      </div>
      {connected.length ? (
        <ul className="repo-list">
          {connected.map((r) => (
            <li key={r.id}>
              <a
                href={r.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="row"
                style={{ gap: 8 }}
              >
                <GitBranch size={14} className="subtle" />
                <strong>{r.fullName}</strong>
                <span className="subtle" style={{ fontSize: 12 }}>
                  {r.defaultBranch ?? ""}
                </span>
              </a>
              {editable && (
                <button
                  className="icon-button"
                  aria-label={`${r.fullName} bağlantısını kaldır`}
                  title="Bağlantıyı kaldır"
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        `${r.fullName} bu projeden ayrılsın mı? Kayıtlı commit ve PR geçmişi silinmez, yeni olaylar eşlenmez.`,
                      )
                    )
                      void run(() =>
                        disconnectRepository(projectId, r.id).then(unwrap),
                      );
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">
          Bu projeye henüz repo bağlı değil. Bağladığında yeni commit ve
          PR&apos;lar burada görünür.
        </p>
      )}
      {error && (
        <p className="error" role="alert" style={{ marginTop: 10 }}>
          {error}
        </p>
      )}
    </section>
  );
}
