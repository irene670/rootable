import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { ensureStoreSchema } from "../../../db/stores";
import { storeRecords } from "../../../db/schema";
import { createSeedStore } from "../../../platform/seed";
import type { MenuProduct, StoreProfile, StoreRecord, StoreVersion } from "../../../platform/types";

const cleanSlug = (value: string) => value.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").slice(0, 32);

async function findStore(slug: string) {
  await ensureStoreSchema();
  const db = getDb();
  const [row] = await db.select().from(storeRecords).where(eq(storeRecords.slug, slug));
  if (row) return JSON.parse(row.payload) as StoreRecord;
  if (slug !== "senri") return null;
  const seed = createSeedStore();
  await db.insert(storeRecords).values({ storeId: seed.storeId, slug: seed.slug, payload: JSON.stringify(seed), updatedAt: seed.updatedAt }).onConflictDoNothing();
  return seed;
}

async function persistStore(store: StoreRecord) {
  const db = getDb();
  await db.insert(storeRecords).values({ storeId: store.storeId, slug: store.slug, payload: JSON.stringify(store), updatedAt: store.updatedAt }).onConflictDoUpdate({
    target: storeRecords.slug,
    set: { storeId: store.storeId, payload: JSON.stringify(store), updatedAt: store.updatedAt },
  });
}

export async function GET(request: Request) {
  const slug = cleanSlug(new URL(request.url).searchParams.get("slug") || "senri");
  try {
    const store = await findStore(slug);
    return store ? Response.json({ store }) : Response.json({ error: "找不到店家" }, { status: 404 });
  } catch (error) {
    if (slug === "senri") return Response.json({ store: createSeedStore(), source: "demo-fallback" });
    return Response.json({ error: error instanceof Error ? error.message : "店家服務暫時無法使用" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as { slug?: string; name?: string; ownerName?: string; phone?: string };
    const slug = cleanSlug(payload.slug || "");
    if (slug.length < 3 || !payload.name?.trim() || !payload.ownerName?.trim()) return Response.json({ error: "請填寫店名、網址前綴與負責人" }, { status: 400 });
    if (await findStore(slug)) return Response.json({ error: "這個網址前綴已被使用" }, { status: 409 });
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
    const products = seed.products.slice(0, 3);
    const store: StoreRecord = {
      ...seed,
      storeId,
      slug,
      ownerName: payload.ownerName.trim().slice(0, 30),
      staff: [{ id: crypto.randomUUID(), name: payload.ownerName.trim().slice(0, 30), role: "owner" }],
      profile,
      products,
      draftProfile: structuredClone(profile),
      draftProducts: structuredClone(products),
      versions: [],
      updatedAt: new Date().toISOString(),
    };
    await persistStore(store);
    return Response.json({ store }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "建立店家失敗" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = await request.json() as {
      slug?: string;
      action?: "save_draft" | "publish" | "restore" | "add_staff";
      profile?: StoreProfile;
      products?: MenuProduct[];
      versionId?: string;
      staffName?: string;
    };
    const slug = cleanSlug(payload.slug || "");
    if (!slug) return Response.json({ error: "缺少店家網址" }, { status: 400 });
    const current = await findStore(slug);
    if (!current) return Response.json({ error: "找不到店家" }, { status: 404 });
    let next: StoreRecord = { ...current, updatedAt: new Date().toISOString() };

    if (payload.action === "save_draft") {
      next = { ...next, draftProfile: payload.profile || current.draftProfile, draftProducts: payload.products || current.draftProducts };
    } else if (payload.action === "publish") {
      const version: StoreVersion = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), profile: current.profile, products: current.products };
      next = { ...next, profile: payload.profile || current.draftProfile, products: payload.products || current.draftProducts, draftProfile: payload.profile || current.draftProfile, draftProducts: payload.products || current.draftProducts, versions: [version, ...current.versions].slice(0, 8) };
    } else if (payload.action === "restore") {
      const version = current.versions.find((item) => item.id === payload.versionId);
      if (!version) return Response.json({ error: "找不到這個版本" }, { status: 404 });
      next = { ...next, draftProfile: version.profile, draftProducts: version.products };
    } else if (payload.action === "add_staff") {
      if (!payload.staffName?.trim()) return Response.json({ error: "請輸入員工名稱" }, { status: 400 });
      next = { ...next, staff: [...current.staff, { id: crypto.randomUUID(), name: payload.staffName.trim().slice(0, 30), role: "staff" }] };
    } else {
      return Response.json({ error: "操作不正確" }, { status: 400 });
    }
    await persistStore(next);
    return Response.json({ store: next });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "更新店家失敗" }, { status: 500 });
  }
}
