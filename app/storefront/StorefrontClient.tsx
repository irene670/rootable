"use client";

/* eslint-disable @next/next/no-html-link-for-pages, @next/next/no-img-element, jsx-a11y/no-static-element-interactions -- Modal backdrop supports pointer dismissal; the explicit close button remains keyboard accessible. */
import { useCallback, useEffect, useMemo, useState } from "react";
import { createSeedStore, seedReviews } from "../../platform/seed";
import { cleanGroupCode, groupItemCount, groupSubtotal, type PublicGroupOrderSession } from "../../platform/group-orders";
import type { MenuProduct, ProductOption, Review, StoreRecord } from "../../platform/types";

type RouteMode = "website" | "order" | "takeout" | "reserve";
type Identity = { method: "line" | "guest"; label: string };
type Selection = Record<string, string[]>;
type CartLine = { id: string; product: MenuProduct; quantity: number; selections: Selection; unitPrice: number; optionLabel: string; note: string };
type CreatedOrder = { orderNo: string; subtotal: number; paymentStatus: string };
const defaultReservationDate = new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().slice(0, 10);

const money = (value: number) => `NT$ ${value.toLocaleString("zh-TW")}`;
const formatOptions = (product: MenuProduct, selections: Selection) => product.optionGroups.flatMap((group) => group.options.filter((option) => selections[group.id]?.includes(option.id)).map((option) => option.name)).join("・");
const optionPrice = (product: MenuProduct, selections: Selection) => product.optionGroups.flatMap((group) => group.options).filter((option) => Object.values(selections).flat().includes(option.id)).reduce((sum, option) => sum + option.price, 0);
const CloseIcon = () => <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6 6 18"/></svg>;
const SearchIcon = () => <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.4-3.4"/></svg>;
const TrashIcon = () => <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14"/></svg>;
const UsersIcon = ({ size = 22 }: { size?: number }) => <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const SparkIcon = () => <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4L12 3Z"/><path d="m18.5 14 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z"/></svg>;
const ShareIcon = () => <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/></svg>;
const CopyIcon = () => <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
const ProductImage = ({ product, className = "" }: { product: MenuProduct; className?: string }) => product.image ? <img className={className} src={product.image} alt={product.imageAlt}/> : <div className={`${className} menu-photo-placeholder`} role="img" aria-label={`${product.name}照片待補`}><span>照片待補</span></div>;
const recommendedProducts = (products: MenuProduct[]) => {
  const highlighted = products.filter((product) => product.featured || product.badge);
  return (highlighted.length ? highlighted : products.filter((product) => !product.soldOut)).slice(0, 4);
};

function StoreLoading({ failed = false }: { failed?: boolean }) {
  return <main className="tenant-mobile-shell storefront-loading" aria-live="polite"><section>{failed ? <><b>目前無法載入店家資料</b><p>請確認網路後重新整理頁面。</p><button className="tenant-primary" onClick={() => window.location.reload()}>重新載入</button></> : <><span className="loading-logo"/><span className="loading-line wide"/><span className="loading-line"/><div className="loading-grid"><i/><i/><i/><i/></div><p>正在準備店家菜單…</p></>}</section></main>;
}

