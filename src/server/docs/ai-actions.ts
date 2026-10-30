"use server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { UserError, attempt } from "@/server/errors";
import { db } from "@/server/db";
import { aiGenerations } from "@/server/db/schema";
import { requireUser, projectAccess } from "@/server/projects/service";
import { getAIProvider } from "@/server/ai/provider";
import { consumeHourlyQuota } from "@/server/ai/quota";
import {
  DOC_ACTIONS,
  docEditRequest,
  type DocAction,
} from "@/features/ai/doc-schema";
import {
  splitSections,
  isEmptySection,
  replaceBodies,
} from "@/features/docs/sections";
import { getDocument } from "./queries";
import { documentGenerationContext } from "./context";
import { writeVersion } from "./store";

const MAX_TARGETS = 25;

// Asks the AI for a change, reconstructs the Markdown on the server and
// stores the proposal. Nothing is written to the document until it is applied.
export async function proposeDocumentEdit(
  projectId: string,
  documentId: string,
  input: unknown,
) {
  return attempt(async () => {
    z.uuid().parse(projectId);
    z.uuid().parse(documentId);
    const request = docEditRequest.parse(input);
    const user = await requireUser();
    const project = await projectAccess(projectId, user.id, true);
    const doc = await getDocument(projectId, documentId);
    if (doc.currentVersion !== request.baseVersion)
      throw new UserError(
        "Doküman bu arada güncellendi. Sayfayı yenileyip tekrar dene.",
      );

    const split = splitSections(doc.contentMarkdown);
    if (!split.sections.length)
      throw new UserError(
        "AI işlemleri başlıklara göre çalışır. Önce dokümana en az bir başlık ekle.",
      );
    let targets = split.sections;
    if (request.action === "fill_empty")
      targets = split.sections.filter((s) => isEmptySection(s.body));
    else if (request.action !== "update_from_project") {
      const one = split.sections.find((s) => s.id === request.sectionId);
      if (!one) throw new UserError("Bir bölüm seçmelisin.");
      if (request.action !== "write_section" && isEmptySection(one.body))
        throw new UserError('Bu bölüm boş. Önce "Bölümü yaz" işlemini kullan.');
      targets = [one];
    }
    if (!targets.length) throw new UserError("Doldurulacak boş bölüm yok.");
    if (targets.length > MAX_TARGETS)
      throw new UserError(
        `Tek seferde en fazla ${MAX_TARGETS} bölüm işlenebilir. Tek tek bölüm seçerek dene.`,
      );

    await consumeHourlyQuota(
      `ai:docs:${user.id}`,
      20,
      "Saatlik doküman AI sınırına ulaştın (20). Daha sonra tekrar dene.",
    );
    const provider = getAIProvider();
    const facts = await documentGenerationContext(projectId, documentId);
    const draft = await provider.writeSections({
      action: request.action,
      instruction: request.instruction,
      document: {
        title: doc.title,
        outline: split.sections.map((s) => s.path),
      },
      targets: targets.map((s) => ({
        id: s.id,
        path: s.path,
        body: s.body.trim(),
      })),
      project: { key: project.key, ...facts },
    });

    // Only requested sections are accepted; everything else is ignored.
    const allowed = new Set(targets.map((t) => t.id));
    const bodies = new Map(
      draft.sections
        .filter((s) => allowed.has(s.id) && s.body.trim())
        .map((s) => [s.id, stripHeadings(s.body)]),
    );
    if (!bodies.size)
      throw new UserError("AI bu bölümler için içerik üretmedi. Tekrar dene.");
    const proposed = replaceBodies(split, bodies);

    const [generation] = await db
      .insert(aiGenerations)
      .values({
        userId: user.id,
        workspaceId: project.workspaceId,
        projectId,
        kind: "doc_edit",
        model: provider.model,
        input: {
          documentId,
          action: request.action,
          sectionIds: [...bodies.keys()],
          instruction: request.instruction,
          baseVersion: request.baseVersion,
        },
        output: { content: proposed },
        status: "succeeded",
      })
      .returning({ id: aiGenerations.id });
    return {
      generationId: generation.id,
      proposed,
      sections: targets.filter((t) => bodies.has(t.id)).map((t) => t.path),
    };
  });
}

// Applies a stored proposal. The content comes from the server-side record,
// not from the client, so what was previewed is exactly what is saved.
export async function applyDocumentEdit(
  projectId: string,
  documentId: string,
  generationId: string,
) {
  return attempt(async () => {
    z.uuid().parse(projectId);
    z.uuid().parse(documentId);
    z.uuid().parse(generationId);
    const user = await requireUser();
    await projectAccess(projectId, user.id, true);
    const [generation] = await db
      .select()
      .from(aiGenerations)
      .where(
        and(
          eq(aiGenerations.id, generationId),
          eq(aiGenerations.userId, user.id),
          eq(aiGenerations.kind, "doc_edit"),
          eq(aiGenerations.projectId, projectId),
        ),
      );
    const input = generation?.input as
      | { documentId: string; action: DocAction; baseVersion: number }
      | undefined;
    const output = generation?.output as { content: string } | undefined;
    if (
      !generation ||
      generation.status !== "succeeded" ||
      input?.documentId !== documentId ||
      typeof output?.content !== "string"
    )
      throw new UserError("Bu öneri bulunamadı ya da zaten uygulandı.");
    const version = await writeVersion({
      projectId,
      documentId,
      userId: user.id,
      content: output.content,
      baseVersion: input.baseVersion,
      note: `AI: ${DOC_ACTIONS[input.action]}`,
    });
    await db
      .update(aiGenerations)
      .set({ status: "applied", updatedAt: new Date() })
      .where(eq(aiGenerations.id, generationId));
    return version;
  });
}

// Headings inside an AI body would change the outline; they become bold text.
function stripHeadings(body: string) {
  let inFence = false;
  return body
    .split("\n")
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
      if (inFence) return line;
      const m = line.match(/^\s{0,3}#{1,6}\s+(.*)$/);
      return m ? `**${m[1].replace(/\s#+\s*$/, "")}**` : line;
    })
    .join("\n");
}
