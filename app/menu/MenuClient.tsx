"use client";

/* eslint-disable @next/next/no-html-link-for-pages, @next/next/no-img-element -- Vinext uses native anchors and locally hosted responsive menu photos. */

import { useMemo, useState } from "react";

const products = [
  { id: "set-chicken", name: "炙燒照燒雞腿定食", description: "去骨雞腿、越光米、味噌湯與三樣小缽", price: 320, category: "定食", image: "/menu/chicken.jpg", imageAlt: "炙燒雞腿搭配米飯與季節蔬菜", badge: "人氣 No.1", featured: true },
  { id: "set-salmon", name: "鹽麴烤鮭魚定食", description: "鮭魚、越光米、味噌湯與三樣小缽", price: 360, category: "定食", image: "/menu/salmon.jpg", imageAlt: "烤鮭魚、米飯與味噌湯定食", badge: "每日限量" },
  { id: "vegetable-curry", name: "十蔬熟成咖哩飯", description: "洋蔥與蘋果慢炒，搭配當日烤時蔬", price: 280, category: "丼與麵", image: "/menu/curry.jpg", imageAlt: "蔬菜咖哩與白飯", badge: "微辣" },
  { id: "moon-rice", name: "月見七彩野菜丼", description: "溫泉蛋、時蔬、芝麻與日式醬汁", price: 290, category: "丼與麵", image: "/menu/rice-bowl.jpg", imageAlt: "鋪滿時蔬與溫泉蛋的日式丼飯" },
  { id: "tofu-bowl", name: "胡麻酥豆腐野菜碗", description: "酥豆腐、毛豆、酪梨、鮮蔬與胡麻醬", price: 300, category: "丼與麵", image: "/menu/tofu.jpg", imageAlt: "酥豆腐、酪梨與多種鮮蔬組成的野菜碗" },
  { id: "miso-ramen", name: "味噌豆乳野菜拉麵", description: "豆乳味噌湯底、豆腐、海苔與季節蔬菜", price: 290, category: "丼與麵", image: "/menu/ramen.jpg", imageAlt: "豆腐、海苔與蔬菜拉麵", badge: "可做全素" },
  { id: "coffee", name: "山霧手沖咖啡", description: "中淺焙，柑橘、堅果與黑糖尾韻", price: 150, category: "飲品", image: "/menu/coffee.jpg", imageAlt: "木桌上的手沖黑咖啡" },
  { id: "latte", name: "黑糖海鹽拿鐵", description: "雙份濃縮、鮮奶、黑糖與海鹽奶蓋", price: 160, category: "飲品", image: "/menu/coffee.jpg", imageAlt: "咖啡館木桌上的熱拿鐵", badge: "招牌" },
  { id: "matcha", name: "宇治抹茶歐蕾", description: "宇治抹茶、鮮奶，可選冰飲或熱飲", price: 170, category: "飲品", image: "/menu/matcha.jpg", imageAlt: "玻璃杯中的冰抹茶歐蕾" },
  { id: "tea", name: "柚香冷泡烏龍", description: "冷泡烏龍、柚子蜜與新鮮檸檬", price: 130, category: "飲品", image: "/menu/tea.jpg", imageAlt: "陽光下加滿冰塊的冷泡茶" },
  { id: "pudding", name: "焦糖昭和布丁", description: "雞蛋、鮮奶、香草與微苦焦糖", price: 130, category: "甜點", image: "/menu/pudding.jpg", imageAlt: "玻璃杯中的手工奶香布丁", badge: "每日手作" },
  { id: "cheesecake", name: "柚香巴斯克乳酪", description: "奶油乳酪、柚子皮與海鹽鮮奶油", price: 160, category: "甜點", image: "/menu/cheesecake.jpg", imageAlt: "白色盤中的乳酪蛋糕切片" },
];

const categories = ["全部", "定食", "丼與麵", "飲品", "甜點"];

type Cart = Record<string, number>;
type PaymentMethod = "cash" | "rootable_pay";
type PaymentChannel = "cash" | "line_pay" | "apple_pay";
type CreatedOrder = { orderNo: string; tableNo: string; subtotal: number; paymentStatus: string };

