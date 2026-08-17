import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { ensureOrderSchema } from "../../../db/orders";
import { orderItems, orders } from "../../../db/schema";

const statuses = new Set(["awaiting_payment", "new", "accepted", "preparing", "ready", "completed", "cancelled"]);
const paymentStatuses = new Set(["unpaid", "paid", "refunded"]);
type IncomingItem = { productId?: string; productName?: string; quantity?: number; unitPrice?: number };

export async function GET(request: Request) {
  try {
    await ensureOrderSchema();
    const storeId = new URL(request.url).searchParams.get("storeId") || "senri-demo";
    const db = getDb();
    const rows = await db.select().from(orders).where(eq(orders.storeId, storeId)).orderBy(desc(orders.createdAt)).limit(80);
    const hydrated = await Promise.all(rows.map(async (order) => ({
      ...order,
      status: order.paymentMethod === "cash" && order.paymentStatus === "unpaid" && !["completed", "cancelled"].includes(order.status) ? "awaiting_payment" : order.status,
      orderSource: order.customerNote.startsWith("【平台導流】") ? "rootable_marketplace" : "direct",
      feeRate: order.customerNote.startsWith("【平台導流】") ? 0.15 : order.paymentMethod === "rootable_pay" ? 0.039 : 0,
      items: await db.select().from(orderItems).where(eq(orderItems.orderId, order.id)),
    })));
    return Response.json({ orders: hydrated });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "無法讀取訂單" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureOrderSchema();
    const payload = (await request.json()) as {
      storeId?: string; tableNo?: string; paymentMethod?: string; paymentChannel?: string;
      customerNote?: string; orderSource?: string; items?: IncomingItem[];
    };
    const items = (payload.items ?? []).filter((item) =>
      item.productId && item.productName && Number.isInteger(item.quantity) && Number(item.quantity) > 0 && Number.isInteger(item.unitPrice) && Number(item.unitPrice) > 0
    );
    if (!payload.tableNo?.trim() || !items.length) return Response.json({ error: "桌號與餐點不得空白" }, { status: 400 });
    if (!["cash", "rootable_pay"].includes(payload.paymentMethod ?? "")) return Response.json({ error: "付款方式不正確" }, { status: 400 });
    if (!["cash", "line_pay", "apple_pay"].includes(payload.paymentChannel ?? "")) return Response.json({ error: "付款管道不正確" }, { status: 400 });

    const subtotal = items.reduce((sum, item) => sum + Number(item.unitPrice) * Number(item.quantity), 0);
    const isMarketplace = payload.orderSource === "rootable_marketplace";
    const feeRate = isMarketplace ? 0.15 : payload.paymentMethod === "rootable_pay" ? 0.039 : 0;
    const platformFee = Math.round(subtotal * feeRate);
    const id = crypto.randomUUID();
    const orderNo = `R${Date.now().toString().slice(-7)}`;
    const isPaid = payload.paymentMethod === "rootable_pay";
    const createdAt = new Date().toISOString();
    const db = getDb();
    await db.insert(orders).values({
      id, orderNo, storeId: payload.storeId || "senri-demo", tableNo: payload.tableNo.trim(), status: isPaid ? "new" : "awaiting_payment",
      paymentMethod: payload.paymentMethod!, paymentChannel: payload.paymentChannel!, paymentStatus: isPaid ? "paid" : "unpaid",
      settlementStatus: isPaid ? "pending" : "not_applicable", subtotal, platformFee,
      merchantPayout: subtotal - platformFee, customerNote: `${isMarketplace ? "【平台導流】" : ""}${payload.customerNote?.trim() || ""}`,
      createdAt, updatedAt: createdAt,
    });
    await db.insert(orderItems).values(items.map((item) => ({
      orderId: id, productId: item.productId!, productName: item.productName!, quantity: Number(item.quantity), servedQuantity: 0, unitPrice: Number(item.unitPrice),
    })));
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return Response.json({ order: { ...order, orderSource: isMarketplace ? "rootable_marketplace" : "direct", feeRate, items } }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "建立訂單失敗" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await ensureOrderSchema();
    const payload = (await request.json()) as { id?: string; storeId?: string; status?: string; paymentStatus?: string; itemId?: number; servedDelta?: number };
    if (!payload.id) return Response.json({ error: "缺少訂單編號" }, { status: 400 });
    const db = getDb();
    const [existing] = await db.select().from(orders).where(and(eq(orders.id, payload.id), eq(orders.storeId, payload.storeId || "senri-demo")));
    if (!existing) return Response.json({ error: "找不到訂單" }, { status: 404 });

    if (payload.itemId !== undefined || payload.servedDelta !== undefined) {
      if (!Number.isInteger(payload.itemId) || ![1, -1].includes(payload.servedDelta ?? 0)) return Response.json({ error: "出餐更新資料不正確" }, { status: 400 });
      if (existing.paymentStatus !== "paid") return Response.json({ error: "訂單尚未付款，不能送入廚房" }, { status: 409 });
      const [item] = await db.select().from(orderItems).where(and(eq(orderItems.id, payload.itemId!), eq(orderItems.orderId, existing.id)));
      if (!item) return Response.json({ error: "找不到訂單品項" }, { status: 404 });
      await db.update(orderItems).set({ servedQuantity: sql`max(0, min(${orderItems.quantity}, ${orderItems.servedQuantity} + ${payload.servedDelta!}))` }).where(eq(orderItems.id, item.id));
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, existing.id));
      const allServed = items.every((row) => row.servedQuantity >= row.quantity);
      const anyServed = items.some((row) => row.servedQuantity > 0);
      const nextStatus = allServed ? "ready" : anyServed ? "preparing" : ["ready", "preparing"].includes(existing.status) ? "accepted" : existing.status;
      await db.update(orders).set({ status: nextStatus, updatedAt: new Date().toISOString() }).where(eq(orders.id, existing.id));
      return Response.json({ order: { ...existing, status: nextStatus, items } });
    }

    const changes: { status?: string; paymentStatus?: string; updatedAt: string } = { updatedAt: new Date().toISOString() };
    if (payload.status && statuses.has(payload.status)) changes.status = payload.status;
    if (payload.status && existing.paymentStatus !== "paid" && payload.status !== "awaiting_payment") return Response.json({ error: "請先完成付款確認" }, { status: 409 });
    if (payload.paymentStatus && paymentStatuses.has(payload.paymentStatus)) {
      changes.paymentStatus = payload.paymentStatus;
      if (payload.paymentStatus === "paid" && existing.paymentMethod === "cash" && existing.paymentStatus === "unpaid") changes.status = "new";
    }
    if (!changes.status && !changes.paymentStatus) return Response.json({ error: "沒有可更新的狀態" }, { status: 400 });
    await db.update(orders).set(changes).where(and(eq(orders.id, payload.id), eq(orders.storeId, payload.storeId || "senri-demo")));
    const [order] = await db.select().from(orders).where(eq(orders.id, payload.id));
    return Response.json({ order });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "更新訂單失敗" }, { status: 500 });
  }
}
