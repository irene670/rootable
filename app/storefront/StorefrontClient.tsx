"use client";

/* eslint-disable @next/next/no-html-link-for-pages, @next/next/no-img-element, jsx-a11y/no-static-element-interactions -- Modal backdrop supports pointer dismissal; the explicit close button remains keyboard accessible. */
import { useEffect, useMemo, useState } from "react";
import { seedReviews } from "../../platform/seed";
import type { MenuProduct, ProductOption, Review, StoreRecord } from "../../platform/types";

type RouteMode = "website" | "order" | "takeout" | "reserve";
type Identity = { method: "line" | "phone"; label: string };
type Selection = Record<string, string[]>;
type CartLine = { id: string; product: MenuProduct; quantity: number; selections: Selection; unitPrice: number; optionLabel: string };
type CreatedOrder = { orderNo: string; subtotal: number; paymentStatus: string };
const defaultReservationDate = new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().slice(0, 10);

const money = (value: number) => `NT$ ${value.toLocaleString("zh-TW")}`;
const formatOptions = (product: MenuProduct, selections: Selection) => product.optionGroups.flatMap((group) => group.options.filter((option) => selections[group.id]?.includes(option.id)).map((option) => option.name)).join("・");
const optionPrice = (product: MenuProduct, selections: Selection) => product.optionGroups.flatMap((group) => group.options).filter((option) => Object.values(selections).flat().includes(option.id)).reduce((sum, option) => sum + option.price, 0);
const CloseIcon = () => <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6 6 18"/></svg>;
const SearchIcon = () => <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.4-3.4"/></svg>;
const HeartIcon = () => <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/></svg>;
const DineInIcon = () => <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 3v7a3 3 0 0 0 3 3h1V3M7 3v6M9 3v6M8 13v8M16 3v18M16 3c3 1 4 4 4 7h-4"/></svg>;
const TakeoutIcon = () => <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 8h14l-1 13H6L5 8Z"/><path d="M8 8a4 4 0 0 1 8 0M9 12h6"/></svg>;
const ReserveIcon = () => <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18M8 15h3M13 15h3"/></svg>;
const TrashIcon = () => <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14"/></svg>;
const ProductImage = ({ product, className = "" }: { product: MenuProduct; className?: string }) => product.image ? <img className={className} src={product.image} alt={product.imageAlt}/> : <div className={`${className} menu-photo-placeholder`} role="img" aria-label={`${product.name}照片待補`}><span>照片待補</span></div>;
const recommendedProducts = (products: MenuProduct[]) => {
  const highlighted = products.filter((product) => product.featured || product.badge);
  return (highlighted.length ? highlighted : products.filter((product) => !product.soldOut)).slice(0, 4);
};

function StoreLoading({ failed = false }: { failed?: boolean }) {
  return <main className="tenant-mobile-shell storefront-loading" aria-live="polite"><section>{failed ? <><b>目前無法載入店家資料</b><p>請確認網路後重新整理頁面。</p><button className="tenant-primary" onClick={() => window.location.reload()}>重新載入</button></> : <><span className="loading-logo"/><span className="loading-line wide"/><span className="loading-line"/><div className="loading-grid"><i/><i/><i/><i/></div><p>正在準備店家菜單…</p></>}</section></main>;
}

