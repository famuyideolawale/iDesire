"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X, ShoppingBag } from "lucide-react";
import { useBagCount } from "../lib/local/bag";

const links = [
  { label: "Shop gifts", href: "/kokies-world-of-gift/shop" },
  { label: "Corporate gifting", href: "/kokies-world-of-gift/corporate-gifts" },
  { label: "Personalisation", href: "/kokies-world-of-gift/personalisation" },
  { label: "Our story", href: "/kokies-world-of-gift/about" },
];
export default function KokiesHeader() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const bagCount = useBagCount("kokies");
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (open)
      document
        .querySelector<HTMLAnchorElement>("#kokies-navigation a")
        ?.focus();
  }, [open]);
  return (
    <header
      className="kokies-header"
      data-cms-site="header"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setOpen(false);
          toggle.current?.focus();
        }
      }}
    >
      <Link
        href="/kokies-world-of-gift"
        className="kokies-brand"
        aria-label="Kokies home"
      >
        <img src="/kokies/kokies-logo.webp" alt="" />
      </Link>
      <nav
        id="kokies-navigation"
        className={open ? "kokies-navigation-open" : ""}
        aria-label="Kokies navigation"
      >
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={path === link.href ? "page" : undefined}
          >
            {link.label}
          </Link>
        ))}
        <Link
          className="kokies-mobile-contact"
          href="/kokies-world-of-gift/contact"
        >
          Contact & enquiries
        </Link>
        <Link
          className="kokies-mobile-contact"
          href="/kokies-world-of-gift/track-order"
        >
          Track an order
        </Link>
        <Link className="kokies-mobile-contact mobile-sister-link" href="/">
          iDesire · Asoebi & fabrics ↗
        </Link>
      </nav>
      <div className="kokies-nav-actions">
        <Link
          className="kokies-header-cta"
          href="/kokies-world-of-gift/contact"
        >
          Start a gift brief ↗
        </Link>
        <Link
          className="kokies-bag-link"
          href="/kokies-world-of-gift/cart"
          aria-label={bagCount ? `Gift bag, ${bagCount} ${bagCount === 1 ? "item" : "items"}` : "Gift bag"}
          aria-current={path === "/kokies-world-of-gift/cart" ? "page" : undefined}
        >
          <ShoppingBag size={20} strokeWidth={1.8} />
          {bagCount > 0 && <span className="bag-count" aria-hidden="true">{bagCount}</span>}
        </Link>
        <button
          ref={toggle}
          className="kokies-menu-toggle"
          aria-controls="kokies-navigation"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={19} /> : <Menu size={19} />}
          <span>{open ? "Close" : "Menu"}</span>
        </button>
      </div>
    </header>
  );
}
