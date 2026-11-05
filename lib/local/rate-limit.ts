import { AuthError } from "./auth";

const runtime = globalThis as typeof globalThis & {
  __requestLimits?: Map<string, { count: number; expires: number }>;
};

export function limitRequest(request: Request, scope: string, max: number, windowMs: number) {
  const limits = runtime.__requestLimits ??= new Map();
  const now = Date.now();
  for (const [key, value] of limits) if (value.expires <= now) limits.delete(key);
  const forwarded = process.env.RENDER === "true"
    ? request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim()
    : undefined;
  const key = scope + ":" + (forwarded?.slice(0, 64) || "local");
  let entry = limits.get(key);
  if (!entry) {
    if (limits.size >= 4096) throw new AuthError("Too many requests. Try again shortly.", 429);
    entry = { count: 0, expires: now + windowMs };
    limits.set(key, entry);
  }
  if (++entry.count > max) throw new AuthError("Too many attempts. Try again in a few minutes.", 429);
}
