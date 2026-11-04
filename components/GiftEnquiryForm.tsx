"use client";
import { api } from "../lib/local/client";
import { useState } from "react";
import { GiftOrder, readLocal } from "../lib/kokies";

const types = [
  "General gifting enquiry",
  "Corporate gifting",
  "Personalised gifts",
  "Event souvenirs",
  "Existing order support",
];
export default function GiftEnquiryForm({
  initialType,
}: {
  initialType?: string;
}) {
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="kokies-enquiry-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = new FormData(form);
        const reference = `KWG-ENQ-${Date.now()}`;
        const record: GiftOrder = {
          reference,
          business: "Kokies World of Gifts",
          product: String(data.get("type")),
          customerName: String(data.get("name")).trim(),
          phone: String(data.get("phone")).trim(),
          quantity: Number(data.get("quantity")) || 0,
          unitPrice: 0,
          estimatedTotal: 0,
          event: String(data.get("eventDate")),
          customisation: `Email: ${data.get("email")}\nBudget: ${data.get("budget") || "To discuss"}\nDestination: ${data.get("destination") || "To discuss"}\n${data.get("details")}`,
          status: "Enquiry received",
          createdAt: new Date().toISOString(),
        };
        if (!record.customerName || !record.phone) {
          setNotice("Please enter your name and phone number.");
          return;
        }
        setBusy(true);
        try {
          const saved = await api("/api/local/kokies", {
            type: "enquiry",
            customerName: record.customerName,
            phone: record.phone,
            email: data.get("email"),
            details:
              record.customisation +
              "\nEvent: " +
              record.event +
              "\nQuantity: " +
              record.quantity,
            typeLabel: record.product,
            enquiryType: record.product,
          });
          setNotice(
            `Enquiry ${saved.id} received. The Kokies team can now review it in their workspace.`,
          );
          form.reset();
        } catch (e) {
          setNotice((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <span className="kokies-eyebrow">YOUR GIFTING BRIEF</span>
      <h2>Tell us what you have in mind.</h2>
      <p>Fields marked * are required.</p>
      <div className="kokies-enquiry-fields">
        <label>
          Your name / organisation *
          <input name="name" autoComplete="name" required />
        </label>
        <label>
          Email address *
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Phone number *
          <input name="phone" type="tel" autoComplete="tel" required />
        </label>
        <label>
          How can we help?
          <select
            name="type"
            defaultValue={
              initialType && types.includes(initialType)
                ? initialType
                : types[0]
            }
          >
            {types.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
        <label>
          Estimated quantity
          <input
            name="quantity"
            type="number"
            min="1"
            placeholder="How many gifts?"
          />
        </label>
        <label>
          Budget per gift (₦)
          <input
            name="budget"
            type="number"
            min="0"
            placeholder="Your preferred range"
          />
        </label>
        <label>
          Required date
          <input name="eventDate" type="date" />
        </label>
        <label>
          Delivery destination
          <input name="destination" placeholder="City and country" />
        </label>
        <label className="kokies-enquiry-wide">
          Your idea / order details *
          <textarea
            name="details"
            required
            rows={5}
            placeholder="The occasion, gift ideas, names, branding, packaging or an existing order reference…"
          />
        </label>
      </div>
      <button className="kokies-button" type="submit" disabled={busy}>
        Send gifting enquiry ↗
      </button>
      <small className="kokies-form-preview-note">
        Your enquiry goes directly to the Kokies workspace. A final quote is
        agreed before payment.
      </small>
      {notice && (
        <p role="status" className="kokies-enquiry-status">
          {notice}
        </p>
      )}
    </form>
  );
}
