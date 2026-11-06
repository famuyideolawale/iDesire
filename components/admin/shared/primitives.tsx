import type { ReactNode } from "react";
import type { LocalOrder } from "../../../lib/local/types";

export const orderTone = (status: string) => {
  if (["Paid", "Completed", "Published", "Active", "Healthy"].includes(status)) return "success";
  if (["Awaiting payment", "Low stock", "Out of stock", "Ready for dispatch"].includes(status)) return "gold";
  if (["Processing", "Dispatched", "Reserved"].includes(status)) return "plum";
  if (["Cancelled", "Draft", "Inactive", "Suspended"].includes(status)) return "muted";
  return "wine";
};
export function AdminBadge({ children }: { children: ReactNode }) {
  return <span className="ops-badge" data-tone={orderTone(String(children))}>{children}</span>;
}
export function AdminSection({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return <section className={"admin-section " + className}><h2>{title}</h2>{children}</section>;
}
export const paidValue = (order: LocalOrder) => !order.demo && order.paymentStatus === "Paid" ? order.payment?.amount ?? order.total : 0;
export function orderChannel(order: LocalOrder) {
  if (/whatsapp/i.test(order.source)) return "WhatsApp";
  if (/website/i.test(order.source)) return "Website";
  if (/staff|manual|admin/i.test(order.source)) return "Admin";
  return order.demo ? "Demo" : "Other";
}
export function exportReport(filename: string, rows: (string | number)[][]) {
  const csv = rows.map(row => row.map(value => {
    const raw = String(value);
    const escaped = typeof value === "string" && /^\s*[=+@-]|^[\t\r\n]/.test(raw) ? "'" + raw : raw;
    return '"' + escaped.replaceAll('"','""') + '"';
  }).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], {type: "text/csv;charset=utf-8"}));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename + ".csv";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
