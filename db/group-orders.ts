import { env } from "cloudflare:workers";

let ready = false;

export async function ensureGroupOrderSchema() {
  if (ready) return;
  if (!env.DB) throw new Error("D1 binding DB is unavailable");
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS group_orders (
    code TEXT PRIMARY KEY NOT NULL,
    payload TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
  ready = true;
}
