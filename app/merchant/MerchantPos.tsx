"use client";

/* eslint-disable @next/next/no-img-element -- Menu images may be merchant-hosted URLs and must stay runtime-configurable. */

import { useMemo, useState } from "react";
import type { MenuProduct, ProductOptionGroup } from "../../platform/types";

type PosOrderMode = "dine_in" | "takeout";
type PosPayment = "cash" | "line_pay" | "apple_pay";
type Selection = Record<string, string[]>;
type PosCartLine = {
  id: string;
  productId: string;
  productName: string;
  optionLabel: string;
  quantity: number;
  unitPrice: number;
};

type MerchantPosProps = {
  storeId: string;
  products: MenuProduct[];
  onCreated: (orderNo: string, destination: string) => void;
  onError: (message: string) => void;
};

const tables = ["A01", "A02", "A03", "A04", "A05", "A06", "B01", "B02"];
const money = (value: number) => `NT$ ${value.toLocaleString("zh-TW")}`;

const initialSelections = (product: MenuProduct): Selection => Object.fromEntries(
  product.optionGroups.map((group) => {
    const firstAvailable = group.options.find((option) => !option.soldOut);
    return [group.id, group.required && firstAvailable ? [firstAvailable.id] : []];
  }),
);

const optionLabel = (product: MenuProduct, selections: Selection) => product.optionGroups
  .flatMap((group) => group.options.filter((option) => selections[group.id]?.includes(option.id)).map((option) => option.name))
  .join("・");

const optionAmount = (product: MenuProduct, selections: Selection) => product.optionGroups
  .flatMap((group) => group.options)
  .filter((option) => Object.values(selections).flat().includes(option.id))
  .reduce((sum, option) => sum + option.price, 0);

