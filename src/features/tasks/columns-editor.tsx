"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import {
  saveProjectColumns,
  resetProjectColumns,
} from "@/server/board/actions";
import { unwrap, errorMessage } from "@/lib/action-result";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { statuses, type BoardColumn } from "./board-columns";

type Row = {
  key: string;
  id?: string;
  name: string;
  status: BoardColumn["status"];
};

export function ColumnsEditor({
  projectId,
  columns,
  onClose,
}: {
  projectId: string;
  columns: BoardColumn[];
  onClose: () => void;
}) {
  const router = useRouter();
  const customised = columns.some((c) => c.custom);
  const [rows, setRows] = useState<Row[]>(
    columns.map((c) => ({
      key: c.id,
      id: c.custom ? c.id : undefined,
      name: c.name,
      status: c.status,
    })),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const missing = statuses.filter(([s]) => !rows.some((r) => r.status === s));

  const move = (i: number, by: number) =>
    setRows((r) => {
      const next = [...r];
      [next[i], next[i + by]] = [next[i + by], next[i]];
      return next;
    });

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await action();
      router.refresh();
      onClose();
    } catch (e) {
      setError(errorMessage(e, "Kolonlar kaydedilemedi."));
      setBusy(false);
    }
  }

  return (
    <Modal title="Kanban kolonları" onClose={onClose}>
      <div className="stack" style={{ gap: 14 }}>
        <p className="muted" style={{ fontSize: 13 }}>
          Her kolon bir duruma bağlıdır; raporlar ve sağlık skoru bu durumları
          kullanır. Her durum için en az bir kolon olmalı. Silinen kolondaki
          görevler aynı durumdaki ilk kolona geçer.
        </p>
        <ul className="columns-editor">
          {rows.map((r, i) => (
            <li key={r.key}>
              <span className="row" style={{ gap: 2 }}>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`${r.name} yukarı`}
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  <ArrowUp size={13} />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`${r.name} aşağı`}
                  disabled={i === rows.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <ArrowDown size={13} />
                </button>
              </span>
              <input
                aria-label="Kolon adı"
                value={r.name}
                maxLength={40}
                onChange={(e) =>
                  setRows((all) =>
                    all.map((x, j) =>
                      j === i ? { ...x, name: e.target.value } : x,
                    ),
                  )
                }
              />
              <select
                aria-label={`${r.name} durumu`}
                value={r.status}
                onChange={(e) =>
                  setRows((all) =>
                    all.map((x, j) =>
                      j === i
                        ? { ...x, status: e.target.value as Row["status"] }
                        : x,
                    ),
                  )
                }
              >
                {statuses.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="icon-button"
                aria-label={`${r.name} kolonunu sil`}
                disabled={rows.length <= 1}
                onClick={() => setRows((all) => all.filter((_, j) => j !== i))}
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={rows.length >= 15}
          onClick={() =>
            setRows((all) => [
              ...all,
              {
                key: crypto.randomUUID(),
                name: "Yeni kolon",
                status: "in_progress",
              },
            ])
          }
          style={{ justifySelf: "start" }}
        >
          <Plus size={13} /> Kolon ekle
        </Button>
        {missing.length > 0 && (
          <p className="error" role="alert" style={{ fontSize: 12 }}>
            Kolonu olmayan durum: {missing.map(([, label]) => label).join(", ")}
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="row between">
          {customised ? (
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    "Kolonlar varsayılan 5 kolona dönsün mü? Görevlerin durumu değişmez.",
                  )
                )
                  void run(() => resetProjectColumns(projectId).then(unwrap));
              }}
            >
              Varsayılana dön
            </Button>
          ) : (
            <span />
          )}
          <Button
            disabled={
              busy || missing.length > 0 || rows.some((r) => !r.name.trim())
            }
            onClick={() =>
              run(() =>
                saveProjectColumns(
                  projectId,
                  rows.map(({ id, name, status }) => ({ id, name, status })),
                ).then(unwrap),
              )
            }
          >
            {busy ? "Kaydediliyor…" : "Kaydet"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
