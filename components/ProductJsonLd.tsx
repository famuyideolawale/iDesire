import { effectivePrice, productPath, type Brand, type LocalProduct } from "../lib/local/types";

/** Structured data so search engines can show the product's price and availability. */
export default function ProductJsonLd({ brand, product, available }: { brand: Brand; product: LocalProduct; available: number }) {
  const origin = process.env.APP_ORIGIN || process.env.RENDER_EXTERNAL_URL || "http://localhost:2030";
  const price = effectivePrice(product);
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: (product.seoDescription || product.description).slice(0, 500),
    image: product.image ? [new URL(product.image, origin).toString()] : undefined,
    sku: product.sku || product.id,
    category: product.category,
    brand: { "@type": "Brand", name: brand === "kokies" ? "Kokies World of Gifts" : "iDesire TRADS" },
    offers: price
      ? {
          "@type": "Offer",
          url: origin + productPath(brand, product),
          priceCurrency: "NGN",
          price,
          availability:
            product.availability === "preorder"
              ? "https://schema.org/PreOrder"
              : product.availability === "made" || available > 0
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
        }
      : undefined,
  };
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output with "<" escaped cannot break out of the script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
