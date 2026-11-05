"use client";
import { useEffect, useState } from "react";
import { CmsHeading } from "./CmsPage";
import Link from "next/link";
import { api, useLocal } from "../lib/local/client";
import { readBag, saveBag, type BagLine } from "../lib/local/bag";
import { type Brand, productPath, homePath } from "../lib/local/types";
import { naira } from "../lib/products";
import type { LocalOrder } from "../lib/local/types";
import { WhatsAppPayment } from "./WhatsAppPayment";
export default function ShoppingBag({ brand }: { brand: Brand }) {
  const { data } = useLocal(),
    [lines, setLines] = useState<BagLine[]>([]),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [order, setOrder] = useState<Pick<LocalOrder, "id" | "status"> | null>(null);
  useEffect(() => {
    const load = () => setLines(readBag(brand));
    load();
    window.addEventListener("bag-change", load);
    return () => window.removeEventListener("bag-change", load);
  }, [brand]);
  const change = (next: BagLine[]) => {
    saveBag(brand, next);
    setLines(next);
  };
  const total = lines.reduce(
    (n, l) =>
      n +
      (data?.products.find((p) => p.id === l.productId)?.price || 0) *
        l.quantity,
    0,
  );
  return (
    <div
      className={`page-shell shopping-bag ${brand === "kokies" ? "kokies-bag" : ""}`}
    >
      <div className="page-hero">
        <span className="eyebrow">
          {brand === "kokies" ? "KOKIES WORLD OF GIFTS" : "iDESIRE TRADS"}
        </span>
        <CmsHeading>
          {brand === "kokies" ? "Your gift bag." : "Your fabric bag."}
        </CmsHeading>
        <p>Review your selection and place your order to continue on WhatsApp.</p>
      </div>
      {order ? (
        <section className="track-card">
          <h2>Order received.</h2>
          <p>
            Your reference is <strong>{order.id}</strong>. Keep it with the
            phone number you used to track your order.
          </p>
          <p>
            Your order is unpaid. Message our team to confirm your final total
            and get payment instructions.
          </p>
          <WhatsAppPayment
            brand={brand}
            reference={order.id}
            status={order.status}
          />
          <Link
            href={`${homePath(brand) === "/" ? "" : homePath(brand)}/track-order`}
          >
            Track this order ↗
          </Link>
        </section>
      ) : !lines.length ? (
        <div className="empty-cart">
          <h2>Your bag is waiting for something lovely.</h2>
          <Link
            className="button button-dark"
            href={brand === "kokies" ? "/kokies-world-of-gift/shop" : "/shop"}
          >
            Explore the collection ↗
          </Link>
        </div>
      ) : (
        <div className="bag-grid">
          <section>
            {lines.map((l, i) => {
              const p = data?.products.find((p) => p.id === l.productId);
              return (
                <article className="bag-item" key={i}>
                  {p ? (
                    <>
                      <img src={p.image} alt={p.name} />
                      <div>
                        <Link href={productPath(brand, p)}>
                          <h2>{p.name}</h2>
                        </Link>
                        <p>
                          {p.price === null
                            ? "Price to quote"
                            : `${naira(p.price)} / ${p.unit}`}
                        </p>
                        {l.colour && <p>Colour: {l.colour}</p>}
                        {l.personalisation &&
                          l.personalisation.method !== "none" && (
                            <p>
                              Personalisation:{" "}
                              {String(
                                l.personalisation.wording ||
                                  l.personalisation.method,
                              )}
                            </p>
                          )}
                        <label>
                          Quantity
                          <input
                            type="number"
                            min={p.minimum}
                            step="1"
                            value={l.quantity}
                            onChange={(e) =>
                              change(
                                lines.map((x, n) =>
                                  n === i
                                    ? { ...x, quantity: Number(e.target.value) }
                                    : x,
                                ),
                              )
                            }
                          />
                        </label>
                      </div>
                    </>
                  ) : (
                    <p>Product unavailable. Please remove it from your bag.</p>
                  )}
                  <button
                    onClick={() => change(lines.filter((_, n) => n !== i))}
                  >
                    Remove
                  </button>
                </article>
              );
            })}
            <Link
              href={brand === "kokies" ? "/kokies-world-of-gift/shop" : "/shop"}
            >
              ← Continue shopping
            </Link>
          </section>
          <form
            className="track-card"
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy) return;
              setBusy(true);
              setNotice("");
              try {
                const v = Object.fromEntries(
                  new FormData(e.currentTarget).entries(),
                );
                const r = await api<Pick<LocalOrder, "id" | "status">>(`/api/local/${brand}`, {
                  ...v,
                  type: "order",
                  items: lines,
                  source: "Website checkout",
                });
                setOrder(r);
                change([]);
              } catch (e) {
                setNotice((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <h2>Your details</h2>
            <h3>Base subtotal {naira(total)}</h3>
            <p>
              Quoted products, personalisation and delivery are confirmed
              separately.
            </p>
            <label>
              Your name
              <input name="customerName" autoComplete="name" required />
            </label>
            <label>
              Email
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <label>
              Phone
              <input name="phone" type="tel" autoComplete="tel" required />
            </label>
            <label>
              Delivery address
              <textarea name="address" autoComplete="street-address" required />
            </label>
            <label>
              Order notes / required date
              <textarea name="notes" />
            </label>
            <fieldset className="checkout-payment">
              <legend>Payment method</legend>
              <div className="checkout-payment-active">
                <strong>WhatsApp</strong>
                <span>Available now</span>
              </div>
              <p>Place your order first, then continue with our team on WhatsApp.</p>
              <div className="checkout-payment-options">
                <button type="button" disabled>
                  Paystack <span>Coming soon</span>
                </button>
                <button type="button" disabled>
                  Flutterwave <span>Coming soon</span>
                </button>
              </div>
            </fieldset>
            <button className="button button-dark full-button" disabled={busy || !data}>
              {busy ? "Placing order…" : "Place order to continue ↗"}
            </button>
            {notice && <p role="alert">{notice}</p>}
          </form>
        </div>
      )}
    </div>
  );
}
