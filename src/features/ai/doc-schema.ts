import { z } from "zod";

export const DOC_ACTIONS = {
  fill_empty: "Boş bölümleri doldur",
  write_section: "Bölümü yaz",
  improve: "İyileştir",
  expand: "Genişlet",
  shorten: "Kısalt",
  update_from_project: "Projeden güncelle",
} as const;
export type DocAction = keyof typeof DOC_ACTIONS;

export const docEditRequest = z.object({
  action: z.enum(Object.keys(DOC_ACTIONS) as [DocAction, ...DocAction[]]),
  // Required for single-section actions.
  sectionId: z.number().int().min(0).optional(),
  instruction: z.string().trim().max(1000).default(""),
  baseVersion: z.number().int().min(1),
});

// The AI returns new bodies for sections by id. It never returns headings,
// so the document's structure cannot change.
export const sectionDraft = z.object({
  sections: z
    .array(
      z.object({
        id: z.number().int().min(0).max(1000),
        body: z.string().max(12000),
      }),
    )
    .max(60),
});
export type SectionDraft = z.infer<typeof sectionDraft>;
