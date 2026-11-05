"use client";

import { CmsHeading } from "./CmsPage";
import { useEffect, useState } from "react";
import { api } from "../lib/local/client";
import type { Brand } from "../lib/local/types";
import { OrderArtwork } from "./OrderArtwork";
import { OrderProgress, type Receipt } from "./OrderProgress";

type TrackingResult = { reference: string; status: string; updatedAt: string } |
  (Pick<Receipt, "reference" | "status" | "updatedAt" | "paymentStatus"> & Partial<Receipt>);

export default function OrderTracker({ brand }: { brand: Brand }) {
  const [reference, setReference] = useState("");
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [verified, setVerified] = useState<{ phone: string; receipt: Receipt }>();
  const [error, setError] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const [busy, setBusy] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => setReference(new URLSearchParams(location.search).get("reference") || ""), []);
  const endpoint = "/api/local/" + brand;

  return (
    <div className="page-shell track-page">
      <div className="page-hero">
        <span className="eyebrow">
          {brand === "kokies" ? "KOKIES WORLD OF GIFTS" : "iDESIRE TRADS"}
        </span>
        <CmsHeading>Track your order.</CmsHeading>
        <p>Enter your order or enquiry reference to check its status.</p>
      </div>
      <section className="track-card">
        <form onSubmit={async e => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          setError("");
          setVerificationError("");
          setVerified(undefined);
          setResult(null);
          try {
            setResult(await api<TrackingResult>(endpoint, { type: "track", reference: reference.trim() }));
          } catch (error) {
            setError((error as Error).message);
          } finally {
            setBusy(false);
          }
        }}>
          <label>
            Order / enquiry reference
            <input name="reference" value={reference} onChange={e => setReference(e.target.value)}
              required maxLength={150} spellCheck={false} autoCapitalize="characters"
              placeholder={brand === "kokies" ? "KWG-…" : "IDT-…"} />
          </label>
          <button className="button button-dark" disabled={busy || !reference.trim()}>
            {busy ? "Checking…" : "Track order"}
          </button>
        </form>
        {error && <p role="alert">{error}</p>}
        {result && (
          <div className="track-result">
            <div role="status">
              <h2>{result.reference}</h2>
              {"paymentStatus" in result ? <OrderProgress receipt={verified?.receipt ?? result} brand={brand} /> : <p>{result.status}</p>}
              <p>Updated {new Date(verified?.receipt.updatedAt ?? result.updatedAt).toLocaleString()}</p>
            </div>
            {brand === "kokies" && "paymentStatus" in result && (
              verified ? <OrderArtwork key={result.reference} reference={result.reference}
                phone={verified.phone} hasArtwork={verified.receipt.hasArtwork} proof={verified.receipt.proof}
                editable={["Awaiting quotation", "Awaiting payment", "Paid"].includes(verified.receipt.status)}
                refresh={async () => setVerified({
                  phone: verified.phone,
                  receipt: await api<Receipt>(endpoint, { type: "track", reference: result.reference, phone: verified.phone }),
                })} /> : (
                <details>
                  <summary>Access artwork and proofs</summary>
                  <p>Verify the phone number used for this order to open its private files.</p>
                  <form onSubmit={async e => {
                    e.preventDefault();
                    if (verifying) return;
                    const phone = String(new FormData(e.currentTarget).get("phone") ?? "").trim();
                    if (!phone) { setVerificationError("Enter the phone number used for this order."); return; }
                    setVerifying(true);
                    setVerificationError("");
                    try {
                      const receipt = await api<Receipt>(endpoint, { type: "track", reference: result.reference, phone });
                      setVerified({ phone, receipt });
                    } catch (error) {
                      setVerificationError((error as Error).message);
                    } finally {
                      setVerifying(false);
                    }
                  }}>
                    <label>Order phone number<input name="phone" type="tel" autoComplete="tel" required /></label>
                    <button className="button button-outline" disabled={verifying}>{verifying ? "Verifying…" : "Verify and open"}</button>
                  </form>
                  {verificationError && <p role="alert">{verificationError}</p>}
                </details>
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
}
