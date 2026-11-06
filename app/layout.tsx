import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./fonts.css";
// admin-desk.css also styles the bag, chat and tracking on the storefront, so it stays global.
import "./admin-desk.css";
import "./globals.css";
import "./brands.css";
import "./approved-design.css";
import "./premium.css";
import StoreShell from "../components/StoreShell";
import { readBusiness } from "../lib/local/store";
import { buildPublicData } from "../lib/local/public";
import type { Brand, PublicData } from "../lib/local/types";

const origin = process.env.APP_ORIGIN || process.env.RENDER_EXTERNAL_URL || "http://localhost:2030";

export const metadata: Metadata = {
  metadataBase: new URL(origin),
  title: {
    default: "iDesire TRADS | Where Tradition Meets Innovation",
    template: "%s | iDesire TRADS",
  },
  description: "Premium Asoebi, wedding fabrics, souvenirs, custom packaging and event branding.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    type: "website",
    siteName: "iDesire TRADS",
    images: [{ url: "/idesire-yoruba-wedding-hero.webp" }],
  },
};
export const viewport: Viewport = { themeColor: "#800020" };

async function initialData(): Promise<{ brand: Brand; data: PublicData } | null> {
  const path = (await headers()).get("x-pathname") ?? "";
  if (!path || path === "/admin" || path.startsWith("/admin/")) return null;
  const brand: Brand = path.startsWith("/kokies-world-of-gift") ? "kokies" : "idesire";
  try {
    return { brand, data: buildPublicData(await readBusiness(brand)) };
  } catch {
    return null; // The page still loads its data in the browser.
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG">
      <body>
        <StoreShell initial={await initialData()}>{children}</StoreShell>
      </body>
    </html>
  );
}
