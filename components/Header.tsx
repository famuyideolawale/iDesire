"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X, Search, ShoppingBag } from "lucide-react";

const navigation = [
  { name: "Shop fabrics", href: "/shop", className: "shop-all-link" },
  { name: "Asoebi", href: "/new" },
  { name: "Weddings", href: "/wedding-orders" },
  { name: "Customisation", href: "/customisation" },
  { name: "Our story", href: "/about" },
];
export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (open)
      document
        .querySelector<HTMLAnchorElement>("#idesire-navigation a")
        ?.focus();
  }, [open]);
  return (
    <>
      <header
        className="site-header"
        data-cms-site="header"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            menuButton.current?.focus();
          }
        }}
      >
        <Link className="wordmark" href="/" aria-label="iDesire TRADS home">
          <img src="/idesire-trads-logo.svg" alt="" />
        </Link>
        <nav
          id="idesire-navigation"
          className={open ? "mobile-open" : ""}
          aria-label="iDesire navigation"
        >
          {navigation.map((item) => (
            <Link
              key={item.href}
              className={item.className}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {item.name}
            </Link>
          ))}
          <Link className="mobile-utility-link" href="/track-order">
            Track order
          </Link>
          <Link className="mobile-utility-link" href="/contact">
            Contact
          </Link>
        </nav>
        <div className="header-actions">
          <Link className="header-track" href="/track-order">
            Track order
          </Link>
          <Link
            className="header-icon"
            href="/shop#collection-search"
            aria-label="Search fabrics"
          >
            <Search size={21} />
          </Link>
          <Link
            className="header-icon bag-link"
            href="/cart"
            aria-label="Shopping bag"
          >
            <ShoppingBag size={21} />
          </Link>
          <button
            ref={menuButton}
            className="idesire-menu-toggle"
            aria-controls="idesire-navigation"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={19} /> : <Menu size={19} />}
            <span>{open ? "Close" : "Menu"}</span>
          </button>
        </div>
      </header>
    </>
  );
}
