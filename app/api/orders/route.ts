import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { ensureOrderSchema } from "../../../db/orders";
import { orderItems, orders } from "../../../db/schema";

const statuses = new Set(["new", "accepted", "preparing", "ready", "completed", "cancelled"]);
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
    const db = getDb();
    await db.insert(orders).values({
      id, orderNo, storeId: payload.storeId || "senri-demo", tableNo: payload.tableNo.trim(), status: "new",
      paymentMethod: payload.paymentMethod!, paymentChannel: payload.paymentChannel!, paymentStatus: isPaid ? "paid" : "unpaid",
      settlementStatus: isPaid ? "pending" : "not_applicable", subtotal, platformFee,
      merchantPayout: subtotal - platformFee, customerNote: `${isMarketplace ? "【平台導流】" : ""}${payload.customerNote?.trim() || ""}`,
    });
    await db.insert(orderItems).values(items.map((item) => ({
      orderId: id, productId: item.productId!, productName: item.productName!, quantity: Number(item.quantity), unitPrice: Number(item.unitPrice),
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
    const payload = (await request.json()) as { id?: string; storeId?: string; status?: string; paymentStatus?: string };
    if (!payload.id) return Response.json({ error: "缺少訂單編號" }, { status: 400 });
    const changes: { status?: string; paymentStatus?: string; updatedAt: string } = { updatedAt: new Date().toISOString() };
    if (payload.status && statuses.has(payload.status)) changes.status = payload.status;
    if (payload.paymentStatus && paymentStatuses.has(payload.paymentStatus)) changes.paymentStatus = payload.paymentStatus;
    if (!changes.status && !changes.paymentStatus) return Response.json({ error: "沒有可更新的狀態" }, { status: 400 });
    const db = getDb();
    await db.update(orders).set(changes).where(and(eq(orders.id, payload.id), eq(orders.storeId, payload.storeId || "senri-demo")));
    const [order] = await db.select().from(orders).where(eq(orders.id, payload.id));
    return Response.json({ order });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "更新訂單失敗" }, { status: 500 });
  }
}
