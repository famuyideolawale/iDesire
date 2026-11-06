import type { Metadata } from "next";
import { readBusiness } from "../../../lib/local/store";
import ProductClient from "./ProductClient";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const data = await readBusiness("kokies").catch(() => null);
  const product = data?.products.find(p => p.status === "published" && p.id === id);
  if (!product) return {};
  return {
    title: product.seoTitle || product.name,
    description: (product.seoDescription || product.description).slice(0, 300),
  };
}

export default function ProductPage() { return <ProductClient />; }
