"use client";
import { CmsHeading, CmsIntro } from "./CmsPage";
import { useState } from "react";
import { naira } from "../lib/products";
import { api } from "../lib/local/client";
import type { Brand } from "../lib/local/types";
export default function OrderTracker({ brand }: { brand: Brand }) {
  const [result, setResult] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div className="page-shell track-page">
      <div className="page-hero">
        <span className="eyebrow">
          {brand === "kokies" ? "KOKIES WORLD OF GIFTS" : "iDESIRE TRADS"}
        </span>
        <CmsHeading>Track your order.</CmsHeading>
        <p>
          Enter your order or enquiry reference and the phone number used to
          place it.
        </p>
      </div>
      <section className="track-card">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            setResult(null);
            try {
              const v = Object.fromEntries(
                new FormData(e.currentTarget).entries(),
              );
              setResult(
                await api(`/api/local/${brand}`, { type: "track", ...v }),
              );
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Order / enquiry reference
            <input
              name="reference"
              required
              placeholder={brand === "kokies" ? "KWG-…" : "IDT-…"}
            />
          </label>
          <label>
            Phone number
            <input name="phone" type="tel" required />
          </label>
          <button className="button button-dark" disabled={busy}>
            {busy ? "Checking…" : "Track order"}
          </button>
        </form>
        {error && <p role="alert">{error}</p>}
        {result && (
          <div className="track-result" role="status">
            <h2>{result.reference}</h2>
            <strong>{result.status}</strong>
            {result.paymentStatus && <p>Payment: {result.paymentStatus}</p>}
            {result.total !== undefined && (
              <p>
                Recorded total: {naira(result.total)}
                {result.status === "Awaiting quotation"
                  ? " · subject to a final quote"
                  : ""}
              </p>
            )}
            {result.items.map((i: any, n: number) => (
              <p key={n}>
                {i.name}
                {i.quantity ? " × " + i.quantity : ""}
              </p>
            ))}
            <p>Updated {new Date(result.updatedAt).toLocaleString()}</p>
            {result.history?.map((h: any, i: number) => (
              <p key={i}>
                {h.text} · {new Date(h.at).toLocaleDateString()}
              </p>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
