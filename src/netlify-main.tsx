import React from "react";
import { createRoot } from "react-dom/client";
import Home from "../app/page";
import MenuClient from "../app/menu/MenuClient";
import MerchantClient from "../app/merchant/MerchantClient";
import MerchantStudioClient from "../app/merchant/MerchantStudioClient";
import OnboardingClient from "../app/onboarding/OnboardingClient";
import StorefrontClient from "../app/storefront/StorefrontClient";
import "../app/globals.css";

type PageDefinition = {
  title: string;
  description: string;
  component: React.ReactNode;
};

const path = window.location.pathname.replace(/\/$/, "") || "/";
const hostPrefix = window.location.hostname.endsWith(".rootable.tw") ? window.location.hostname.split(".")[0] : "";
const storeMatch = path.match(/^\/s\/([^/]+)(?:\/(order|takeout|reserve))?$/);
const storeSlug = storeMatch?.[1] || hostPrefix || "senri";
const subdomainMode = hostPrefix ? (path.match(/^\/(order|takeout|reserve)$/)?.[1] || "website") : "";
const storeMode = (storeMatch?.[2] || (storeMatch ? "website" : subdomainMode)) as "website" | "order" | "takeout" | "reserve" | "";
const merchantSlug = new URLSearchParams(window.location.search).get("store") || localStorage.getItem("rootable-merchant-slug") || "senri";

const pages: Record<string, PageDefinition> = {
  "/": {
    title: "Rootable 森根｜QR Code 點餐與店家接單",
    description: "顧客掃碼點餐、店家平板接單，支援現金與模擬代支付。",
    component: <Home />,
  },
  "/menu": {
    title: "森日小館｜手機點餐",
    description: "Rootable QR Code 點餐試營運頁面",
    component: <MenuClient />,
  },
  "/merchant": {
    title: "店家營運後台｜Rootable 森根",
    description: "編輯店家網站、菜單、訂位、評論、員工與付款方案。",
    component: <MerchantStudioClient initialSlug={merchantSlug} />,
  },
  "/merchant/orders": {
    title: "森日小館｜Rootable 訂單工作台",
    description: "平板即時接單、備餐與收現。",
    component: <MerchantClient />,
  },
  "/start": {
    title: "免費開店｜Rootable 森根",
    description: "自助建立店家網站、菜單與 QR Code 點餐。",
    component: <OnboardingClient />,
  },
};

const tenantPage: PageDefinition | null = storeMode ? {
  title: `${storeMode === "website" ? "店家首頁" : storeMode === "reserve" ? "線上訂位" : storeMode === "takeout" ? "預約外帶" : "手機點餐"}｜Rootable 森根`,
  description: "店家網站、手機點餐、預約外帶與訂位。",
  component: <StorefrontClient slug={storeSlug} mode={storeMode}/>,
} : null;
const page = tenantPage ?? pages[path] ?? pages["/"];
document.title = page.title;
document.querySelector('meta[name="description"]')?.setAttribute("content", page.description);

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>{page.component}</React.StrictMode>,
);
