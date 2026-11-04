import postgres from "postgres";
import { seedDatabase } from "./seed";
import type { StoreDatabase } from "./types";

const runtime = globalThis as typeof globalThis & {
  __websiteSql?: ReturnType<typeof postgres>;
  __websiteSchema?: Promise<void>;
};
export const cloudEnabled = () => Boolean(process.env.DATABASE_URL);
export function sql() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  return runtime.__websiteSql ??= postgres(process.env.DATABASE_URL, {
    max: 3, idle_timeout: 20, connect_timeout: 15,
    ssl: "require", prepare: false,
  });
}
export async function ready() {
  if (!runtime.__websiteSchema) {
    runtime.__websiteSchema = (async () => {
      const db = sql();
      await db`CREATE TABLE IF NOT EXISTS website_state (
        id integer PRIMARY KEY CHECK (id = 1),
        data jsonb NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      )`;
      const existing = await db`SELECT id FROM website_state WHERE id = 1`;
      if (existing.length) return;
      const raw = process.env.BOOTSTRAP_DEVELOPER_JSON;
      if (!raw) throw new Error("Initial Developer account configuration is required.");
      const user = JSON.parse(raw) as StoreDatabase["users"][number];
      if (user.username !== "Developer" || user.role !== "Developer" ||
          !user.brands?.includes("idesire") || !user.brands?.includes("kokies") ||
          !/^[a-f0-9]{32,128}$/i.test(user.salt) ||
          !/^[a-f0-9]{128}$/i.test(user.passwordHash) || user.status === "Suspended")
        throw new Error("Invalid initial Developer account configuration.");
      const seed = seedDatabase();
      seed.users = [user];
      await db`INSERT INTO website_state (id, data) VALUES (1, ${db.json(seed)}) ON CONFLICT (id) DO NOTHING`;
    })().catch(error => { runtime.__websiteSchema = undefined; throw error; });
  }
  await runtime.__websiteSchema;
}
export async function cloudDatabase(): Promise<StoreDatabase> {
  await ready();
  const rows = await sql()`SELECT data FROM website_state WHERE id = 1`;
  return rows[0].data as StoreDatabase;
}
