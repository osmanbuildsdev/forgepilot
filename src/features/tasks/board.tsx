"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  useDraggable,
  useDroppable,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Sparkles } from "lucide-react";
import type { Task } from "@/server/db/schema";
import { saveTasks, updateTask, deleteTask } from "@/server/actions";
import { generateTaskDraft } from "@/server/ai/actions";
import { TaskCardContent } from "@/components/task-card";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { z } from "zod";
import { generatedTasks } from "./schemas";
const columns = [
  ["backlog", "Backlog"],
  ["todo", "Yapılacak"],
  ["in_progress", "Devam ediyor"],
  ["review", "İnceleme"],
  ["done", "Tamamlandı"],
] as const;
type Draft = z.infer<typeof generatedTasks>;
function Card({
  task,
  projectKey,
  onEdit,
  disabled,
}: {
  task: Task;
  projectKey: string;
  onEdit: () => void;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id, disabled });
  return (
    <article
      ref={setNodeRef}
      className="task-card"
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 5 : undefined,
        position: "relative",
      }}
    >
      <div className="row between">
        <span className="muted" style={{ fontSize: 10 }}>
          GÖREV
        </span>
        <button
          className="drag-handle"
          aria-label={`${task.title} görevini taşı`}
          {...listeners}
          {...attributes}
        >
          <GripVertical size={16} />
        </button>
      </div>
      <button className="task-open" onClick={onEdit}>
        <TaskCardContent task={task} projectKey={projectKey} />
      </button>
    </article>
  );
}
function Column({
  status,
  title,
  count,
  children,
}: {
  status: string;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section ref={setNodeRef} className={`column ${isOver ? "over" : ""}`}>
      <div className="column-heading">
        <span>{title}</span>
        <span className="muted">{count}</span>
      </div>
      {children}
    </section>
  );
}
export function Board({
  projectId,
  projectKey,
  tasks,
  editable,
  aiEnabled,
}: {
  projectId: string;
  projectKey: string;
  tasks: Task[];
  editable: boolean;
  aiEnabled: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Task | "new" | null>(null);
  const [ai, setAi] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const close = useCallback(() => {
    setEditing(null);
    setAi(false);
    setDraft(null);
    setError("");
  }, []);
  async function run(action: () => Promise<void>) {
    setError("");
    setBusy(true);
    try {
      await action();
      router.refresh();
      return true;
    } catch {
      setError(
        "İşlem tamamlanamadı. Bağlantını ve çalışma alanı yetkilerini kontrol edip tekrar dene.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function dragEnd(event: DragEndEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    const status = columns.find((c) => c[0] === event.over?.id)?.[0];
    if (task && status && status !== task.status && !busy && editable)
      await run(() => updateTask(projectId, task.id, { ...task, status }));
  }
  return (
    <>
      <div
        className="row between"
        style={{ marginBottom: 22, flexWrap: "wrap" }}
      >
        <span className="muted">
          {tasks.length} görev ·{" "}
          {editable
            ? "Sürükle veya görevden durumunu değiştir."
            : "Salt okunur erişim."}
        </span>
        {editable && (
          <div className="row">
            <Button
              variant="outline"
              disabled={busy || !aiEnabled}
              title={
                aiEnabled
                  ? "Gemini ile öneri oluştur"
                  : "GEMINI_API_KEY yapılandırılmalı"
              }
              onClick={() => {
                setError("");
                setAi(true);
              }}
            >
              <Sparkles size={15} />
              AI ile planla
            </Button>
            <Button
              disabled={busy}
              onClick={() => {
                setError("");
                setEditing("new");
              }}
            >
              <Plus size={15} />
              Görev oluştur
            </Button>
          </div>
        )}
      </div>
      {error && !editing && !ai && (
        <p role="alert" className="error" style={{ marginBottom: 15 }}>
          {error}
        </p>
      )}
      <DndContext sensors={sensors} onDragEnd={dragEnd}>
        <div className="board">
          {columns.map(([status, title]) => (
            <Column
              key={status}
              status={status}
              title={title}
              count={tasks.filter((t) => t.status === status).length}
            >
              {tasks
                .filter((t) => t.status === status)
                .map((t) => (
                  <Card
                    key={t.id}
                    task={t}
                    projectKey={projectKey}
                    onEdit={() => {
                      setError("");
                      setEditing(t);
                    }}
                    disabled={!editable || busy}
                  />
                ))}
              {!tasks.some((t) => t.status === status) && (
                <p
                  className="muted"
                  style={{ fontSize: 11, padding: "10px 2px" }}
                >
                  Henüz görev yok
                </p>
              )}
            </Column>
          ))}
        </div>
      </DndContext>
      {editing && (
        <Modal
          title={
            editing === "new" ? "Yeni görev" : `${projectKey}-${editing.number}`
          }
          onClose={close}
        >
          <form
            className="form-grid"
            onSubmit={async (e) => {
              e.preventDefault();
              const data = Object.fromEntries(new FormData(e.currentTarget));
              const ok = await run(() =>
                editing === "new"
                  ? saveTasks(projectId, { tasks: [data] })
                  : updateTask(projectId, editing.id, data),
              );
              if (ok) close();
            }}
          >
            <label className="field">
              Başlık
              <input
                name="title"
                defaultValue={editing === "new" ? "" : editing.title}
                required
                maxLength={200}
                readOnly={!editable}
              />
            </label>
            <label className="field">
              Açıklama / Kabul kriterleri
              <textarea
                name="description"
                defaultValue={editing === "new" ? "" : editing.description}
                maxLength={10000}
                readOnly={!editable}
              />
            </label>
            <div className="row">
              <label className="field" style={{ flex: 1 }}>
                Durum
                <select
                  name="status"
                  defaultValue={editing === "new" ? "backlog" : editing.status}
                  disabled={!editable}
                >
                  {columns.map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" style={{ flex: 1 }}>
                Öncelik
                <select
                  name="priority"
                  defaultValue={editing === "new" ? "medium" : editing.priority}
                  disabled={!editable}
                >
                  <option value="low">Düşük</option>
                  <option value="medium">Normal</option>
                  <option value="high">Yüksek</option>
                  <option value="urgent">Acil</option>
                </select>
              </label>
            </div>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            {editable && (
              <div className="row between">
                {editing !== "new" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy}
                    onClick={async () => {
                      if (
                        window.confirm(
                          "Bu görev kalıcı olarak silinecek. Devam edilsin mi?",
                        )
                      ) {
                        const ok = await run(() =>
                          deleteTask(projectId, editing.id),
                        );
                        if (ok) close();
                      }
                    }}
                  >
                    Görevi sil
                  </Button>
                ) : (
                  <span />
                )}
                <Button disabled={busy}>
                  {busy ? "Kaydediliyor…" : "Kaydet"}
                </Button>
              </div>
            )}
          </form>
        </Modal>
      )}
      {ai && (
        <Modal title="Bir sonraki adımı birlikte planlayalım." onClose={close}>
          {!draft ? (
            <form
              className="form-grid"
              onSubmit={async (e) => {
                e.preventDefault();
                const instruction = String(
                  new FormData(e.currentTarget).get("instruction"),
                );
                setError("");
                setBusy(true);
                try {
                  setDraft(await generateTaskDraft(projectId, instruction));
                } catch {
                  setError(
                    "Gemini öneri oluşturamadı. API anahtarını, model erişimini ve kotanı kontrol et.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <p className="muted">
                Proje açıklaması ve mevcut görev başlıkları Gemini’ye
                gönderilir. Öneriler, sen onaylayana kadar kaydedilmez.
              </p>
              <label className="field">
                Neyi geliştirmek istiyorsun?
                <textarea
                  name="instruction"
                  required
                  minLength={10}
                  maxLength={2000}
                  placeholder="Örn. E-posta doğrulama akışını ve testlerini planla."
                />
              </label>
              <Button disabled={busy}>
                {busy ? "Öneriler hazırlanıyor…" : "Görev önerileri oluştur"}
              </Button>
            </form>
          ) : (
            <div className="stack">
              <p className="muted">
                Önerileri düzenle veya çıkar, ardından kaydet.
              </p>
              {draft.tasks.map((t, i) => (
                <div className="panel form-grid" key={i}>
                  <label className="field">
                    Görev başlığı
                    <input
                      aria-label={`Öneri ${i + 1} başlığı`}
                      value={t.title}
                      onChange={(e) =>
                        setDraft({
                          tasks: draft.tasks.map((x, j) =>
                            j === i ? { ...x, title: e.target.value } : x,
                          ),
                        })
                      }
                    />
                  </label>
                  <label className="field">
                    Açıklama
                    <textarea
                      value={t.description}
                      onChange={(e) =>
                        setDraft({
                          tasks: draft.tasks.map((x, j) =>
                            j === i ? { ...x, description: e.target.value } : x,
                          ),
                        })
                      }
                    />
                  </label>
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={() =>
                      setDraft({ tasks: draft.tasks.filter((_, j) => j !== i) })
                    }
                  >
                    Öneriyi çıkar
                  </Button>
                </div>
              ))}
              <Button
                disabled={
                  busy ||
                  !draft.tasks.length ||
                  draft.tasks.some((t) => !t.title.trim())
                }
                onClick={async () => {
                  const ok = await run(() =>
                    saveTasks(projectId, {
                      tasks: draft.tasks.map((t) => ({
                        ...t,
                        status: "backlog",
                      })),
                    }),
                  );
                  if (ok) close();
                }}
              >
                {busy
                  ? "Kaydediliyor…"
                  : `${draft.tasks.length} görevi onayla ve kaydet`}
              </Button>
            </div>
          )}
          {error && (
            <p role="alert" className="error" style={{ marginTop: 15 }}>
              {error}
            </p>
          )}
        </Modal>
      )}
    </>
  );
}
