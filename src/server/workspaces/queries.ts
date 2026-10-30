import "server-only";
import { and, eq, gt, isNull } from "drizzle-orm";
import { createHash } from "node:crypto";
import { db } from "@/server/db";
import {
  members,
  user,
  workspaces,
  workspaceInvitations as invitations,
} from "@/server/db/schema";

export async function membersOverview(workspaceId: string) {
  const [people, pending] = await Promise.all([
    db
      .select({
        memberId: members.id,
        userId: user.id,
        name: user.name,
        email: user.email,
        role: members.role,
      })
      .from(members)
      .innerJoin(user, eq(user.id, members.userId))
      .where(eq(members.workspaceId, workspaceId))
      .orderBy(user.name),
    db
      .select({
        id: invitations.id,
        email: invitations.email,
        role: invitations.role,
        expiresAt: invitations.expiresAt,
      })
      .from(invitations)
      .where(
        and(
          eq(invitations.workspaceId, workspaceId),
          isNull(invitations.acceptedAt),
          isNull(invitations.revokedAt),
          gt(invitations.expiresAt, new Date()),
        ),
      )
      .orderBy(invitations.createdAt),
  ]);
  return { people, pending };
}

export async function invitePreview(token: string) {
  const [row] = await db
    .select({
      workspace: workspaces.name,
      email: invitations.email,
      role: invitations.role,
    })
    .from(invitations)
    .innerJoin(workspaces, eq(workspaces.id, invitations.workspaceId))
    .where(
      and(
        eq(
          invitations.tokenHash,
          createHash("sha256").update(token).digest("hex"),
        ),
        isNull(invitations.acceptedAt),
        isNull(invitations.revokedAt),
        gt(invitations.expiresAt, new Date()),
      ),
    );
  return row ?? null;
}
