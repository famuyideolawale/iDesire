"use client";
import { useEffect, useRef, useState } from "react";
import { CmsHeading } from "./CmsPage";
import Link from "next/link";
import { api, useLocal } from "../lib/local/client";
import { readBag, saveBag, type BagLine } from "../lib/local/bag";
import { type Brand, productPath, homePath } from "../lib/local/types";
import { naira } from "../lib/products";
import { OrderArtwork } from "./OrderArtwork";
import { OrderProgress, type Receipt } from "./OrderProgress";
export default function ShoppingBag({ brand }: { brand: Brand }) {
  const { data, error, reload } = useLocal(),
    [lines, setLines] = useState<BagLine[]>([]),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [order, setOrder] = useState<Receipt | null>(null),
    [recovering, setRecovering] = useState(true),
    [quote, setQuote] = useState(false);
  const submitting = useRef(false);
  const checkoutStorage = "checkout-receipt-" + brand;
  useEffect(() => {
    let active = true;
    const key = localStorage.getItem(checkoutStorage);
    if (!key) { setRecovering(false); return; }
    api<Receipt>(`/api/local/${brand}`, { type: "receipt", key })
      .then(receipt => {
        if (!active) return;
        const pending = localStorage.getItem(checkoutStorage + "-pending");
        if (pending === JSON.stringify(readBag(brand))) saveBag(brand, []);
        localStorage.removeItem(checkoutStorage + "-pending");
        setOrder(receipt);
      })
      .catch(error => {
        if (active && error.status !== 404) setNotice("Could not load your receipt. Refresh to try again.");
      })
      .finally(() => { if (active) setRecovering(false); });
    return () => { active = false; };
  }, [brand, checkoutStorage]);
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
  const needsQuote = lines.some(line => {
    const product = data?.products.find(p => p.id === line.productId);
    return product?.price === null || product?.sample || (brand === "kokies" && product?.priceConfirmed !== true) ||
      (line.personalisation?.method && line.personalisation.method !== "none") ||
      (!!line.personalisation?.productColour && line.personalisation.productColour !== "As pictured");
  });
  const insufficient = lines.some(line => {
    const available = data?.inventory.find(i => i.productId === line.productId)?.available ?? 0;
    return lines.filter(item => item.productId === line.productId).reduce((sum, item) => sum + item.quantity, 0) > available;
  });
  const invalidLines = !!data && lines.some(line => {
    const product = data.products.find(p => p.id === line.productId);
    return !product || !Number.isInteger(line.quantity) || line.quantity < product.minimum || line.quantity > 100000;
  });
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
      {recovering ? <p role="status">Checking for your saved receipt...</p> : order ? (
        <section className="track-card">
          <h2>Order received</h2>
          <p>Reference <strong>{order.reference}</strong></p>
          <button type="button" className="button button-outline" onClick={async () => {
            try { await navigator.clipboard.writeText(order.reference); setNotice("Reference copied."); }
            catch { setNotice("Select and copy the reference above."); }
          }}>Copy reference</button>
          <OrderProgress receipt={order} brand={brand} />
          <button type="button" className="button button-outline" onClick={async () => {
            try { setOrder(await api<Receipt>(`/api/local/${brand}`, {type: "receipt", key: localStorage.getItem(checkoutStorage)})); }
            catch { setNotice("Could not refresh your receipt. Please try again."); }
          }}>Refresh status</button>
          {brand === "kokies" && <OrderArtwork key={order.reference} reference={order.reference}
            receiptKey={localStorage.getItem(checkoutStorage) ?? undefined} hasArtwork={order.hasArtwork} proof={order.proof}
            editable={["Awaiting quotation", "Awaiting payment", "Paid"].includes(order.status)}
            refresh={async () => setOrder(await api<Receipt>(`/api/local/${brand}`, {type: "receipt", key: localStorage.getItem(checkoutStorage)}))} />}
          <Link href={`${homePath(brand) === "/" ? "" : homePath(brand)}/track-order?reference=${encodeURIComponent(order.reference)}`}>
            Track this order
          </Link>
          <button type="button" className="button button-outline full-button" onClick={() => {
            localStorage.removeItem(checkoutStorage);
            setOrder(null);
            setNotice("");
          }}>Back to your bag</button>
          {notice && <p role="status">{notice}</p>}
        </section>
      ) : !lines.length ? (
        <div className="empty-cart">
          {notice && <p role="alert">{notice}</p>}
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
                        {p.price !== null && !p.sample && <p>{data?.inventory.find(i => i.productId === p.id)?.available ?? 0} {p.unit === "yard" ? "yards" : "units"} available</p>}
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
                    <p>{data ? "Product unavailable. Please remove it from your bag." : "Loading product details..."}</p>
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
              if (submitting.current || !data || invalidLines || (insufficient && !needsQuote && !quote)) return;
              submitting.current = true;
              setBusy(true);
              setNotice("");
              try {
                const v = Object.fromEntries(
                  new FormData(e.currentTarget).entries(),
                );
                const checkoutKey = localStorage.getItem(checkoutStorage) || crypto.randomUUID();
                localStorage.setItem(checkoutStorage, checkoutKey);
                localStorage.setItem(checkoutStorage + "-pending", JSON.stringify(lines));
                const r = await api<Receipt>(`/api/local/${brand}`, {
                  ...v,
                  type: "order",
                  checkoutKey,
                  ...(quote ? { kind: "enquiry" } : {}),
                  items: lines,
                  source: "Website checkout",
                });
                setOrder(r);
                if (JSON.stringify(readBag(brand)) === JSON.stringify(lines)) change([]);
                localStorage.removeItem(checkoutStorage + "-pending");
              } catch (e) {
                const key = localStorage.getItem(checkoutStorage);
                const recovered = key ? await api<Receipt>(`/api/local/${brand}`, {type: "receipt", key}).catch(() => null) : null;
                if (recovered) {
                  setOrder(recovered);
                  if (JSON.stringify(readBag(brand)) === JSON.stringify(lines)) change([]);
                  localStorage.removeItem(checkoutStorage + "-pending");
                } else setNotice((e as Error).message);
              } finally {
                submitting.current = false;
                setBusy(false);
              }
            }}
          >
            <h2>Your details</h2>
            <h3>{needsQuote || quote ? "Base estimate" : "Subtotal"} {naira(total)}</h3>
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
            {error && <p role="alert">Could not refresh the catalogue. <button type="button" onClick={reload}>Retry</button></p>}
            {invalidLines && <p role="alert">Review the minimum quantity and remove unavailable products.</p>}
            {insufficient && !needsQuote && <label className="stock-quote-choice">
              <input type="checkbox" checked={quote} onChange={e => setQuote(e.target.checked)} />
              Request a quote instead. Your quantity exceeds current availability.
            </label>}
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
            <button className="button button-dark full-button" disabled={busy || !data || invalidLines || (insufficient && !needsQuote && !quote)}>
              {busy ? "Placing order…" : (needsQuote || quote ? "Request quote" : "Place order to continue")}
            </button>
            {notice && <p role="alert">{notice}</p>}
          </form>
        </div>
      )}
    </div>
  );
}
