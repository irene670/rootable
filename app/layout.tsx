import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") || headerList.get("host") || "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const image = `${protocol}://${host}/og.png`;
  const title = "Rootable 森根｜小店無紙化點餐與收款";
  const description = "QR Code 點餐、平板接單、現金與代支付，一套工具就能開始。";
  return {
    title, description,
    openGraph: { title, description, images: [{ url: image, width: 1200, height: 630, alt: "Rootable 森根手機點餐與平板接單" }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-Hant"><body>{children}</body></html>;
}
