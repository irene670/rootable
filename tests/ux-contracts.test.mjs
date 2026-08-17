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
  assert.match(source, /店內付款/);
  assert.match(source, /window\.scrollTo\(\{ top: 0/);
  assert.doesNotMatch(source, /href="\/s\/senri"/);
  assert.doesNotMatch(source, /<b>⌑<\/b>|<b>▣<\/b>|<b>▤<\/b>/);
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
