import { createHash } from "node:crypto";
import { GoogleGenAI } from "@google/genai";
import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";
import { normalizeAiMenu } from "../../platform/ai-menu";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8" } });

async function withinRateLimit(request: Request) {
  const forwarded = request.headers.get("x-nf-client-connection-ip") || request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const fingerprint = createHash("sha256").update(forwarded.trim()).digest("hex").slice(0, 24);
  const hour = new Date().toISOString().slice(0, 13);
  const key = `${hour}/${fingerprint}`;
  const storage = getStore({ name: "rootable-ai-rate-limit", consistency: "strong" });
  const current = await storage.get(key, { type: "json", consistency: "strong" }) as { count?: number } | null;
  if ((current?.count || 0) >= 5) return false;
  await storage.setJSON(key, { count: (current?.count || 0) + 1 });
  return true;
}

export default async (request: Request) => {
  if (request.method !== "POST") return json({ error: "只接受菜單照片上傳" }, 405);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return json({ error: "不允許跨站上傳" }, 403);
  if (!process.env.GEMINI_API_KEY) return json({ error: "AI 菜單功能尚未完成伺服器設定" }, 503);
  try {
    if (!await withinRateLimit(request)) return json({ error: "本裝置本小時已達 5 次辨識上限，請稍後再試" }, 429);
    const payload = await request.json() as { imageBase64?: string; mimeType?: string; storeId?: string };
    if (!payload.storeId?.trim()) return json({ error: "缺少店家識別資料" }, 400);
    if (!payload.mimeType || !allowedTypes.has(payload.mimeType)) return json({ error: "只支援 JPG、PNG 或 WebP 圖片" }, 400);
    if (!payload.imageBase64 || payload.imageBase64.length > 7_000_000) return json({ error: "圖片為空白或超過 5MB" }, 413);

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ inlineData: { mimeType: payload.mimeType, data: payload.imageBase64 } }, { text: `你是台灣餐飲菜單數位化助理。請讀取照片中清楚可見的菜單內容，輸出繁體中文結構化資料。
規則：
1. 只能抄錄照片中看得到的品名、價格、分類、說明與加購／尺寸／口味選項，絕對不可自行創造。
2. 台幣價格輸出整數。價格看不清或沒有標示時填 0，並在 warnings 寫出品名與原因。
3. 保留套餐、尺寸、甜度、冰量、加料等變體；無法判斷是否必選時設 required=false、min=0。
4. 不推測過敏原、食材來源、促銷或庫存。沒有說明、標章時輸出空字串。
5. 相同品項不要重複。若照片模糊、裁切或反光，請在 warnings 明確提醒店家。
6. 只輸出 JSON 物件：{"items":[{"name":"","price":0,"category":"","description":"","badge":"","optionGroups":[{"name":"","required":false,"min":0,"max":1,"options":[{"name":"","price":0}]}]}],"warnings":[]}。所有欄位都必須存在。` }],
      config: { responseMimeType: "application/json" },
    });
    const raw = JSON.parse(response.text || "{}");
    const normalized = normalizeAiMenu(raw);
    if (!normalized.products.length) return json({ error: "照片中沒有辨識到可用的菜單品項，請重新拍攝完整且清楚的菜單" }, 422);
    return json({ ...normalized, model: MODEL });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    console.error("AI menu extraction failed", message.slice(0, 300));
    return json({ error: "AI 暫時無法辨識菜單，請確認照片清楚或稍後再試" }, 502);
  }
};

export const config: Config = { path: "/api/ai-menu" };
