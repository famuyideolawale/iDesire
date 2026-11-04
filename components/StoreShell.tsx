"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Announcement } from "./BrandDetails";
import Header from "./Header";
import Footer from "./Footer";
import LiveChat from "./LiveChat";
import BrandDirectory from "./BrandDirectory";
import { LocalProvider } from "../lib/local/client";
import CmsPage from "./CmsPage";
import KokiesHeader from "./KokiesHeader";

export default function StoreShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const path = usePathname();
  if (path === "/admin" || path.startsWith("/admin/"))
    return <div id="main-content">{children}</div>;
  if (
    path === "/kokies-world-of-gift" ||
    path.startsWith("/kokies-world-of-gift/")
  )
    return (
      <LocalProvider key="kokies" brand="kokies">
        <div className="kokies-site">
          <a className="skip-link" href="#main-content">
            Skip to content
          </a>
          <BrandDirectory current="kokies" />
          <KokiesHeader />
          <Announcement />
          <main id="main-content">
            <CmsPage>{children}</CmsPage>
          </main>
          <footer
            className="kokies-footer compact-footer"
            data-cms-site="footer"
          >
            <div className="kokies-footer-brand">
              <Link href="/kokies-world-of-gift" aria-label="Kokies home">
                <img
                  src="/kokies/kokies-world-of-gifts-logo.jpg"
                  alt="Kokies World of Gifts"
                />
              </Link>
              <p>
                Personalised gifts, corporate keepsakes and event souvenirs.
              </p>
            </div>
            <div>
              <span className="kokies-eyebrow">THE GIFT HOUSE</span>
              <Link href="/kokies-world-of-gift/shop">Shop gifts</Link>
              <Link href="/kokies-world-of-gift/corporate-gifts">
                Corporate gifting
              </Link>
              <Link href="/kokies-world-of-gift/personalisation">
                Make it personal
              </Link>
            </div>
            <div>
              <span className="kokies-eyebrow">HERE TO HELP</span>
              <Link href="/kokies-world-of-gift/contact">
                Contact & enquiries
              </Link>
              <Link href="/kokies-world-of-gift/track-order">
                Track your order
              </Link>
              <Link href="/kokies-world-of-gift/help">Ordering & FAQs</Link>
            </div>
            <div className="kokies-footer-sister">
              <span className="kokies-eyebrow">OUR SISTER BUSINESS</span>
              <h3>iDesire TRADS</h3>
              <p>Asoebi, lace and occasion fabrics.</p>
              <Link href="/">Visit iDesire ↗</Link>
            </div>
            <div className="kokies-footer-bottom">
              <small>© 2026 Kokies World of Gifts</small>
              <Link href="/kokies-world-of-gift/about">Our story</Link>
            </div>
          </footer>
          <LiveChat brand="kokies" />
        </div>
      </LocalProvider>
    );
  return (
    <LocalProvider key="idesire" brand="idesire">
      <div className="idesire-site">
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <BrandDirectory current="idesire" />
        <Header />
        <Announcement />
        <main id="main-content">
          <CmsPage>{children}</CmsPage>
        </main>
        <Footer />
        <LiveChat brand="idesire" />
      </div>
    </LocalProvider>
  );
}
