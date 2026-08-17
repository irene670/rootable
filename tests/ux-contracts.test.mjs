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
