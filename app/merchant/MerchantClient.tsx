"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Native anchors avoid the deployed Vinext Link runtime crash. */

import { useCallback, useEffect, useMemo, useState } from "react";

type OrderItem = { id?: number; productName: string; quantity: number; unitPrice: number };
type Order = {
  id: string;
  orderNo: string;
  tableNo: string;
  status: string;
  paymentMethod: string;
  paymentChannel: string;
  paymentStatus: string;
  settlementStatus: string;
  subtotal: number;
  platformFee: number;
  merchantPayout: number;
  customerNote: string;
  createdAt: string;
  items: OrderItem[];
};
type MerchantView = "live" | "completed" | "settlement";

const labels: Record<string, string> = { new: "待接單", accepted: "已接單", preparing: "製作中", ready: "可取餐", completed: "已完成", cancelled: "已取消" };
const nextAction: Record<string, { label: string; status: string }> = {
  new: { label: "接單", status: "accepted" },
  accepted: { label: "開始製作", status: "preparing" },
  preparing: { label: "標記可取餐", status: "ready" },
  ready: { label: "完成取餐", status: "completed" },
};
const queueColumns = [
  { id: "new", title: "待接單", hint: "新訂單先確認", statuses: ["new"] },
  { id: "preparing", title: "製作中", hint: "依進單順序處理", statuses: ["accepted", "preparing"] },
  { id: "ready", title: "可取餐", hint: "交餐後完成訂單", statuses: ["ready"] },
];

const money = (value: number) => `NT$ ${value.toLocaleString("zh-TW")}`;
const orderTime = (value: string) => new Date(value).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });

