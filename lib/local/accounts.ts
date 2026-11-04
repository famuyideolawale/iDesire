import {
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { readFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import { AuthError } from "./auth";
import { required, text, record } from "./store";
import { canManageAccount, canManageAccounts } from "./permissions";
import type { Brand, SessionUser, StoreDatabase } from "./types";
export function publicAccount({
  salt: _salt,
  passwordHash: _hash,
  ...user
}: StoreDatabase["users"][number]): SessionUser {
  return { ...user, status: user.status ?? "Active" };
}
function setPassword(
  account: StoreDatabase["users"][number],
  password: string,
) {
  if (password.length < 10 || password.length > 200)
    throw new Error("Use a password of 10–200 characters.");
  account.salt = randomBytes(16).toString("hex");
  account.passwordHash = scryptSync(password, account.salt, 64).toString("hex");
  account.sessionVersion = (account.sessionVersion ?? 0) + 1;
}
function identity(
  db: StoreDatabase,
  input: Record<string, unknown>,
  except = "",
) {
  const username = required(input.username ?? input.email, "Username", 80),
    email = text(input.email, 200).toLowerCase();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._@+-]{2,79}$/.test(username))
    throw new Error(
      "Use a username of 3–80 letters, numbers, dots, underscores or hyphens.",
    );
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("Enter a valid email address.");
  const aliases = [username, email].filter(Boolean).map((v) => v.toLowerCase());
  if (
    db.users.some(
      (u) =>
        u.id !== except &&
        [u.username ?? "", u.email].some(
          (v) => v && aliases.includes(v.toLowerCase()),
        ),
    )
  )
    throw new Error("That username or email is already in use.");
  return { username, email };
}
function bootstrapAllowed(
  input: Record<string, unknown>,
  db: StoreDatabase,
  user: SessionUser,
) {
  if (user.role !== "Owner" || db.users.some((u) => u.role === "Developer"))
    return false;
  const supplied = text(input.provisionToken, 200);
  if (!/^[a-f0-9]{64}$/.test(supplied)) return false;
  try {
    const expected = readFileSync(
      path.join(process.cwd(), ".local", "account-provision.token"),
      "utf8",
    ).trim();
    return (
      expected.length === supplied.length &&
      timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))
    );
  } catch {
    return false;
  }
}
function access(
  input: Record<string, unknown>,
  actor: SessionUser,
  brand: Brand,
  bootstrap = false,
) {
  const role = (text(input.role) || "Manager") as SessionUser["role"];
  if (!["Developer", "Owner", "Manager"].includes(role))
    throw new Error("Choose a valid account role.");
  if (actor.role !== "Developer" && !bootstrap && role !== "Manager")
    throw new AuthError(
      "Only a Developer can grant owner or developer access.",
      403,
    );
  const brands: Brand[] =
    role === "Developer"
      ? ["idesire", "kokies"]
      : Array.isArray(input.brands)
        ? [
            ...new Set(
              input.brands.filter(
                (b): b is Brand => b === "idesire" || b === "kokies",
              ),
            ),
          ]
        : [brand];
  if (!brands.length) throw new Error("Select at least one business.");
  if (
    actor.role !== "Developer" &&
    !bootstrap &&
    brands.some((b) => !actor.brands.includes(b))
  )
    throw new AuthError("You cannot grant access to that business.", 403);
  return { role, brands };
}
export function accountAction(
  action: string,
  input: Record<string, unknown>,
  actor: SessionUser,
  brand: Brand,
  db: StoreDatabase,
): unknown {
  if (!canManageAccounts(actor))
    throw new AuthError("You do not have permission to manage accounts.", 403);
  if (action === "createStaff") {
    const bootstrap = bootstrapAllowed(input, db, actor);
    const scope = access(input, actor, brand, bootstrap);
    const ids = identity(db, input);
    const password =
      text(input.password, 201) || randomBytes(18).toString("base64url");
    const account = {
      id: randomUUID(),
      name: required(input.name, "Display name", 180),
      ...ids,
      ...scope,
      status: "Active" as const,
      sessionVersion: 0,
      createdAt: new Date().toISOString(),
      salt: "",
      passwordHash: "",
    };
    setPassword(account, password);
    db.users.push(account);
    if (bootstrap)
      unlinkSync(path.join(process.cwd(), ".local", "account-provision.token"));
    return {
      account: publicAccount(account),
      username: account.username,
      password,
    };
  }
  const target = db.users.find((u) => u.id === input.id);
  if (!target) throw new Error("Account not found.");
  if (!canManageAccount(actor, target))
    throw new AuthError("You cannot modify this account.", 403);
  if (action === "removeStaff") {
    if (actor.role !== "Developer")
      throw new AuthError("Only a Developer can remove staff accounts.", 403);
    if (target.id === actor.id)
      throw new Error("You cannot remove your own Developer account.");
    db.users = db.users.filter((u) => u.id !== target.id);
    return { removed: target.id };
  }
  if (action === "updateStaff") {
    const scope = access(input, actor, brand);
    if (
      target.id === actor.id &&
      (scope.role !== actor.role ||
        JSON.stringify([...scope.brands].sort()) !==
          JSON.stringify([...actor.brands].sort()))
    )
      throw new Error("You cannot remove your own developer access.");
    const ids = identity(db, input, target.id);
    const changed =
      target.role !== scope.role ||
      JSON.stringify([...target.brands].sort()) !==
        JSON.stringify([...scope.brands].sort());
    Object.assign(target, {
      name: required(input.name, "Display name", 180),
      ...ids,
      ...scope,
    });
    if (changed) target.sessionVersion = (target.sessionVersion ?? 0) + 1;
    return { account: publicAccount(target) };
  }
  if (action === "setStaffStatus") {
    if (target.id === actor.id)
      throw new Error("You cannot suspend your own account.");
    if (input.status !== "Active" && input.status !== "Suspended")
      throw new Error("Choose Active or Suspended.");
    target.status = input.status;
    target.sessionVersion = (target.sessionVersion ?? 0) + 1;
    return { account: publicAccount(target) };
  }
  if (action === "resetStaffPassword") {
    if (target.id === actor.id)
      throw new Error(
        "Use Change your password in Settings for your own account.",
      );
    const password = randomBytes(18).toString("base64url");
    setPassword(target, password);
    return {
      account: publicAccount(target),
      username: target.username || target.email,
      password,
    };
  }
  throw new Error("Unsupported account action.");
}
