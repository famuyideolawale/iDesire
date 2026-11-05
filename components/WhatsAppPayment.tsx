"use client";

import { useLocal } from "../lib/local/client";
import type { Brand } from "../lib/local/types";

export function WhatsAppPayment({
  brand,
  reference,
  status,
}: {
  brand: Brand;
  reference: string;
  status: string;
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
  const message = [`Hi ${name},`, `Order reference: ${reference}`, request].join("\n\n");

  return (
    <a
      className="button button-dark checkout-whatsapp"
      href={`https://wa.me/${number}?text=${encodeURIComponent(message)}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      {quote ? "Confirm quote on WhatsApp" : "Continue payment on WhatsApp"} ↗
    </a>
  );
}
