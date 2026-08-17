import type { Metadata } from "next";
import MerchantClient from "./MerchantClient";

export const metadata: Metadata = {
  title: "森日小館｜Rootable 店家接單", description: "平板接單、處理與代支付結算",
  openGraph: { title: "森日小館｜Rootable 店家接單", description: "平板接單、處理與代支付結算", images: [] },
  twitter: { title: "森日小館｜Rootable 店家接單", description: "平板接單、處理與代支付結算", images: [] },
};
export default function MerchantPage() { return <MerchantClient />; }
