import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";
import type { Reservation } from "../../platform/types";

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const storage = () => getStore({ name: "rootable-reservations", consistency: "strong" });

async function list(storeId: string) {
  const target = storage();
  const { blobs } = await target.list({ prefix: `${storeId}/` });
  const values = await Promise.all(blobs.map(({ key }) => target.get(key, { type: "json", consistency: "strong" }) as Promise<Reservation | null>));
  return values.filter((value): value is Reservation => Boolean(value)).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
}

export default async (request: Request) => {
  try {
    if (request.method === "GET") {
      const storeId = new URL(request.url).searchParams.get("storeId") || "senri-demo";
      return json({ reservations: await list(storeId) });
    }
    if (request.method === "POST") {
      const payload = await request.json() as Partial<Reservation>;
      if (!payload.storeId || !payload.customerName?.trim() || !payload.phone?.trim() || !payload.date || !payload.time || !Number.isInteger(payload.partySize)) return json({ error: "請完整填寫訂位資料" }, 400);
      const partySize = Math.min(20, Math.max(1, Number(payload.partySize)));
      const busyPeriod = ["18:30", "19:00", "19:30"].includes(payload.time);
      const deposit = partySize >= 6 || busyPeriod ? partySize * 200 : 0;
      const reservation: Reservation = { id: crypto.randomUUID(), storeId: payload.storeId, customerName: payload.customerName.trim().slice(0, 30), phone: payload.phone.trim().slice(0, 30), date: payload.date, time: payload.time, partySize, note: payload.note?.trim().slice(0, 120) || "", deposit, depositStatus: deposit ? "simulated_paid" : "not_required", status: "confirmed", createdAt: new Date().toISOString() };
      await storage().setJSON(`${reservation.storeId}/${reservation.id}`, reservation, { onlyIfNew: true });
      return json({ reservation }, 201);
    }
    if (request.method === "PATCH") {
      const payload = await request.json() as { storeId?: string; id?: string; status?: Reservation["status"] };
      if (!payload.storeId || !payload.id || !payload.status) return json({ error: "缺少更新資料" }, 400);
      const target = storage();
      const key = `${payload.storeId}/${payload.id}`;
      const entry = await target.getWithMetadata(key, { type: "json", consistency: "strong" }) as { data: Reservation; etag: string } | null;
      if (!entry) return json({ error: "找不到訂位" }, 404);
      const reservation = { ...entry.data, status: payload.status };
      const result = await target.setJSON(key, reservation, { onlyIfMatch: entry.etag });
      return result.modified ? json({ reservation }) : json({ error: "訂位已被更新" }, 409);
    }
    return json({ error: "不支援的請求方式" }, 405);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "訂位服務暫時無法使用" }, 500);
  }
};

export const config: Config = { path: "/api/reservations" };
