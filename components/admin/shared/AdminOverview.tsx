"use client";

import { useState } from "react";
import { ArrowUpRight, Bell, Boxes, CircleDollarSign, Gift, MessageCircle, Search, ShoppingBag } from "lucide-react";
import { orderStatuses, type Brand, type BusinessData, type SessionUser } from "../../../lib/local/types";
import { naira } from "../../../lib/products";
import { CollapsibleSection, DataList } from "./Density";
import { AdminBadge, AdminSection, exportReport, orderChannel, paidValue } from "./primitives";

type Go = (tab: string, term?: string, intent?: string) => void;
type Props = { data: BusinessData; brand: Brand; session: SessionUser; go: Go; signOut: () => void; reports?: boolean };
const isOpen = (status: string) => !["Completed", "Cancelled"].includes(status);
const month = new Intl.DateTimeFormat("en-NG", {month: "short", timeZone: "Africa/Lagos"});
const monthKey = new Intl.DateTimeFormat("sv-SE", {year: "numeric", month: "2-digit", timeZone: "Africa/Lagos"});
const shortDate = new Intl.DateTimeFormat("en-NG", {dateStyle: "medium", timeZone: "Africa/Lagos"});
const colors = ["#db9b9c", "#d5ac72", "#7c1839", "#ad6891", "#ad7041", "#6d8b86", "#638769", "#baa6a4"];

