import { mkdir, readFile, writeFile, rename, copyFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
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
  const job = state.queue.then(async () => {
    const current = await database();
    const next = structuredClone(current);
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
    await persist(next);
    state.loaded = Promise.resolve(next);
    return result;
  });
  state.queue = job.catch(() => undefined);
  return job;
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
