"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, ExternalLink, Sparkles } from "lucide-react";
import { askCopilot } from "@/server/copilot/actions";
import { saveTasks } from "@/server/actions";
import { setTaskPriority, setTaskSprint } from "@/server/tasks/actions";
import { unwrap, errorMessage } from "@/lib/action-result";
import { renderMarkdown } from "@/features/docs/markdown";
import { priorityLabels } from "@/components/task-card";
import { Button } from "@/components/ui/button";
import type { CopilotAction, CopilotReference } from "./copilot-schema";

type Message =
  | { role: "user"; content: string }
  | {
      role: "assistant";
      content: string;
      references: CopilotReference[];
      actions: (CopilotAction & { done?: boolean })[];
    };

const examples = [
  "Bugün neye odaklanmalıyım?",
  "Hangi görevler engelli?",
  "Bu hafta neler oldu?",
  "MVP'den önce ne kaldı?",
  "Parola sıfırlama için görevler oluştur.",
  "Hangi sprint geride?",
];

function describe(a: CopilotAction) {
  switch (a.type) {
    case "create_task":
      return `Görev oluştur: ${a.title} (${priorityLabels[a.priority]})`;
    case "update_priority":
      return `${a.label} önceliğini "${priorityLabels[a.priority]}" yap`;
    case "add_to_sprint":
      return `${a.label} görevini ${a.sprintName} sprintine ekle`;
    case "open_task":
      return `${a.label} görevini aç`;
  }
}

export function CopilotChat({
  projects,
  initialProject,
}: {
  projects: { id: string; name: string; key: string; canWrite: boolean }[];
  initialProject: string;
}) {
  const [projectId, setProjectId] = useState(initialProject);
  const [conversations, setConversations] = useState<Record<string, Message[]>>(
    {},
  );
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const project = projects.find((p) => p.id === projectId)!;
  const messages = conversations[projectId] ?? [];

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, busy]);

  const update = (fn: (m: Message[]) => Message[]) =>
    setConversations((c) => ({ ...c, [projectId]: fn(c[projectId] ?? []) }));

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setDraft("");
    setError("");
    const history = messages
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.content }));
    update((m) => [...m, { role: "user", content: q }]);
    setBusy(true);
    try {
      const reply = await askCopilot(projectId, { question: q, history }).then(
        unwrap,
      );
      update((m) => [
        ...m,
        {
          role: "assistant",
          content: reply.answer,
          references: reply.references,
          actions: reply.actions,
        },
      ]);
    } catch (e) {
      setError(errorMessage(e, "Copilot yanıt veremedi. Tekrar dene."));
    } finally {
      setBusy(false);
    }
  }

  async function run(
    messageIndex: number,
    actionIndex: number,
    action: CopilotAction,
  ) {
    setError("");
    setBusy(true);
    try {
      if (action.type === "create_task")
        await saveTasks(projectId, {
          tasks: [
            {
              title: action.title,
              description: action.description,
              priority: action.priority,
            },
          ],
        }).then(unwrap);
      else if (action.type === "update_priority")
        await setTaskPriority(projectId, action.taskId, action.priority).then(
          unwrap,
        );
      else if (action.type === "add_to_sprint")
        await setTaskSprint(projectId, action.taskId, action.sprintId).then(
          unwrap,
        );
      update((m) =>
        m.map((msg, i) =>
          i === messageIndex && msg.role === "assistant"
            ? {
                ...msg,
                actions: msg.actions.map((a, j) =>
                  j === actionIndex ? { ...a, done: true } : a,
                ),
              }
            : msg,
        ),
      );
    } catch (e) {
      setError(errorMessage(e, "İşlem uygulanamadı."));
    } finally {
      setConfirming(null);
      setBusy(false);
    }
  }

  return (
    <section className="panel copilot">
      <div className="copilot-head">
        <label className="row" style={{ gap: 8, fontSize: 13 }}>
          <span className="muted">Proje</span>
          <select
            value={projectId}
            onChange={(e) => {
              setProjectId(e.target.value);
              setError("");
            }}
            style={{ width: "auto", height: 30 }}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.key} · {p.name}
              </option>
            ))}
          </select>
        </label>
        {messages.length > 0 && (
          <button className="link-button" onClick={() => update(() => [])}>
            Yeni konuşma
          </button>
        )}
      </div>

      <div className="copilot-log" aria-live="polite">
        {!messages.length && (
          <div className="copilot-empty">
            <Sparkles size={20} />
            <p className="muted">
              {project.name} hakkında sor. Yanıtlar yalnızca projedeki gerçek
              verilere dayanır.
            </p>
            <div className="copilot-examples">
              {examples.map((e) => (
                <button key={e} onClick={() => ask(e)} disabled={busy}>
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="msg user">
              {m.content}
            </div>
          ) : (
            <div key={i} className="msg assistant">
              <div
                className="markdown"
                // renderMarkdown drops raw HTML and sanitises the output.
                dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
              />
              {m.references.length > 0 && (
                <div
                  className="row"
                  style={{ gap: 6, flexWrap: "wrap", marginTop: 10 }}
                >
                  {m.references.map((r) =>
                    r.external ? (
                      <a
                        key={r.label}
                        className="badge"
                        href={r.href}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {r.label} <ExternalLink size={10} />
                      </a>
                    ) : (
                      <Link key={r.label} className="badge" href={r.href}>
                        {r.label}
                      </Link>
                    ),
                  )}
                </div>
              )}
              {m.actions.length > 0 && (
                <ul className="copilot-actions">
                  {m.actions.map((a, j) => {
                    const id = `${i}:${j}`;
                    return (
                      <li key={id}>
                        <span>{describe(a)}</span>
                        {a.type === "open_task" ? (
                          <Button size="sm" variant="outline" asChild>
                            <Link href={a.href}>Aç</Link>
                          </Button>
                        ) : a.done ? (
                          <span className="badge live">Uygulandı</span>
                        ) : !project.canWrite ? (
                          <span className="subtle" style={{ fontSize: 12 }}>
                            Yazma yetkin yok
                          </span>
                        ) : confirming === id ? (
                          <span className="row" style={{ gap: 6 }}>
                            <Button
                              size="sm"
                              disabled={busy}
                              onClick={() => run(i, j, a)}
                            >
                              Onayla
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setConfirming(null)}
                            >
                              Vazgeç
                            </Button>
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => setConfirming(id)}
                          >
                            Uygula…
                          </Button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ),
        )}
        {busy && !confirming && (
          <div className="msg assistant subtle">Düşünüyor…</div>
        )}
        <div ref={end} />
      </div>

      {error && (
        <p className="error" role="alert" style={{ padding: "0 16px" }}>
          {error}
        </p>
      )}
      <form
        className="copilot-input"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(draft);
        }}
      >
        <textarea
          aria-label="Copilot'a sor"
          placeholder="Bir soru sor… (Enter gönderir, Shift+Enter yeni satır)"
          value={draft}
          maxLength={2000}
          rows={1}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void ask(draft);
            }
          }}
        />
        <Button size="sm" disabled={busy || !draft.trim()} aria-label="Gönder">
          <ArrowUp size={15} />
        </Button>
      </form>
    </section>
  );
}
