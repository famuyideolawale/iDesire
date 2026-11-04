import {
  randomBytes,
  createHmac,
  timingSafeEqual,
  scryptSync,
} from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";
import { database } from "./store";
import type { Brand, SessionUser } from "./types";
let secretPromise: Promise<string> | undefined;
async function secret() {
  if (process.env.SESSION_SECRET) {
    if (process.env.SESSION_SECRET.length < 48) throw new Error("SESSION_SECRET must contain at least 48 characters.");
    return process.env.SESSION_SECRET;
  }
  if (process.env.RENDER === "true") throw new Error("SESSION_SECRET is required.");
  if (!secretPromise)
    secretPromise = (async () => {
      const dir = path.join(process.cwd(), ".local");
      await mkdir(dir, { recursive: true });
      const file = path.join(dir, "session-secret");
      try {
        return await readFile(file, "utf8");
      } catch {
        const value = randomBytes(48).toString("hex");
        try {
          await writeFile(file, value, { flag: "wx" });
          return value;
        } catch {
          return await readFile(file, "utf8");
        }
      }
    })();
  return secretPromise;
}
export async function makeSession(user: SessionUser) {
  const payload = Buffer.from(
    JSON.stringify({
      id: user.id,
      version: user.sessionVersion ?? 0,
      expires: Date.now() + 8 * 3600000,
    }),
  ).toString("base64url");
  return (
    payload +
    "." +
    createHmac("sha256", await secret())
      .update(payload)
      .digest("base64url")
  );
}
export async function sessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get("dual-admin-session")?.value;
  if (!token) return null;
  try {
    const [payload, signature] = token.split(".");
    const expected = createHmac("sha256", await secret())
      .update(payload)
      .digest("base64url");
    if (
      !signature ||
      signature.length !== expected.length ||
      !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    )
      return null;
    const value = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (value.expires < Date.now()) return null;
    const user = (await database()).users.find((u) => u.id === value.id);
    if (
      !user ||
      user.status === "Suspended" ||
      (value.version ?? 0) !== (user.sessionVersion ?? 0)
    )
      return null;
    const { salt: _salt, passwordHash: _hash, ...publicUser } = user;
    return publicUser;
  } catch {
    return null;
  }
}
export async function requireUser(brand?: Brand) {
  const user = await sessionUser();
  if (!user) throw new AuthError("Sign in to the staff workspace.", 401);
  if (brand && !user.brands.includes(brand))
    throw new AuthError("This account cannot manage that business.", 403);
  return user;
}
export class AuthError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function login(email: string, password: string) {
  if (!email.trim() || !password) return null;
  const db = await database();
  const user = db.users.find(
    (u) =>
      u.email.toLowerCase() === email.trim().toLowerCase() ||
      u.username?.toLowerCase() === email.trim().toLowerCase(),
  );
  if (!user || user.status === "Suspended") return null;
  const candidate = scryptSync(password, user.salt, 64);
  if (!timingSafeEqual(candidate, Buffer.from(user.passwordHash, "hex")))
    return null;
  const { salt: _salt, passwordHash: _hash, ...publicUser } = user;
  return publicUser;
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = process.env.APP_ORIGIN || process.env.RENDER_EXTERNAL_URL || new URL(request.url).origin;
  if (origin && origin !== new URL(expected).origin)
    throw new AuthError("Cross-origin changes are not allowed.", 403);
}
