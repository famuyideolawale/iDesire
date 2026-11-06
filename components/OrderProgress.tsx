import type { Brand, LocalOrder } from "../lib/local/types";
import { naira } from "../lib/products";
import { WhatsAppPayment } from "./WhatsAppPayment";

export type Receipt = Pick<LocalOrder, "status" | "paymentStatus" | "total" | "updatedAt" | "deliveryFee" | "quoteIssuedAt" | "holdUntil" | "deliveryPending"> & {
  deliveryPlace?: string;
  reference: string;
  hasArtwork?: boolean;
  proof?: { id: string; approvedAt?: string };
  items: { name: string; quantity: number }[];
  history?: { at: string; text: string }[];
};

const stages = [
  ["Awaiting quotation", "Awaiting quotation"],
  ["Awaiting payment", "Awaiting payment"],
  ["Payment confirmed", "Paid"],
  ["In production", "Processing"],
  ["Ready for dispatch", "Ready for dispatch"],
  ["Dispatched", "Dispatched"],
  ["Completed", "Completed"],
];

export function OrderProgress({ receipt, brand }: {
  receipt: Pick<Receipt, "reference" | "status" | "paymentStatus"> & Partial<Receipt>;
  brand: Brand;
}) {
  const step = stages.findIndex(([, status]) => status === receipt.status);
  return <>
    <p><strong>{receipt.status}</strong> · Payment {receipt.paymentStatus.toLowerCase()}</p>
    {receipt.total !== undefined && <p>{receipt.status === "Awaiting quotation" ? "Base estimate" : "Order total"}: <strong>{naira(receipt.total)}</strong>
      {receipt.deliveryPlace && receipt.status !== "Awaiting quotation" && <> · {receipt.deliveryPlace === "Pickup" ? "pickup" : receipt.deliveryPending ? `delivery to ${receipt.deliveryPlace} to confirm` : `includes ${naira(receipt.deliveryFee ?? 0)} delivery to ${receipt.deliveryPlace}`}</>}</p>}
    {receipt.quoteIssuedAt && <p>Final quote issued {new Date(receipt.quoteIssuedAt).toLocaleDateString()}. Delivery: {naira(receipt.deliveryFee ?? 0)}.</p>}
    {receipt.holdUntil && <p>Stock held until {new Date(receipt.holdUntil).toLocaleString()}.</p>}
    {receipt.paymentStatus === "Unpaid" && receipt.status === "Awaiting payment" && !receipt.holdUntil && (
      <p>Ask our team to confirm availability before sending payment.</p>
    )}
    {step >= 0 && <ol className="order-progress" aria-label="Order progress">
      <li data-complete="true">Order received</li>
      {stages.map(([label, status], index) => status === "Awaiting quotation" && step > 0 && !receipt.quoteIssuedAt ? null : (
        <li key={status} aria-current={index === step ? "step" : undefined} data-complete={index < step}>{label}</li>
      ))}
    </ol>}
    {receipt.items && <ul className="receipt-items">{receipt.items.map((item, index) => <li key={index}>{item.name} × {item.quantity}</li>)}</ul>}
    {receipt.paymentStatus === "Unpaid" && <WhatsAppPayment brand={brand} reference={receipt.reference} status={receipt.status} items={receipt.items} total={receipt.total}
      deliveryFee={receipt.deliveryFee} deliveryPending={receipt.deliveryPending} deliveryPlace={receipt.deliveryPlace} />}
  </>;
}
