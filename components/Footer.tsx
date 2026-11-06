import { Newsletter } from "./LocalEnquiry";
import Link from "next/link";
export default function Footer() {
  return (
    <footer className="footer compact-footer" data-cms-site="footer">
      <div className="footer-main">
        <div className="idesire-footer-brand">
          <Link
            className="footer-logo"
            href="/"
            aria-label="iDesire TRADS home"
          >
            <img src="/idesire-trads-logo.webp" alt="iDesire TRADS" />
          </Link>
          <p>Fabrics and thoughtful finishing for your next celebration.</p>
        </div>
        <div>
          <h4>Explore</h4>
          <Link href="/shop">Shop fabrics</Link>
          <Link href="/new">New arrivals</Link>
          <Link href="/wedding-orders">Wedding orders</Link>
        </div>
        <div>
          <h4>Help</h4>
          <Link href="/contact">Contact us</Link>
          <Link href="/track-order">Track your order</Link>
          <Link href="/kokies-world-of-gift/personalisation">Souvenirs by Kokies ↗</Link>
          <Link href="/account">Your account</Link>
        </div>
        <div>
          <h4>Stay in the loop</h4>
          <p>New fabrics, fresh inspiration.</p>
          <Newsletter />
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 iDesire TRADS</span>
        <Link href="/kokies-world-of-gift">
          Discover Kokies · Gifts & souvenirs ↗
        </Link>
      </div>
    </footer>
  );
}
