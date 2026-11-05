"use client";
import { CmsHeading } from "./CmsPage";
import { useEffect, useState } from "react";
import { api } from "../lib/local/client";
import type { Brand } from "../lib/local/types";
import { OrderArtwork } from "./OrderArtwork";
import { OrderProgress, type Receipt } from "./OrderProgress";
export default function OrderTracker({ brand }: { brand: Brand }) {
  const [reference, setReference] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  useEffect(() => setReference(new URLSearchParams(location.search).get("reference") || ""), []);
  const [result, setResult] = useState<Receipt | { reference: string; status: string; updatedAt: string; items: {name: string; quantity: number}[] } | null>(null),
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
              setResult(await api(`/api/local/${brand}`, { type: "track", ...v }));
              setVerifiedPhone(String(v.phone));
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
              value={reference}
              onChange={e => setReference(e.target.value)}
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
            {"paymentStatus" in result ? <OrderProgress receipt={result} brand={brand} /> : <p>{result.status}</p>}
            {brand === "kokies" && "paymentStatus" in result && <OrderArtwork key={result.reference} reference={result.reference}
              phone={verifiedPhone} hasArtwork={result.hasArtwork} proof={result.proof}
              editable={["Awaiting quotation", "Awaiting payment", "Paid"].includes(result.status)}
              refresh={async () => setResult(await api(`/api/local/${brand}`, { type: "track", reference: result.reference, phone: verifiedPhone }))} />}
            <p>Updated {new Date(result.updatedAt).toLocaleString()}</p>
          </div>
        )}
      </section>
    </div>
  );
}
