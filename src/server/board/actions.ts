"use server";
import { z } from "zod";
import { and, eq, inArray, notInArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { UserError, attempt } from "@/server/errors";
import { db } from "@/server/db";
import { projectColumns, tasks } from "@/server/db/schema";
import { requireUser, projectAccess } from "@/server/projects/service";

const STATUSES = ["backlog", "todo", "in_progress", "review", "done"] as const;

const columnsInput = z
  .array(
    z.object({
      id: z.uuid().optional(),
      name: z.string().trim().min(1).max(40),
      status: z.enum(STATUSES),
    }),
  )
  .min(STATUSES.length)
  .max(15)
  .refine(
    (cols) =>
      new Set(cols.map((c) => c.name.toLocaleLowerCase("tr-TR"))).size ===
      cols.length,
    "Kolon adları benzersiz olmalı.",
  )
  // Every status needs a column, otherwise its tasks would have nowhere to go.
  .refine(
    (cols) => STATUSES.every((s) => cols.some((c) => c.status === s)),
    "Her durum için en az bir kolon olmalı.",
  );

// Replaces the project's columns with the given ordered list.
export async function saveProjectColumns(projectId: string, input: unknown) {
  return attempt(async () => {
    z.uuid().parse(projectId);
    const columns = columnsInput.parse(input);
    const user = await requireUser();
    await projectAccess(projectId, user.id, true);
    await db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(projectColumns)
        .where(eq(projectColumns.projectId, projectId));
      const keep = columns.map((c) => c.id).filter((id): id is string => !!id);
      if (keep.some((id) => !existing.some((e) => e.id === id)))
        throw new UserError("Kolon bulunamadı. Sayfayı yenileyip tekrar dene.");
      // Removed columns: their tasks fall back to the first column of their
      // status (the foreign key clears column_id).
      await tx
        .delete(projectColumns)
        .where(
          keep.length
            ? and(
                eq(projectColumns.projectId, projectId),
                notInArray(projectColumns.id, keep),
              )
            : eq(projectColumns.projectId, projectId),
        );
      // Names are unique per project; park kept rows on temporary names so
      // renames and swaps cannot collide mid-update.
      for (const id of keep)
        await tx
          .update(projectColumns)
          .set({ name: `__tmp_${id}` })
          .where(eq(projectColumns.id, id));
      const statusChanged: string[] = [];
      for (const [position, c] of columns.entries()) {
        if (c.id) {
          const before = existing.find((e) => e.id === c.id)!;
          if (before.status !== c.status) statusChanged.push(c.id);
          await tx
            .update(projectColumns)
            .set({
              name: c.name,
              status: c.status,
              position,
              updatedAt: new Date(),
            })
            .where(eq(projectColumns.id, c.id));
        } else
          await tx
            .insert(projectColumns)
            .values({ projectId, name: c.name, status: c.status, position });
      }
      // A column that moved to another status no longer matches its tasks.
      if (statusChanged.length)
        await tx
          .update(tasks)
          .set({ columnId: null })
          .where(inArray(tasks.columnId, statusChanged));
    });
    revalidatePath("/app", "layout");
  });
}

// Back to the five default columns; tasks keep their status.
export async function resetProjectColumns(projectId: string) {
  return attempt(async () => {
    z.uuid().parse(projectId);
    const user = await requireUser();
    await projectAccess(projectId, user.id, true);
    await db
      .delete(projectColumns)
      .where(eq(projectColumns.projectId, projectId));
    revalidatePath("/app", "layout");
  });
}
