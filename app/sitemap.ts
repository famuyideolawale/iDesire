import type { MetadataRoute } from "next";
import { readBusiness } from "../lib/local/store";
import { productPath, type Brand } from "../lib/local/types";

export const dynamic = "force-dynamic";
const origin = process.env.APP_ORIGIN || process.env.RENDER_EXTERNAL_URL || "http://localhost:2030";

const staticPaths = [
  "/", "/shop", "/new", "/wedding-orders", "/customisation", "/about", "/contact",
  "/kokies-world-of-gift", "/kokies-world-of-gift/shop", "/kokies-world-of-gift/corporate-gifts",
  "/kokies-world-of-gift/personalisation", "/kokies-world-of-gift/about",
  "/kokies-world-of-gift/contact", "/kokies-world-of-gift/help",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = staticPaths.map((path) => ({ url: origin + path }));
  for (const brand of ["idesire", "kokies"] as Brand[]) {
    try {
      const b = await readBusiness(brand);
      for (const p of b.products.filter((p) => p.status === "published" && !p.sample))
        entries.push({ url: origin + productPath(brand, p) });
    } catch {
      // The static pages are still listed if the database is unavailable.
    }
  }
  return entries;
}
