"use client";
import { addToBag } from "../../../lib/local/bag";
import { useLocal, useFabricCatalogue, whatsappNumber } from "../../../lib/local/client";
import { notFound, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  products as seed,
  naira,
  Product,
} from "../../../lib/products";
import { CmsHeading } from "../../../components/CmsPage";
import Link from "next/link";
import { ProductGallery, CataloguePhoto } from "../../../components/ProductGallery";
import { FabricServices } from "../../../components/FabricServices";

const MAX_YARDS = 10000;

export default function ProductPage() {
  const params = useParams<{ slug: string }>();
  const { data: serverData } = useLocal();
  const catalogue = useFabricCatalogue();
  const catalogueLoaded = !!serverData;
  const p = catalogue.find((x) => x.slug === params.slug);
  const [colourSlug, setColourSlug] = useState("");
  // Customers buy fabric by the yard: one number in, the total out.
  const [yardsText, setYardsText] = useState("5");
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const colour = params.get("colour");
    setColourSlug(p?.colours?.find(c => c.slug === colour)?.slug ?? p?.colours?.[0]?.slug ?? "");
    const minimum = p?.minimumYards ?? 5;
    // Older shared links used "pieces" of a fixed length; convert them to total yards.
    const length = Number(params.get("yards"));
    const pieces = Number(params.get("pieces")) || 1;
    const total = Number.isInteger(length) && Number.isInteger(pieces) ? length * pieces : NaN;
    setYardsText(String(total >= minimum && total <= MAX_YARDS ? total : minimum));
  }, [p?.slug, p?.minimumYards]);
  const [requestedSize, setSize] = useState("");
  const [notice, setNotice] = useState("");
  if (!p) {
    if (!catalogueLoaded)
      return (
        <div className="page-shell" style={{ paddingTop: 80 }}>
          Loading product…
        </div>
      );
    return notFound();
  }
  const size = p.sizes?.includes(requestedSize) ? requestedSize : p.sizes?.[0];
  const minimumYards = p.minimumYards ?? 5;
  const typed = Number(yardsText);
  const yardsValid = yardsText !== "" && Number.isInteger(typed) && typed >= minimumYards && typed <= MAX_YARDS;
  const yards = yardsValid ? typed : minimumYards;
  const setYards = (value: number) => setYardsText(String(Math.min(MAX_YARDS, Math.max(minimumYards, Math.round(value)))));
  const subtotal = p.price !== undefined ? p.price * yards : undefined;
  const selectedColour = p.colours?.find((c) => c.slug === colourSlug);
  const image = selectedColour?.image ?? p.image;
  const message = [
    "Hi iDesire TRADS, I'd like to ask about this fabric:",
    p.name,
    selectedColour && "Colour: " + selectedColour.name,
    size && "Size: " + size,
    "Yards: " + yards,
    p.price === undefined ? "Price: Please quote" :
      "Fabric total: " + naira(p.price * yards) + " (" + naira(p.price) + " per yard × " + yards + " yards)",
    "",
    "Is it available, and what would delivery cost?",
  ].filter(line => line !== undefined).join("\n");
  const whatsappUrl = `https://wa.me/${whatsappNumber(serverData?.settings.phone, "2348091142201")}?text=${encodeURIComponent(message)}`;
  return (
    <div className="product-detail page-shell" data-cms-product={p.slug}>
      <div className="detail-image">
        <ProductGallery src={image} alt={p.name + (selectedColour ? " in " + selectedColour.name : "")} />
        {p.colours && (
          <div className="colour-thumbs">
            {p.colours.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => setColourSlug(c.slug)}
                aria-label={`View ${c.name}`}
                aria-pressed={colourSlug === c.slug}
              >
                <img src={c.image} alt="" loading="lazy" />
                <span>{c.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="detail-copy">
        <span className="eyebrow">{p.category} / IDESIRE EDIT</span>
        <CmsHeading>{p.name}</CmsHeading>
        <strong className="detail-price">
          {p.price ? `${naira(p.price)} / yard` : "Price on request"}
        </strong>
        <p>{p.description}</p>
        <p className="detail-note">Minimum order: {p.minimumYards ?? 5} yards.</p>
        {p.colours && (
          <>
            <label className="field-label">
              Colour: {selectedColour?.name}
            </label>
            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                margin: "10px 0 22px",
              }}
            >
              {p.colours.map((c) => (
                <button
                  type="button"
                  key={c.slug}
                  onClick={() => setColourSlug(c.slug)}
                  title={c.name}
                  aria-label={`Select ${c.name}`}
                  aria-pressed={colourSlug === c.slug}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: c.hex,
                    border:
                      colourSlug === c.slug
                        ? "3px solid #f9f5f1"
                        : "2px solid white",
                    outline:
                      colourSlug === c.slug
                        ? "2px solid #79183d"
                        : "1px solid #d5ccc7",
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
          </>
        )}
        <div className="yard-picker">
          <label className="field-label" htmlFor="fabric-yards">How many yards?</label>
          <div className="yard-stepper">
            <button type="button" aria-label="One yard less" disabled={yards <= minimumYards} onClick={() => setYards(yards - 1)}>−</button>
            <input
              id="fabric-yards"
              type="number"
              inputMode="numeric"
              min={minimumYards}
              max={MAX_YARDS}
              step="1"
              value={yardsText}
              aria-describedby="yard-help"
              aria-invalid={!yardsValid}
              onChange={(e) => setYardsText(e.target.value.replace(/[^\d]/g, "").slice(0, 5))}
              onBlur={() => { if (!yardsValid) setYards(Number(yardsText) || minimumYards); }}
            />
            <span className="yard-unit">yards</span>
            <button type="button" aria-label="One yard more" disabled={yards >= MAX_YARDS} onClick={() => setYards(yards + 1)}>+</button>
          </div>
          <div className="yard-chips" aria-label="Quick amounts">
            {[...new Set([minimumYards, 10, 20, 50, 100])].filter((n) => n >= minimumYards).map((n) => (
              <button key={n} type="button" aria-pressed={yards === n && yardsValid} onClick={() => setYards(n)}>{n} yd</button>
            ))}
          </div>
          <p id="yard-help" className={"yard-help" + (yardsValid ? "" : " yard-help-error")}>
            {yardsValid ? `Minimum ${minimumYards} yards. Any amount above that, in whole yards.`
              : `Enter a whole number from ${minimumYards} to ${MAX_YARDS.toLocaleString("en-NG")} yards.`}
          </p>
        </div>
        {serverData && p.price !== undefined && (() => {
          const id = serverData.products.find(product => product.slug === p.slug)?.id ?? p.slug;
          const available = serverData.inventory.find(item => item.productId === id)?.available ?? 0;
          const needed = yards;
          return <p className={"stock-note" + (available < needed ? " stock-low" : "")}>
            {available <= 0 ? "Sold out for now. Ask us about the next delivery."
              : available < needed ? `Only ${available} yards in stock right now. You can still add ${yards} yards and request a quote at checkout.`
              : available <= 30 ? `Only ${available} yards left in this colourway.`
              : "In stock and ready to cut."}
          </p>;
        })()}
        {subtotal !== undefined && (
          <div className="fabric-total" aria-live="polite">
            <span>{naira(p.price!)} × {yards.toLocaleString("en-NG")} yards</span>
            <strong>{naira(subtotal)}</strong>
            <small>Delivery is added at checkout for your location.</small>
          </div>
        )}
        {p.sizes?.length ? <label className="field-label">Size <select value={size} onChange={e=>setSize(e.target.value)}>{p.sizes.map(option=><option key={option}>{option}</option>)}</select></label> : null}
        <div className="fabric-actions">
        <button
          className="button button-dark"
          disabled={!yardsValid}
          onClick={() => {
            addToBag("idesire", {
              productId: p.slug,
              quantity: yards,
              colour: selectedColour?.name,
              size,
            });
            setNotice(`Added ${yards} yards to your fabric bag.`);
          }}
        >
          Add to fabric bag
        </button>
        <Link className="button button-outline" href="/cart">
          View fabric bag ↗
        </Link>
        </div>
        {notice && <p role="status">{notice}</p>}
        <a className="text-link" href={whatsappUrl} target="_blank" rel="noreferrer">
          Ask about this fabric on WhatsApp ↗
        </a>
        <div className="detail-accordions">
          <FabricServices fabric={p.name} colour={colourSlug || undefined} yards={yards} />
          {p.price && (
            <>
                <details>
                  <summary>Optional extras & deals</summary>
                  <ul>
                    <li>2-Tone Aso-Oke Gele: ₦7,500</li>
                    <li>Cotton Aso-Oke Gele: ₦7,000+ (depending on design)</li>
                    <li>Raw Silk: ₦3,500</li>
                    <li>Fila: ₦3,000–₦3,500</li>
                  </ul>
                  <p>
                    Extras are priced separately and should be confirmed with
                    our team.
                  </p>
                </details>
                <details>
                  <summary>Bulk order perks</summary>
                  <ul>
                    <li>Complimentary custom paper bags</li>
                    <li>
                      Free logo branding on orders (terms and conditions apply)
                    </li>
                    <li>
                      Optional luxury packaging available at an additional fee
                    </li>
                  </ul>
                </details>
            </>
          )}
          <details>
            <summary>Product details</summary>
            <p>
              Colours shown on screen may vary slightly from the actual fabric.
              Custom colours are available subject to terms. Contact us to confirm current stock.
            </p>
          </details>
          <details>
            <summary>Wedding and bulk orders</summary>
            <p>
              Group quantities and customisation requirements are reviewed
              individually.{" "}
              <Link href="/wedding-orders">Start a wedding enquiry.</Link>
            </p>
          </details>
        </div>
      </div>
      <section className="related-products">
          <div className="section-heading">
            <div>
              <span className="eyebrow">COMPLETE THE LOOK</span>
              <h2>
                Related <em>pieces.</em>
              </h2>
            </div>
            <Link className="text-link" href="/shop">
              View all ↗
            </Link>
          </div>
          <div className="product-grid">
            {catalogue
              .filter(item => item.slug !== p.slug)
              .sort((a,b) => {
                const score = (item: Product) => (p.relatedIds?.includes(item.id ?? item.slug) ? 10 : 0) + (p.category === item.category ? 2 : 0) + (p.collection && p.collection === item.collection ? 1 : 0);
                return score(b) - score(a);
              })
              .slice(0, 4)
              .map((item) => (
                <div key={item.slug} className="related-card">
                  <Link href={`/product/${item.slug}`}>
                    <CataloguePhoto src={item.image} alt={item.name} />
                    <span>{item.category}</span>
                    <h3>{item.name}</h3>
                    <strong>
                      {item.price
                        ? naira(item.price) + " / yard"
                        : "Price on request"}
                    </strong>
                  </Link>
                </div>
              ))}
          </div>
      </section>
    </div>
  );
}
