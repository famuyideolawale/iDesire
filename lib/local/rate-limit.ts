import { AuthError } from "./auth";

type Entry = { count: number; expires: number };
const runtime = globalThis as typeof globalThis & {
  __requestLimits?: Map<string, Entry>;
};
const MAX_KEYS = 10_000;

/**
 * Best-effort client address. On Render the proxy appends the address it saw,
 * so the last X-Forwarded-For entry is the trustworthy one. Other hosts usually
 * set X-Real-IP. Locally there is no proxy, so requests share one bucket.
 */
export function clientAddress(request: Request) {
  const headers = request.headers;
  if (process.env.RENDER === "true") {
    const last = headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
    return last ? last.slice(0, 64) : "local";
  }
  const real = headers.get("x-real-ip")?.trim();
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const candidate = real || forwarded || headers.get("cf-connecting-ip")?.trim();
  return candidate ? candidate.slice(0, 64) : "local";
}

export function limitRequest(request: Request, scope: string, max: number, windowMs: number) {
  const limits = (runtime.__requestLimits ??= new Map());
  const now = Date.now();
  const key = scope + ":" + clientAddress(request);
  let entry = limits.get(key);
  if (entry && entry.expires <= now) {
    limits.delete(key);
    entry = undefined;
  }
  if (!entry) {
    // Evict expired entries first, then the oldest, instead of refusing everyone.
    if (limits.size >= MAX_KEYS) {
      for (const [k, v] of limits) if (v.expires <= now) limits.delete(k);
      while (limits.size >= MAX_KEYS) {
        const oldest = limits.keys().next().value;
        if (oldest === undefined) break;
        limits.delete(oldest);
      }
    }
    entry = { count: 0, expires: now + windowMs };
    limits.set(key, entry);
  }
  if (++entry.count > max) throw new AuthError("Too many attempts. Try again in a few minutes.", 429);
}
