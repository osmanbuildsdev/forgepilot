export type Role = "owner" | "admin" | "member" | "viewer";
export function canWrite(role: Role | null | undefined) {
  return role === "owner" || role === "admin" || role === "member";
}
