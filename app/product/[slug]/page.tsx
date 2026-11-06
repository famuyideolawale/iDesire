import type { Metadata } from "next";
import { readBusiness } from "../../../lib/local/store";
import ProductClient from "./ProductClient";
import ProductJsonLd from "../../../components/ProductJsonLd";
import { availableStock } from "../../../lib/local/actions";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await readBusiness("idesire").catch(() => null);
  const product = data?.products.find(p => p.status === "published" && p.slug === slug);
  if (!product) return {};
  return {
    title: product.seoTitle || product.name,
    description: (product.seoDescription || product.description).slice(0, 300),
    openGraph: product.image ? { images: [{ url: product.image }] } : undefined,
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await readBusiness("idesire").catch(() => null);
  const product = data?.products.find(p => p.status === "published" && p.slug === slug);
  return (
    <>
      {data && product && <ProductJsonLd brand="idesire" product={product} available={availableStock(data, product.id)} />}
      <ProductClient />
    </>
  );
}
