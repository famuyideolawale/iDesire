import type { SessionUser } from "./types";
export function canManageAccounts(user: SessionUser) {
  return user.role === "Developer" || user.role === "Owner";
}
export function canManageAccount(actor: SessionUser, target: SessionUser) {
  return (
    actor.role === "Developer" ||
    (actor.role === "Owner" &&
      target.role === "Manager" &&
      target.brands.every((b) => actor.brands.includes(b)))
  );
}
