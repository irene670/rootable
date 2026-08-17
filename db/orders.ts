import { env } from "cloudflare:workers";

let ready = false;

export async function ensureOrderSchema() {
  if (ready) return;
  if (!env.DB) throw new Error("D1 binding DB is unavailable");
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY NOT NULL, order_no TEXT NOT NULL UNIQUE,
      store_id TEXT NOT NULL DEFAULT 'senri-demo', table_no TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new', payment_method TEXT NOT NULL,
      payment_channel TEXT NOT NULL, payment_status TEXT NOT NULL,
      settlement_status TEXT NOT NULL DEFAULT 'not_applicable',
      subtotal INTEGER NOT NULL, platform_fee INTEGER NOT NULL DEFAULT 0,
      merchant_payout INTEGER NOT NULL, customer_note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, order_id TEXT NOT NULL,
      product_id TEXT NOT NULL, product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL, served_quantity INTEGER NOT NULL DEFAULT 0,
      unit_price INTEGER NOT NULL
    )`),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_orders_store_status ON orders (store_id, status)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id)"),
  ]);
  const columns = await env.DB.prepare("PRAGMA table_info(order_items)").all<{ name: string }>();
  if (!columns.results.some((column) => column.name === "served_quantity")) {
    await env.DB.prepare("ALTER TABLE order_items ADD COLUMN served_quantity INTEGER NOT NULL DEFAULT 0").run();
  }
  ready = true;
}
