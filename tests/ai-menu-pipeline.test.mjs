import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function importAiMenuModule() {
  const source = await readFile(new URL("../platform/ai-menu.ts", import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
}

function assertCropContainsBox(plan, sourceWidth, sourceHeight, box) {
  const [yMin, xMin, yMax, xMax] = box;
  const left = (xMin / 1000) * sourceWidth;
  const top = (yMin / 1000) * sourceHeight;
  const right = (xMax / 1000) * sourceWidth;
  const bottom = (yMax / 1000) * sourceHeight;
  assert.ok(plan.sourceX <= left);
  assert.ok(plan.sourceY <= top);
  assert.ok(plan.sourceX + plan.sourceWidth >= right);
  assert.ok(plan.sourceY + plan.sourceHeight >= bottom);
}

test("plans AI menu crops from normalized boxes with 10 percent padding and 1200x900 output", async () => {
  const { createMenuImageCropPlan } = await importAiMenuModule();
  const box = [250, 300, 650, 700];
  const plan = createMenuImageCropPlan(4000, 3000, box);
  assert.equal(plan.paddingRatio, 0.1);
  assert.equal(plan.outputWidth, 1200);
  assert.equal(plan.outputHeight, 900);
  assert.ok(plan.sourceWidth > 1600);
  assert.ok(plan.sourceHeight > 1200);
  assert.ok(Math.abs(plan.sourceWidth / plan.sourceHeight - 4 / 3) < 0.01);
  assertCropContainsBox(plan, 4000, 3000, box);
});

test("keeps edge crops inside the source image without clipping the detected dish box", async () => {
  const { createMenuImageCropPlan } = await importAiMenuModule();
  const box = [20, 0, 180, 80];
  const plan = createMenuImageCropPlan(4000, 3000, box);
  assert.equal(plan.sourceX, 0);
  assert.ok(plan.sourceY >= 0);
  assert.ok(plan.sourceX + plan.sourceWidth <= 4000);
  assert.ok(plan.sourceY + plan.sourceHeight <= 3000);
  assertCropContainsBox(plan, 4000, 3000, box);
});

test("returns a lower-resolution crop plan with a review warning when the source crop is too small", async () => {
  const { createMenuImageCropPlan } = await importAiMenuModule();
  const plan = createMenuImageCropPlan(800, 600, [100, 100, 500, 500]);
  assert.ok(plan.outputWidth < 1200);
  assert.ok(plan.outputHeight < 900);
  assert.match(plan.warnings.join("\n"), /原始區塊偏小/);
});

test("flags likely screenshot or compressed menu sources for merchant review", async () => {
  const { getAiMenuImageQualityWarnings } = await importAiMenuModule();
  const warnings = getAiMenuImageQualityWarnings({
    fileName: "ubereats-screenshot.png",
    fileSize: 180_000,
    mimeType: "image/png",
    width: 860,
    height: 640,
  });
  assert.ok(warnings.some((warning) => warning.includes("解析度偏低")));
  assert.ok(warnings.some((warning) => warning.includes("截圖")));
  assert.ok(warnings.some((warning) => warning.includes("轉傳壓縮圖")));
});

test("normalizes AI menu boxes and records missing-price review warnings", async () => {
  const { normalizeAiMenu } = await importAiMenuModule();
  const normalized = normalizeAiMenu({
    items: [{
      name: "唐揚雞咖哩",
      price: "",
      category: "咖哩",
      description: "",
      badge: "",
      imageBox: [-20, 220, 1180, 760],
      optionGroups: [],
    }],
    warnings: [],
  });
  assert.equal(normalized.products.length, 1);
  assert.deepEqual(normalized.products[0].sourceImageBox, [0, 220, 1000, 760]);
  assert.ok(normalized.warnings.some((warning) => warning.includes("價格無法確認")));
});
