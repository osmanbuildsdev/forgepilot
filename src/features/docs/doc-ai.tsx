"use client";
import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import {
  proposeDocumentEdit,
  applyDocumentEdit,
} from "@/server/docs/ai-actions";
import { unwrap, errorMessage } from "@/lib/action-result";
import { DOC_ACTIONS, type DocAction } from "@/features/ai/doc-schema";
import { splitSections, isEmptySection } from "./sections";
import { diffMarkdown } from "./diff";
import { DiffView } from "@/components/diff-view";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";

const SINGLE: DocAction[] = ["write_section", "improve", "expand", "shorten"];

export function DocAi({
  projectId,
  documentId,
  content,
  version,
  initialAction,
  onApplied,
  onClose,
}: {
  projectId: string;
  documentId: string;
  // The saved content; proposals are always based on what is stored.
  content: string;
  version: number;
  initialAction?: DocAction;
  onApplied: (content: string, version: number) => void;
  onClose: () => void;
}) {
  const sections = useMemo(() => splitSections(content).sections, [content]);
  const empty = sections.filter((s) => isEmptySection(s.body));
  const [action, setAction] = useState<DocAction>(
    initialAction ?? (empty.length ? "fill_empty" : "improve"),
  );
  const [sectionId, setSectionId] = useState<number>(
    (action === "write_section"
      ? empty[0]
      : sections.find((s) => !isEmptySection(s.body))
    )?.id ??
      sections[0]?.id ??
      0,
  );
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [proposal, setProposal] = useState<{
    generationId: string;
    proposed: string;
    sections: string[];
  } | null>(null);
  const single = SINGLE.includes(action);

  return (
    <Modal title="AI ile düzenle" onClose={onClose} variant="drawer">
      {!proposal ? (
        <form
          className="form-grid"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              setProposal(
                await proposeDocumentEdit(projectId, documentId, {
                  action,
                  sectionId: single ? sectionId : undefined,
                  instruction,
                  baseVersion: version,
                }).then(unwrap),
              );
            } catch (err) {
              setError(errorMessage(err, "Öneri oluşturulamadı."));
            } finally {
              setBusy(false);
            }
          }}
        >
          <p className="muted" style={{ fontSize: 13 }}>
            AI yalnızca seçilen bölümlerin içeriğini yazar; başlıklar ve sıra
            değişmez. Proje bilgileri veritabanından gelir. Önce farkı görür,
            sonra uygularsın.
          </p>
          <label className="field">
            İşlem
            <select
              value={action}
              onChange={(e) => setAction(e.target.value as DocAction)}
            >
              {(Object.keys(DOC_ACTIONS) as DocAction[]).map((a) => (
                <option key={a} value={a}>
                  {DOC_ACTIONS[a]}
                  {a === "fill_empty" ? ` (${empty.length} bölüm)` : ""}
                </option>
              ))}
            </select>
          </label>
          {single && (
            <label className="field">
              Bölüm
              <select
                value={sectionId}
                onChange={(e) => setSectionId(Number(e.target.value))}
              >
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {"  ".repeat(Math.max(0, s.level - 1))}
                    {s.title || "(başlıksız)"}
                    {isEmptySection(s.body) ? " — boş" : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="field">
            Ek talimat (isteğe bağlı)
            <textarea
              value={instruction}
              maxLength={1000}
              style={{ minHeight: 80 }}
              placeholder="Örn. Teknik olmayan paydaşlar için yaz, maddeler halinde olsun."
              onChange={(e) => setInstruction(e.target.value)}
            />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <Button disabled={busy || !sections.length}>
            <Sparkles size={14} />
            {busy ? "Hazırlanıyor… (30–60 sn sürebilir)" : "Öneri oluştur"}
          </Button>
        </form>
      ) : (
        <div className="stack" style={{ gap: 14 }}>
          <p className="muted" style={{ fontSize: 13 }}>
            Değişen bölümler: {proposal.sections.join(" · ")}
          </p>
          <DiffView diff={diffMarkdown(content, proposal.proposed)} />
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="row between">
            <Button
              variant="ghost"
              onClick={() => setProposal(null)}
              disabled={busy}
            >
              Vazgeç
            </Button>
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  const next = await applyDocumentEdit(
                    projectId,
                    documentId,
                    proposal.generationId,
                  ).then(unwrap);
                  onApplied(proposal.proposed, next);
                } catch (err) {
                  setError(errorMessage(err, "Uygulanamadı."));
                  setBusy(false);
                }
              }}
            >
              {busy ? "Uygulanıyor…" : "Uygula (yeni sürüm)"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
