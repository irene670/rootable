"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Shared Vinext and Netlify SPA client. */
import { useState } from "react";

export default function OnboardingClient() {
  const [signedIn, setSignedIn] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", ownerName: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/stores", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const result = await response.json() as { store?: { slug: string }; error?: string };
      if (!response.ok || !result.store) throw new Error(result.error || "開店失敗");
      localStorage.setItem("rootable-merchant-slug", result.store.slug);
      window.location.href = `/merchant?store=${encodeURIComponent(result.store.slug)}`;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "開店服務暫時無法使用"); } finally { setLoading(false); }
  };
  return <main className="onboarding-page"><header><a className="brand" href="/"><span className="brand-mark">R</span><span>Rootable <b>森根</b></span></a><span>免費開店・不用綁卡</span></header><section className="onboarding-layout"><div className="onboarding-copy"><p className="eyebrow">最快 10 分鐘上線</p><h1>把你的店，變成一個會接單的網站。</h1><p>建立店家首頁、菜單、內用 QR 點餐、預約外帶與訂位。現金訂單永久免費，需要代支付再按成功交易計費。</p><ol><li><b>01</b><span>用 LINE 建立店家帳號</span></li><li><b>02</b><span>填店名與網址前綴</span></li><li><b>03</b><span>編輯菜單後直接發布</span></li></ol></div><div className="onboarding-card">{!signedIn ? <><span className="tenant-logo">R</span><h2>店家登入</h2><p>正式版將連接 LINE Login；目前先用模擬登入完成整條開店流程。</p><button className="line-login-button" onClick={() => setSignedIn(true)}><span>LINE</span>使用 LINE 登入<small>模擬登入，不存取真實 LINE 資料</small></button><a href="/merchant?store=senri">直接查看示範店後台</a></> : <><p className="tenant-kicker">LINE 模擬登入成功</p><h2>建立第一家店</h2><label>店家名稱<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="例如：森日小館"/></label><label>網址前綴<div className="slug-field"><input value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} placeholder="senri"/><span>.rootable.tw</span></div></label><label>負責人姓名<input value={form.ownerName} onChange={(event) => setForm({ ...form, ownerName: event.target.value })}/></label><label>店家電話<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })}/></label>{error && <p className="form-error">{error}</p>}<button className="tenant-primary" disabled={loading || form.slug.length < 3 || !form.name || !form.ownerName} onClick={submit}>{loading ? "正在建立…" : "建立店家並進入後台"}</button><small>免費版採 Rootable 統一付款與訂位規則。</small></>}</div></section></main>;
}
