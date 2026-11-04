import { mkdir, readFile, writeFile, rename, copyFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { cloudEnabled, cloudDatabase, ready, sql } from "./cloud";
import { seedDatabase } from "./seed";
import type { Brand, BusinessData, StoreDatabase } from "./types";
const directory = path.join(process.cwd(), ".local");
const filename = path.join(directory, "store.json");
const runtime = globalThis as typeof globalThis & {
  __dualStore?: { loaded?: Promise<StoreDatabase>; queue: Promise<unknown> };
};
const state =
  runtime.__dualStore ?? (runtime.__dualStore = { queue: Promise.resolve() });
async function persist(data: StoreDatabase) {
  await mkdir(directory, { recursive: true });
  const temporary = path.join(
    directory,
    `store-${process.pid}-${randomUUID()}.tmp`,
  );
  await writeFile(temporary, JSON.stringify(data, null, 2), "utf8");
  try {
    await copyFile(filename, path.join(directory, "store.previous.json"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  await rename(temporary, filename);
}
export async function database(): Promise<StoreDatabase> {
  if (cloudEnabled()) return cloudDatabase();
  if (process.env.RENDER === "true") throw new Error("Persistent database configuration is required.");
  if (!state.loaded)
    state.loaded = (async () => {
      await mkdir(directory, { recursive: true });
      try {
        return JSON.parse(await readFile(filename, "utf8")) as StoreDatabase;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT")
          throw new Error(
            "Local database could not be read. Existing data was not reset.",
          );
        const seeded = seedDatabase();
        await persist(seeded);
        return seeded;
      }
    })();
  return state.loaded;
}
export async function readBusiness(brand: Brand) {
  return structuredClone((await database()).businesses[brand]);
}
export async function mutate<T>(
  brand: Brand,
  actor: string,
  action: string,
  entity: string,
  callback: (business: BusinessData, db: StoreDatabase) => T | Promise<T>,
): Promise<T> {
  const change = async (next: StoreDatabase) => {
    const business = next.businesses[brand];
    const result = await callback(business, next);
    business.revision++;
    if (
      [
        "createStaff",
        "updateStaff",
        "setStaffStatus",
        "resetStaffPassword",
        "removeStaff",
        "changePassword",
      ].includes(action)
    )
      for (const other of ["idesire", "kokies"] as Brand[])
        if (other !== brand) next.businesses[other].revision++;

    business.audit.unshift({
      id: randomUUID(),
      at: new Date().toISOString(),
      actor,
      action,
      entity,
    });
    business.audit = business.audit.slice(0, 1500);
    return result;
  };
  if (cloudEnabled()) {
    await ready();
    return sql().begin(async transaction => {
      const rows = await transaction`SELECT data FROM website_state WHERE id = 1 FOR UPDATE`;
      const next = rows[0].data as StoreDatabase;
      const result = await change(next);
      await transaction`UPDATE website_state SET data = ${transaction.json(next)}, updated_at = now() WHERE id = 1`;
      return result;
    }) as Promise<T>;
  }
  const job = state.queue.then(async () => {
    const next = structuredClone(await database());
    const result = await change(next);
    await persist(next);
    state.loaded = Promise.resolve(next);
    return result;
  });
  state.queue = job.catch(() => undefined);
  return job;
}
// Frequent polls fetch only the fields they need from Postgres.
export async function readRevision(brand: Brand): Promise<number> {
  if (!cloudEnabled()) return (await database()).businesses[brand].revision;
  await ready();
  const rows = await sql()`SELECT data->'businesses'->${brand}->>'revision' AS revision FROM website_state WHERE id = 1`;
  return Number(rows[0].revision);
}
export async function readVisitorChat(brand: Brand, visitorHash?: string) {
  let conversation: import("./types").Conversation | undefined;
  let settings: Pick<BusinessData["settings"], "chatWelcome" | "chatOnline">;
  if (cloudEnabled()) {
    await ready();
    const rows = await sql()`SELECT
      data->'businesses'->${brand}->'settings'->'chatWelcome' AS welcome,
      data->'businesses'->${brand}->'settings'->'chatOnline' AS online,
      (SELECT c FROM jsonb_array_elements(data->'businesses'->${brand}->'conversations') AS c
       WHERE c->>'visitorHash' = ${visitorHash ?? ""} LIMIT 1) AS conversation
      FROM website_state WHERE id = 1`;
    conversation = rows[0].conversation;
    settings = { chatWelcome: rows[0].welcome, chatOnline: rows[0].online };
  } else {
    const b = await readBusiness(brand);
    conversation = visitorHash ? b.conversations.find(c => c.visitorHash === visitorHash) : undefined;
    settings = b.settings;
  }
  return {
    conversation: conversation ? { id: conversation.id, name: conversation.name, status: conversation.status, messages: conversation.messages } : null,
    welcome: settings.chatWelcome, online: settings.chatOnline,
  };
}
export function parseBrand(value: string): Brand {
  if (value !== "idesire" && value !== "kokies")
    throw new Error("Unknown business.");
  return value;
}
export function text(value: unknown, max = 1000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
export function positive(value: unknown, min = 0, max = 10000000) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max)
    throw new Error(`Enter a number between ${min} and ${max}.`);
  return n;
}
export function safeUrl(value: unknown) {
  const url = text(value, 2000);
  if (!url) return "";
  if (
    url.startsWith("/") &&
    !url.startsWith("//") &&
    !url.includes(String.fromCharCode(92))
  )
    return url;
  if (url.startsWith("https://")) return url;
  throw new Error("Use a local path or an https URL.");
}
export function required(value: unknown, label: string, max = 1000) {
  const v = text(value, max);
  if (!v) throw new Error(`${label} is required.`);
  return v;
}
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid request.");
  return value as Record<string, unknown>;
}
