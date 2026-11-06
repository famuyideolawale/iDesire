import type { SessionUser } from "./types";

/**
 * Account rules:
 * - Developer sees and manages every account, including Owners and other Developers.
 * - Owner sees and manages every account except Developers.
 * - Manager cannot see or manage accounts.
 */
export function canManageAccounts(user: SessionUser) {
  return user.role === "Developer" || user.role === "Owner";
}
export function canSeeAccount(actor: Pick<SessionUser, "role">, target: Pick<SessionUser, "role">) {
  return actor.role === "Developer" || (actor.role === "Owner" && target.role !== "Developer");
}
export function canManageAccount(actor: SessionUser, target: SessionUser) {
  return canSeeAccount(actor, target) && canManageAccounts(actor);
}
/** Roles an actor may assign. Only a Developer can create or promote to Developer. */
export function assignableRoles(actor: Pick<SessionUser, "role">): SessionUser["role"][] {
  if (actor.role === "Developer") return ["Manager", "Owner", "Developer"];
  if (actor.role === "Owner") return ["Manager", "Owner"];
  return [];
}
