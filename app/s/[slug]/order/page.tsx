import StorefrontClient from "../../../storefront/StorefrontClient";

export default async function StoreOrderPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <StorefrontClient slug={slug} mode="order"/>;
}
