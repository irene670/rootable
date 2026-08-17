import type { Metadata } from "next";
import MenuClient from "./MenuClient";

export const metadata: Metadata = {
  title: "森日小館｜手機點餐",
  description: "Rootable QR Code 點餐試營運頁面",
  openGraph: { title: "森日小館｜手機點餐", description: "Rootable QR Code 點餐試營運頁面", images: [] },
  twitter: { title: "森日小館｜手機點餐", description: "Rootable QR Code 點餐試營運頁面", images: [] },
};

export default function MenuPage() { return <MenuClient />; }
