"use client";
import { addToBag } from "../../../lib/local/bag";
import { useLocal, asFabric } from "../../../lib/local/client";
import { notFound, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  products as seed,
  naira,
  Product,
  readProductCatalogue,
} from "../../../lib/products";
import { CmsHeading } from "../../../components/CmsPage";
import Link from "next/link";

export default function ProductPage() {
  const params = useParams<{ slug: string }>();
  const [catalogue, setCatalogue] = useState<Product[]>(seed);
  const [catalogueLoaded, setCatalogueLoaded] = useState(false);
  const { data: serverData } = useLocal();
  useEffect(() => {
    if (serverData) {
      setCatalogue(serverData.products.map(asFabric));
      setCatalogueLoaded(true);
    }
  }, [serverData]);
  const p = catalogue.find((x) => x.slug === params.slug);
  const [colourSlug, setColourSlug] = useState("");
  useEffect(() => {
    if (p?.colours?.length) {
      const requested = new URLSearchParams(window.location.search).get(
        "colour",
      );
      setColourSlug(
        (current) =>
          current ||
          (p.colours!.some((c) => c.slug === requested)
            ? requested!
            : p.colours![0].slug),
      );
    }
  }, [p]);
  const [yards, setYards] = useState(5);
  useEffect(() => {
    setYards((current) => Math.max(p?.minimumYards ?? 5, current));
  }, [p?.minimumYards]);
  const [quantity, setQuantity] = useState(1);
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
  const selectedColour = p.colours?.find((c) => c.slug === colourSlug);
  const image = selectedColour?.image ?? p.image;
  const priceText = p.price
    ? ` Price: ₦${p.price.toLocaleString("en-NG")} per yard. Estimated fabric subtotal: ₦${(p.price * yards * quantity).toLocaleString("en-NG")}.`
    : " Please confirm the current price per yard and total before payment.";
  const message = `Hello iDesire TRADS, I would like to enquire about ${p.name}${selectedColour ? `, colour: ${selectedColour.name}` : ""}, ${yards} yards per piece, quantity ${quantity}.${priceText} Please confirm availability, delivery and payment details.`;
  const whatsappUrl = `https://wa.me/2348091142201?text=${encodeURIComponent(message)}`;
  return (
    <div className="product-detail page-shell" data-cms-product={p.slug}>
      <div className="detail-image">
        <img
          src={image}
          alt={`${p.name}${selectedColour ? ` in ${selectedColour.name}` : ""}`}
        />
        {p.colours && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,minmax(0,1fr))",
              gap: 8,
              marginTop: 10,
            }}
          >
            {p.colours.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => setColourSlug(c.slug)}
                aria-label={`View ${c.name}`}
                style={{
                  border:
                    colourSlug === c.slug
                      ? "2px solid #79183d"
                      : "1px solid #ddd",
                  padding: 3,
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                <img
                  src={c.image}
                  alt={c.name}
                  style={{
                    width: "100%",
                    height: 90,
                    objectFit: "cover",
                    display: "block",
                  }}
                />
                <span
                  style={{ display: "block", fontSize: 12, padding: "5px 2px" }}
                >
                  {c.name}
                </span>
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
        <p className="detail-note">
          <strong>Minimum order: {p.minimumYards ?? 5} yards.</strong> Prices
          shown are per yard. Customisable colours are available; terms and
          conditions apply.
        </p>
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
                  style={{
                    width: 30,
                    height: 30,
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
            <label className="field-label" htmlFor="yards">
              Fabric length
            </label>
            <select
              id="yards"
              value={yards}
              onChange={(e) => setYards(Number(e.target.value))}
              style={{
                display: "block",
                width: "100%",
                padding: 13,
                margin: "8px 0 18px",
                border: "1px solid #ded5d0",
                background: "transparent",
              }}
            >
              {Array.from(
                new Set([
                  p.minimumYards ?? 5,
                  ...(p.yardOptions ?? [5, 6, 7, 8, 9, 10]).filter(
                    (y) => y >= (p.minimumYards ?? 5),
                  ),
                ]),
              ).map((y) => (
                <option key={y} value={y}>
                  {p.price
                    ? `${y} yards · ${naira(p.price * y)} per piece`
                    : `${y} yards`}
                </option>
              ))}
            </select>
            <p style={{ fontSize: 13, color: "#756b68" }}>
              Minimum order is {p.minimumYards ?? 5} yards. Confirm the required
              length with your tailor before ordering.
            </p>
            {p.price && (
              <div className="detail-accordions">
                <details open>
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
              </div>
            )}
          </>
        )}
        {!p.colours && (
          <>
            <label className="field-label" htmlFor="fabric-yards">
              Fabric length (yards)
            </label>
            <input
              id="fabric-yards"
              type="number"
              min={p.minimumYards ?? 5}
              step="1"
              value={yards}
              onChange={(e) =>
                setYards(
                  Math.max(
                    p.minimumYards ?? 5,
                    Math.floor(Number(e.target.value) || 5),
                  ),
                )
              }
            />
          </>
        )}
        <label className="field-label" htmlFor="quantity">
          Quantity
        </label>
        <div className="quantity-row">
          <input
            id="quantity"
            type="number"
            min="1"
            value={quantity}
            onChange={(e) =>
              setQuantity(Math.max(1, Number(e.target.value) || 1))
            }
          />
          <span>Need a larger quantity? Ask about a group order.</span>
        </div>
        <button
          className="button button-dark full-button"
          onClick={() => {
            addToBag("idesire", {
              productId: p.slug,
              quantity: yards * quantity,
              colour: selectedColour?.name,
            });
            setNotice("Added to your fabric bag.");
          }}
        >
          Add to fabric bag
        </button>
        <Link className="button button-outline full-button" href="/cart">
          View bag & send order ↗
        </Link>
        {notice && <p role="status">{notice}</p>}
        <a
          className="button button-dark full-button"
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
        >
          Enquire about this fabric ↗
        </a>
        <a
          className="button button-outline full-button"
          href={`https://wa.me/2348091142201?text=${encodeURIComponent(message + " Please share payment and delivery options.")}`}
          target="_blank"
          rel="noreferrer"
        >
          Order on WhatsApp
        </a>
        <div className="detail-accordions">
          <details>
            <summary>Product details</summary>
            <p>
              {p.description} Colours shown on screen may vary slightly from the
              actual fabric. Contact us to confirm current stock.
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
              .filter((item) => item.slug !== p.slug)
              .slice(0, 4)
              .map((item) => (
                <div key={item.slug} className="related-card">
                  <Link href={`/product/${item.slug}`}>
                    <img src={item.image} alt={item.name} />
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
    </div>
  );
}