export default function AdminOverview({ data, brand, session, go, signOut, reports }: Props) {
  const gift = brand === "kokies";
  const [measure, setMeasure] = useState<"orders" | "revenue">("orders");
  const [term, setTerm] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [channel, setChannel] = useState("All channels");
  const orders = data.orders.filter(o => (!reports || ((!start || o.createdAt.slice(0,10) >= start) &&
    (!end || o.createdAt.slice(0,10) <= end) && (channel === "All channels" || orderChannel(o) === channel))));
  const sorted = [...orders].sort((a,b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const revenue = orders.reduce((sum,o) => sum + paidValue(o), 0);
  const lowStock = data.inventory.filter(i => data.products.some(p => p.id === i.productId && p.status === "published") && i.stock - i.reserved <= i.threshold).length;
  const waiting = data.conversations.filter(c => c.status === "Waiting").length;
  const unread = data.conversations.reduce((sum,c) => sum + c.unread, 0);
  const count = (status: string) => orders.filter(o => o.status === status).length;
  const tasks = [
    [count("Awaiting quotation"), "Quotes to review", "Quotes"],
    [count("Awaiting payment"), "Payments to confirm", "Orders"],
    [data.enquiries.filter(e => e.status === "New").length, "New enquiries", "Enquiries"],
    [unread, "Unread messages", "Live chat"],
    [lowStock, "Low stock products", "Inventory"],
    [count("Ready for dispatch"), "Ready for dispatch", "Fulfilment"],
  ] as const;
  const lastMonth = reports && end ? new Date(end + "T12:00:00Z") : new Date();
  const series = Array.from({length: 6}, (_, index) => {
    const date = new Date(Date.UTC(lastMonth.getUTCFullYear(), lastMonth.getUTCMonth() - 5 + index, 15));
    const key = monthKey.format(date);
    const value = measure === "orders"
      ? orders.filter(o => monthKey.format(new Date(o.createdAt)) === key).length
      : orders.filter(o => o.payment && monthKey.format(new Date(o.payment.confirmedAt)) === key).reduce((sum,o) => sum + paidValue(o), 0);
    return { key, label: month.format(date), value };
  });
  const max = Math.max(1, ...series.map(row => row.value));
  const metrics = [
    {title: gift ? "Open gift orders" : "Open orders", value: orders.filter(o => isOpen(o.status)).length, caption: "Orders still in motion", icon: gift ? Gift : ShoppingBag, tab: "Orders"},
    {title: "Collected revenue", value: naira(revenue), caption: "Recorded payments · excludes demo", icon: CircleDollarSign, tab: "Reports"},
    {title: "Waiting conversations", value: waiting, caption: "Customers awaiting a response", icon: MessageCircle, tab: "Live chat"},
    {title: "Low stock alerts", value: lowStock, caption: "At or below reorder level", icon: Boxes, tab: "Inventory"},
  ];
  let running = 0;
  const segments = orderStatuses.map((status, i) => {
    const begin = running;
    running += count(status) * 100 / Math.max(1, orders.length);
    return colors[i] + " " + begin + "% " + running + "%";
  });
  const searchResults = term.trim() ? [
    ...data.orders.map(o => ({label: o.id, detail: o.customerName, tab: "Orders", search: o.id})),
    ...data.products.map(p => ({label: p.name, detail: p.category, tab: "Products", search: p.name})),
    ...data.customers.map(c => ({label: c.name, detail: "Customer", tab: "Customers", search: c.name})),
  ].filter(row => (row.label + " " + row.detail).toLowerCase().includes(term.trim().toLowerCase())).slice(0, 7) : [];
  const recent = <AdminSection title={gift ? "Gift orders in motion" : "Recent orders"} className="dash-recent">
    <DataList data={sorted} label="Orders" mode={reports ? "page" : "preview"} limit={reports ? 15 : 6} resetKey={JSON.stringify([start,end,channel])} onViewAll={reports ? undefined : () => go("Orders")} render={rows => <div className="dash-table-scroll"><table><thead><tr><th>Order</th><th>Product</th><th>Amount</th><th>Status</th><th>Date</th><th><span className="sr-only">Actions</span></th></tr></thead>
      <tbody>{rows.map(o => <tr key={o.id}><td><strong>{o.customerName}</strong><small>{o.id}{o.demo ? " · Demo" : ""}</small></td><td><span className="dash-product">{o.items[0]?.image && <img alt="" src={o.items[0].image} />}{o.items[0]?.name ?? "Order"}</span></td><td>{naira(o.total)}</td><td><AdminBadge>{o.status}</AdminBadge></td><td>{shortDate.format(new Date(o.createdAt))}</td><td><button onClick={() => go("Orders", o.id)} aria-label={"Open order " + o.id}><ArrowUpRight size={16} /></button></td></tr>)}</tbody>
    </table></div>} />
  </AdminSection>;
  const chart = <AdminSection title="Revenue & Orders Trend" className="dash-chart">
    <div className="dash-chart-controls"><small>{measure === "orders" ? "Orders placed" : "Payments with a recorded confirmation date"}</small>
      <div role="group" aria-label="Trend measure"><button aria-pressed={measure === "orders"} onClick={() => setMeasure("orders")}>Orders</button><button aria-pressed={measure === "revenue"} onClick={() => setMeasure("revenue")}>Revenue</button></div>
    </div>
    <div className="dash-bars">{series.map(row => <div key={row.key}><strong>{measure === "orders" ? row.value : naira(row.value)}</strong><span style={{height: Math.max(2, row.value / max * 105)}} /><small>{row.label}</small></div>)}</div>
  </AdminSection>;
  const breakdown = <AdminSection title="Orders by status" className="dash-breakdown">
    <div className="dash-ring" style={{background: orders.length ? "conic-gradient(" + segments.join(",") + ")" : "#e9dfd8"}}><span><strong>{orders.length}</strong>Orders</span></div>
    <ul>{orderStatuses.map((status,i) => <li key={status}><span><i style={{backgroundColor: colors[i]}} />{status}</span><strong>{count(status)}</strong></li>)}</ul>
  </AdminSection>;
  const next = <AdminSection title={gift ? "Packing desk" : "Your next actions"} className="dash-next">
    {tasks.map(([value,label,tab]) => <button key={label} onClick={() => go(tab, "", label === "Payments to confirm" ? "Awaiting payment" : label === "Ready for dispatch" ? "Ready for dispatch" : undefined)}><span>{label}</span><b>{value}</b><ArrowUpRight size={14} /></button>)}
  </AdminSection>;
  const quick = <AdminSection title="Quick actions" className="dash-quick">
    <div>{[["New order","Orders","new"],["Create quote","Quotes","new"],["Add product","Products","new"],["Manage stock","Inventory",""],["Customers","Customers",""],["Brand studio","Page builder",""]].filter(([,tab]) => !gift || !["Orders","Quotes"].includes(tab)).map(([label,tab,intent]) => <button key={label} onClick={() => go(tab,"",intent || undefined)}>{label}<ArrowUpRight size={14}/></button>)}</div>
  </AdminSection>;
  const audience = <AdminSection title="Newsletter audience"><p><strong>{data.subscribers.length}</strong> subscribers · {data.customers.length} customer profiles</p></AdminSection>;

  return <div className={"admin-dashboard " + (gift ? "gift-dashboard" : "fashion-dashboard")}>
    <header className="dash-hero"><div className={gift ? "gift-workroom-intro" : undefined}>{gift && <img src="/kokies/kokies-logo.webp" alt="" />}<div><span className="desk-kicker">{gift ? "Kokies World of Gifts · The gifting desk" : "The business of beautiful occasions"}</span>
      <h1>{reports ? "Business reports" : gift ? "Your gifting business, at a glance." : "Your business, at a glance."}</h1><p>{session.name} · {session.role}</p></div></div>
      <div className="dash-header-tools"><div className="dash-search"><Search size={16} /><input aria-label="Search workspace" placeholder="Search orders, customers, products…" value={term} onChange={e => setTerm(e.target.value)} />
        {!!term.trim() && <div className="dash-popover">{searchResults.length ? searchResults.map((r,i) => <button key={i} onClick={() => go(r.tab,r.search)}>{r.label}<small>{r.detail}</small></button>) : <p>No matches.</p>}</div>}
      </div><details className="dash-menu"><summary aria-label="Notifications"><Bell size={18} /><b>{unread + count("Awaiting payment")}</b></summary><div className="dash-popover"><button onClick={() => go("Live chat")}>{unread} unread messages</button><button onClick={() => go("Orders","","Awaiting payment")}>{count("Awaiting payment")} pending payments</button></div></details>
      <details className="dash-menu"><summary aria-label="Staff profile">{session.name.slice(0,2).toUpperCase()}</summary><div className="dash-popover"><strong>{session.name}</strong><button onClick={signOut}>Sign out</button></div></details></div>
    </header>
    {reports && <div className="dash-report-filters"><label>From<input type="date" value={start} onChange={e => setStart(e.target.value)} /></label><label>To<input type="date" value={end} onChange={e => setEnd(e.target.value)} /></label><label>Channel<select value={channel} onChange={e => setChannel(e.target.value)}><option>All channels</option>{[...new Set(data.orders.map(orderChannel))].map(s => <option key={s}>{s}</option>)}</select></label><button onClick={() => exportReport(brand + "-order-report", [["Reference","Date","Channel","Status","Order total (NGN)","Recorded revenue (NGN)","Demo"],...sorted.map(o => [o.id, o.createdAt, orderChannel(o), o.status, o.total, paidValue(o), o.demo ? "Yes" : "No"])])}>Export report</button></div>}
    <div className="dash-metrics">{metrics.map(({title,value,caption,icon:Icon,tab}) => <button key={title} onClick={() => go(tab)}><span className="dash-metric-icon"><Icon size={23} /></span><span><b>{title}</b><strong>{value}</strong><small>{caption}</small></span><ArrowUpRight size={15} /></button>)}</div>
    {reports ? <><div className="dash-report-grid">{chart}{breakdown}</div><CollapsibleSection title="Detailed orders" count={sorted.length} defaultOpen>{recent}</CollapsibleSection></> : gift ?
      <div className="gift-workroom"><div><AdminSection title="Today’s gift desk"><p>Start a gift order or prepare a quote for a corporate or event customer.</p><div className="gift-workroom-tools"><button className="desk-primary" onClick={() => go("Orders", "", "new")}>New gift order</button><button onClick={() => go("Quotes", "", "new")}>Create a quote</button></div></AdminSection>{next}<AdminSection title="Gift activity"><ul className="dash-label-list"><li>Personalisation requests <b>{orders.filter(o => o.items.some(i => i.personalisation && i.personalisation.method !== "none")).length}</b></li><li>WhatsApp orders <b>{orders.filter(o => orderChannel(o) === "WhatsApp").length}</b></li><li>Corporate enquiries <b>{data.enquiries.filter(e => /corporate/i.test(e.type)).length}</b></li><li>Event enquiries <b>{data.enquiries.filter(e => /event|wedding/i.test(e.type)).length}</b></li></ul></AdminSection>{quick}{audience}</div><div>{recent}{chart}{breakdown}</div></div> :
      <div className="fashion-dash-board"><div><div className="dash-report-grid">{chart}{breakdown}</div>{recent}</div><aside>{quick}{next}{audience}</aside></div>}
  </div>;
}