export default function MerchantClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [view, setView] = useState<MerchantView>("live");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState("");
  const [lastSynced, setLastSynced] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const loadOrders = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await fetch("/api/orders?storeId=senri-demo", { cache: "no-store" });
      const result = await response.json() as { orders?: Order[]; error?: string };
      if (!response.ok) throw new Error(result.error || "訂單讀取失敗");
      setOrders(result.orders || []);
      setLastSynced(Date.now());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "連線失敗");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const firstLoad = window.setTimeout(() => { void loadOrders(); }, 0);
    const syncTimer = window.setInterval(() => loadOrders(true), 5000);
    const clockTimer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => {
      window.clearTimeout(firstLoad);
      window.clearInterval(syncTimer);
      window.clearInterval(clockTimer);
    };
  }, [loadOrders]);

  const updateOrder = async (order: Order, changes: { status?: string; paymentStatus?: string }) => {
    setUpdating(order.id);
    setError("");
    try {
      const response = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: order.id, storeId: "senri-demo", ...changes }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "更新失敗");
      await loadOrders(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新失敗");
    } finally {
      setUpdating("");
    }
  };

  const activeOrders = orders.filter((order) => !["completed", "cancelled"].includes(order.status));
  const completedOrders = orders.filter((order) => order.status === "completed");
  const counts = useMemo(() => ({
    new: orders.filter((order) => order.status === "new").length,
    preparing: orders.filter((order) => ["accepted", "preparing"].includes(order.status)).length,
    ready: orders.filter((order) => order.status === "ready").length,
  }), [orders]);
  const productionCounts = useMemo(() => {
    const totals = new Map<string, number>();
    activeOrders.forEach((order) => order.items.forEach((item) => totals.set(item.productName, (totals.get(item.productName) || 0) + item.quantity)));
    return Array.from(totals.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [activeOrders]);
  const payOrders = orders.filter((order) => order.paymentMethod === "rootable_pay" && order.paymentStatus === "paid");
  const gross = payOrders.reduce((sum, order) => sum + order.subtotal, 0);
  const fees = payOrders.reduce((sum, order) => sum + order.platformFee, 0);
  const payout = gross - fees;

  const elapsedMinutes = (createdAt: string) => {
    const started = new Date(createdAt).getTime();
    if (!Number.isFinite(started)) return 0;
    return Math.max(0, Math.floor((now - started) / 60000));
  };

  const paymentLabel = (order: Order) => order.paymentMethod === "cash"
    ? (order.paymentStatus === "paid" ? "現金已收" : "現金待收")
    : `${order.paymentChannel === "line_pay" ? "LINE Pay" : "Apple Pay"} 已付`;

  const renderOrder = (order: Order, history = false) => {
    const minutes = elapsedMinutes(order.createdAt);
    return (
      <article className={`kds-ticket status-${order.status} ${minutes >= 15 && !history ? "is-urgent" : ""}`} key={order.id}>
        <header className="ticket-header">
          <div className="ticket-table"><span>桌號</span><strong>{order.tableNo}</strong></div>
          <div className="ticket-identity"><b>{order.orderNo}</b><span>{orderTime(order.createdAt)} 進單</span></div>
          <div className="ticket-time"><strong>{minutes}</strong><span>分鐘</span></div>
        </header>

        <div className="ticket-flags">
          <span className={`status-badge status-${order.status}`}>{labels[order.status]}</span>
          <span className={`payment-badge ${order.paymentStatus}`}>{paymentLabel(order)}</span>
        </div>

        <div className="ticket-items">
          {order.items.map((item, index) => (
            <div key={`${item.productName}-${index}`}><b>{item.quantity}</b><span>{item.productName}</span></div>
          ))}
        </div>

        {order.customerNote && <p className="order-note"><b>顧客備註</b>{order.customerNote}</p>}

        <footer className="ticket-footer">
          <div className="ticket-total"><span>訂單金額</span><b>{money(order.subtotal)}</b></div>
          {history ? (
            <button className="secondary-ticket-action" onClick={() => updateOrder(order, { status: "ready" })} disabled={updating === order.id}>重新開啟</button>
          ) : (
            <div className="ticket-actions">
              {order.paymentMethod === "cash" && order.paymentStatus === "unpaid" && (
                <button className="cash-button" onClick={() => updateOrder(order, { paymentStatus: "paid" })} disabled={updating === order.id}>確認收現</button>
              )}
              {nextAction[order.status] && (
                <button className="progress-button" onClick={() => updateOrder(order, { status: nextAction[order.status].status })} disabled={updating === order.id}>
                  {updating === order.id ? "更新中…" : nextAction[order.status].label}
                </button>
              )}
            </div>
          )}
        </footer>
      </article>
    );
  };

  const viewTitle = view === "live" ? "接單工作台" : view === "completed" ? "已完成訂單" : "代支付結算";

  return (
    <main className="merchant-page">
      <aside className="merchant-sidebar">
        <a className="brand merchant-brand" href="/"><span className="brand-mark">R</span><span>Rootable <b>森根</b></span></a>
        <div className="merchant-store"><span className="store-avatar">森</span><div><b>森日小館</b><small>高雄鹽埕・試營運店</small></div></div>
        <nav className="merchant-nav" aria-label="店家後台導覽">
          <button className={view === "live" ? "active" : ""} onClick={() => setView("live")} aria-pressed={view === "live"}><span>01</span><div><b>接單工作台</b><small>{activeOrders.length} 張進行中</small></div></button>
          <button className={view === "completed" ? "active" : ""} onClick={() => setView("completed")} aria-pressed={view === "completed"}><span>02</span><div><b>已完成</b><small>{completedOrders.length} 張訂單</small></div></button>
          <button className={view === "settlement" ? "active" : ""} onClick={() => setView("settlement")} aria-pressed={view === "settlement"}><span>03</span><div><b>代支付結算</b><small>{payOrders.length} 筆交易</small></div></button>
        </nav>
        <div className="merchant-sidebar-status"><span className="sync-dot" />系統連線正常</div>
      </aside>

      <section className="merchant-main">
        <header className="merchant-topbar">
          <div><p className="merchant-kicker">今日營運</p><h1>{viewTitle}</h1></div>
          <div className="merchant-actions">
            <div className="sync-status"><span className="sync-dot" /><b>自動同步</b><small>{lastSynced ? `${new Date(lastSynced).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })} 更新` : "準備連線"}</small></div>
            <button className="refresh-button" onClick={() => loadOrders()} disabled={loading}>重新整理</button>
            <a className="open-menu-link" href="/menu">開啟顧客點餐</a>
          </div>
        </header>

        {error && <p className="form-error dashboard-error" role="alert">{error}</p>}

        {view === "live" && (
          <div className="live-workspace">
            <section className="metric-row" aria-label="即時訂單摘要">
              <article className="metric-new"><span>待接單</span><b>{counts.new}</b><small>請先確認</small></article>
              <article><span>製作中</span><b>{counts.preparing}</b><small>廚房處理</small></article>
              <article className="metric-ready"><span>可取餐</span><b>{counts.ready}</b><small>等待交付</small></article>
              <article><span>全部進行中</span><b>{activeOrders.length}</b><small>即時同步</small></article>
            </section>

            {productionCounts.length > 0 && (
              <section className="production-strip" aria-label="目前待製作餐點總數">
                <div><span>備餐總覽</span><small>所有進行中訂單</small></div>
                {productionCounts.map(([name, quantity]) => <p key={name}><b>{quantity}</b><span>{name}</span></p>)}
              </section>
            )}

            {loading ? (
              <div className="kds-loading" aria-live="polite"><span /><span /><span /><p>正在同步訂單…</p></div>
            ) : (
              <section className="order-board" aria-label="訂單流程看板" aria-live="polite">
                {queueColumns.map((column) => {
                  const columnOrders = orders.filter((order) => column.statuses.includes(order.status));
                  return (
                    <section className={`queue-column queue-${column.id}`} key={column.id} aria-labelledby={`queue-${column.id}-title`}>
                      <header><div><h2 id={`queue-${column.id}-title`}>{column.title}</h2><p>{column.hint}</p></div><b>{columnOrders.length}</b></header>
                      <div className="queue-list">
                        {columnOrders.length ? columnOrders.map((order) => renderOrder(order)) : <div className="queue-empty"><b>目前沒有訂單</b><span>{column.id === "new" ? "新訂單會即時出現在這裡" : "訂單推進後會移到這一欄"}</span></div>}
                      </div>
                    </section>
                  );
                })}
              </section>
            )}
          </div>
        )}

        {view === "completed" && (
          <section className="history-panel">
            <header><div><h2>今日已完成</h2><p>若誤按完成，可重新開啟回到「可取餐」。</p></div><b>{completedOrders.length} 張</b></header>
            <div className="history-grid">{completedOrders.length ? completedOrders.map((order) => renderOrder(order, true)) : <div className="dashboard-empty"><b>今天還沒有完成的訂單</b><p>完成取餐後，訂單會保留在這裡。</p></div>}</div>
          </section>
        )}

        {view === "settlement" && (
          <section className="settlement-workspace">
            <div className="settlement-summary-card"><p>本期預計結算</p><strong>{money(payout)}</strong><span>模擬資料・下次結算日 9 月 10 日</span></div>
            <div className="settlement-stat-grid">
              <article><span>已收交易款</span><b>{money(gross)}</b><small>{payOrders.length} 筆代支付</small></article>
              <article><span>Rootable 服務費</span><b>− {money(fees)}</b><small>試營運費率 3.9%</small></article>
              <article><span>顧客加價</span><b>NT$ 0</b><small>費用由店家負擔</small></article>
            </div>
            <div className="settlement-detail"><h2>結算規則</h2><ol><li><b>每月彙整</b><span>彙整上月已付款且無退款爭議的訂單。</span></li><li><b>費用透明</b><span>交易款、手續費與店家實收分開列示。</span></li><li><b>固定撥款</b><span>每月 10 日撥付上一結算週期款項。</span></li></ol><p className="demo-notice">目前為模擬代支付，不會產生真實撥款。</p></div>
          </section>
        )}
      </section>
    </main>
  );
}
