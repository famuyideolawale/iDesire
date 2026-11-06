"use client";
import { addToBag } from "../../../lib/local/bag";
import { useLocal, asFabric } from "../../../lib/local/client";
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
  const [yards, setYards] = useState(5);
  const [quantity, setQuantity] = useState(1);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const colour = params.get("colour");
    setColourSlug(p?.colours?.find(c => c.slug === colour)?.slug ?? p?.colours?.[0]?.slug ?? "");
    const minimum = p?.minimumYards ?? 5;
    const length = Number(params.get("yards"));
    const options = p?.yardOptions ?? [5, 6, 7, 8, 9, 10];
    setYards(Number.isInteger(length) && length >= minimum && length <= 100000 &&
      (!p?.colours?.length || options.includes(length) || length === minimum) ? length : minimum);
    const pieces = Number(params.get("pieces"));
    setQuantity(Number.isInteger(pieces) && pieces >= 1 && pieces <= 100000 ? pieces : 1);
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
  const selectedColour = p.colours?.find((c) => c.slug === colourSlug);
  const image = selectedColour?.image ?? p.image;
  const message = [
    "Hi iDesire TRADS, I'd like to ask about this fabric:",
    p.name,
    selectedColour && "Colour: " + selectedColour.name,
    size && "Size: " + size,
    "Quantity: " + quantity + (quantity === 1 ? " piece" : " pieces") + " × " + yards + " yards",
    p.price === undefined ? "Price: Please quote" :
      "Estimated subtotal: " + naira(p.price * yards * quantity) + " (" + naira(p.price) + "/yard)",
    "",
    "Is it available, and what would delivery cost?",
  ].filter(line => line !== undefined).join("\n");
  const whatsappUrl = `https://wa.me/2348091142201?text=${encodeURIComponent(message)}`;
  return (
    <div className="product-detail page-shell" data-cms-product={p.slug}>
      <div className="detail-image">
        <ProductGallery src={image} alt={p.name + (selectedColour ? " in " + selectedColour.name : "")} />
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
                aria-pressed={colourSlug === c.slug}
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
        {serverData && p.price !== undefined && <p>{serverData.inventory.find(item => item.productId === p.slug)?.available ?? serverData.inventory.find(item => item.productId === serverData.products.find(product => product.slug === p.slug)?.id)?.available ?? 0} yards available</p>}
        {p.price !== undefined && <p className="fabric-subtotal">Fabric subtotal <strong>{naira(p.price * yards * quantity)}</strong></p>}
        {p.sizes?.length ? <label className="field-label">Size <select value={size} onChange={e=>setSize(e.target.value)}>{p.sizes.map(option=><option key={option}>{option}</option>)}</select></label> : null}
        <div className="fabric-actions">
        <button
          className="button button-dark"
          onClick={() => {
            addToBag("idesire", {
              productId: p.slug,
              quantity: yards * quantity,
              colour: selectedColour?.name,
              size,
            });
            setNotice("Added to your fabric bag.");
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
          <FabricServices fabric={p.name} colour={colourSlug || undefined} yards={yards} quantity={quantity} />
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
