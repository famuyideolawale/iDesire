"use client";
import { useState } from "react";
import { api } from "../lib/local/client";

export function FabricServices({ fabric, colour, yards, quantity }: {
  fabric: string; colour?: string; yards: number; quantity: number;
}) {
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  return <>
    <button type="button" className="button button-outline" onClick={async () => {
      const url = new URL(location.href);
      url.search = new URLSearchParams({ ...(colour ? {colour} : {}), yards: String(yards), pieces: String(quantity) }).toString();
      url.hash = "";
      try { await navigator.clipboard.writeText(url.href); setNotice("Fabric selection link copied."); }
      catch { setShareUrl(url.href); }
    }}>Share this Asoebi selection</button>
    {shareUrl && <label>Selection link<input readOnly value={shareUrl} onFocus={e => e.currentTarget.select()} /></label>}
    <details>
      <summary>Request a fabric swatch</summary>
      <form className="swatch-form" onSubmit={async e => {
        e.preventDefault();
        if (busy) return;
        const form = e.currentTarget;
        setBusy(true);
        try {
          const result = await api<{id: string}>("/api/local/idesire", {
            ...Object.fromEntries(new FormData(form)),
            type: "enquiry", enquiryType: "Fabric swatch request",
            details: fabric + (colour ? " · " + colour : ""),
          });
          form.reset();
          setNotice("Swatch request received. Your reference is " + result.id + ".");
        } catch (error) { setNotice((error as Error).message); }
        finally { setBusy(false); }
      }}>
        <p>Our team will confirm availability and delivery for your swatch.</p>
        <label>Name<input name="customerName" autoComplete="name" required /></label>
        <label>Phone or WhatsApp<input name="phone" type="tel" autoComplete="tel" required /></label>
        <button className="button button-dark" disabled={busy}>{busy ? "Sending..." : "Request swatch"}</button>
      </form>
    </details>
    {notice && <p role="status">{notice}</p>}
  </>;
}
