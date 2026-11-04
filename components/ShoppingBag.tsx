"use client";
import { useEffect, useState } from "react";
import { CmsHeading, CmsIntro } from "./CmsPage";
import Link from "next/link";
import { api, useLocal } from "../lib/local/client";
import { readBag, saveBag, type BagLine } from "../lib/local/bag";
import { type Brand, productPath, homePath } from "../lib/local/types";
import { naira } from "../lib/products";
export default function ShoppingBag({ brand }: { brand: Brand }) {
  const { data } = useLocal(),
    [lines, setLines] = useState<BagLine[]>([]),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [reference, setReference] = useState("");
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
        <p>Review your selection, then send your order to our team.</p>
      </div>
      {reference ? (
        <section className="track-card">
          <h2>Order received.</h2>
          <p>
            Your reference is <strong>{reference}</strong>. Keep it with the
            phone number you used to track your order.
          </p>
          <p>
            No payment was collected. Our team will confirm delivery,
            availability and any personalisation charges.
          </p>
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
              setBusy(true);
              setNotice("");
              try {
                const v = Object.fromEntries(
                  new FormData(e.currentTarget).entries(),
                );
                const r = await api(`/api/local/${brand}`, {
                  ...v,
                  type: "order",
                  items: lines,
                  source: "Website checkout",
                });
                setReference(r.id);
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
            <button className="button button-dark full-button" disabled={busy}>
              {busy ? "Submitting…" : "Send order to our team ↗"}
            </button>
            {notice && <p role="alert">{notice}</p>}
            <small>
              No payment is collected online in this local workspace.
            </small>
          </form>
        </div>
      )}
    </div>
  );
}
