import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  orderNo: text("order_no").notNull().unique(),
  storeId: text("store_id").notNull().default("senri-demo"),
  tableNo: text("table_no").notNull(),
  status: text("status").notNull().default("new"),
  paymentMethod: text("payment_method").notNull(),
  paymentChannel: text("payment_channel").notNull(),
  paymentStatus: text("payment_status").notNull(),
  settlementStatus: text("settlement_status").notNull().default("not_applicable"),
  subtotal: integer("subtotal").notNull(),
  platformFee: integer("platform_fee").notNull().default(0),
  merchantPayout: integer("merchant_payout").notNull(),
  customerNote: text("customer_note").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_orders_store_status").on(table.storeId, table.status),
  index("idx_orders_created_at").on(table.createdAt),
]);

export const orderItems = sqliteTable("order_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: text("order_id").notNull(),
  productId: text("product_id").notNull(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  servedQuantity: integer("served_quantity").notNull().default(0),
  unitPrice: integer("unit_price").notNull(),
}, (table) => [index("idx_order_items_order_id").on(table.orderId)]);
