"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type OrderItem = { id?: number; productName: string; quantity: number; unitPrice: number };
type Order = {
  id: string; orderNo: string; tableNo: string; status: string; paymentMethod: string; paymentChannel: string;
  paymentStatus: string; settlementStatus: string; subtotal: number; platformFee: number; merchantPayout: number;
  customerNote: string; createdAt: string; items: OrderItem[];
};

const labels: Record<string, string> = { new: "新訂單", accepted: "已接單", preparing: "製作中", ready: "可取餐", completed: "已完成", cancelled: "已取消" };
const nextAction: Record<string, { label: string; status: string }> = {
  new: { label: "接受訂單", status: "accepted" }, accepted: { label: "開始製作", status: "preparing" },
  preparing: { label: "通知取餐", status: "ready" }, ready: { label: "完成訂單", status: "completed" },
};

export default function MerchantClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState("active");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState("");

  const loadOrders = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await fetch("/api/orders?storeId=senri-demo", { cache: "no-store" });
      const result = await response.json() as { orders?: Order[]; error?: string };
      if (!response.ok) throw new Error(result.error || "訂單讀取失敗");
      setOrders(result.orders || []); setError("");
    } catch (err) { setError(err instanceof Error ? err.message : "連線失敗"); }
    finally { if (!quiet) setLoading(false); }
  }, []);

  useEffect(() => {
    const firstLoad = window.setTimeout(() => { void loadOrders(); }, 0);
    const timer = window.setInterval(() => loadOrders(true), 5000);
    return () => { window.clearTimeout(firstLoad); window.clearInterval(timer); };
  }, [loadOrders]);

  const updateOrder = async (order: Order, changes: { status?: string; paymentStatus?: string }) => {
    setUpdating(order.id); setError("");
    try {
      const response = await fetch("/api/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: order.id, storeId: "senri-demo", ...changes }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "更新失敗");
      await loadOrders(true);
    } catch (err) { setError(err instanceof Error ? err.message : "更新失敗"); }
    finally { setUpdating(""); }
  };

  const visibleOrders = orders.filter((order) => filter === "active" ? !["completed", "cancelled"].includes(order.status) : filter === "all" || order.status === filter);
  const counts = useMemo(() => ({
    new: orders.filter((o) => o.status === "new").length,
    preparing: orders.filter((o) => ["accepted", "preparing"].includes(o.status)).length,
    ready: orders.filter((o) => o.status === "ready").length,
  }), [orders]);
  const payOrders = orders.filter((o) => o.paymentMethod === "rootable_pay" && o.paymentStatus === "paid");
  const gross = payOrders.reduce((sum, o) => sum + o.subtotal, 0);
  const fees = payOrders.reduce((sum, o) => sum + o.platformFee, 0);

  return (
    <main className="merchant-page">
      <aside className="merchant-sidebar">
        <Link className="brand merchant-brand" href="/"><span className="brand-mark">R</span><span>Rootable <b>森根</b></span></Link>
        <nav className="merchant-nav" aria-label="店家後台導覽">
          <button className="active"><span>01</span>即時訂單</button><button><span>02</span>菜單管理</button><button><span>03</span>代支付結算</button><button><span>04</span>店家設定</button>
        </nav>
        <div className="store-card"><span className="store-avatar">森</span><div><b>森日小館</b><small>高雄鹽埕・試營運店</small></div></div>
      </aside>
      <section className="merchant-main">
        <header className="merchant-topbar"><div><p className="eyebrow">即時營運</p><h1>訂單中心</h1></div><div className="merchant-actions"><span className="live-pill">每 5 秒同步</span><Link className="button button-secondary" href="/menu">開啟顧客點餐</Link></div></header>
        <div className="operations-grid">
          <section className="orders-panel">
            <div className="metric-row"><article><span>新訂單</span><b>{counts.new}</b><small>等待接單</small></article><article><span>進行中</span><b>{counts.preparing}</b><small>已接單／製作</small></article><article><span>可取餐</span><b>{counts.ready}</b><small>等待交付</small></article></div>
            <div className="order-toolbar"><div className="status-tabs" role="tablist" aria-label="訂單篩選">{[{ id: "active", label: "進行中" }, { id: "new", label: "新訂單" }, { id: "ready", label: "可取餐" }, { id: "completed", label: "已完成" }, { id: "all", label: "全部" }].map((tab) => <button role="tab" aria-selected={filter === tab.id} className={filter === tab.id ? "active" : ""} key={tab.id} onClick={() => setFilter(tab.id)}>{tab.label}</button>)}</div><button className="refresh-button" onClick={() => loadOrders()} disabled={loading}>重新整理</button></div>
            {error && <p className="form-error dashboard-error" role="alert">{error}</p>}
            <div className="merchant-order-list" aria-live="polite">
              {loading ? <div className="dashboard-empty"><b>正在同步訂單…</b></div> : visibleOrders.length === 0 ? <div className="dashboard-empty"><b>目前沒有這個狀態的訂單</b><p>從顧客點餐頁送出一筆訂單，就會立即出現在這裡。</p><Link className="button button-primary" href="/menu">前往顧客點餐</Link></div> : visibleOrders.map((order) => <article className={`merchant-order status-${order.status}`} key={order.id}>
                <header><div className="order-identity"><span>{order.tableNo}</span><div><b>{order.orderNo}</b><small>{new Date(order.createdAt).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}</small></div></div><div className="order-badges"><span className="status-badge">{labels[order.status]}</span><span className={`payment-badge ${order.paymentStatus}`}>{order.paymentMethod === "cash" ? (order.paymentStatus === "paid" ? "現金已收" : "現金待收") : `${order.paymentChannel === "line_pay" ? "LINE Pay" : "Apple Pay"} 已付`}</span></div></header>
                <div className="merchant-order-items">{order.items.map((item, index) => <div key={`${item.productName}-${index}`}><b>{item.quantity}</b><span>{item.productName}</span><small>NT$ {item.quantity * item.unitPrice}</small></div>)}</div>
                {order.customerNote && <p className="order-note"><b>備註</b>{order.customerNote}</p>}
                <footer><div><span>訂單金額</span><b>NT$ {order.subtotal}</b></div><div className="order-actions">{order.paymentMethod === "cash" && order.paymentStatus === "unpaid" && <button className="cash-button" onClick={() => updateOrder(order, { paymentStatus: "paid" })} disabled={updating === order.id}>確認收現</button>}{nextAction[order.status] && <button className="progress-button" onClick={() => updateOrder(order, { status: nextAction[order.status].status })} disabled={updating === order.id}>{updating === order.id ? "更新中…" : nextAction[order.status].label}</button>}</div></footer>
              </article>)}
            </div>
          </section>
          <aside className="settlement-panel"><p className="eyebrow">本期代支付</p><h2>預計結算</h2><strong>NT$ {gross - fees}</strong><div className="settlement-breakdown"><span>已收交易款<b>NT$ {gross}</b></span><span>Rootable 服務費 3.9%<b>− NT$ {fees}</b></span></div><div className="settlement-date"><small>下次結算日</small><b>9 月 10 日</b><p>結算上月已完成且無退款爭議的訂單。</p></div><p className="demo-notice">目前為模擬代支付，不會產生真實撥款。</p></aside>
        </div>
      </section>
    </main>
  );
}
