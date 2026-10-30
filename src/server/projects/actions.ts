"use server";
import { UserError, attempt } from "@/server/errors";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { projects } from "@/server/db/schema";
import { recordActivity } from "@/server/activity";
import {
  requireUser,
  projectAccess,
  workspaceAccess,
} from "@/server/projects/service";
import { canManageMembers } from "@/server/permissions";

// The key is fixed after creation because task IDs (FORGE-24) are built from it
// and may already be referenced in commits, docs and conversations.
const projectUpdate = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().max(5000).default(""),
});

export async function updateProject(projectId: string, input: unknown) {
  return attempt(async () => {
    z.uuid().parse(projectId);
    const data = projectUpdate.parse(input);
    const user = await requireUser();
    await projectAccess(projectId, user.id, true);
    await db.transaction(async (tx) => {
      await tx
        .update(projects)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(projects.id, projectId));
      await recordActivity(tx, {
        projectId,
        type: "project.updated",
        actorId: user.id,
        message: "Proje bilgileri güncellendi.",
        metadata: { name: data.name },
      });
    });
    revalidatePath("/app", "layout");
  });
}

export async function deleteProject(projectId: string, confirmKey: unknown) {
  return attempt(async () => {
    z.uuid().parse(projectId);
    const user = await requireUser();
    const project = await projectAccess(projectId, user.id, true);
    const me = await workspaceAccess(project.workspaceId, user.id);
    if (!canManageMembers(me.role))
      throw new UserError("Projeyi yalnızca sahip veya yöneticiler silebilir.");
    // Typing the key is the confirmation; it guards against deleting the wrong project.
    if (confirmKey !== project.key)
      throw new UserError("Onay için proje anahtarını doğru yazmalısın.");
    await db.delete(projects).where(eq(projects.id, projectId));
    revalidatePath("/app", "layout");
  });
}
