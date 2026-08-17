import { createHash } from "node:crypto";
import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const imageExtensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const images = () => getStore({ name: "rootable-menu-images", consistency: "strong" });
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

async function withinUploadLimit(request: Request) {
  const forwarded = request.headers.get("x-nf-client-connection-ip") || request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const fingerprint = createHash("sha256").update(forwarded.trim()).digest("hex").slice(0, 24);
  const hour = new Date().toISOString().slice(0, 13);
  const key = `${hour}/${fingerprint}`;
  const limits = getStore({ name: "rootable-menu-image-rate-limit", consistency: "strong" });
  const current = await limits.get(key, { type: "json", consistency: "strong" }) as { count?: number } | null;
  if ((current?.count || 0) >= 120) return false;
  await limits.setJSON(key, { count: (current?.count || 0) + 1 });
  return true;
}

export default async (request: Request) => {
  try {
    if (request.method === "GET") {
      const id = new URL(request.url).searchParams.get("id") || "";
      if (!/^[a-zA-Z0-9_-]{3,80}\/[a-f0-9-]{20,50}\.(jpg|png|webp)$/.test(id)) return json({ error: "圖片網址不正確" }, 400);
      const metadata = await images().getMetadata(id, { consistency: "strong" });
      if (!metadata) return json({ error: "找不到圖片" }, 404);
      const data = await images().get(id, { type: "arrayBuffer", consistency: "strong" });
      return new Response(data, { headers: { "Content-Type": String(metadata.metadata.contentType || "image/jpeg"), "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
    }
    if (request.method !== "POST") return json({ error: "不支援的請求方式" }, 405);
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return json({ error: "不允許跨站上傳" }, 403);
    if (!await withinUploadLimit(request)) return json({ error: "本裝置本小時上傳圖片數量過多，請稍後再試" }, 429);
    const payload = await request.json() as { imageBase64?: string; mimeType?: string; storeId?: string };
    const storeId = (payload.storeId || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
    if (storeId.length < 3) return json({ error: "缺少店家識別資料" }, 400);
    if (!payload.mimeType || !imageTypes.has(payload.mimeType)) return json({ error: "只支援 JPG、PNG 或 WebP 圖片" }, 400);
    if (!payload.imageBase64 || payload.imageBase64.length > 1_900_000) return json({ error: "餐點圖片為空白或超過 1.4MB" }, 413);
    const bytes = Buffer.from(payload.imageBase64, "base64");
    if (!bytes.length || bytes.length > 1_400_000) return json({ error: "餐點圖片大小不正確" }, 413);
    const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const id = `${storeId}/${crypto.randomUUID()}.${imageExtensions[payload.mimeType]}`;
    await images().set(id, data, { metadata: { contentType: payload.mimeType, storeId, createdAt: new Date().toISOString() }, onlyIfNew: true });
    return json({ imageUrl: `/api/menu-images?id=${encodeURIComponent(id)}` }, 201);
  } catch (error) {
    console.error("Menu image service failed", error instanceof Error ? error.message.slice(0, 300) : "unknown");
    return json({ error: "餐點圖片服務暫時無法使用" }, 500);
  }
};

export const config: Config = { path: "/api/menu-images" };
