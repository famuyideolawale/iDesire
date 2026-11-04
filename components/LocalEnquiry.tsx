"use client";
import { useState } from "react";
import { api, useLocal } from "../lib/local/client";
import type { Brand } from "../lib/local/types";
export default function LocalEnquiry({
  brand = "idesire",
  wedding = false,
}: {
  brand?: Brand;
  wedding?: boolean;
}) {
  const [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="enquiry-form local-enquiry"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        setBusy(true);
        try {
          const v = Object.fromEntries(new FormData(form).entries());
          const r = await api(`/api/local/${brand}`, {
            ...v,
            type: "enquiry",
            enquiryType: wedding
              ? "Wedding / group fabric order"
              : "Contact enquiry",
            details: `${v.details}\nQuantity: ${v.quantity || "To discuss"}\nRequired date: ${v.date || "To discuss"}\nColours: ${v.colours || "To discuss"}`,
          });
          setNotice(
            `Thank you. Your enquiry ${r.id} has reached our admin workspace. Keep this reference for follow-up.`,
          );
          form.reset();
        } catch (e) {
          setNotice((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>
        {wedding ? "Tell us about your celebration." : "Send us a message."}
      </h2>
      <div className="form-grid">
        <label>
          Your name *<input name="customerName" required autoComplete="name" />
        </label>
        <label>
          Email *
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          Phone / WhatsApp *
          <input name="phone" type="tel" required autoComplete="tel" />
        </label>
        {wedding && (
          <>
            <label>
              Required date
              <input name="date" type="date" />
            </label>
            <label>
              Quantity (yards)
              <input name="quantity" type="number" min="5" />
            </label>
            <label>
              Preferred colours
              <input name="colours" />
            </label>
          </>
        )}
        <label className="wide-field">
          Your message *<textarea name="details" rows={5} required />
        </label>
      </div>
      <button className="button button-dark" disabled={busy}>
        {busy ? "Sending…" : "Send enquiry ↗"}
      </button>
      {notice && <p role="status">{notice}</p>}
    </form>
  );
}
export function BrandContact() {
  const { data } = useLocal();
  return (
    <div className="contact-grid">
      <a
        href={`https://wa.me/${data?.settings.phone || "2348091142201"}`}
        target="_blank"
        rel="noreferrer"
      >
        <span className="eyebrow">CHAT WITH OUR TEAM</span>
        <h2>WhatsApp us ↗</h2>
        <p>Ask about fabrics, quantities and your celebration.</p>
      </a>
      <a
        href={
          data?.settings.instagram ||
          "https://www.instagram.com/idesiretradsng/"
        }
        target="_blank"
        rel="noreferrer"
      >
        <span className="eyebrow">FOLLOW ALONG</span>
        <h2>Instagram ↗</h2>
        <p>New arrivals and occasion inspiration.</p>
      </a>
      <a href={`mailto:${data?.settings.email || "idesiretrads@gmail.com"}`}>
        <span className="eyebrow">EMAIL</span>
        <h2>Send an email ↗</h2>
        <p>{data?.settings.email || "idesiretrads@gmail.com"}</p>
      </a>
    </div>
  );
}
export function Newsletter() {
  const { brand } = useLocal(),
    [status, setStatus] = useState("");
  return (
    <>
      <form
        className="newsletter"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          try {
            await api(`/api/local/${brand}`, {
              type: "subscribe",
              email: new FormData(form).get("email"),
            });
            setStatus("You’re on the list. Thank you!");
            form.reset();
          } catch (e) {
            setStatus((e as Error).message);
          }
        }}
      >
        <input
          name="email"
          aria-label="Email address"
          placeholder="Your email address"
          type="email"
          required
        />
        <button>Join us ↗</button>
      </form>
      {status && <p role="status">{status}</p>}
    </>
  );
}
