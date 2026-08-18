import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const storefrontUrl = new URL("../app/storefront/StorefrontClient.tsx", import.meta.url);

test("customer ordering keeps real-data loading, menu fallback, and cart safeguards", async () => {
  const source = await readFile(storefrontUrl, "utf8");
  assert.match(source, /StoreRecord \| null/);
  assert.match(source, /recommendedProducts\(store\.products\)/);
  assert.match(source, /rootable-cart-/);
  assert.match(source, /tenant-remove-line/);
  assert.match(source, /餐前付款/);
  assert.match(source, /window\.scrollTo\(\{ top: 0/);
  assert.match(source, /setStore\(createSeedStore\(\)\)/);
  assert.match(source, /uber-menu-page/);
  assert.match(source, /團體點餐/);
  assert.match(source, /登入 LINE 並加入熟客/);
  assert.doesNotMatch(source, /function ScanStoreLanding/);
  assert.doesNotMatch(source, /function IdentityGate/);
  assert.match(source, /登入 LINE 並加入熟客/);
  assert.doesNotMatch(source, /href="\/s\/senri"/);
  assert.doesNotMatch(source, /<b>⌑<\/b>|<b>▣<\/b>|<b>▤<\/b>/);
});

test("D1 storefront profiles remain durable and the seeded demo remains recoverable", async () => {
  const [route, schema, storeSchema] = await Promise.all([
    readFile(new URL("../app/api/stores/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/stores.ts", import.meta.url), "utf8"),
  ]);
  assert.match(route, /export async function GET/);
  assert.match(route, /export async function POST/);
  assert.match(route, /export async function PATCH/);
  assert.match(route, /source: "demo-fallback"/);
  assert.match(route, /onConflictDoUpdate/);
  assert.match(schema, /storeRecords/);
  assert.match(storeSchema, /CREATE TABLE IF NOT EXISTS store_records/);
});

test("AI menu and merchant draft workflows preserve review and publishing boundaries", async () => {
  const [aiMenu, importer, merchant] = await Promise.all([
    readFile(new URL("../platform/ai-menu.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/merchant/AiMenuImporter.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/merchant/MerchantStudioClient.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(aiMenu, /paddingRatio: 0\.1/);
  assert.match(aiMenu, /targetWidth: 1200, targetHeight: 900/);
  assert.match(importer, /imageBlobFromBox\(file, product\.sourceImageBox\)/);
  assert.match(importer, /待校對/);
  assert.match(merchant, /草稿已儲存・尚未發布/);
  assert.match(merchant, /window\.setTimeout\(async \(\) =>/);
  assert.match(merchant, /previewOrdering=/);
  assert.match(merchant, /確定要從草稿移除/);
});

test("pricing keeps direct orders separate from marketplace-attributed orders", async () => {
  const [landing, studio, orders, storefront, orderApi] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/merchant/MerchantStudioClient.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/merchant/MerchantClient.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/storefront/StorefrontClient.tsx", import.meta.url), "utf8"),
    readFile(new URL("../netlify/functions/orders.ts", import.meta.url), "utf8"),
  ]);
  for (const source of [landing, studio]) {
    assert.match(source, /店內直客/);
    assert.match(source, /3\.9%/);
    assert.match(source, /15%/);
    assert.match(source, /不再另外加(?:收)? 3\.9%/);
  }
  assert.match(orders, /直客歸因/);
  assert.match(orders, /森藏導流訂單/);
  assert.match(storefront, /params\.get\("source"\) === "marketplace"/);
  assert.match(storefront, /orderSource,/);
  assert.match(orderApi, /orderSource === "rootable_marketplace" \? 0\.15/);
  assert.match(orderApi, /feeRate/);
});

test("cash orders are gated before kitchen and split serving is tracked per item", async () => {
  const [merchant, d1Orders, netlifyOrders, storefront, legacyMenu] = await Promise.all([
    readFile(new URL("../app/merchant/MerchantClient.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/orders/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../netlify/functions/orders.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/storefront/StorefrontClient.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/menu/MenuClient.tsx", import.meta.url), "utf8"),
  ]);
  for (const api of [d1Orders, netlifyOrders]) {
    assert.match(api, /awaiting_payment/);
    assert.match(api, /servedQuantity/);
    assert.match(api, /訂單尚未付款，不能送入廚房/);
  }
  assert.match(d1Orders, /createdAt, updatedAt: createdAt/);
  assert.match(merchant, /櫃台待收現/);
  assert.match(merchant, /出餐 1 份/);
  assert.match(merchant, /下一桌/);
  assert.match(merchant, /quantity - \(item\.servedQuantity \?\? 0\)/);
  assert.match(storefront, /店員確認收款後，訂單才會送入廚房/);
  assert.match(legacyMenu, /店員確認收款後才開始備餐/);
});

test("merchant workbench includes a usable manual POS order flow", async () => {
  const [pos, merchant, orderApi] = await Promise.all([
    readFile(new URL("../app/merchant/MerchantPos.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/merchant/MerchantClient.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/orders/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(pos, /櫃台手動開單/);
  assert.match(pos, /orderSource: "merchant_pos"/);
  assert.match(pos, /initialTable/);
  assert.match(pos, /收現並送單/);
  assert.match(pos, /LINE Pay/);
  assert.match(pos, /optionGroups/);
  assert.match(merchant, /<MerchantPos/);
  assert.match(merchant, /即時桌況/);
  assert.match(merchant, /空桌點一下立即開單/);
  assert.match(merchant, /setPosTable\(table\.tableNo\)/);
  assert.match(orderApi, /isMerchantPos/);
});

test("group ordering uses durable shared sessions and a host-controlled combined checkout", async () => {
  const [storefront, groupApi, groupModel, netlifyConfig] = await Promise.all([
    readFile(new URL("../app/storefront/StorefrontClient.tsx", import.meta.url), "utf8"),
    readFile(new URL("../netlify/functions/group-orders.ts", import.meta.url), "utf8"),
    readFile(new URL("../platform/group-orders.ts", import.meta.url), "utf8"),
    readFile(new URL("../netlify.toml", import.meta.url), "utf8"),
  ]);
  assert.match(storefront, /團體點餐/);
  assert.match(storefront, /建立團體 QR Code/);
  assert.match(storefront, /api\.qrserver\.com/);
  assert.match(storefront, /掃描加入桌號/);
  assert.match(storefront, /我的用餐備註/);
  assert.match(storefront, /餐點備註/);
  assert.match(storefront, /update_member_note/);
  assert.match(storefront, /【\$\{item\.memberName\}】/);
  assert.match(storefront, /group-orders/);
  assert.match(storefront, /begin_checkout/);
  assert.match(storefront, /mark_submitted/);
  assert.match(groupApi, /只有發起人/);
  assert.match(groupApi, /rootable-group-orders/);
  assert.match(groupApi, /onlyIfMatch/);
  assert.match(groupApi, /findGroupMember/);
  assert.match(groupModel, /SHA-256/);
  assert.match(groupModel, /note: String\(item\.note/);
  assert.doesNotMatch(groupModel, /tokenHash: member\.tokenHash/);
  assert.match(netlifyConfig, /\/api\/group-orders/);
});
