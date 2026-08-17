import type { MenuProduct, ProductOptionGroup } from "./types";

type UnknownRecord = Record<string, unknown>;

const text = (value: unknown, fallback = "") => typeof value === "string" ? value.trim().slice(0, 160) : fallback;
const money = (value: unknown) => {
  const numeric = typeof value === "number" ? value : Number(String(value ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(numeric) ? Math.max(0, Math.min(100_000, Math.round(numeric))) : 0;
};

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

export function normalizeAiMenu(payload: unknown): { products: MenuProduct[]; warnings: string[] } {
  const record = payload && typeof payload === "object" ? payload as UnknownRecord : {};
  const sourceItems = Array.isArray(record.items) ? record.items : [];
  const warnings = Array.isArray(record.warnings) ? record.warnings.map((item) => text(item)).filter(Boolean).slice(0, 20) : [];
  const products = sourceItems.slice(0, 60).flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as UnknownRecord;
    const name = text(item.name);
    if (!name) return [];
    const price = money(item.price);
    if (!price) warnings.push(`${name} 的價格無法確認，請店家補上。`);
    return [{
      id: `ai-${crypto.randomUUID()}`,
      name,
      description: text(item.description, "請店家補上餐點介紹"),
      price,
      category: text(item.category, "未分類"),
      image: "/menu/rice-bowl.jpg",
      imageAlt: name,
      badge: text(item.badge) || undefined,
      optionGroups: normalizeOptionGroups(item.optionGroups),
    }];
  });
  return { products, warnings: Array.from(new Set(warnings)) };
}