function ScanStoreLanding({ store, mode, tableNo, onStart }: { store: StoreRecord; mode: "order" | "takeout"; tableNo: string; onStart: () => void }) {
  const [favorited, setFavorited] = useState(false);
  const preview = recommendedProducts(store.products);
  const categories = Array.from(new Set(store.products.map((product) => product.category))).slice(0, 4);
  return <main className="scan-store-shell" style={{ "--tenant-primary": store.profile.theme.primary, "--tenant-accent": store.profile.theme.accent } as React.CSSProperties}>
    <section className="scan-store-page">
      <div className="scan-store-hero"><img src={store.profile.coverImage} alt={`${store.profile.name}招牌餐點`}/><div className="scan-store-shade"/><nav><a href={`/s/${store.slug}`} aria-label="關閉並返回店家首頁"><CloseIcon/></a><div><button aria-label="搜尋餐點" onClick={onStart}><SearchIcon/></button><button className={favorited ? "favorited" : ""} aria-label={favorited ? "取消收藏店家" : "收藏店家"} aria-pressed={favorited} onClick={() => setFavorited((value) => !value)}><HeartIcon/></button></div></nav><div className="scan-store-hero-copy"><p>{store.profile.tagline}</p><span>今天想吃什麼？先看看店家的人氣餐點</span></div></div>
      <div className="scan-store-logo" aria-hidden="true">{store.profile.logoText}</div>
      <section className="scan-store-summary"><p className="scan-store-open">營業中・可接受點餐</p><h1>{store.profile.name}</h1><div className="scan-store-rating"><b>4.8 ★</b><span>（130+）</span><i>・</i><span>內用免服務費</span></div><p>{store.profile.announcement}</p></section>
      <section className="scan-service-picker" aria-label="用餐方式"><a className={mode === "order" ? "active" : ""} href={`/s/${store.slug}/order?table=${encodeURIComponent(tableNo)}`}><b><DineInIcon/></b><span>內用</span><small>{mode === "order" ? `桌號 ${tableNo}` : "掃碼點餐"}</small></a><a className={mode === "takeout" ? "active" : ""} href={`/s/${store.slug}/takeout`}><b><TakeoutIcon/></b><span>外帶</span><small>預約取餐</small></a><a href={`/s/${store.slug}/reserve`}><b><ReserveIcon/></b><span>訂位</span><small>線上預約</small></a></section>
      <section className="scan-store-stats"><div><b>{mode === "order" ? tableNo : "最快 17:30"}</b><span>{mode === "order" ? "目前桌號" : "預約取餐"}</span></div><div><b>15–20 分鐘</b><span>預估出餐時間</span></div></section>
      <section className="scan-menu-preview"><header><div><p>瀏覽菜單</p><h2>店內人氣餐點</h2></div><button onClick={onStart}>查看全部</button></header><nav aria-label="菜單分類"><button className="active">★ 精選</button>{categories.map((item) => <button key={item} onClick={onStart}>{item}</button>)}</nav><div>{preview.map((product, index) => <article key={product.id}><button onClick={onStart}><div><ProductImage product={product}/>{index < 2 && <span>人氣第 {index + 1} 名</span>}<i>＋</i></div><h3>{product.name}</h3><b>{money(product.price)}</b><p>{product.description}</p></button></article>)}</div></section>
      <section className="scan-store-note"><b>點餐前提醒</b><p>{mode === "order" ? `本次為桌號 ${tableNo} 內用點餐。電子支付完成後會直接進入廚房；選擇現金則須先到櫃台付款。` : "外帶餐點依選擇時間製作，送出前仍可確認取餐時間與付款方式。"}</p></section>
      <footer className="scan-start-dock"><div><span>{mode === "order" ? `內用・桌號 ${tableNo}` : "預約外帶"}</span><small>顧客免平台服務費</small></div><button onClick={onStart}>查看菜單並開始點餐</button></footer>
    </section>
  </main>;
}

function IdentityGate({ onDone, storeName, storeSlug }: { onDone: (identity: Identity) => void; storeName: string; storeSlug: string }) {
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState<"line" | "phone" | "">("");
  const validPhone = /^09\d{8}$/.test(phone.replace(/\D/g, ""));
  return <main className="tenant-mobile-shell identity-shell"><section className="identity-card">
    <a className="tenant-back" href={`/s/${storeSlug}`}>返回店家首頁</a>
    <div className="tenant-logo">森</div><p className="tenant-kicker">{storeName}・開始點餐</p><h1>先留下聯絡方式</h1><p>用來確認訂單與取餐資訊。可選 LINE 或手機號碼，不會向顧客收取費用。</p>
    <button className="line-login-button" onClick={() => { setMethod("line"); onDone({ method: "line", label: "LINE 顧客（模擬）" }); }}><span>LINE</span>使用 LINE 登入<small>試營運模擬，不會連到真實帳號</small></button>
    <div className="identity-divider"><span>或</span></div>
    <label htmlFor="customer-phone">輸入手機號碼</label><input id="customer-phone" inputMode="numeric" autoComplete="tel" placeholder="0912 345 678" value={phone} onChange={(event) => setPhone(event.target.value.slice(0, 12))}/>
    <button className="tenant-primary" disabled={!validPhone} onClick={() => { setMethod("phone"); onDone({ method: "phone", label: phone.replace(/\D/g, "") }); }}>用手機號碼繼續</button>
    <p className="identity-note">手機號碼目前不發送驗證碼。送出即同意試營運隱私與訂單聯絡規則。</p>
    {method && <span className="sr-only">已選擇 {method}</span>}
  </section></main>;
}

