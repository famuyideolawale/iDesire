"use client";
import { useEffect, useRef, useState } from "react";
import { CmsHeading } from "./CmsPage";
import Link from "next/link";
import { api, useLocal, whatsappNumber } from "../lib/local/client";
import WhatsAppIcon from "./WhatsAppIcon";
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
  const [deliveryMethod, setDeliveryMethod] = useState("delivery");
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
    return product?.price === null || product?.sample || product?.availability === "made" || product?.availability === "preorder" || (brand === "kokies" && product?.priceConfirmed !== true) ||
      (line.personalisation?.method && line.personalisation.method !== "none") ||
      (!!line.personalisation?.productColour && line.personalisation.productColour !== "As pictured");
  });
  const insufficient = lines.some(line => {
    const available = data?.inventory.find(i => i.productId === line.productId)?.available ?? 0;
    return lines.filter(item => item.productId === line.productId).reduce((sum, item) => sum + item.quantity, 0) > available;
  });
  const invalidLines = !!data && lines.some(line => {
    const product = data.products.find(p => p.id === line.productId);
    return !product || !Number.isInteger(line.quantity) || line.quantity < product.minimum || line.quantity > (product.maximum ?? 100000);
  });
  const shopName = brand === "kokies" ? "Kokies World of Gifts" : "iDesire TRADS";
  const whatsapp = whatsappNumber(data?.settings.phone, brand === "kokies" ? "2349099591993" : "2348091142201");
  // A ready-written message listing the bag, for customers who want to talk first.
  const bagMessage = () => {
    const items = lines.map((line) => {
      const p = data?.products.find((x) => x.id === line.productId);
      const unit = p?.unit === "yard" ? "yards" : "units";
      return `- ${p?.name ?? line.productId}: ${line.quantity} ${unit}${line.colour ? `, ${line.colour}` : ""}${line.size ? `, ${line.size}` : ""}`;
    });
    return [`Hi ${shopName}, I'd like to order:`, ...items, "", "Could you confirm availability, delivery and the total?"].join("\n");
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
        <p>Review your selection, place your order, then confirm payment with us on WhatsApp.</p>
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
                        {p.price !== null && !p.sample && (() => {
                          const available = data?.inventory.find(i => i.productId === p.id)?.available ?? 0;
                          const unit = p.unit === "yard" ? "yards" : "units";
                          return <p className="stock-line">{available <= 0 ? "Sold out for now. We can quote a restock." : available < l.quantity ? `Only ${available} ${unit} available.` : "In stock"}</p>;
                        })()}
                        {l.colour && <p>Colour: {l.colour}</p>}{l.size && <p>Size: {l.size}</p>}
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
                            max={p.maximum ?? 100000}
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
            <p><Link href={(brand === "kokies" ? homePath(brand) : "") + "/account"}>Sign in</Link> to save this order to your account, or continue as a guest.</p>
            <fieldset className="choice-cards">
              <legend>How would you like to receive it?</legend>
              {[
                ["delivery", "Delivery", "To your address. We confirm the fee before you pay."],
                ["pickup", "Pickup", "Collect from us. We confirm the place and time."],
              ].map(([value, title, hint]) => (
                <label key={value} className="choice-card">
                  <input type="radio" name="deliveryMethod" value={value} checked={deliveryMethod === value} onChange={() => setDeliveryMethod(value)} />
                  <span><b>{title}</b><small>{hint}</small></span>
                </label>
              ))}
            </fieldset>
            {deliveryMethod === "delivery" ? <label>Delivery address<textarea name="address" autoComplete="street-address" required /></label> :
              <p className="choice-note">Our team will confirm the pickup location and time on WhatsApp.</p>}
            <label>
              Order notes / required date
              <textarea name="notes" />
            </label>
            {error && <p role="alert">Could not refresh the catalogue. <button type="button" onClick={reload}>Retry</button></p>}
            {invalidLines && <p role="alert">Review the minimum and maximum quantities, and remove unavailable products.</p>}
            {insufficient && !needsQuote && <label className="stock-quote-choice">
              <input type="checkbox" checked={quote} onChange={e => setQuote(e.target.checked)} />
              Request a quote instead. Your quantity exceeds current availability.
            </label>}
            <section className="checkout-steps" aria-labelledby="checkout-steps-title">
              <h3 id="checkout-steps-title">How payment works</h3>
              <ol>
                <li><b>Place your order</b><span>You get a reference straight away{needsQuote || quote ? " and we prepare your quote" : " and we hold your items for 24 hours"}.</span></li>
                <li><b>Confirm on WhatsApp</b><span>We confirm the total, including delivery, and send our bank details.</span></li>
                <li><b>Pay by bank transfer</b><span>Once we confirm your payment, we start on your order.</span></li>
              </ol>
            </section>
            <button className="button button-dark full-button" disabled={busy || !data || invalidLines || (insufficient && !needsQuote && !quote)}>
              {busy ? "Placing order…" : (needsQuote || quote ? "Request my quote" : "Place order")}
            </button>
            <a className="checkout-ask-whatsapp" href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(bagMessage())}`} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon /> Prefer to talk first? Send this bag on WhatsApp
            </a>
            {notice && <p role="alert">{notice}</p>}
          </form>
        </div>
      )}
    </div>
  );
}
