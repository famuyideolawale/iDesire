"use client";

import { useLocal } from "../lib/local/client";
import type { Brand } from "../lib/local/types";
import WhatsAppIcon from "./WhatsAppIcon";

export function WhatsAppPayment({
  brand,
  reference,
  status,
  items = [],
  total,
  deliveryFee,
  deliveryPending,
  deliveryPlace,
}: {
  brand: Brand;
  reference: string;
  status: string;
  items?: { name: string; quantity: number }[];
  total?: number;
  deliveryFee?: number;
  deliveryPending?: boolean;
  deliveryPlace?: string;
}) {
  const { data } = useLocal();
  const quote = status === "Awaiting quotation";
  if (!quote && status !== "Awaiting payment") return null;

  const kokies = brand === "kokies";
  const name = kokies ? "Kokies World of Gifts" : "iDesire TRADS";
  const defaultPhone = kokies ? "2349099591993" : "2348091142201";
  const digits = (data?.settings.phone || defaultPhone).replace(/\D/g, "");
  const international = digits.replace(/^00/, "").replace(/^0(?=\d{10}$)/, "234");
  const number = /^[1-9]\d{7,14}$/.test(international) ? international : defaultPhone;
  const request = quote
    ? "Could you share my final quote, including delivery?"
    : "Please send your bank details so I can pay.";
  const summary = items.map((item) => `- ${item.name} × ${item.quantity}`).join("\n");
  const n = (v: number) => "₦" + v.toLocaleString("en-NG");
  const deliveryText = !deliveryPlace ? "" : deliveryPlace === "Pickup" ? "Pickup"
    : deliveryPending || deliveryFee === undefined ? `Delivery to ${deliveryPlace}: fee to confirm` : `Delivery to ${deliveryPlace}: ${n(deliveryFee)}`;
  const amount = quote || !total ? deliveryText
    : [deliveryText, `Total: ${n(total)}${deliveryPending ? " + delivery" : ""}`].filter(Boolean).join("\n");
  const message = [`Hi ${name},`, `Order reference: ${reference}`, summary, amount, request].filter(Boolean).join("\n\n");

  return (
    <a
      className="button button-dark checkout-whatsapp"
      href={`https://wa.me/${number}?text=${encodeURIComponent(message)}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      <WhatsAppIcon /> {quote ? "Get my quote on WhatsApp" : "Confirm payment on WhatsApp"}
    </a>
  );
}