function ProductSheet({ product, onClose, onAdd }: { product: MenuProduct; onClose: () => void; onAdd: (quantity: number, selections: Selection, note: string) => void }) {
  const defaults = Object.fromEntries(product.optionGroups.map((group) => [group.id, group.required && group.options.find((option) => !option.soldOut) ? [group.options.find((option) => !option.soldOut)!.id] : []]));
  const [selections, setSelections] = useState<Selection>(defaults);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
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
    <label className="uber-item-note"><span>餐點備註 <small>選填</small></span><textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={120} placeholder="例如：醬料分開、不要香菜"/></label>
    <footer className="uber-sheet-footer"><div className="tenant-stepper"><button onClick={() => setQuantity((value) => Math.max(1, value - 1))}>−</button><span>{quantity}</span><button onClick={() => setQuantity((value) => value + 1)}>＋</button></div><button className="tenant-primary" disabled={!valid} onClick={() => onAdd(quantity, selections, note)}><span>加入 {quantity} 份</span><strong>{money(total)}</strong></button></footer>
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

function GroupOrderDialog({ open, group, currentMember, defaultName, joinCode, groupUrl, loading, error, onClose, onCreate, onJoin, onUpdateMemberNote, onShare }: {
  open: boolean;
  group: PublicGroupOrderSession | null;
  currentMember?: PublicGroupOrderSession["members"][number];
  defaultName: string;
  joinCode: string;
  groupUrl: string;
  loading: boolean;
  error: string;
  onClose: () => void;
  onCreate: (name: string) => void;
  onJoin: (code: string, name: string) => void;
  onUpdateMemberNote: (note: string) => void;
  onShare: () => void;
}) {
  const [name, setName] = useState(defaultName);
  const [memberNote, setMemberNote] = useState(currentMember?.note || "");
  const isJoining = Boolean(joinCode);
  const qrImageUrl = groupUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=0&data=${encodeURIComponent(groupUrl)}` : "";
  if (!open) return null;
  return <div className="group-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="group-dialog" role="dialog" aria-modal="true" aria-labelledby="group-dialog-title">
      <header><div className="group-dialog-heading"><span><UsersIcon/></span><div><p>同桌同步點餐</p><h2 id="group-dialog-title">{group ? "請朋友掃描加入" : isJoining ? "加入這張團體訂單" : "建立團體 QR Code"}</h2></div></div><button onClick={onClose} aria-label="關閉團體點餐視窗"><CloseIcon/></button></header>
      {group ? <>
        <div className="group-live-summary"><div className="group-avatar-stack">{group.members.slice(0, 5).map((member) => <span className={`tone-${member.color}`} title={member.name} key={member.id}>{member.name.slice(0, 1)}</span>)}</div><div><b>{group.members.length} 人已加入</b><span>{groupItemCount(group)} 份餐點・{money(groupSubtotal(group))}</span></div><em>同步中</em></div>
        <section className="group-qr-card" aria-label="團體點餐 QR Code"><div className="group-qr-card-head"><span><UsersIcon size={18}/></span><div><b>桌號 {group.tableNo}・統一結帳</b><small>朋友掃描後，即可各自在同一張訂單選餐</small></div></div>{qrImageUrl && <img src={qrImageUrl} alt={`掃描加入桌號 ${group.tableNo} 的團體點餐`} width="220" height="220"/>}<p>請讓每位朋友掃描這張 QR Code</p><div className="group-code-card"><div><span>備用團體代碼</span><strong>{group.code}</strong></div><button onClick={onShare}><ShareIcon/>分享連結</button></div></section>
        {currentMember && <section className="group-member-note"><label htmlFor="group-member-note">我的用餐備註 <small>選填</small></label><textarea id="group-member-note" maxLength={120} value={memberNote} onChange={(event) => setMemberNote(event.target.value)} placeholder="例如：我是素食、請先上這份"/><button onClick={() => onUpdateMemberNote(memberNote)} disabled={loading || memberNote === currentMember.note}>{loading ? "儲存中…" : "儲存我的備註"}</button></section>}
        <div className="group-how"><b>朋友加入後會怎麼進行？</b><ol><li><span>1</span>每個人用自己的手機選餐</li><li><span>2</span>大家即時看見整桌內容</li><li><span>3</span>發起人確認後統一送單</li></ol></div>
      </> : <>
        <p className="group-dialog-intro">{isJoining ? "掃描成功。填寫稱呼後就能加入，並各自選擇自己的餐點。" : "先建立一張同桌訂單，再把畫面上的 QR Code 給朋友掃描；最後由你統一確認付款。"}</p>
        <div className="group-form"><label htmlFor="group-member-name">大家怎麼稱呼你？</label><input id="group-member-name" maxLength={12} value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：小森" autoComplete="nickname"/></div>
        <div className="group-dialog-benefits"><div><UsersIcon size={20}/><span><b>不用傳手機</b><small>每個人都能自己加口味備註</small></span></div><div><CopyIcon/><span><b>整桌不漏點</b><small>送出前依成員逐一確認</small></span></div></div>
        <button className="group-primary" disabled={loading || !name.trim() || (isJoining && joinCode.length !== 6)} onClick={() => isJoining ? onJoin(joinCode, name) : onCreate(name)}>{loading ? "正在連接同桌…" : isJoining ? "加入這張訂單" : "建立團體 QR Code"}</button>
      </>}
      {error && <p className="group-dialog-error" role="alert">{error}</p>}
      <p className="group-dialog-note">團體點餐只合併本次桌號的餐點，付款仍由發起人最後確認。</p>
    </section>
  </div>;
}

function OrderFlow({ store, mode, previewOrdering = false }: { store: StoreRecord; mode: "order" | "takeout"; previewOrdering?: boolean }) {
  const [identity, setIdentity] = useState<Identity>(previewOrdering ? { method: "guest", label: "店家預覽" } : { method: "guest", label: "免登入顧客" });
  const [postOrderLineLinked, setPostOrderLineLinked] = useState(false);
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
  const [group, setGroup] = useState<PublicGroupOrderSession | null>(null);
  const [groupDialog, setGroupDialog] = useState(false);
  const [groupInviteCode, setGroupInviteCode] = useState("");
  const [groupMemberId, setGroupMemberId] = useState("");
  const [groupToken, setGroupToken] = useState("");
  const [groupLoading, setGroupLoading] = useState(false);
  const [groupError, setGroupError] = useState("");
  const [groupNotice, setGroupNotice] = useState("");

  const loadGroup = useCallback(async (code: string) => {
    const response = await fetch(`/api/group-orders?code=${encodeURIComponent(code)}`, { cache: "no-store" });
    const result = await response.json() as { group?: PublicGroupOrderSession; error?: string };
    if (!response.ok || !result.group) throw new Error(result.error || "無法同步團體點餐");
    setGroup(result.group);
    return result.group;
  }, []);

  useEffect(() => {
    if (previewOrdering) return;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const scanned = params.get("table");
      if (scanned) setTableNo(scanned.slice(0, 12));
      if (params.get("source") === "marketplace") setOrderSource("rootable_marketplace");
      const invite = cleanGroupCode(params.get("group") || "");
      if (mode === "order" && invite.length === 6) {
        setIdentity({ method: "guest", label: "團體點餐顧客" }); setGroupInviteCode(invite); setGroupDialog(true);
        const membership = sessionStorage.getItem(`rootable-group-${store.slug}-${invite}`);
        if (membership) {
          try {
            const saved = JSON.parse(membership) as { memberId: string; token: string };
            setGroupMemberId(saved.memberId); setGroupToken(saved.token); void loadGroup(invite).catch(() => undefined);
          } catch { sessionStorage.removeItem(`rootable-group-${store.slug}-${invite}`); }
        }
      }
      const savedIdentity = sessionStorage.getItem(`rootable-identity-${store.slug}`);
      if (savedIdentity) {
        try {
          const saved = JSON.parse(savedIdentity) as Identity;
          if (saved.method === "line") setIdentity(saved);
        } catch { sessionStorage.removeItem(`rootable-identity-${store.slug}`); }
      }
      const savedCart = sessionStorage.getItem(`rootable-cart-${store.slug}-${mode}`);
      if (savedCart) {
        try { setCart(JSON.parse(savedCart) as CartLine[]); }
        catch { sessionStorage.removeItem(`rootable-cart-${store.slug}-${mode}`); }
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadGroup, mode, previewOrdering, store.slug]);

  useEffect(() => { if (!previewOrdering) sessionStorage.setItem(`rootable-cart-${store.slug}-${mode}`, JSON.stringify(cart)); }, [cart, mode, previewOrdering, store.slug]);
  useEffect(() => { if (checkout) window.scrollTo({ top: 0, behavior: "auto" }); }, [checkout]);
  useEffect(() => {
    if (!group?.code) return;
    const timer = window.setInterval(() => void loadGroup(group.code).catch(() => undefined), 2500);
    return () => window.clearInterval(timer);
  }, [group?.code, loadGroup]);
  useEffect(() => {
    if (!group?.code || !groupMemberId || !groupToken || group.status !== "active") return;
    const timer = window.setTimeout(async () => {
      const items = cart.map((line) => ({ id: line.id, productId: line.product.id, productName: line.product.name, quantity: line.quantity, unitPrice: line.unitPrice, optionLabel: line.optionLabel, note: line.note, image: line.product.image }));
      const send = () => fetch("/api/group-orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: group.code, memberId: groupMemberId, token: groupToken, action: "sync_cart", items }) });
      try {
        let response = await send();
        if (response.status === 409) { await new Promise((resolve) => window.setTimeout(resolve, 220)); response = await send(); }
        const result = await response.json() as { group?: PublicGroupOrderSession };
        if (response.ok && result.group) setGroup(result.group);
      } catch { /* Local cart remains safe and retries on the next edit. */ }
    }, 520);
    return () => window.clearTimeout(timer);
  }, [cart, group?.code, group?.status, groupMemberId, groupToken]);

  const recommended = useMemo(() => recommendedProducts(store.products), [store.products]);
  const categories = ["熱門推薦", ...Array.from(new Set(store.products.map((product) => product.category).filter(Boolean)))];
  const visible = store.products.filter((product) => (category === "熱門推薦" ? recommended.some((item) => item.id === product.id) : product.category === category) && `${product.name}${product.description}`.toLocaleLowerCase("zh-TW").includes(query.trim().toLocaleLowerCase("zh-TW")));
  const ownCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const ownSubtotal = cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const groupForDisplay = useMemo(() => group ? {
    ...group,
    members: group.members.map((member) => member.id === groupMemberId ? { ...member, items: cart.map((line) => ({ id: line.id, productId: line.product.id, productName: line.product.name, quantity: line.quantity, unitPrice: line.unitPrice, optionLabel: line.optionLabel, note: line.note, image: line.product.image })) } : member),
  } : null, [cart, group, groupMemberId]);
  const count = groupForDisplay ? groupItemCount(groupForDisplay) : ownCount;
  const subtotal = groupForDisplay ? groupSubtotal(groupForDisplay) : ownSubtotal;
  const isGroupHost = Boolean(groupForDisplay?.members.find((member) => member.id === groupMemberId)?.isHost);
  const currentGroupMember = groupForDisplay?.members.find((member) => member.id === groupMemberId);
  const defaultGroupName = identity?.method === "line" ? "LINE 顧客" : "";
  const groupCode = groupForDisplay?.code;
  const groupTableNo = groupForDisplay?.tableNo;
  const groupUrl = useMemo(() => {
    if (!groupCode || !groupTableNo || typeof window === "undefined") return "";
    const url = new URL(window.location.href);
    url.searchParams.set("table", groupTableNo);
    url.searchParams.set("group", groupCode);
    return url.toString();
  }, [groupCode, groupTableNo]);

  const rememberGroup = (nextGroup: PublicGroupOrderSession, memberId: string, token: string) => {
    setGroup(nextGroup); setGroupMemberId(memberId); setGroupToken(token); setGroupInviteCode(nextGroup.code); setGroupError("");
    sessionStorage.setItem(`rootable-group-${store.slug}-${nextGroup.code}`, JSON.stringify({ memberId, token }));
    const url = new URL(window.location.href); url.searchParams.set("table", nextGroup.tableNo); url.searchParams.set("group", nextGroup.code); window.history.replaceState({}, "", url);
  };
  const createGroup = async (memberName: string) => {
    setGroupLoading(true); setGroupError("");
    try {
      const response = await fetch("/api/group-orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", storeId: store.storeId, storeSlug: store.slug, tableNo, memberName }) });
      const result = await response.json() as { group?: PublicGroupOrderSession; memberId?: string; token?: string; error?: string };
      if (!response.ok || !result.group || !result.memberId || !result.token) throw new Error(result.error || "無法建立團體點餐");
      rememberGroup(result.group, result.memberId, result.token);
    } catch (cause) { setGroupError(cause instanceof Error ? cause.message : "無法建立團體點餐"); }
    finally { setGroupLoading(false); }
  };
  const joinGroup = async (code: string, memberName: string) => {
    setGroupLoading(true); setGroupError("");
    try {
      const available = await loadGroup(code);
      if (available.storeId !== store.storeId || available.tableNo !== tableNo) throw new Error("這個團體代碼不是目前店家或桌號");
      const response = await fetch("/api/group-orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "join", code, memberName }) });
      const result = await response.json() as { group?: PublicGroupOrderSession; memberId?: string; token?: string; error?: string };
      if (!response.ok || !result.group || !result.memberId || !result.token) throw new Error(result.error || "無法加入團體點餐");
      rememberGroup(result.group, result.memberId, result.token);
    } catch (cause) { setGroupError(cause instanceof Error ? cause.message : "無法加入團體點餐"); }
    finally { setGroupLoading(false); }
  };
  const shareGroup = async () => {
    if (!groupForDisplay) return;
    try {
      if (navigator.share) await navigator.share({ title: `${store.profile.name}・${groupForDisplay.tableNo} 團體點餐`, text: "掃描 QR Code 或開啟連結，一起選餐", url: groupUrl });
      else { await navigator.clipboard.writeText(groupUrl); setGroupNotice("團體邀請連結已複製"); }
    } catch (cause) { if (!(cause instanceof DOMException && cause.name === "AbortError")) setGroupNotice("請直接讓朋友掃描畫面上的 QR Code"); }
  };

  const add = (product: MenuProduct, quantity: number, selections: Selection, lineNote: string) => {
    const price = product.price + optionPrice(product, selections);
    setCart((current) => [...current, { id: crypto.randomUUID(), product, quantity, selections, unitPrice: price, optionLabel: formatOptions(product, selections), note: lineNote.trim().slice(0, 120) }]);
    setDetail(null);
  };
  const change = (id: string, delta: number) => setCart((current) => current.map((line) => line.id === id ? { ...line, quantity: Math.max(1, line.quantity + delta) } : line));
  const remove = (id: string) => setCart((current) => current.filter((line) => line.id !== id));
  const patchGroup = async (action: string, extra: Record<string, unknown> = {}) => {
    if (!groupForDisplay) throw new Error("找不到團體點餐");
    const response = await fetch("/api/group-orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: groupForDisplay.code, memberId: groupMemberId, token: groupToken, action, ...extra }) });
    const result = await response.json() as { group?: PublicGroupOrderSession; error?: string };
    if (!response.ok || !result.group) throw new Error(result.error || "團體點餐更新失敗");
    setGroup(result.group);
    return result.group;
  };
  const updateMemberNote = async (memberNote: string) => {
    setGroupLoading(true); setGroupError("");
    try { await patchGroup("update_member_note", { memberNote }); setGroupNotice("已儲存你的用餐備註"); }
    catch (cause) { setGroupError(cause instanceof Error ? cause.message : "無法儲存用餐備註"); }
    finally { setGroupLoading(false); }
  };
  const submit = async () => {
    setLoading(true); setError("");
    let lockedGroup: PublicGroupOrderSession | null = null;
    try {
      if (groupForDisplay) {
        const ownItems = cart.map((line) => ({ id: line.id, productId: line.product.id, productName: line.product.name, quantity: line.quantity, unitPrice: line.unitPrice, optionLabel: line.optionLabel, note: line.note, image: line.product.image }));
        await patchGroup("sync_cart", { items: ownItems });
        lockedGroup = await patchGroup("begin_checkout");
      }
      const orderItems = groupForDisplay && lockedGroup ? Array.from(lockedGroup.members.flatMap((member) => member.items.map((item) => ({ ...item, memberId: member.id, memberName: member.name }))).reduce((map, item) => {
        const key = `${item.memberId}|${item.productId}|${item.productName}|${item.optionLabel}|${item.note}|${item.unitPrice}`;
        const current = map.get(key);
        const itemLabel = `${item.productName}${item.optionLabel ? `（${item.optionLabel}）` : ""}${item.note ? `・備註：${item.note}` : ""}`;
        map.set(key, current ? { ...current, quantity: current.quantity + item.quantity } : { productId: item.productId, productName: `【${item.memberName}】${itemLabel}`, quantity: item.quantity, unitPrice: item.unitPrice });
        return map;
      }, new Map<string, { productId: string; productName: string; quantity: number; unitPrice: number }>()).values()) : cart.map((line) => ({ productId: line.product.id, productName: `${line.product.name}${line.optionLabel ? `（${line.optionLabel}）` : ""}${line.note ? `・備註：${line.note}` : ""}`, quantity: line.quantity, unitPrice: line.unitPrice }));
      const groupNote = lockedGroup ? `團體點餐 ${lockedGroup.members.length} 人：${lockedGroup.members.map((member) => `${member.name}${member.note ? `（${member.note}）` : ""}`).join("、")}` : identity?.label || "";
      const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ storeId: store.storeId, tableNo: mode === "order" ? tableNo : `外帶 ${pickupTime}`, paymentMethod: payment === "cash" ? "cash" : "rootable_pay", paymentChannel: payment, orderSource, customerNote: `${groupNote}${note ? `｜${note}` : ""}`, items: orderItems }) });
      const result = await response.json() as { order?: CreatedOrder; error?: string };
      if (!response.ok || !result.order) throw new Error(result.error || "訂單送出失敗");
      if (lockedGroup) await patchGroup("mark_submitted", { orderNo: result.order.orderNo });
      sessionStorage.removeItem(`rootable-cart-${store.slug}-${mode}`); setCart([]); setCreated(result.order);
    } catch (cause) {
      if (lockedGroup) void patchGroup("checkout_failed").catch(() => undefined);
      setError(cause instanceof Error ? cause.message : "訂單服務暫時無法使用");
    } finally { setLoading(false); }
  };

  const submittedGroup = groupForDisplay?.status === "submitted" ? groupForDisplay : null;
  if (created || submittedGroup) {
    const finalOrder = created || { orderNo: submittedGroup!.orderNo, subtotal: groupSubtotal(submittedGroup!), paymentStatus: "paid" };
    const hasLineIdentity = identity?.method === "line" || postOrderLineLinked;
    return <main className="tenant-mobile-shell order-complete-shell"><section className="tenant-success"><div aria-hidden="true">✓</div><p className="tenant-kicker">{submittedGroup ? `${submittedGroup.members.length} 人團體訂單` : "訂單已送出"}</p><h1>{created && payment === "cash" ? "請先到櫃台完成付款" : submittedGroup && !created ? "發起人已送出整桌訂單" : mode === "order" ? "餐點會送到桌邊" : "請依預約時間到店取餐"}</h1>{created && payment === "cash" && <div className="cash-next-step"><b>下一步：向店員出示訂單編號</b><span>店員確認收款後，訂單才會送入廚房開始製作。</span></div>}<dl><div><dt>訂單編號</dt><dd>{finalOrder.orderNo}</dd></div><div><dt>{mode === "order" ? "桌號" : "取餐時間"}</dt><dd>{mode === "order" ? tableNo : pickupTime}</dd></div><div><dt>點餐方式</dt><dd>{submittedGroup ? `團體點餐・${submittedGroup.members.length} 人` : "一般點餐"}</dd></div><div><dt>金額</dt><dd>{money(finalOrder.subtotal)}</dd></div></dl>
      {hasLineIdentity ? <section className="post-order-member linked" aria-live="polite"><span><SparkIcon/></span><div><b>{postOrderLineLinked ? "LINE 登入完成" : "本次消費已連結 LINE"}</b><p>已加入 {store.profile.name} 熟客紀錄，可接收訂單通知與下次優惠。</p></div></section> : <section className="post-order-member"><span><SparkIcon/></span><div><p className="member-eyebrow">送單成功・最後一步為選填</p><h2>用 LINE 留下這次消費</h2><p>登入後可查詢訂單、接收完成通知，並領取下次消費 NT$30 示範優惠。</p><button className="line-login-button compact" onClick={() => { const nextIdentity: Identity = { method: "line", label: "LINE 顧客（模擬）" }; sessionStorage.setItem(`rootable-identity-${store.slug}`, JSON.stringify(nextIdentity)); setIdentity(nextIdentity); setPostOrderLineLinked(true); }}><span>LINE</span>登入 LINE 並加入熟客<small>自願加入・不影響本次訂單</small></button><small>現在不登入也沒關係，訂單已經成功送出。</small></div></section>}
      <p>付款、通知與退款皆為試營運模擬，不會產生真實扣款。</p><a className="tenant-primary" href={`/s/${store.slug}`}>完成並回店家首頁</a></section></main>;
  }

  if (checkout) return <main className="tenant-mobile-shell"><section className="tenant-checkout group-checkout"><header><button onClick={() => setCheckout(false)}>返回</button><div><b>{groupForDisplay ? "確認整桌餐點" : "確認訂單"}</b><span>{mode === "order" ? `內用・桌號 ${tableNo}` : `外帶・${pickupTime} 取餐`}</span></div></header><div className="tenant-checkout-body">
    {groupForDisplay ? <section className="group-checkout-list"><header><div><span><UsersIcon size={20}/></span><div><h1>{groupForDisplay.members.length} 人一起點</h1><p>每個人的餐點都分開列出，送單前再確認一次。</p></div></div><button onClick={() => setGroupDialog(true)}><ShareIcon/>邀請</button></header>{groupForDisplay.members.map((member) => <div className="group-member-order" key={member.id}><div className="group-member-order-head"><span className={`tone-${member.color}`}>{member.name.slice(0, 1)}</span><div><b>{member.name}{member.isHost ? "・發起人" : ""}</b><small>{member.items.reduce((sum, item) => sum + item.quantity, 0)} 份・{money(member.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0))}{member.note ? `・${member.note}` : ""}</small></div>{member.id === groupMemberId && <em>我的餐點</em>}</div>{member.items.length ? member.items.map((item) => <article className="group-member-line" key={item.id}><img src={item.image || store.profile.coverImage} alt=""/><span><b>{item.productName}</b><small>{item.optionLabel || "標準選項"}{item.note ? `・備註：${item.note}` : ""}</small></span><strong>×{item.quantity}<small>{money(item.unitPrice * item.quantity)}</small></strong></article>) : <p className="group-member-empty">還在選餐中</p>}</div>)}</section> : <section><h1>您的餐點</h1>{cart.map((line) => <article className="tenant-cart-line" key={line.id}><ProductImage className="tenant-cart-image" product={line.product}/><div><b>{line.product.name}</b><span>{line.optionLabel}{line.note ? `・備註：${line.note}` : ""}</span><strong>{money(line.unitPrice)}</strong></div><div className="tenant-cart-actions"><div className="tenant-stepper"><button onClick={() => change(line.id, -1)} aria-label={`減少 ${line.product.name}`}>−</button><span>{line.quantity}</span><button onClick={() => change(line.id, 1)} aria-label={`增加 ${line.product.name}`}>＋</button></div><button className="tenant-remove-line" onClick={() => remove(line.id)} aria-label={`移除 ${line.product.name}`}><TrashIcon/></button></div></article>)}</section>}
    {(!groupForDisplay || isGroupHost) && <><section className="tenant-order-info"><h2>{mode === "order" ? "桌號" : "取餐時間"}</h2>{mode === "order" ? <input value={tableNo} readOnly={Boolean(groupForDisplay)} onChange={(event) => setTableNo(event.target.value)} aria-label="桌號"/> : <select value={pickupTime} onChange={(event) => setPickupTime(event.target.value)}>{["11:30", "12:00", "12:30", "17:30", "18:00", "18:30", "19:00"].map((time) => <option key={time}>{time}</option>)}</select>}<label>整桌備註<textarea maxLength={80} value={note} onChange={(event) => setNote(event.target.value)} placeholder="例如：餐具 4 份、一起上菜"/></label></section><fieldset className="tenant-payment"><legend>統一付款方式</legend>{[["cash", "櫃台付現", "送出後請先付款；店員確認後才開始製作"], ["line_pay", "LINE Pay", "Rootable 代支付・模擬"], ["apple_pay", "Apple Pay", "Rootable 代支付・模擬"]].map(([id, label, help]) => <button type="button" className={payment === id ? "selected" : ""} onClick={() => setPayment(id as typeof payment)} key={id}><span/><div><b>{label}</b><small>{help}</small></div><strong>{id === "cash" ? "餐前付款" : "立即付款"}</strong></button>)}</fieldset></>}
    {groupForDisplay && !isGroupHost && <section className="group-waiting-card"><UsersIcon size={24}/><div><h2>餐點會由發起人統一送出</h2><p>你仍可返回菜單調整自己的內容；同桌更新會自動同步。</p></div></section>}{error && <p className="form-error" role="alert">{error}</p>}
  </div><footer className="tenant-checkout-footer"><div><span>{groupForDisplay ? `${groupForDisplay.members.length} 人・${count} 份` : "顧客服務費 NT$ 0"}</span><b>{money(subtotal)}</b></div>{groupForDisplay && !isGroupHost ? <button className="tenant-secondary group-back-menu" onClick={() => setCheckout(false)}>返回調整我的餐點</button> : <button className="tenant-primary" disabled={!count || loading || groupForDisplay?.status === "submitting"} onClick={submit}>{loading ? "正在送出整桌訂單…" : payment === "cash" ? "確認整桌並前往櫃台付款" : `模擬支付 ${money(subtotal)}`}</button>}</footer></section>
    <GroupOrderDialog key={`${groupForDisplay?.code || groupInviteCode || "new"}-${defaultGroupName}`} open={groupDialog} group={groupForDisplay} currentMember={currentGroupMember} defaultName={defaultGroupName} joinCode={groupInviteCode} groupUrl={groupUrl} loading={groupLoading} error={groupError} onClose={() => setGroupDialog(false)} onCreate={createGroup} onJoin={joinGroup} onUpdateMemberNote={updateMemberNote} onShare={shareGroup}/>
  </main>;

  return <main className="tenant-mobile-shell"><section className="uber-menu-page" style={{ "--tenant-primary": store.profile.theme.primary, "--tenant-accent": store.profile.theme.accent } as React.CSSProperties}>
    <header className="uber-menu-top"><a href={`/s/${store.slug}`} aria-label="返回店家首頁"><CloseIcon/></a><div><b>{store.profile.name}</b><span>{mode === "order" ? `內用・桌號 ${tableNo}` : "預約外帶"}</span></div><button aria-label="搜尋" onClick={() => document.getElementById("tenant-menu-search")?.focus()}><SearchIcon/></button></header>
    {mode === "order" && <section className={groupForDisplay ? "group-live-bar active" : "group-live-bar"}><div className="group-live-bar-main"><span><UsersIcon size={20}/></span><div><b>{groupForDisplay ? `${groupForDisplay.members.length} 人正在一起點` : "同桌要一起點嗎？"}</b><small>{groupForDisplay ? `桌號 ${groupForDisplay.tableNo}・掃 QR Code 加入` : "各自用手機選餐，最後由一人統一付款"}</small></div></div>{groupForDisplay ? <div className="group-live-bar-actions"><button onClick={() => setGroupDialog(true)} aria-label="顯示團體點餐 QR Code">顯示 QR</button><button onClick={shareGroup} aria-label="分享團體點餐"><ShareIcon/></button></div> : <button onClick={() => setGroupDialog(true)}>團體點餐</button>}</section>}
    {groupNotice && <p className="group-notice" role="status">{groupNotice}<button onClick={() => setGroupNotice("")} aria-label="關閉提示">關閉</button></p>}
    <div className="uber-search"><SearchIcon/><input id="tenant-menu-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋餐點、飲品或關鍵字"/></div>
    <nav className="uber-category-tabs">{categories.map((item) => <button className={category === item ? "active" : ""} onClick={() => setCategory(item)} key={item}>{item}</button>)}</nav>
    <div className="uber-service-status"><span>● 接單中</span><b>{mode === "order" ? "預計 15–20 分鐘送達" : "最早 17:30 取餐"}</b></div>
    <section className="uber-menu-content"><div className="uber-section-title"><div><p className="tenant-kicker">{query ? "搜尋結果" : "今天想吃什麼？"}</p><h1>{query ? `「${query}」` : category}</h1></div><span>{visible.length} 項</span></div>{visible.length ? <div className="uber-product-grid">{visible.map((product) => <article className={product.soldOut ? "sold-out" : ""} key={product.id}><button onClick={() => !product.soldOut && setDetail(product)}><div className="uber-product-photo"><ProductImage product={product}/>{product.badge && <span>{product.badge}</span>}<i aria-hidden="true">＋</i></div><div className="uber-product-copy"><h2>{product.name}</h2><b>{money(product.price)}</b>{product.availableNote && <small>{product.availableNote}</small>}<p>{product.description}</p></div></button></article>)}</div> : <div className="uber-empty"><b>找不到符合的餐點</b><p>可以換個關鍵字，或切換其他分類看看。</p><button onClick={() => setQuery("")}>清除搜尋</button></div>}</section>
    {count > 0 && <button className={groupForDisplay ? "uber-cart-dock group-cart-dock" : "uber-cart-dock"} onClick={() => setCheckout(true)}><span>{count}</span><b>{groupForDisplay ? `查看整桌・${groupForDisplay.members.length} 人` : "查看購物車"}</b><strong>{money(subtotal)}</strong></button>}
    {detail && <ProductSheet product={detail} onClose={() => setDetail(null)} onAdd={(quantity, selections, lineNote) => add(detail, quantity, selections, lineNote)}/>}<GroupOrderDialog key={`${groupForDisplay?.code || groupInviteCode || "new"}-${defaultGroupName}`} open={groupDialog} group={groupForDisplay} currentMember={currentGroupMember} defaultName={defaultGroupName} joinCode={groupInviteCode} groupUrl={groupUrl} loading={groupLoading} error={groupError} onClose={() => setGroupDialog(false)} onCreate={createGroup} onJoin={joinGroup} onUpdateMemberNote={updateMemberNote} onShare={shareGroup}/>
  </section></main>;
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
      } catch {
        if (cancelled) return;
        if (slug === "senri") {
          setStore(createSeedStore());
          setReviews(seedReviews);
          setFailed(false);
        } else {
          setFailed(true);
        }
      }
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
