"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const products = [
  { id: "set-chicken", name: "森野炙燒雞腿定食", description: "每日蔬菜、味噌湯與小缽", price: 280, category: "主餐", art: "art-chicken", featured: true },
  { id: "set-tofu", name: "胡麻野菜豆腐定食", description: "季節蔬菜、胡麻醬與五穀飯", price: 250, category: "主餐", art: "art-tofu" },
  { id: "curry", name: "慢燉野菜咖哩", description: "十種蔬果熬煮，溫潤微辣", price: 240, category: "主餐", art: "art-curry" },
  { id: "coffee", name: "山霧手沖咖啡", description: "中淺焙，柑橘與黑糖香氣", price: 180, category: "飲品", art: "art-coffee" },
  { id: "latte", name: "栗香拿鐵", description: "自製栗子泥與雙份濃縮", price: 160, category: "飲品", art: "art-latte" },
  { id: "pudding", name: "焦糖昭和布丁", description: "雞蛋、鮮奶與微苦焦糖", price: 120, category: "甜點", art: "art-pudding" },
];

type Cart = Record<string, number>;
type PaymentMethod = "cash" | "rootable_pay";
type PaymentChannel = "cash" | "line_pay" | "apple_pay";
type CreatedOrder = { orderNo: string; tableNo: string; subtotal: number; paymentStatus: string };

