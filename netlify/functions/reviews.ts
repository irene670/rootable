import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";
import { seedReviews } from "../../platform/seed";
import type { Review } from "../../platform/types";

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const storage = () => getStore({ name: "rootable-reviews", consistency: "strong" });

async function list(storeId: string) {
  const target = storage();
  const { blobs } = await target.list({ prefix: `${storeId}/` });
  const values = await Promise.all(blobs.map(({ key }) => target.get(key, { type: "json", consistency: "strong" }) as Promise<Review | null>));
  const reviews = values.filter((value): value is Review => Boolean(value));
  return reviews.length ? reviews : seedReviews.filter((review) => review.storeId === storeId);
}

export default async (request: Request) => {
  try {
    if (request.method === "GET") {
      const storeId = new URL(request.url).searchParams.get("storeId") || "senri-demo";
      return json({ reviews: await list(storeId) });
    }
    if (request.method === "POST") {
      const payload = await request.json() as Partial<Review> & { completedOrder?: boolean };
      if (!payload.completedOrder || !payload.storeId || !payload.orderNo || !payload.customerName?.trim() || !payload.comment?.trim() || !payload.rating) return json({ error: "只有完成訂單的顧客可以留下評論" }, 403);
      const review: Review = { id: crypto.randomUUID(), storeId: payload.storeId, orderNo: payload.orderNo, customerName: payload.customerName.trim().slice(0, 30), rating: Math.min(5, Math.max(1, Number(payload.rating))), comment: payload.comment.trim().slice(0, 300), merchantReply: "", status: "published", createdAt: new Date().toISOString() };
      await storage().setJSON(`${review.storeId}/${review.id}`, review, { onlyIfNew: true });
      return json({ review }, 201);
    }
    if (request.method === "PATCH") {
      const payload = await request.json() as { storeId?: string; id?: string; reply?: string; report?: boolean };
      if (!payload.storeId || !payload.id) return json({ error: "缺少評論資料" }, 400);
      const target = storage();
      const key = `${payload.storeId}/${payload.id}`;
      let entry = await target.getWithMetadata(key, { type: "json", consistency: "strong" }) as { data: Review; etag: string } | null;
      if (!entry) {
        const seeded = seedReviews.find((review) => review.id === payload.id && review.storeId === payload.storeId);
        if (!seeded) return json({ error: "找不到評論" }, 404);
        await target.setJSON(key, seeded, { onlyIfNew: true });
        entry = await target.getWithMetadata(key, { type: "json", consistency: "strong" }) as { data: Review; etag: string };
      }
      const review: Review = { ...entry.data, ...(payload.reply !== undefined ? { merchantReply: payload.reply.trim().slice(0, 300) } : {}), ...(payload.report ? { status: "reported" as const } : {}) };
      const result = await target.setJSON(key, review, { onlyIfMatch: entry.etag });
      return result.modified ? json({ review }) : json({ error: "評論已被更新" }, 409);
    }
    return json({ error: "不支援的請求方式" }, 405);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "評論服務暫時無法使用" }, 500);
  }
};

export const config: Config = { path: "/api/reviews" };
