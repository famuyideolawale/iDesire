"use client";
import { useEffect, useState } from "react";

export function OrderArtwork({ reference, phone, receiptKey, staff, hasArtwork, proof, editable, refresh }: {
  reference: string; phone?: string; receiptKey?: string; staff?: boolean;
  hasArtwork?: boolean; proof?: { id: string; approvedAt?: string }; editable: boolean;
  refresh: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState<{ url: string; proofId?: string }>();
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);

  async function request(action: string, data = new FormData()) {
    if (busy) return;
    setBusy(true);
    setNotice("");
    data.set("action", action);
    data.set("reference", reference);
    if (phone) data.set("phone", phone);
    if (receiptKey) data.set("key", receiptKey);
    if (proof) data.set("proofId", proof.id);
    try {
      const response = await fetch("/api/local/artwork", { method: "POST", body: data });
      if (!response.ok) throw new Error((await response.json()).error);
      if (action.startsWith("view-")) {
        setPreview({ url: URL.createObjectURL(await response.blob()), proofId: action === "view-proof" ? proof?.id : undefined });
      } else {
        setPreview(undefined);
        await refresh();
        setNotice(action === "approve-proof" ? "Proof approved." : "Image uploaded.");
      }
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return <details className="order-artwork">
    <summary>Artwork and proof {proof?.approvedAt ? "· Approved" : proof ? "· Awaiting approval" : ""}</summary>
    {hasArtwork && <button type="button" className="button button-outline" disabled={busy} onClick={() => void request("view-artwork")}>View uploaded artwork</button>}
    {proof && <button type="button" className="button button-outline" disabled={busy} onClick={() => void request("view-proof")}>View proof</button>}
    {preview && <img className="proof-preview" src={preview.url} alt={preview.proofId ? "Proof for this order" : "Artwork for this order"} />}
    {editable && !staff && proof && !proof.approvedAt && preview?.proofId === proof.id &&
      <button type="button" className="button button-dark" disabled={busy} onClick={() => void request("approve-proof")}>Approve this proof</button>}
    {editable && <form onSubmit={event => {
      event.preventDefault();
      void request(staff ? "upload-proof" : "upload-artwork", new FormData(event.currentTarget));
    }}>
      <label>{staff ? "Upload proof for customer review" : "Upload your logo or artwork"}
        <input name="file" type="file" accept="image/png,image/jpeg,image/webp" required />
      </label>
      <small>PNG, JPEG or WebP up to 5 MB.</small>
      <button className="button button-outline" disabled={busy}>{busy ? "Working..." : staff ? "Send proof for review" : "Upload artwork"}</button>
    </form>}
    {notice && <p role="status">{notice}</p>}
  </details>;
}
