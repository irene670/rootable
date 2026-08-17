import type { Metadata } from "next";
import MerchantStudioClient from "./MerchantStudioClient";

export const metadata: Metadata = {
  title: "店家營運後台｜Rootable 森根", description: "編輯店家網站、菜單、訂位、評論、員工與付款方案。",
  openGraph: { title: "店家營運後台｜Rootable 森根", description: "編輯店家網站、菜單、訂位、評論、員工與付款方案。", images: [] },
  twitter: { title: "店家營運後台｜Rootable 森根", description: "編輯店家網站、菜單、訂位、評論、員工與付款方案。", images: [] },
};
export default function MerchantPage() { return <MerchantStudioClient />; }
