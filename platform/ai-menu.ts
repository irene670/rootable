import type { MenuProduct, ProductOptionGroup } from "./types";

type UnknownRecord = Record<string, unknown>;
export type ImageBox = [number, number, number, number];
export type AiMenuProduct = MenuProduct & { sourceImageBox?: ImageBox };
export type ImageCropPlan = {
  sourceX: number;
  sourceY: number;
  sourceWidth: number;
  sourceHeight: number;
  outputWidth: number;
  outputHeight: number;
  paddingRatio: number;
  warnings: string[];
};
export type ImageQualityInput = {
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  width?: number;
  height?: number;
};

const cropDefaults = { paddingRatio: 0.1, targetWidth: 1200, targetHeight: 900 };

const text = (value: unknown, fallback = "") => typeof value === "string" ? value.trim().slice(0, 160) : fallback;
const money = (value: unknown) => {
  const numeric = typeof value === "number" ? value : Number(String(value ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(numeric) ? Math.max(0, Math.min(100_000, Math.round(numeric))) : 0;
};
const imageBox = (value: unknown): ImageBox | undefined => {
  if (!Array.isArray(value) || value.length !== 4) return undefined;
  const box = value.map((coordinate) => Math.max(0, Math.min(1000, Math.round(Number(coordinate))))) as ImageBox;
  const [yMin, xMin, yMax, xMax] = box;
  if (![...box].every(Number.isFinite) || yMax - yMin < 40 || xMax - xMin < 40) return undefined;
  return box;
};
const finiteSize = (value: unknown) => Number.isFinite(Number(value)) ? Math.max(1, Math.round(Number(value))) : 0;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const fitRange = (start: number, size: number, total: number) => {
  const fittedSize = Math.min(size, total);
  return clamp(start, 0, Math.max(0, total - fittedSize));
};

export function getAiMenuImageQualityWarnings(input: ImageQualityInput) {
  const width = finiteSize(input.width);
  const height = finiteSize(input.height);
  const fileName = input.fileName || "";
  const warnings: string[] = [];
  if (width && height) {
    const shortEdge = Math.min(width, height);
    const longEdge = Math.max(width, height);
    if (shortEdge < 900 || longEdge < 1400) warnings.push("原始菜單照片解析度偏低，AI 可能看不清小字；辨識後請逐項校對。");
    const aspectRatio = longEdge / shortEdge;
    if (aspectRatio > 2.4) warnings.push("菜單照片比例很長或很窄，可能只拍到部分版面；請確認是否漏掉品項。");
  }
  if (/screenshot|screen\s?shot|截圖|螢幕|畫面/i.test(fileName) || input.mimeType === "image/png") {
    warnings.push("若來源是截圖、外送後台或社群圖片，價格與照片可能已被壓縮或裁掉，匯入前請用原菜單逐項核對。");
  }
  if (input.fileSize && input.fileSize < 220_000) warnings.push("圖片檔案偏小，可能是轉傳壓縮圖；照片與價格請特別確認。");
  return warnings;
}

export function createMenuImageCropPlan(sourceWidth: number, sourceHeight: number, box: ImageBox, options: Partial<typeof cropDefaults> = {}): ImageCropPlan {
  const width = finiteSize(sourceWidth);
  const height = finiteSize(sourceHeight);
  const paddingRatio = clamp(options.paddingRatio ?? cropDefaults.paddingRatio, 0.08, 0.12);
  const targetWidth = finiteSize(options.targetWidth ?? cropDefaults.targetWidth) || cropDefaults.targetWidth;
  const targetHeight = finiteSize(options.targetHeight ?? cropDefaults.targetHeight) || cropDefaults.targetHeight;
  if (!width || !height) return { sourceX: 0, sourceY: 0, sourceWidth: 1, sourceHeight: 1, outputWidth: targetWidth, outputHeight: targetHeight, paddingRatio, warnings: ["原始照片尺寸無法確認，餐點照片請人工檢查。"] };

  const [yMin, xMin, yMax, xMax] = box;
  const left = clamp((xMin / 1000) * width, 0, width);
  const top = clamp((yMin / 1000) * height, 0, height);
  const right = clamp((xMax / 1000) * width, left + 1, width);
  const bottom = clamp((yMax / 1000) * height, top + 1, height);
  const boxWidth = Math.max(1, right - left);
  const boxHeight = Math.max(1, bottom - top);
  const centerX = left + boxWidth / 2;
  const centerY = top + boxHeight / 2;
  const targetAspect = targetWidth / targetHeight;

  let cropWidth = boxWidth * (1 + paddingRatio * 2);
  let cropHeight = boxHeight * (1 + paddingRatio * 2);
  if (cropWidth / cropHeight < targetAspect) cropWidth = cropHeight * targetAspect;
  else cropHeight = cropWidth / targetAspect;
  const unclampedX = centerX - cropWidth / 2;
  const unclampedY = centerY - cropHeight / 2;
  const sourceX = fitRange(unclampedX, cropWidth, width);
  const sourceY = fitRange(unclampedY, cropHeight, height);
  const sourceCropWidth = Math.max(1, Math.min(cropWidth, width));
  const sourceCropHeight = Math.max(1, Math.min(cropHeight, height));
  const outputCanReachTarget = sourceCropWidth >= targetWidth * 0.75 && sourceCropHeight >= targetHeight * 0.75;
  const warnings: string[] = [];
  if (!outputCanReachTarget) warnings.push("餐點照片原始區塊偏小，系統會保留可用解析度；請檢查成品是否清楚。");
  const roundedSourceX = Math.floor(sourceX);
  const roundedSourceY = Math.floor(sourceY);
  const roundedSourceWidth = Math.max(1, Math.min(width - roundedSourceX, Math.ceil(sourceX + sourceCropWidth) - roundedSourceX));
  const roundedSourceHeight = Math.max(1, Math.min(height - roundedSourceY, Math.ceil(sourceY + sourceCropHeight) - roundedSourceY));

  return {
    sourceX: roundedSourceX,
    sourceY: roundedSourceY,
    sourceWidth: roundedSourceWidth,
    sourceHeight: roundedSourceHeight,
    outputWidth: outputCanReachTarget ? targetWidth : Math.round(sourceCropWidth),
    outputHeight: outputCanReachTarget ? targetHeight : Math.round(sourceCropHeight),
    paddingRatio,
    warnings,
  };
}

function normalizeOptionGroups(value: unknown): ProductOptionGroup[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).flatMap((raw, groupIndex) => {
    if (!raw || typeof raw !== "object") return [];
    const group = raw as UnknownRecord;
    const options = Array.isArray(group.options) ? group.options.slice(0, 20).flatMap((rawOption, optionIndex) => {
      if (!rawOption || typeof rawOption !== "object") return [];
      const option = rawOption as UnknownRecord;
      const name = text(option.name);
      return name ? [{ id: `ai-option-${groupIndex}-${optionIndex}-${crypto.randomUUID()}`, name, price: money(option.price) }] : [];
    }) : [];
    const name = text(group.name);
    if (!name || !options.length) return [];
    const required = Boolean(group.required);
    const rawMin = Math.max(0, Math.round(Number(group.min) || (required ? 1 : 0)));
    const rawMax = Math.max(1, Math.round(Number(group.max) || 1));
    const max = Math.min(options.length, rawMax);
    const min = Math.min(max, rawMin);
    return [{ id: `ai-group-${groupIndex}-${crypto.randomUUID()}`, name, required: required || min > 0, min, max, options }];
  });
}

export function normalizeAiMenu(payload: unknown): { products: AiMenuProduct[]; warnings: string[] } {
  const record = payload && typeof payload === "object" ? payload as UnknownRecord : {};
  const sourceItems = Array.isArray(record.items) ? record.items : [];
  const warnings = Array.isArray(record.warnings) ? record.warnings.map((item) => text(item)).filter(Boolean).slice(0, 20) : [];
  const products = sourceItems.slice(0, 60).flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as UnknownRecord;
    const name = text(item.name);
    if (!name) return [];
    const price = money(item.price);
    const sourceImageBox = imageBox(item.imageBox);
    if (!price) warnings.push(`${name} 的價格無法確認，請店家補上。`);
    if (!sourceImageBox) warnings.push(`${name} 沒有找到可對應的餐點照片，將標記為照片待補。`);
    return [{
      id: `ai-${crypto.randomUUID()}`,
      name,
      description: text(item.description, "請店家補上餐點介紹"),
      price,
      category: text(item.category, "未分類"),
      image: "",
      imageAlt: name,
      badge: text(item.badge) || undefined,
      sourceImageBox,
      optionGroups: normalizeOptionGroups(item.optionGroups),
    }];
  });
  return { products, warnings: Array.from(new Set(warnings)) };
}
