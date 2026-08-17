import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";

const statuses = new Set(["new", "accepted", "preparing", "ready", "completed", "cancelled"]);
const paymentStatuses = new Set(["unpaid", "paid", "refunded"]);

type IncomingItem = {
  productId?: string;
  productName?: string;
  quantity?: number;
  unitPrice?: number;
};

type OrderItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
};

type Order = {
  id: string;
  orderNo: string;
  storeId: string;
  tableNo: string;
  status: string;
  paymentMethod: string;
  paymentChannel: string;
  paymentStatus: string;
  settlementStatus: string;
  subtotal: number;
  platformFee: number;
  merchantPayout: number;
  customerNote: string;
  orderSource: "direct" | "rootable_marketplace";
  feeRate: number;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
};

const json = (data: unknown, status = 200) => Response.json(data, {
  status,
  headers: { "Cache-Control": "no-store" },
});

const store = () => getStore({ name: "rootable-orders", consistency: "strong" });
const orderKey = (storeId: string, id: string) => `${storeId}/${id}`;

async function listOrders(storeId: string) {
  const ordersStore = store();
  const { blobs } = await ordersStore.list({ prefix: `${storeId}/` });
  const orders = (await Promise.all(
    blobs.map(({ key }) => ordersStore.get(key, { type: "json", consistency: "strong" }) as Promise<Order | null>),
  )).filter((order): order is Order => Boolean(order));
  return orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 80);
}

async function createOrder(request: Request) {
  const payload = (await request.json()) as {
    storeId?: string;
    tableNo?: string;
    paymentMethod?: string;
    paymentChannel?: string;
    customerNote?: string;
    orderSource?: string;
    items?: IncomingItem[];
  };
  const items = (payload.items ?? []).filter((item): item is OrderItem =>
    Boolean(item.productId && item.productName)
    && Number.isInteger(item.quantity) && Number(item.quantity) > 0
    && Number.isInteger(item.unitPrice) && Number(item.unitPrice) > 0,
  ).map((item) => ({
    productId: item.productId,
    productName: item.productName,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unitPrice),
  }));

  if (!payload.tableNo?.trim() || !items.length) return json({ error: "桌號與餐點不得空白" }, 400);
  if (!new Set(["cash", "rootable_pay"]).has(payload.paymentMethod ?? "")) return json({ error: "付款方式不正確" }, 400);
  if (!new Set(["cash", "line_pay", "apple_pay"]).has(payload.paymentChannel ?? "")) return json({ error: "付款管道不正確" }, 400);

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const orderSource = payload.orderSource === "rootable_marketplace" ? "rootable_marketplace" : "direct";
  const feeRate = orderSource === "rootable_marketplace" ? 0.15 : payload.paymentMethod === "rootable_pay" ? 0.039 : 0;
  const platformFee = Math.round(subtotal * feeRate);
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const order: Order = {
    id,
    orderNo: `R${Date.now().toString().slice(-7)}`,
    storeId: payload.storeId || "senri-demo",
    tableNo: payload.tableNo.trim(),
    status: "new",
    paymentMethod: payload.paymentMethod!,
    paymentChannel: payload.paymentChannel!,
    paymentStatus: payload.paymentMethod === "rootable_pay" ? "paid" : "unpaid",
    settlementStatus: payload.paymentMethod === "rootable_pay" ? "pending" : "not_applicable",
    subtotal,
    platformFee,
    merchantPayout: subtotal - platformFee,
    customerNote: payload.customerNote?.trim() || "",
    orderSource,
    feeRate,
    createdAt,
    updatedAt: createdAt,
    items,
  };

  await store().setJSON(orderKey(order.storeId, id), order, { onlyIfNew: true });
  return json({ order }, 201);
}

async function updateOrder(request: Request) {
  const payload = (await request.json()) as { id?: string; storeId?: string; status?: string; paymentStatus?: string };
  const storeId = payload.storeId || "senri-demo";
  if (!payload.id) return json({ error: "缺少訂單編號" }, 400);
  if (payload.status && !statuses.has(payload.status)) return json({ error: "訂單狀態不正確" }, 400);
  if (payload.paymentStatus && !paymentStatuses.has(payload.paymentStatus)) return json({ error: "付款狀態不正確" }, 400);
  if (!payload.status && !payload.paymentStatus) return json({ error: "沒有可更新的狀態" }, 400);

  const ordersStore = store();
  const key = orderKey(storeId, payload.id);
  const entry = await ordersStore.getWithMetadata(key, { type: "json", consistency: "strong" }) as { data: Order; etag: string } | null;
  if (!entry) return json({ error: "找不到訂單" }, 404);
  const order = {
    ...entry.data,
    ...(payload.status ? { status: payload.status } : {}),
    ...(payload.paymentStatus ? { paymentStatus: payload.paymentStatus } : {}),
    updatedAt: new Date().toISOString(),
  };
  const result = await ordersStore.setJSON(key, order, { onlyIfMatch: entry.etag });
  if (!result.modified) return json({ error: "訂單已被其他裝置更新，請重新整理" }, 409);
  return json({ order });
}

export default async (request: Request) => {
  try {
    if (request.method === "GET") {
      const storeId = new URL(request.url).searchParams.get("storeId") || "senri-demo";
      return json({ orders: await listOrders(storeId) });
    }
    if (request.method === "POST") return await createOrder(request);
    if (request.method === "PATCH") return await updateOrder(request);
    return json({ error: "不支援的請求方式" }, 405);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "訂單服務暫時無法使用" }, 500);
  }
};

export const config: Config = { path: "/api/orders" };