const money = (value: number) => `NT$ ${value.toLocaleString("zh-TW")}`;

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
  const items = useMemo(() => products.filter((product) => cart[product.id]).map((product) => ({ ...product, quantity: cart[product.id] })), [cart]);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);

  const changeQuantity = (id: string, delta: number) => {
    if (step === "checkout" && delta < 0 && count === 1 && cart[id] === 1) setStep("menu");
    setCart((current) => {
      const next = Math.max(0, (current[id] || 0) + delta);
      const updated = { ...current, [id]: next };
      if (!next) delete updated[id];
      return updated;
    });
  };

  const choosePayment = (method: PaymentMethod, channel: PaymentChannel) => {
    setPaymentMethod(method);
    setPaymentChannel(channel);
    setError("");
  };

  const submitOrder = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: "senri-demo",
          tableNo,
          paymentMethod,
          paymentChannel,
          customerNote: note,
          items: items.map((item) => ({ productId: item.id, productName: item.name, quantity: item.quantity, unitPrice: item.price })),
        }),
      });
      const result = await response.json() as { order?: CreatedOrder; error?: string };
      if (!response.ok || !result.order) throw new Error(result.error || "訂單送出失敗");
      setCreatedOrder(result.order);
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "連線失敗，請再試一次");
    } finally {
      setLoading(false);
    }
  };

  if (step === "success" && createdOrder) {
    return (
      <main className="customer-app-shell success-shell">
        <section className="customer-app order-success-page" aria-live="polite">
          <div className="success-card">
            <div className="success-seal" aria-hidden="true">✓</div>
            <p className="customer-kicker">訂單已送出</p>
            <h1>店家收到囉！</h1>
            <p className="success-help">請留意取餐通知，並保留這個畫面。</p>
            <div className="pickup-ticket">
              <span>取餐序號</span>
              <strong>{createdOrder.orderNo}</strong>
            </div>
            <dl className="success-meta">
              <div><dt>桌號</dt><dd>{createdOrder.tableNo}</dd></div>
              <div><dt>金額</dt><dd>{money(createdOrder.subtotal)}</dd></div>
              <div><dt>付款</dt><dd>{createdOrder.paymentStatus === "paid" ? "模擬付款完成" : "到店付現"}</dd></div>
            </dl>
            <p className="demo-notice">試營運模擬付款，不會產生真實扣款。</p>
            <button className="customer-primary-action" onClick={() => { setCart({}); setStep("menu"); setCreatedOrder(null); }}>繼續看菜單</button>
          </div>
        </section>
      </main>
    );
  }

  if (step === "checkout") {
    return (
      <main className="customer-app-shell checkout-shell">
        <section className="customer-app checkout-page">
          <header className="customer-step-header">
            <button className="back-button" onClick={() => setStep("menu")} aria-label="返回菜單">返回</button>
            <div><b>確認訂單</b><span>第 2 步，共 2 步</span></div>
            <span className="step-count">{count} 份</span>
          </header>

          <div className="checkout-content">
            <section className="checkout-block" aria-labelledby="order-review-title">
              <div className="checkout-block-title"><h1 id="order-review-title">訂單內容</h1><span>{money(subtotal)}</span></div>
              <div className="checkout-items">
                {items.map((item) => (
                  <article className="checkout-item" key={item.id}>
                    <img src={item.image} alt="" width="64" height="64" />
                    <div className="checkout-item-copy"><h2>{item.name}</h2><p>{money(item.price)}</p></div>
                    <div className="qty-control" aria-label={`${item.name}數量`}>
                      <button onClick={() => changeQuantity(item.id, -1)} aria-label={`減少${item.name}`}>−</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => changeQuantity(item.id, 1)} aria-label={`增加${item.name}`}>＋</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="checkout-block" aria-labelledby="dining-info-title">
              <h2 id="dining-info-title">用餐資訊</h2>
              <div className="field-group compact-field">
                <label htmlFor="tableNo">桌號或取餐名稱</label>
                <input id="tableNo" value={tableNo} onChange={(event) => setTableNo(event.target.value)} maxLength={12} autoComplete="off" />
              </div>
              <div className="field-group compact-field">
                <label htmlFor="note">餐點備註 <span>選填</span></label>
                <textarea id="note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="例如：不要香菜、飯少一點" maxLength={80} />
                <small>{note.length}/80</small>
              </div>
            </section>

            <fieldset className="checkout-block payment-options">
              <legend>付款方式</legend>
              <p className="payment-helper">顧客不加價，代支付手續費由店家負擔。</p>
              <button className={`payment-option ${paymentMethod === "cash" ? "selected" : ""}`} onClick={() => choosePayment("cash", "cash")} aria-pressed={paymentMethod === "cash"}>
                <span className="payment-radio" aria-hidden="true" />
                <span><b>到店付現</b><small>送出後至櫃台支付現金</small></span>
                <strong>免手續費</strong>
              </button>
              <button className={`payment-option ${paymentChannel === "line_pay" ? "selected" : ""}`} onClick={() => choosePayment("rootable_pay", "line_pay")} aria-pressed={paymentChannel === "line_pay"}>
                <span className="payment-radio" aria-hidden="true" />
                <span><b>LINE Pay</b><small>Rootable 代支付・模擬</small></span>
                <strong>立即付款</strong>
              </button>
              <button className={`payment-option ${paymentChannel === "apple_pay" ? "selected" : ""}`} onClick={() => choosePayment("rootable_pay", "apple_pay")} aria-pressed={paymentChannel === "apple_pay"}>
                <span className="payment-radio" aria-hidden="true" />
                <span><b>Apple Pay</b><small>Rootable 代支付・模擬</small></span>
                <strong>快速確認</strong>
              </button>
            </fieldset>

            {error && <p className="form-error" role="alert">{error}</p>}
          </div>

          <footer className="checkout-footer">
            <div><span>應付金額</span><strong>{money(subtotal)}</strong></div>
            <button onClick={submitOrder} disabled={loading || !tableNo.trim()}>
              {loading ? "正在送出訂單…" : paymentMethod === "cash" ? "送出訂單" : `模擬支付 ${money(subtotal)}`}
            </button>
            <p>送出即代表確認餐點內容；模擬付款不會扣款。</p>
          </footer>
        </section>
      </main>
    );
  }

  return (
    <main className="customer-app-shell">
      <section className="customer-app menu-page">
        <header className="customer-store-header">
          <a className="customer-home-link" href="/" aria-label="返回 Rootable 首頁">R</a>
          <div className="customer-store-title"><span>桌邊手機點餐</span><h1>森日小館</h1></div>
          <div className="table-chip"><span>桌號</span><b>A03</b></div>
        </header>

        <div className="service-banner"><span>現在接單中</span><b>預計 15–20 分鐘</b></div>

        <div className="category-tabs" aria-label="菜單分類" role="tablist">
          {categories.map((item) => (
            <button role="tab" aria-selected={category === item} className={category === item ? "active" : ""} onClick={() => setCategory(item)} key={item}>{item}</button>
          ))}
        </div>

        <section className="menu-content" aria-labelledby="menu-title">
          <div className="section-heading">
            <div><p className="customer-kicker">今日菜單</p><h2 id="menu-title">想吃什麼？</h2></div>
            <p>{visibleProducts.length} 項餐點</p>
          </div>

          <div className="product-grid">
            {visibleProducts.map((product) => {
              const quantity = cart[product.id] || 0;
              return (
                <article className={`menu-card ${quantity ? "selected" : ""}`} key={product.id}>
                  <div className="menu-card-copy">
                    {product.featured && <span className="featured-label">店長推薦</span>}
                    <h3>{product.name}</h3>
                    <p>{product.description}</p>
                    <div className="menu-card-footer">
                      <b>{money(product.price)}</b>
                      {quantity ? (
                        <div className="qty-control" aria-label={`${product.name}數量`}>
                          <button onClick={() => changeQuantity(product.id, -1)} aria-label={`減少${product.name}`}>−</button>
                          <span>{quantity}</span>
                          <button onClick={() => changeQuantity(product.id, 1)} aria-label={`增加${product.name}`}>＋</button>
                        </div>
                      ) : (
                        <button className="add-button" onClick={() => changeQuantity(product.id, 1)} aria-label={`加入${product.name}`}>加入</button>
                      )}
                    </div>
                  </div>
                  <figure className="food-photo">
                    <img src={product.image} alt={product.imageAlt} width="320" height="320" loading="lazy" decoding="async" />
                    <figcaption><span>{product.category}</span>{product.badge && <b>{product.badge}</b>}</figcaption>
                  </figure>
                </article>
              );
            })}
          </div>

          <p className="menu-photo-note">餐點照片為擺盤示意；實際內容依當日食材為準。照片來源：Pexels。</p>
        </section>

        {count > 0 && (
          <div className="cart-dock" aria-live="polite">
            <div className="cart-quantity"><span>{count}</span><p>購物車</p></div>
            <button onClick={() => setStep("checkout")}><span>查看訂單</span><strong>{money(subtotal)}</strong></button>
          </div>
        )}
      </section>
    </main>
  );
}
