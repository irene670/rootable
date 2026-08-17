import React from "react";
import { createRoot } from "react-dom/client";
import Home from "../app/page";
import MenuClient from "../app/menu/MenuClient";
import MerchantClient from "../app/merchant/MerchantClient";
import "../app/globals.css";

type PageDefinition = {
  title: string;
  description: string;
  component: React.ReactNode;
};

const path = window.location.pathname.replace(/\/$/, "") || "/";

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
    title: "森日小館｜Rootable 店家接單",
    description: "平板接單、處理與代支付結算",
    component: <MerchantClient />,
  },
};

const page = pages[path] ?? pages["/"];
document.title = page.title;
document.querySelector('meta[name="description"]')?.setAttribute("content", page.description);

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>{page.component}</React.StrictMode>,
);