function ProductSheet({ product, onClose, onAdd }: { product: MenuProduct; onClose: () => void; onAdd: (quantity: number, selections: Selection) => void }) {
  const defaults = Object.fromEntries(product.optionGroups.map((group) => [group.id, group.required && group.options.find((option) => !option.soldOut) ? [group.options.find((option) => !option.soldOut)!.id] : []]));
  const [selections, setSelections] = useState<Selection>(defaults);
  const [quantity, setQuantity] = useState(1);
  const valid = product.optionGroups.every((group) => (selections[group.id]?.length || 0) >= group.min && (selections[group.id]?.length || 0) <= group.max);
  const choose = (groupId: string, option: ProductOption, max: number) => {
    if (option.soldOut) return;
    setSelections((current) => {
      const selected = current[groupId] || [];
      if (max === 1) return { ...current, [groupId]: [option.id] };
      if (selected.includes(option.id)) return { ...current, [groupId]: selected.filter((id) => id !== option.id) };
      if (selected.length >= max) return current;
      return { ...current, [groupId]: [...selected, option.id] };
    });
  };
  const total = (product.price + optionPrice(product, selections)) * quantity;
  return <div className="uber-sheet-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="uber-product-sheet" role="dialog" aria-modal="true" aria-labelledby="tenant-product-title">
    <header className="uber-sheet-header"><button onClick={onClose} aria-label="關閉"><CloseIcon/></button><b>餐點選項</b><span/></header>
    <ProductImage className="uber-sheet-image" product={product}/><div className="uber-sheet-copy"><h2 id="tenant-product-title">{product.name}</h2><p>{product.description}</p><strong>{money(product.price)}</strong>{product.availableNote && <small>{product.availableNote}</small>}</div>
    {product.optionGroups.map((group) => <fieldset className="uber-option-group" key={group.id}><legend><span><b>{group.name}</b><small>{group.max > 1 ? `最多選 ${group.max} 項` : "請選 1 項"}</small></span><em>{group.required ? "必選" : "選填"}</em></legend>
      {group.options.map((option) => { const active = selections[group.id]?.includes(option.id); return <button type="button" disabled={option.soldOut} className={active ? "selected" : ""} onClick={() => choose(group.id, option, group.max)} key={option.id}><span className={group.max === 1 ? "radio" : "check"}/><span><b>{option.name}</b>{option.soldOut && <small>今日售完</small>}</span><strong>{option.price ? `+${money(option.price)}` : ""}</strong></button>; })}
    </fieldset>)}
    <footer className="uber-sheet-footer"><div className="tenant-stepper"><button onClick={() => setQuantity((value) => Math.max(1, value - 1))}>−</button><span>{quantity}</span><button onClick={() => setQuantity((value) => value + 1)}>＋</button></div><button className="tenant-primary" disabled={!valid} onClick={() => onAdd(quantity, selections)}><span>加入 {quantity} 份</span><strong>{money(total)}</strong></button></footer>
  </section></div>;
}

