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
}: {
  brand: Brand;
  reference: string;
  status: string;
  items?: { name: string; quantity: number }[];
  total?: number;
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
    : "Could you confirm the amount due, including delivery, and send the payment instructions?";
  const summary = items.map((item) => `- ${item.name} × ${item.quantity}`).join("\n");
  const amount = !quote && total ? `Order total before delivery: ₦${total.toLocaleString("en-NG")}` : "";
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
