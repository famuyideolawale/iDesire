import type { Metadata } from "next";
import { readBusiness } from "../../../lib/local/store";
import ProductClient from "./ProductClient";
import ProductJsonLd from "../../../components/ProductJsonLd";
import { availableStock } from "../../../lib/local/actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const data = await readBusiness("kokies").catch(() => null);
  const product = data?.products.find(p => p.status === "published" && p.id === id);
  if (!product) return {};
  return {
    title: product.seoTitle || product.name,
    description: (product.seoDescription || product.description).slice(0, 300),
    openGraph: product.image ? { images: [{ url: product.image }] } : undefined,
  };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await readBusiness("kokies").catch(() => null);
  const product = data?.products.find(p => p.status === "published" && p.id === id);
  return (
    <>
      {data && product && <ProductJsonLd brand="kokies" product={product} available={availableStock(data, product.id)} />}
      <ProductClient />
    </>
  );
}