function ReservationPanel({ store }: { store: StoreRecord }) {
  const [form, setForm] = useState({ customerName: "", phone: "", date: defaultReservationDate, time: "18:00", partySize: 2, note: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    setLoading(true); setMessage("");
    try {
      const response = await fetch("/api/reservations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, storeId: store.storeId }) });
      const result = await response.json() as { reservation?: { deposit: number }; error?: string };
      if (!response.ok || !result.reservation) throw new Error(result.error || "訂位失敗");
      setMessage(result.reservation.deposit ? `訂位完成，已模擬支付訂金 ${money(result.reservation.deposit)}。` : "訂位完成，本次不需要訂金。預約已送到店家後台。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "訂位服務暫時無法使用"); } finally { setLoading(false); }
  };
  return <section className="reservation-page"><a className="tenant-back" href={`/s/${store.slug}`}>返回店家首頁</a><p className="tenant-kicker">線上訂位</p><h1>預約 {store.profile.name}</h1><p>一般訂位免訂金；6 人以上或熱門時段預收每人 NT$200（本版為模擬付款）。</p>
    <div className="reservation-form"><label>姓名<input value={form.customerName} onChange={(event) => setForm({ ...form, customerName: event.target.value })}/></label><label>手機<input inputMode="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })}/></label><label>日期<input type="date" min={defaultReservationDate} value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })}/></label><label>時間<select value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })}>{["11:30", "12:00", "12:30", "17:30", "18:00", "18:30", "19:00", "19:30"].map((time) => <option key={time}>{time}</option>)}</select></label><label>人數<select value={form.partySize} onChange={(event) => setForm({ ...form, partySize: Number(event.target.value) })}>{Array.from({ length: 12 }, (_, index) => index + 1).map((size) => <option key={size} value={size}>{size} 人</option>)}</select></label><label className="wide">備註<textarea value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="兒童椅、過敏食材或其他需求"/></label></div>
    <div className="reservation-policy"><b>取消規則</b><span>24 小時前全額退還；4–24 小時退 50%；4 小時內或未到店不退款。店家取消則全額退還。</span></div><button className="tenant-primary" disabled={loading || !form.customerName || !form.phone} onClick={submit}>{loading ? "正在確認…" : "確認訂位"}</button>{message && <p className="reservation-message" role="status">{message}</p>}
  </section>;
}

function StoreWebsite({ store, reviews }: { store: StoreRecord; reviews: Review[] }) {
  const profile = store.profile;
  const rating = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
  return <main className="store-website" style={{ "--tenant-primary": profile.theme.primary, "--tenant-accent": profile.theme.accent } as React.CSSProperties}>
    <header className="store-web-nav"><a href="/"><span className="tenant-logo small">{profile.logoText}</span><b>{profile.name}</b></a><nav><a href="#about">關於我們</a><a href="#menu-preview">熱門餐點</a><a href="#reviews">顧客評論</a></nav><a className="tenant-primary compact" href={`/s/${store.slug}/order?table=A03`}>開始點餐</a></header>
    <section className="store-hero"><img src={profile.coverImage} alt={`${profile.name}招牌餐點`}/><div className="store-hero-overlay"><span className="tenant-logo">{profile.logoText}</span><p>{profile.tagline}</p><h1>{profile.name}</h1><div><span>★ {rating.toFixed(1)}（{reviews.length}）</span><span>現在營業中</span><span>高雄鹽埕</span></div><p className="store-announcement">{profile.announcement}</p><div className="store-hero-actions"><a className="tenant-primary" href={`/s/${store.slug}/order?table=A03`}>內用掃碼點餐</a><a className="tenant-secondary" href={`/s/${store.slug}/takeout`}>預約外帶</a><a className="tenant-secondary" href={`/s/${store.slug}/reserve`}>線上訂位</a></div></div></section>
    <section className="store-story" id="about"><div><p className="tenant-kicker">Our story</p><h2>{profile.tagline}</h2><p>{profile.story}</p></div><dl><div><dt>營業時間</dt><dd>{profile.hours.map((line) => <span key={line}>{line}</span>)}</dd></div><div><dt>地址</dt><dd>{profile.address}</dd></div><div><dt>聯絡方式</dt><dd>{profile.phone}</dd></div><div><dt>付款方式</dt><dd>{profile.paymentMethods.join("・")}</dd></div></dl></section>
    <section className="store-menu-preview" id="menu-preview"><div className="store-section-head"><div><p className="tenant-kicker">Popular menu</p><h2>今天想吃什麼？</h2></div><a href={`/s/${store.slug}/order?table=A03`}>查看完整菜單</a></div><div className="store-product-row">{recommendedProducts(store.products).map((product) => <article key={product.id}><ProductImage product={product}/><span>{product.badge || "店長推薦"}</span><h3>{product.name}</h3><p>{product.description}</p><b>{money(product.price)}</b></article>)}</div></section>
    <section className="store-gallery">{profile.gallery.map((image, index) => <img src={image} alt={`${profile.name}餐點與店內照片 ${index + 1}`} key={image}/>)}</section>
    <section className="store-reviews" id="reviews"><div className="store-section-head"><div><p className="tenant-kicker">Verified reviews</p><h2>完成訂單的顧客怎麼說</h2></div><b>★ {rating.toFixed(1)}</b></div><div>{reviews.map((review) => <article key={review.id}><span>{"★".repeat(review.rating)}</span><p>{review.comment}</p><b>{review.customerName}</b>{review.merchantReply && <small>店家回覆：{review.merchantReply}</small>}</article>)}</div></section>
    <footer className="store-footer"><div><span className="tenant-logo small">{profile.logoText}</span><b>{profile.name}</b><p>{profile.address}・{profile.phone}</p></div><span>Powered by Rootable 森根・免費版</span></footer>
  </main>;
}

function OrderFlow({ store, mode, previewOrdering = false }: { store: StoreRecord; mode: "order" | "takeout"; previewOrdering?: boolean }) {
  const [started, setStarted] = useState(previewOrdering);
  const [identity, setIdentity] = useState<Identity | null>(previewOrdering ? { method: "phone", label: "店家預覽" } : null);
  const [category, setCategory] = useState("熱門推薦");
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<MenuProduct | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [checkout, setCheckout] = useState(false);
  const [payment, setPayment] = useState<"cash" | "line_pay" | "apple_pay">("cash");
  const [pickupTime, setPickupTime] = useState("17:30");
  const [tableNo, setTableNo] = useState("A03");
  const [note, setNote] = useState("");
  const [orderSource, setOrderSource] = useState<"direct" | "rootable_marketplace">("direct");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreatedOrder | null>(null);
  useEffect(() => { if (previewOrdering) return; const timer = window.setTimeout(() => { const params = new URLSearchParams(window.location.search); const scanned = params.get("table"); if (scanned) setTableNo(scanned.slice(0, 12)); if (params.get("source") === "marketplace") setOrderSource("rootable_marketplace"); const saved = sessionStorage.getItem(`rootable-identity-${store.slug}`); if (saved) setIdentity(JSON.parse(saved) as Identity); const savedCart = sessionStorage.getItem(`rootable-cart-${store.slug}-${mode}`); if (savedCart) { try { setCart(JSON.parse(savedCart) as CartLine[]); } catch { sessionStorage.removeItem(`rootable-cart-${store.slug}-${mode}`); } } }, 0); return () => window.clearTimeout(timer); }, [mode, previewOrdering, store.slug]);
  useEffect(() => { if (!previewOrdering) sessionStorage.setItem(`rootable-cart-${store.slug}-${mode}`, JSON.stringify(cart)); }, [cart, mode, previewOrdering, store.slug]);
  useEffect(() => { if (checkout) window.scrollTo({ top: 0, behavior: "auto" }); }, [checkout]);
  const recommended = useMemo(() => recommendedProducts(store.products), [store.products]);
  const categories = ["熱門推薦", ...Array.from(new Set(store.products.map((product) => product.category).filter(Boolean)))];
  const visible = store.products.filter((product) => (category === "熱門推薦" ? recommended.some((item) => item.id === product.id) : product.category === category) && `${product.name}${product.description}`.toLocaleLowerCase("zh-TW").includes(query.trim().toLocaleLowerCase("zh-TW")));
  const count = cart.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const add = (product: MenuProduct, quantity: number, selections: Selection) => { const price = product.price + optionPrice(product, selections); setCart((current) => [...current, { id: crypto.randomUUID(), product, quantity, selections, unitPrice: price, optionLabel: formatOptions(product, selections) }]); setDetail(null); };
  const change = (id: string, delta: number) => setCart((current) => current.map((line) => line.id === id ? { ...line, quantity: Math.max(1, line.quantity + delta) } : line));
  const remove = (id: string) => setCart((current) => current.filter((line) => line.id !== id));
  const submit = async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ storeId: store.storeId, tableNo: mode === "order" ? tableNo : `外帶 ${pickupTime}`, paymentMethod: payment === "cash" ? "cash" : "rootable_pay", paymentChannel: payment, orderSource, customerNote: `${identity?.label || ""}${note ? `｜${note}` : ""}`, items: cart.map((line) => ({ productId: line.product.id, productName: `${line.product.name}${line.optionLabel ? `（${line.optionLabel}）` : ""}`, quantity: line.quantity, unitPrice: line.unitPrice })) }) });
      const result = await response.json() as { order?: CreatedOrder; error?: string }; if (!response.ok || !result.order) throw new Error(result.error || "訂單送出失敗"); sessionStorage.removeItem(`rootable-cart-${store.slug}-${mode}`); setCreated(result.order);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "訂單服務暫時無法使用"); } finally { setLoading(false); }
  };
  if (!started) return <ScanStoreLanding store={store} mode={mode} tableNo={tableNo} onStart={() => setStarted(true)}/>;
  if (!identity) return <IdentityGate storeName={store.profile.name} storeSlug={store.slug} onDone={(value) => { sessionStorage.setItem(`rootable-identity-${store.slug}`, JSON.stringify(value)); setIdentity(value); }}/>
  if (created) return <main className="tenant-mobile-shell"><section className="tenant-success"><div>✓</div><p className="tenant-kicker">訂單已送出</p><h1>{payment === "cash" ? "請先到櫃台完成付款" : mode === "order" ? "餐點會送到桌邊" : "請依預約時間到店取餐"}</h1>{payment === "cash" && <div className="cash-next-step"><b>下一步：向店員出示訂單編號</b><span>店員確認收款後，訂單才會送入廚房開始製作。</span></div>}<dl><div><dt>訂單編號</dt><dd>{created.orderNo}</dd></div><div><dt>{mode === "order" ? "桌號" : "取餐時間"}</dt><dd>{mode === "order" ? tableNo : pickupTime}</dd></div><div><dt>付款</dt><dd>{payment === "cash" ? "待櫃台收現" : `${payment === "line_pay" ? "LINE Pay" : "Apple Pay"} 模擬完成`}</dd></div><div><dt>金額</dt><dd>{money(created.subtotal)}</dd></div></dl><p>付款、通知與退款皆為試營運模擬，不會產生真實扣款。</p><a className="tenant-primary" href={`/s/${store.slug}`}>回店家首頁</a></section></main>;
  if (checkout) return <main className="tenant-mobile-shell"><section className="tenant-checkout"><header><button onClick={() => setCheckout(false)}>返回</button><div><b>確認訂單</b><span>{mode === "order" ? `內用・桌號 ${tableNo}` : `外帶・${pickupTime} 取餐`}</span></div></header><div className="tenant-checkout-body"><section><h1>您的餐點</h1>{cart.map((line) => <article className="tenant-cart-line" key={line.id}><ProductImage className="tenant-cart-image" product={line.product}/><div><b>{line.product.name}</b><span>{line.optionLabel}</span><strong>{money(line.unitPrice)}</strong></div><div className="tenant-cart-actions"><div className="tenant-stepper"><button onClick={() => change(line.id, -1)} aria-label={`減少 ${line.product.name}`}>−</button><span>{line.quantity}</span><button onClick={() => change(line.id, 1)} aria-label={`增加 ${line.product.name}`}>＋</button></div><button className="tenant-remove-line" onClick={() => remove(line.id)} aria-label={`移除 ${line.product.name}`}><TrashIcon/></button></div></article>)}</section><section className="tenant-order-info"><h2>{mode === "order" ? "桌號" : "取餐時間"}</h2>{mode === "order" ? <input value={tableNo} onChange={(event) => setTableNo(event.target.value)} /> : <select value={pickupTime} onChange={(event) => setPickupTime(event.target.value)}>{["11:30", "12:00", "12:30", "17:30", "18:00", "18:30", "19:00"].map((time) => <option key={time}>{time}</option>)}</select>}<label>餐點備註<textarea maxLength={80} value={note} onChange={(event) => setNote(event.target.value)} placeholder="例如：不要香菜、餐具 2 份"/></label></section><fieldset className="tenant-payment"><legend>付款方式</legend>{[["cash", "櫃台付現", "送出後請先付款；店員確認後才開始製作"], ["line_pay", "LINE Pay", "Rootable 代支付・模擬"], ["apple_pay", "Apple Pay", "Rootable 代支付・模擬"]].map(([id, label, help]) => <button type="button" className={payment === id ? "selected" : ""} onClick={() => setPayment(id as typeof payment)} key={id}><span/><div><b>{label}</b><small>{help}</small></div><strong>{id === "cash" ? "餐前付款" : "立即付款"}</strong></button>)}</fieldset>{error && <p className="form-error">{error}</p>}</div><footer className="tenant-checkout-footer"><div><span>顧客服務費 NT$ 0</span><b>{money(subtotal)}</b></div><button className="tenant-primary" disabled={!cart.length || loading} onClick={submit}>{loading ? "正在送出…" : payment === "cash" ? "送出並前往櫃台付款" : `模擬支付 ${money(subtotal)}`}</button></footer></section></main>;
  return <main className="tenant-mobile-shell"><section className="uber-menu-page" style={{ "--tenant-primary": store.profile.theme.primary, "--tenant-accent": store.profile.theme.accent } as React.CSSProperties}><header className="uber-menu-top"><a href={`/s/${store.slug}`} aria-label="返回店家首頁"><CloseIcon/></a><div><b>{store.profile.name}</b><span>{mode === "order" ? `內用・桌號 ${tableNo}` : "預約外帶"}</span></div><button aria-label="搜尋" onClick={() => document.getElementById("tenant-menu-search")?.focus()}><SearchIcon/></button></header><div className="uber-search"><input id="tenant-menu-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋餐點或飲品"/></div><nav className="uber-category-tabs">{categories.map((item) => <button className={category === item ? "active" : ""} onClick={() => setCategory(item)} key={item}>{item}</button>)}</nav><div className="uber-service-status"><span>接單中</span><b>{mode === "order" ? "預計 15–20 分鐘送達" : "最早 17:30 取餐"}</b></div><section className="uber-menu-content"><div className="uber-section-title"><div><p className="tenant-kicker">{query ? "搜尋結果" : "完整菜單"}</p><h1>{query ? `「${query}」` : category}</h1></div><span>{visible.length} 項</span></div>{visible.length ? <div className="uber-product-grid">{visible.map((product) => <article className={product.soldOut ? "sold-out" : ""} key={product.id}><button onClick={() => !product.soldOut && setDetail(product)}><div className="uber-product-photo"><ProductImage product={product}/>{product.badge && <span>{product.badge}</span>}<i>＋</i></div><h2>{product.name}</h2><b>{money(product.price)}</b>{product.availableNote && <small>{product.availableNote}</small>}<p>{product.description}</p></button></article>)}</div> : <div className="uber-empty"><b>找不到符合的餐點</b><p>可以換個關鍵字，或切換其他分類看看。</p><button onClick={() => setQuery("")}>清除搜尋</button></div>}</section>{count > 0 && <button className="uber-cart-dock" onClick={() => setCheckout(true)}><span>{count}</span><b>查看購物車</b><strong>{money(subtotal)}</strong></button>}{detail && <ProductSheet product={detail} onClose={() => setDetail(null)} onAdd={(quantity, selections) => add(detail, quantity, selections)}/>}</section></main>;
}