export default function MerchantPos({ storeId, products, onCreated, onError }: MerchantPosProps) {
  const categories = useMemo(() => ["全部", ...Array.from(new Set(products.map((product) => product.category)))], [products]);
  const [category, setCategory] = useState("全部");
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<PosOrderMode>("dine_in");
  const [tableNo, setTableNo] = useState("A01");
  const [takeoutName, setTakeoutName] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [note, setNote] = useState("");
  const [payment, setPayment] = useState<PosPayment>("cash");
  const [cart, setCart] = useState<PosCartLine[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<MenuProduct | null>(null);
  const [selections, setSelections] = useState<Selection>({});
  const [quantity, setQuantity] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const filteredProducts = products.filter((product) => {
    const keyword = search.trim().toLowerCase();
    return (category === "全部" || product.category === category)
      && (!keyword || `${product.name}${product.description}${product.category}`.toLowerCase().includes(keyword));
  });
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const selectedUnitPrice = selectedProduct ? selectedProduct.price + optionAmount(selectedProduct, selections) : 0;
  const validSelection = selectedProduct ? selectedProduct.optionGroups.every((group) => {
    const count = selections[group.id]?.length || 0;
    return count >= group.min && count <= group.max;
  }) : false;

  const openProduct = (product: MenuProduct) => {
    if (product.soldOut) return;
    if (!product.optionGroups.length) {
      addLine(product, {}, 1);
      return;
    }
    setSelectedProduct(product);
    setSelections(initialSelections(product));
    setQuantity(1);
  };

  const toggleOption = (group: ProductOptionGroup, optionId: string) => {
    const current = selections[group.id] || [];
    const selected = current.includes(optionId);
    let next: string[];
    if (group.max === 1) next = selected && !group.required ? [] : [optionId];
    else if (selected) next = current.filter((id) => id !== optionId);
    else next = current.length < group.max ? [...current, optionId] : current;
    setSelections({ ...selections, [group.id]: next });
  };

  const addLine = (product: MenuProduct, chosen: Selection, count: number) => {
    const label = optionLabel(product, chosen);
    const unitPrice = product.price + optionAmount(product, chosen);
    const id = `${product.id}:${Object.entries(chosen).flatMap(([groupId, ids]) => ids.map((optionId) => `${groupId}-${optionId}`)).sort().join("|") || "base"}`;
    setCart((current) => {
      const existing = current.find((item) => item.id === id);
      if (existing) return current.map((item) => item.id === id ? { ...item, quantity: item.quantity + count } : item);
      return [...current, { id, productId: product.id, productName: product.name, optionLabel: label, quantity: count, unitPrice }];
    });
    setSelectedProduct(null);
  };

  const changeQuantity = (id: string, delta: number) => setCart((current) => current
    .map((item) => item.id === id ? { ...item, quantity: item.quantity + delta } : item)
    .filter((item) => item.quantity > 0));

  const submitOrder = async () => {
    const destination = mode === "dine_in" ? tableNo : `外帶-${takeoutName.trim() || "現場客"}`;
    if (!cart.length) { setError("請先加入至少一項餐點"); return; }
    if (mode === "dine_in" && !tableNo) { setError("請選擇桌號"); return; }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          tableNo: destination,
          paymentMethod: payment === "cash" ? "cash" : "rootable_pay",
          paymentChannel: payment,
          orderSource: "merchant_pos",
          customerNote: `櫃台手動開單・${mode === "dine_in" ? `${partySize} 位` : "外帶"}${note.trim() ? `｜${note.trim()}` : ""}`,
          items: cart.map((item) => ({
            productId: item.productId,
            productName: item.optionLabel ? `${item.productName}（${item.optionLabel}）` : item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        }),
      });
      const result = await response.json() as { order?: { id: string; orderNo: string }; error?: string };
      if (!response.ok || !result.order) throw new Error(result.error || "建立訂單失敗");
      if (payment === "cash") {
        const paidResponse = await fetch("/api/orders", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: result.order.id, storeId, paymentStatus: "paid" }),
        });
        const paidResult = await paidResponse.json() as { error?: string };
        if (!paidResponse.ok) throw new Error(paidResult.error || "訂單已建立，但收現確認失敗；請到待收現區確認");
      }
      setCart([]);
      setNote("");
      setTakeoutName("");
      onCreated(result.order.orderNo, destination);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "建立訂單失敗";
      setError(message);
      onError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="pos-workspace" aria-label="櫃台手動開單">
      <aside className="pos-order-context">
        <div className="pos-mode-switch" role="group" aria-label="訂單類型">
          <button className={mode === "dine_in" ? "active" : ""} onClick={() => setMode("dine_in")} aria-pressed={mode === "dine_in"}>內用</button>
          <button className={mode === "takeout" ? "active" : ""} onClick={() => setMode("takeout")} aria-pressed={mode === "takeout"}>外帶</button>
        </div>
        {mode === "dine_in" ? <>
          <div className="pos-panel-heading"><span>01</span><div><b>選擇桌位</b><small>開單後直接送入接單工作台</small></div></div>
          <div className="pos-table-grid">{tables.map((table) => <button className={tableNo === table ? "active" : ""} onClick={() => setTableNo(table)} aria-pressed={tableNo === table} key={table}>{table}</button>)}</div>
          <div className="pos-field"><span>用餐人數</span><div className="pos-party-stepper"><button onClick={() => setPartySize((value) => Math.max(1, value - 1))} aria-label="減少一位">−</button><strong>{partySize} 位</strong><button onClick={() => setPartySize((value) => Math.min(20, value + 1))} aria-label="增加一位">＋</button></div></div>
        </> : <>
          <div className="pos-panel-heading"><span>01</span><div><b>外帶資料</b><small>姓名可留空，系統會標示現場客</small></div></div>
          <label className="pos-field">取餐姓名<input value={takeoutName} onChange={(event) => setTakeoutName(event.target.value)} placeholder="例如：陳小姐" /></label>
        </>}
        <div className="pos-source-note"><b>櫃台直接客</b><span>現金 0%・Rootable Pay 3.9%</span></div>
      </aside>

      <section className="pos-menu-panel">
        <header className="pos-menu-header"><div><p>02 選擇餐點</p><h2>店內菜單</h2></div><label><span className="sr-only">搜尋餐點</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜尋品項、分類" /></label></header>
        <nav className="pos-category-tabs" aria-label="菜單分類">{categories.map((item) => <button className={category === item ? "active" : ""} onClick={() => setCategory(item)} aria-pressed={category === item} key={item}>{item}</button>)}</nav>
        <div className="pos-product-grid">
          {filteredProducts.map((product) => <button className="pos-product-card" onClick={() => openProduct(product)} disabled={product.soldOut} key={product.id}>
            {product.image ? <img src={product.image} alt={product.imageAlt} loading="lazy" /> : <span className="pos-image-placeholder">照片待補</span>}
            <span className="pos-product-copy"><b>{product.name}</b><small>{product.optionGroups.length ? `${product.optionGroups.length} 組規格` : product.category}</small><strong>{money(product.price)}</strong></span>
            <i>{product.soldOut ? "停售" : "加入"}</i>
          </button>)}
          {!filteredProducts.length && <div className="pos-empty"><b>找不到符合的餐點</b><button onClick={() => { setSearch(""); setCategory("全部"); }}>清除搜尋</button></div>}
        </div>
      </section>

      <aside className="pos-cart-panel">
        <header><div><p>03 確認訂單</p><h2>{mode === "dine_in" ? tableNo : "外帶"}</h2></div><b>{itemCount} 份</b></header>
        <div className="pos-cart-lines">
          {cart.length ? cart.map((item) => <article key={item.id}><div><b>{item.productName}</b>{item.optionLabel && <small>{item.optionLabel}</small>}<strong>{money(item.unitPrice * item.quantity)}</strong></div><div className="pos-line-stepper"><button onClick={() => changeQuantity(item.id, -1)} aria-label={`減少${item.productName}`}>−</button><span>{item.quantity}</span><button onClick={() => changeQuantity(item.id, 1)} aria-label={`增加${item.productName}`}>＋</button></div></article>) : <div className="pos-cart-empty"><b>尚未加入餐點</b><span>從中間菜單點選餐點，訂單會出現在這裡。</span></div>}
        </div>
        <label className="pos-note-field">訂單備註<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={120} placeholder="例如：趕時間、餐點一起上" /><small>{note.length}/120</small></label>
        <fieldset className="pos-payment"><legend>付款方式</legend>
          <button className={payment === "cash" ? "selected" : ""} onClick={() => setPayment("cash")} aria-pressed={payment === "cash"}><span /><div><b>現金已收</b><small>確認後直接送入廚房</small></div><strong>0%</strong></button>
          <button className={payment === "line_pay" ? "selected" : ""} onClick={() => setPayment("line_pay")} aria-pressed={payment === "line_pay"}><span /><div><b>LINE Pay</b><small>Demo 模擬付款成功</small></div><strong>3.9%</strong></button>
          <button className={payment === "apple_pay" ? "selected" : ""} onClick={() => setPayment("apple_pay")} aria-pressed={payment === "apple_pay"}><span /><div><b>Apple Pay</b><small>Demo 模擬付款成功</small></div><strong>3.9%</strong></button>
        </fieldset>
        {error && <p className="pos-error" role="alert">{error}</p>}
        <footer className="pos-cart-footer"><div><span>合計・{itemCount} 份</span><strong>{money(subtotal)}</strong></div><button onClick={() => void submitOrder()} disabled={!cart.length || saving}>{saving ? "正在建立訂單…" : payment === "cash" ? "收現並送單" : "模擬付款並送單"}</button></footer>
      </aside>

      {selectedProduct && <div className="pos-option-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedProduct(null); }}>
        <section className="pos-option-sheet" role="dialog" aria-modal="true" aria-labelledby="pos-option-title">
          <header><div><p>{selectedProduct.category}</p><h2 id="pos-option-title">{selectedProduct.name}</h2><strong>{money(selectedProduct.price)}</strong></div><button onClick={() => setSelectedProduct(null)} aria-label="關閉餐點規格">關閉</button></header>
          {selectedProduct.optionGroups.map((group) => <fieldset key={group.id}><legend><span><b>{group.name}</b><small>{group.max > 1 ? `最多選 ${group.max} 項` : "選擇 1 項"}</small></span><em>{group.required ? "必選" : "選填"}</em></legend>{group.options.map((option) => {
            const active = selections[group.id]?.includes(option.id);
            return <button className={active ? "selected" : ""} onClick={() => toggleOption(group, option.id)} disabled={option.soldOut} aria-pressed={active} key={option.id}><span className={group.max > 1 ? "check" : "radio"} /><b>{option.name}{option.soldOut ? "・已售完" : ""}</b><strong>{option.price ? `＋${money(option.price)}` : "不加價"}</strong></button>;
          })}</fieldset>)}
          <footer><div className="pos-option-stepper"><button onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="減少數量">−</button><strong>{quantity}</strong><button onClick={() => setQuantity((value) => Math.min(20, value + 1))} aria-label="增加數量">＋</button></div><button className="pos-add-option" onClick={() => addLine(selectedProduct, selections, quantity)} disabled={!validSelection}>加入 {quantity} 份・{money(selectedUnitPrice * quantity)}</button></footer>
        </section>
      </div>}
    </section>
  );
}
