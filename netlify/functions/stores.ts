import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";
import { createSeedStore } from "../../platform/seed";
import type { MenuProduct, StoreProfile, StoreRecord, StoreVersion } from "../../platform/types";

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const records = () => getStore({ name: "rootable-stores", consistency: "strong" });
const cleanSlug = (value: string) => value.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").slice(0, 32);

async function getRecord(slug: string) {
  const existing = await records().get(slug, { type: "json", consistency: "strong" }) as StoreRecord | null;
  if (existing) return existing;
  if (slug === "senri") return createSeedStore();
  return null;
}

async function createStore(request: Request) {
  const payload = await request.json() as { slug?: string; name?: string; ownerName?: string; phone?: string };
  const slug = cleanSlug(payload.slug || "");
  if (slug.length < 3 || !payload.name?.trim() || !payload.ownerName?.trim()) return json({ error: "請填寫店名、網址前綴與負責人" }, 400);
  if (await getRecord(slug)) return json({ error: "這個網址前綴已被使用" }, 409);
  const seed = createSeedStore();
  const storeId = `store-${crypto.randomUUID()}`;
  const profile: StoreProfile = {
    ...seed.profile,
    slug,
    storeId,
    name: payload.name.trim().slice(0, 40),
    phone: payload.phone?.trim().slice(0, 30) || "尚未設定",
    announcement: "新店開張，歡迎光臨！",
    story: "在店家後台編輯品牌故事，讓顧客更認識你。",
  };
  const record: StoreRecord = {
    ...seed,
    storeId,
    slug,
    ownerName: payload.ownerName.trim().slice(0, 30),
    staff: [{ id: crypto.randomUUID(), name: payload.ownerName.trim().slice(0, 30), role: "owner" }],
    profile,
    products: seed.products.slice(0, 3),
    draftProfile: structuredClone(profile),
    draftProducts: structuredClone(seed.products.slice(0, 3)),
    versions: [],
    updatedAt: new Date().toISOString(),
  };
  await records().setJSON(slug, record, { onlyIfNew: true });
  return json({ store: record }, 201);
}

async function updateStore(request: Request) {
  const payload = await request.json() as {
    slug?: string;
    action?: "save_draft" | "publish" | "restore" | "add_staff";
    profile?: StoreProfile;
    products?: MenuProduct[];
    versionId?: string;
    staffName?: string;
  };
  const slug = cleanSlug(payload.slug || "");
  if (!slug) return json({ error: "缺少店家網址" }, 400);
  const storage = records();
  const entry = await storage.getWithMetadata(slug, { type: "json", consistency: "strong" }) as { data: StoreRecord; etag: string } | null;
  const current = entry?.data || (slug === "senri" ? createSeedStore() : null);
  if (!current) return json({ error: "找不到店家" }, 404);
  let next: StoreRecord = { ...current, updatedAt: new Date().toISOString() };

  if (payload.action === "save_draft") {
    next = { ...next, draftProfile: payload.profile || current.draftProfile, draftProducts: payload.products || current.draftProducts };
  } else if (payload.action === "publish") {
    const version: StoreVersion = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), profile: current.profile, products: current.products };
    next = { ...next, profile: payload.profile || current.draftProfile, products: payload.products || current.draftProducts, draftProfile: payload.profile || current.draftProfile, draftProducts: payload.products || current.draftProducts, versions: [version, ...current.versions].slice(0, 8) };
  } else if (payload.action === "restore") {
    const version = current.versions.find((item) => item.id === payload.versionId);
    if (!version) return json({ error: "找不到這個版本" }, 404);
    next = { ...next, draftProfile: version.profile, draftProducts: version.products };
  } else if (payload.action === "add_staff") {
    if (!payload.staffName?.trim()) return json({ error: "請輸入員工名稱" }, 400);
    next = { ...next, staff: [...current.staff, { id: crypto.randomUUID(), name: payload.staffName.trim().slice(0, 30), role: "staff" }] };
  } else {
    return json({ error: "操作不正確" }, 400);
  }

  const result = entry
    ? await storage.setJSON(slug, next, { onlyIfMatch: entry.etag })
    : await storage.setJSON(slug, next, { onlyIfNew: true });
  if (!result.modified) return json({ error: "內容已被其他裝置更新，請重新整理" }, 409);
  return json({ store: next });
}

export default async (request: Request) => {
  try {
    if (request.method === "GET") {
      const slug = cleanSlug(new URL(request.url).searchParams.get("slug") || "senri");
      const store = await getRecord(slug);
      return store ? json({ store }) : json({ error: "找不到店家" }, 404);
    }
    if (request.method === "POST") return createStore(request);
    if (request.method === "PATCH") return updateStore(request);
    return json({ error: "不支援的請求方式" }, 405);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "店家服務暫時無法使用" }, 500);
  }
};

export const config: Config = { path: "/api/stores" };
