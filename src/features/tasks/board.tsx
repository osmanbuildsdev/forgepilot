"use client";
import { unwrap, errorMessage } from "@/lib/action-result";
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
import type { Task, Label, Sprint } from "@/server/db/schema";
import {
  saveTasks,
  updateTask,
  deleteTask,
  createLabel,
  setTaskLabels,
} from "@/server/actions";
import { generateTaskDraft } from "@/server/ai/actions";
import { TaskCardContent } from "@/components/task-card";
import { Modal } from "@/components/modal";
import { TaskComments } from "./task-comments";
import { TaskChecklist } from "./task-checklist";
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
  assignee,
  labels,
  checklist,
  blocked,
  onEdit,
  disabled,
}: {
  task: Task;
  projectKey: string;
  assignee?: string;
  labels: Label[];
  checklist?: { done: number; total: number };
  blocked?: number;
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
      <button
        className="drag-handle"
        aria-label={`${task.title} görevini taşı`}
        {...listeners}
        {...attributes}
      >
        <GripVertical size={14} />
      </button>
      <button className="task-open" onClick={onEdit}>
        <TaskCardContent
          task={task}
          projectKey={projectKey}
          assignee={assignee}
          labels={labels}
          checklist={checklist}
          blocked={blocked}
        />
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
  members,
  labels,
  labelIdsByTask,
  subtaskProgress,
  blockedBy,
  editable,
  aiEnabled,
  viewer,
  sprints,
  milestones,
  initialSprint,
}: {
  projectId: string;
  projectKey: string;
  tasks: Task[];
  members: { id: string; name: string }[];
  labels: Label[];
  labelIdsByTask: Record<string, string[]>;
  subtaskProgress: Record<string, { done: number; total: number }>;
  blockedBy: Record<string, number>;
  editable: boolean;
  aiEnabled: boolean;
  viewer: { id: string; canModerate: boolean };
  sprints: { id: string; name: string; status: Sprint["status"] }[];
  milestones: { id: string; name: string }[];
  initialSprint: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Task | "new" | null>(null);
  const [ai, setAi] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sprintFilter, setSprintFilter] = useState(initialSprint);
  // "all" shows everything, "none" the unscheduled pool, otherwise one sprint.
  const visible =
    sprintFilter === "all"
      ? tasks
      : tasks.filter((t) =>
          sprintFilter === "none"
            ? t.sprintId === null
            : t.sprintId === sprintFilter,
        );
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
    } catch (e) {
      setError(errorMessage(e));
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function dragEnd(event: DragEndEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    const status = columns.find((c) => c[0] === event.over?.id)?.[0];
    if (task && status && status !== task.status && !busy && editable)
      await run(() =>
        updateTask(projectId, task.id, { ...task, status }).then(unwrap),
      );
  }
  return (
    <>
      <div
        className="row between"
        style={{ marginBottom: 22, flexWrap: "wrap" }}
      >
        <div className="row" style={{ gap: 10 }}>
          <select
            aria-label="Sprint filtresi"
            value={sprintFilter}
            onChange={(e) => {
              setSprintFilter(e.target.value);
              const url = new URL(window.location.href);
              if (e.target.value === "all") url.searchParams.delete("sprint");
              else url.searchParams.set("sprint", e.target.value);
              window.history.replaceState(null, "", url);
            }}
            style={{ width: "auto", height: 32 }}
          >
            <option value="all">Tüm görevler</option>
            <option value="none">Sprinte atanmamış</option>
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.status === "active" ? " (aktif)" : ""}
                {s.status === "completed" ? " (tamamlandı)" : ""}
              </option>
            ))}
          </select>
          <span className="muted">
            {visible.length} görev
            {!editable && " · Salt okunur erişim"}
          </span>
        </div>
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
              variant="outline"
              disabled={busy}
              onClick={async () => {
                const name = window.prompt("Yeni etiket adı");
                if (name?.trim())
                  await run(async () => {
                    await createLabel(projectId, { name }).then(unwrap);
                  });
              }}
            >
              Etiket ekle
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
              count={visible.filter((t) => t.status === status).length}
            >
              {visible
                .filter((t) => t.status === status)
                .map((t) => (
                  <Card
                    key={t.id}
                    task={t}
                    projectKey={projectKey}
                    assignee={members.find((m) => m.id === t.assigneeId)?.name}
                    labels={labels.filter((l) =>
                      labelIdsByTask[t.id]?.includes(l.id),
                    )}
                    checklist={subtaskProgress[t.id]}
                    blocked={blockedBy[t.id]}
                    onEdit={() => {
                      setError("");
                      setEditing(t);
                    }}
                    disabled={!editable || busy}
                  />
                ))}
              {!visible.some((t) => t.status === status) && (
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
          variant="drawer"
        >
          <form
            className="form-grid"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              const selected = form.getAll("labelIds").map(String);
              form.delete("labelIds");
              const data = Object.fromEntries(form);
              const ok = await run(async () => {
                if (editing === "new")
                  await saveTasks(projectId, { tasks: [data] }).then(unwrap);
                else {
                  await updateTask(projectId, editing.id, data).then(unwrap);
                  await setTaskLabels(projectId, editing.id, selected).then(
                    unwrap,
                  );
                }
              });
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
            <div className="row">
              <label className="field" style={{ flex: 1 }}>
                Atanan kişi
                <select
                  name="assigneeId"
                  defaultValue={
                    editing === "new" ? "" : (editing.assigneeId ?? "")
                  }
                  disabled={!editable}
                >
                  <option value="">Atanmamış</option>
                  {members.map((m) => (
                    <option value={m.id} key={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" style={{ flex: 1 }}>
                Son tarih
                <input
                  type="date"
                  name="dueDate"
                  defaultValue={
                    editing === "new" ? "" : (editing.dueDate ?? "")
                  }
                  readOnly={!editable}
                />
              </label>
              <label className="field" style={{ width: 90 }}>
                Puan
                <input
                  type="number"
                  name="estimatePoints"
                  min={0}
                  max={100}
                  defaultValue={
                    editing === "new" ? "" : (editing.estimatePoints ?? "")
                  }
                  readOnly={!editable}
                />
              </label>
            </div>
            <div className="row">
              <label className="field" style={{ flex: 1 }}>
                Sprint
                <select
                  name="sprintId"
                  defaultValue={
                    editing === "new"
                      ? sprintFilter !== "all" && sprintFilter !== "none"
                        ? sprintFilter
                        : ""
                      : (editing.sprintId ?? "")
                  }
                  disabled={!editable}
                >
                  <option value="">Sprint yok</option>
                  {sprints
                    .filter(
                      (s) =>
                        s.status !== "completed" ||
                        (editing !== "new" && s.id === editing.sprintId),
                    )
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.status === "active" ? " (aktif)" : ""}
                      </option>
                    ))}
                </select>
              </label>
              <label className="field" style={{ flex: 1 }}>
                Milestone
                <select
                  name="milestoneId"
                  defaultValue={
                    editing === "new" ? "" : (editing.milestoneId ?? "")
                  }
                  disabled={!editable}
                >
                  <option value="">Milestone yok</option>
                  {milestones.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {editing !== "new" && labels.length > 0 && (
              <fieldset className="field">
                Etiketler
                <div className="row" style={{ flexWrap: "wrap" }}>
                  {labels.map((l) => (
                    <label key={l.id} className="row" style={{ gap: 5 }}>
                      <input
                        type="checkbox"
                        name="labelIds"
                        value={l.id}
                        defaultChecked={labelIdsByTask[editing.id]?.includes(
                          l.id,
                        )}
                        disabled={!editable}
                      />
                      <span style={{ color: l.color }}>{l.name}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
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
                          deleteTask(projectId, editing.id).then(unwrap),
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
          {editing !== "new" && (
            <TaskChecklist
              key={`checklist-${editing.id}`}
              projectId={projectId}
              projectKey={projectKey}
              taskId={editing.id}
              candidates={tasks}
              canWrite={editable}
            />
          )}
          {editing !== "new" && (
            <TaskComments
              key={editing.id}
              projectId={projectId}
              taskId={editing.id}
              viewerId={viewer.id}
              canWrite={editable}
              canModerate={viewer.canModerate}
            />
          )}
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
                  setDraft(
                    await generateTaskDraft(projectId, instruction).then(
                      unwrap,
                    ),
                  );
                } catch (e) {
                  setError(
                    errorMessage(
                      e,
                      "Gemini öneri oluşturamadı. Bağlantını kontrol edip tekrar dene.",
                    ),
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
                    }).then(unwrap),
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
