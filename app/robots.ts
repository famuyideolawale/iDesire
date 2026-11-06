import type { MetadataRoute } from "next";

const origin = process.env.APP_ORIGIN || process.env.RENDER_EXTERNAL_URL || "http://localhost:2030";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/cart", "/kokies-world-of-gift/cart", "/account", "/kokies-world-of-gift/account"] },
    sitemap: origin + "/sitemap.xml",
  };
}
