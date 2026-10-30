"use server";
import { UserError, attempt } from "@/server/errors";
import { z } from "zod";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import {
  members,
  projects,
  tasks,
  user as users,
  workspaceInvitations as invitations,
} from "@/server/db/schema";
import { requireUser, workspaceAccess } from "@/server/projects/service";
import { canManageMembers, canManageRole } from "@/server/permissions";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const roleSchema = z.enum(["owner", "admin", "member", "viewer"]);
const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  role: z.enum(["admin", "member", "viewer"]),
});

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

async function manager(workspaceId: string) {
  z.uuid().parse(workspaceId);
  const user = await requireUser();
  const me = await workspaceAccess(workspaceId, user.id);
  if (!canManageMembers(me.role))
    throw new UserError("Üyeleri yönetmek için yönetici yetkisi gerekir.");
  return { user, me };
}

export async function createInvite(workspaceId: string, input: unknown) {
  return attempt(async () => {
    const data = inviteSchema.parse(input);
    const { user, me } = await manager(workspaceId);
    if (!canManageRole(me.role, data.role))
      throw new UserError("Bu rolü verme yetkiniz yok.");
    const [existing] = await db
      .select({ id: members.id })
      .from(members)
      .innerJoin(users, eq(users.id, members.userId))
      .where(
        and(
          eq(members.workspaceId, workspaceId),
          sql`lower(${users.email}) = ${data.email}`,
        ),
      );
    if (existing) throw new UserError("Bu kişi zaten çalışma alanının üyesi.");
    const token = randomBytes(32).toString("base64url");
    await db.transaction(async (tx) => {
      // A newer invite replaces any pending one for the same address.
      await tx
        .update(invitations)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(invitations.workspaceId, workspaceId),
            eq(invitations.email, data.email),
            isNull(invitations.acceptedAt),
            isNull(invitations.revokedAt),
          ),
        );
      await tx.insert(invitations).values({
        workspaceId,
        email: data.email,
        role: data.role,
        tokenHash: hashToken(token),
        invitedBy: user.id,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      });
    });
    revalidatePath("/app/settings/members");
    return token;
  });
}

export async function revokeInvite(workspaceId: string, inviteId: string) {
  return attempt(async () => {
    z.uuid().parse(inviteId);
    await manager(workspaceId);
    const revoked = await db
      .update(invitations)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(invitations.id, inviteId),
          eq(invitations.workspaceId, workspaceId),
          isNull(invitations.acceptedAt),
          isNull(invitations.revokedAt),
        ),
      )
      .returning({ id: invitations.id });
    if (!revoked.length) throw new UserError("Davet bulunamadı.");
    revalidatePath("/app/settings/members");
  });
}

export async function acceptInvite(token: string) {
  return attempt(async () => {
    z.string().min(20).max(100).parse(token);
    const user = await requireUser();
    const workspaceId = await db.transaction(async (tx) => {
      // Locking the row makes concurrent accepts of the same token safe.
      const [invite] = await tx
        .select()
        .from(invitations)
        .where(eq(invitations.tokenHash, hashToken(token)))
        .for("update");
      if (
        !invite ||
        invite.acceptedAt ||
        invite.revokedAt ||
        invite.expiresAt < new Date()
      )
        throw new UserError("Davet geçersiz veya süresi dolmuş.");
      if (invite.email !== user.email.toLowerCase())
        throw new UserError(
          "Bu davet farklı bir e-posta adresi için oluşturulmuş.",
        );
      await tx
        .insert(members)
        .values({
          workspaceId: invite.workspaceId,
          userId: user.id,
          role: invite.role,
        })
        .onConflictDoNothing();
      await tx
        .update(invitations)
        .set({ acceptedAt: new Date() })
        .where(eq(invitations.id, invite.id));
      return invite.workspaceId;
    });
    revalidatePath("/app", "layout");
    return workspaceId;
  });
}

async function ownerCount(tx: Pick<typeof db, "select">, workspaceId: string) {
  const [row] = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(members)
    .where(
      and(eq(members.workspaceId, workspaceId), eq(members.role, "owner")),
    );
  return row.n;
}

export async function changeMemberRole(
  workspaceId: string,
  memberId: string,
  role: unknown,
) {
  return attempt(async () => {
    z.uuid().parse(memberId);
    const next = roleSchema.parse(role);
    const { user, me } = await manager(workspaceId);
    await db.transaction(async (tx) => {
      const [target] = await tx
        .select()
        .from(members)
        .where(
          and(eq(members.id, memberId), eq(members.workspaceId, workspaceId)),
        )
        .for("update");
      if (!target) throw new UserError("Üye bulunamadı.");
      if (target.userId === user.id)
        throw new UserError("Kendi rolünüzü değiştiremezsiniz.");
      if (!canManageRole(me.role, target.role) || !canManageRole(me.role, next))
        throw new UserError("Bu rolü değiştirme yetkiniz yok.");
      if (
        target.role === "owner" &&
        next !== "owner" &&
        (await ownerCount(tx, workspaceId)) <= 1
      )
        throw new UserError("Çalışma alanında en az bir sahip kalmalı.");
      await tx
        .update(members)
        .set({ role: next, updatedAt: new Date() })
        .where(eq(members.id, memberId));
    });
    revalidatePath("/app/settings/members");
  });
}

export async function removeMember(workspaceId: string, memberId: string) {
  return attempt(async () => {
    z.uuid().parse(workspaceId);
    z.uuid().parse(memberId);
    const user = await requireUser();
    const me = await workspaceAccess(workspaceId, user.id);
    await db.transaction(async (tx) => {
      const [target] = await tx
        .select()
        .from(members)
        .where(
          and(eq(members.id, memberId), eq(members.workspaceId, workspaceId)),
        )
        .for("update");
      if (!target) throw new UserError("Üye bulunamadı.");
      const self = target.userId === user.id;
      if (
        !self &&
        !(canManageMembers(me.role) && canManageRole(me.role, target.role))
      )
        throw new UserError("Bu üyeyi çıkarma yetkiniz yok.");
      if (target.role === "owner" && (await ownerCount(tx, workspaceId)) <= 1)
        throw new UserError("Son sahip çalışma alanından çıkarılamaz.");
      await tx.delete(members).where(eq(members.id, memberId));
      // Tasks must not stay assigned to someone who lost access.
      await tx
        .update(tasks)
        .set({ assigneeId: null, updatedAt: new Date() })
        .where(
          and(
            eq(tasks.assigneeId, target.userId),
            sql`${tasks.projectId} in (select ${projects.id} from ${projects} where ${projects.workspaceId} = ${workspaceId})`,
          ),
        );
    });
    revalidatePath("/app", "layout");
  });
}
