import { env } from "cloudflare:workers";

let ready = false;

export async function ensureStoreSchema() {
  if (ready) return;
  if (!env.DB) throw new Error("D1 binding DB is unavailable");
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS store_records (
      store_id TEXT PRIMARY KEY NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_store_records_slug ON store_records (slug)"),
  ]);
  ready = true;
}
