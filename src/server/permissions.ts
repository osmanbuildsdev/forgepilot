export type Role = "owner" | "admin" | "member" | "viewer";
export const ROLES: Role[] = ["owner", "admin", "member", "viewer"];
export function canWrite(role: Role | null | undefined) {
  return role === "owner" || role === "admin" || role === "member";
}
export function canManageMembers(role: Role | null | undefined) {
  return role === "owner" || role === "admin";
}
// Owners manage everyone; admins manage only members and viewers.
export function canManageRole(actor: Role | null | undefined, target: Role) {
  if (actor === "owner") return true;
  return actor === "admin" && (target === "member" || target === "viewer");
}
export function assignableRoles(actor: Role | null | undefined): Role[] {
  return ROLES.filter((r) => canManageRole(actor, r));
}