export default function StorefrontClient({ slug = "senri", mode = "website", previewStore, previewOrdering = false }: { slug?: string; mode?: RouteMode; previewStore?: StoreRecord; previewOrdering?: boolean }) {
  const [store, setStore] = useState<StoreRecord | null>(null);
  const [reviews, setReviews] = useState<Review[]>(previewStore ? seedReviews : []);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (previewStore) return;
    let cancelled = false;
    const load = async () => {
      try {
        setFailed(false);
        const storeResponse = await fetch(`/api/stores?slug=${encodeURIComponent(slug)}`);
        const storeResult = await storeResponse.json() as { store?: StoreRecord };
        if (!storeResponse.ok || !storeResult.store) throw new Error("store-load-failed");
        if (!cancelled) setStore(storeResult.store);
        const reviewResponse = await fetch(`/api/reviews?storeId=${encodeURIComponent(storeResult.store.storeId)}`);
        const reviewResult = reviewResponse.ok ? await reviewResponse.json() as { reviews?: Review[] } : {};
        if (!cancelled) setReviews(reviewResult.reviews || []);
      } catch { if (!cancelled) setFailed(true); }
    };
    void load();
    return () => { cancelled = true; };
  }, [previewStore, slug]);
  const currentStore = previewStore || store;
  if (!currentStore) return <StoreLoading failed={failed}/>;
  if (mode === "reserve") return <main className="tenant-mobile-shell"><ReservationPanel store={currentStore}/></main>;
  if (mode === "order" || mode === "takeout") return <OrderFlow store={currentStore} mode={mode} previewOrdering={previewOrdering}/>;
  return <StoreWebsite store={currentStore} reviews={reviews}/>;
}