export default function MenuClient() {
  const [category, setCategory] = useState("全部");
  const [cart, setCart] = useState<Cart>({});
  const [step, setStep] = useState<"menu" | "checkout" | "success">("menu");
  const [tableNo, setTableNo] = useState("A03");
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [paymentChannel, setPaymentChannel] = useState<PaymentChannel>("cash");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);

  const visibleProducts = category === "全部" ? products : products.filter((product) => product.category === category);
  const items = useMemo(() => products.filter((p) => cart[p.id]).map((p) => ({ ...p, quantity: cart[p.id] })), [cart]);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);

  const changeQuantity = (id: string, delta: number) => setCart((current) => {
    const next = Math.max(0, (current[id] || 0) + delta);
    const updated = { ...current, [id]: next };
    if (!next) delete updated[id];
    return updated;
  });

  const choosePayment = (method: PaymentMethod, channel: PaymentChannel) => {
    setPaymentMethod(method); setPaymentChannel(channel); setError("");
  };

  const submitOrder = async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: "senri-demo", tableNo, paymentMethod, paymentChannel, customerNote: note,
          items: items.map((item) => ({ productId: item.id, productName: item.name, quantity: item.quantity, unitPrice: item.price })),
        }),
      });
      const result = await response.json() as { order?: CreatedOrder; error?: string };
      if (!response.ok || !result.order) throw new Error(result.error || "訂單送出失敗");
      setCreatedOrder(result.order); setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "連線失敗，請再試一次");
    } finally { setLoading(false); }
  };

  if (step === "success" && createdOrder) {
    return (
      <main className="order-success-page">
        <section className="success-card" aria-live="polite">
          <div className="success-seal" aria-hidden="true">✓</div>
          <p className="eyebrow">訂單已送到店家平板</p>
          <h1>收到，我們開始準備了。</h1>
          <p className="success-number">取餐序號 <b>{createdOrder.orderNo}</b></p>
          <div className="success-meta">
            <span><small>桌號</small><b>{createdOrder.tableNo}</b></span>
            <span><small>金額</small><b>NT$ {createdOrder.subtotal}</b></span>
            <span><small>付款</small><b>{createdOrder.paymentStatus === "paid" ? "已完成（模擬）" : "現場付現"}</b></span>
          </div>
          <p className="demo-notice">這是試營運模擬付款，不會產生真實扣款。</p>
          <Link className="button button-primary" href="/merchant">到店家平板查看訂單</Link>
          <button className="text-button" onClick={() => { setCart({}); setStep("menu"); setCreatedOrder(null); }}>再下一筆訂單</button>
        </section>
      </main>
    );
  }

  if (step === "checkout") {
    return (
      <main className="checkout-page">
        <header className="mobile-topbar"><button className="back-button" onClick={() => setStep("menu")}>返回菜單</button><b>確認訂單</b><span /></header>
        <div className="checkout-layout">
          <section className="checkout-main">
            <div className="checkout-heading"><p className="eyebrow">森日小館</p><h1>選擇付款方式</h1><p>顧客不加價；代支付手續費由店家負擔。</p></div>
            <div className="field-group">
              <label htmlFor="tableNo">桌號或取餐名稱</label>
              <input id="tableNo" value={tableNo} onChange={(event) => setTableNo(event.target.value)} maxLength={12} />
            </div>
            <fieldset className="payment-options">
              <legend>付款方式</legend>
              <button className={`payment-option ${paymentMethod === "cash" ? "selected" : ""}`} onClick={() => choosePayment("cash", "cash")} aria-pressed={paymentMethod === "cash"}>
                <span><b>到店付現</b><small>下單後到櫃台支付現金</small></span><strong>0 元加價</strong>
              </button>
              <button className={`payment-option ${paymentChannel === "line_pay" ? "selected" : ""}`} onClick={() => choosePayment("rootable_pay", "line_pay")} aria-pressed={paymentChannel === "line_pay"}>
                <span><b>LINE Pay</b><small>Rootable 代支付・模擬流程</small></span><strong>立即付款</strong>
              </button>
              <button className={`payment-option ${paymentChannel === "apple_pay" ? "selected" : ""}`} onClick={() => choosePayment("rootable_pay", "apple_pay")} aria-pressed={paymentChannel === "apple_pay"}>
                <span><b>Apple Pay</b><small>Rootable 代支付・模擬流程</small></span><strong>快速確認</strong>
              </button>
            </fieldset>
            <div className="field-group"><label htmlFor="note">給店家的備註（選填）</label><textarea id="note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="例如：不要香菜" maxLength={80} /></div>
          </section>
          <aside className="checkout-summary">
            <h2>訂單內容</h2>
            {items.map((item) => <div className="summary-item" key={item.id}><span>{item.name}<small>{item.quantity} × NT$ {item.price}</small></span><b>NT$ {item.quantity * item.price}</b></div>)}
            <div className="summary-total"><span>合計</span><b>NT$ {subtotal}</b></div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button button-primary checkout-submit" onClick={submitOrder} disabled={loading || !tableNo.trim()}>
              {loading ? "正在送出…" : paymentMethod === "cash" ? "送出訂單・現場付現" : `模擬支付 NT$ ${subtotal}`}
            </button>
            <p className="secure-note">試營運階段不會產生真實扣款或撥款。</p>
          </aside>
        </div>
      </main>
    );
  }

  return (
    <main className="menu-page">
      <header className="menu-hero"><Link className="mini-brand" href="/">Rootable 森根</Link><div><p className="eyebrow">Rootable 店家</p><h1>森日小館</h1><p>高雄鹽埕・日常定食與咖啡</p></div><div className="table-chip">桌號 <b>A03</b></div></header>
      <nav className="category-tabs" aria-label="菜單分類">{["全部", "主餐", "飲品", "甜點"].map((item) => <button className={category === item ? "active" : ""} onClick={() => setCategory(item)} key={item}>{item}</button>)}</nav>
      <section className="menu-content" aria-labelledby="menu-title">
        <div className="section-heading"><div><p className="eyebrow">今日菜單</p><h2 id="menu-title">慢慢吃，好好生活。</h2></div><p>餐點皆為現點現做，約 15–20 分鐘。</p></div>
        <div className="product-grid">{visibleProducts.map((product) => {
          const quantity = cart[product.id] || 0;
          return <article className="menu-card" key={product.id}><div className={`food-art ${product.art}`} aria-hidden="true"><span>{product.featured ? "人氣推薦" : product.category}</span></div><div className="menu-card-copy"><h3>{product.name}</h3><p>{product.description}</p><div className="menu-card-footer"><b>NT$ {product.price}</b>{quantity ? <div className="qty-control" aria-label={`${product.name}數量`}><button onClick={() => changeQuantity(product.id, -1)} aria-label={`減少${product.name}`}>−</button><span>{quantity}</span><button onClick={() => changeQuantity(product.id, 1)} aria-label={`增加${product.name}`}>＋</button></div> : <button className="add-button" onClick={() => changeQuantity(product.id, 1)}>加入</button>}</div></div></article>;
        })}</div>
      </section>
      {count > 0 && <div className="cart-dock"><div><span>{count} 份餐點</span><b>NT$ {subtotal}</b></div><button onClick={() => setStep("checkout")}>查看購物車並結帳</button></div>}
    </main>
  );
}
