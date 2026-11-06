"use client";
import { CollapsibleSection, DataList, Pagination, useDataPage } from "./admin/shared/Density";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Bell, CalendarDays, CheckCircle2, ChevronDown, ClipboardList, Clock3, Download, FileText, Layers3, Mail, Package, Phone, Plus, RotateCcw, Search, ShoppingBag, UserRound } from "lucide-react";
import { orderStatuses, type BusinessData, type LocalOrder, type OrderStatus, type SessionUser } from "../lib/local/types";
import { naira } from "../lib/products";

type Act = (input: Record<string, unknown>) => Promise<{id?: string} | null>;
type Action = "new" | "note" | "quote" | "payment";
const date = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeZone: "Africa/Lagos" });
const stamp = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" });
const day = new Intl.DateTimeFormat("sv-SE", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" });
const formValues = (form: HTMLFormElement) => Object.fromEntries(new FormData(form));
const closed = (o: LocalOrder) => o.status === "Completed" || o.status === "Cancelled";
const stages: OrderStatus[] = ["Awaiting quotation", "Awaiting payment", "Paid", "Processing", "Ready for dispatch", "Dispatched", "Completed"];
const fulfilment: OrderStatus[] = ["Paid", "Processing", "Ready for dispatch", "Dispatched"];
const orderType = (o: LocalOrder) => o.quoteRequired || o.quoteIssuedAt || o.status === "Awaiting quotation" || o.history.some(event => event.text.startsWith("Quote issued:")) ? "Quote order" : "Product order";
const tone = (status: OrderStatus) => status === "Paid" || status === "Completed" ? "success" : status === "Awaiting payment" ? "gold" : status === "Cancelled" ? "muted" : status === "Processing" ? "plum" : "wine";
const editableStatuses = (o: LocalOrder) => orderStatuses.filter(status => {
  if (status === o.status) return true;
  if (closed(o)) return false;
  if (o.status === "Dispatched") return status === "Completed";
  if (o.paymentStatus === "Paid") return [...fulfilment, "Completed", "Cancelled"].includes(status);
  return status === "Awaiting quotation" || status === "Cancelled";
});

function exportOrders(orders: LocalOrder[], filename: string) {
  // Text cells are escaped for CSV and neutralised before spreadsheet import.
  const cell = (value: string | number) => {
    const raw = String(value);
    const safe = typeof value === "string" && /^[\s]*[=+@-]|^[\t\r\n]/.test(raw) ? "'" + raw : raw;
    return '"' + safe.replaceAll('"', '""') + '"';
  };
  const rows = [
    ["Reference", "Customer", "Products", "Status", "Payment", "Type", "Created (WAT)", "Delivery (NGN)", "Total (NGN)", "Demo"],
    ...orders.map(o => [o.id, o.customerName, o.items.map(i => i.name + " × " + i.quantity).join("; "), o.status,
      o.paymentStatus, orderType(o), stamp.format(new Date(o.createdAt)), o.deliveryFee ?? 0, o.total, o.demo ? "Yes" : "No"]),
  ];
  const url = URL.createObjectURL(new Blob(["\uFEFF" + rows.map(row => row.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename + ".csv";
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Thumbnail({ src }: { src?: string }) {
  return src ? <img className="ops-thumb" src={src} alt="" loading="lazy" /> : <span className="ops-thumb ops-thumb-empty"><Package size={19} aria-hidden="true" /></span>;
}

function OrderDialog({ title, children, close }: { title: string; children: ReactNode; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);
  return <dialog className="ops-dialog" ref={ref} aria-labelledby="ops-dialog-title" onCancel={close}>
    <div className="ops-card-head"><h2 id="ops-dialog-title">{title}</h2><button type="button" onClick={close}>Close</button></div>
    {children}
  </dialog>;
}

export default function IDesireOrders({ data, session, act, busy, error, go, signOut, mode, intent, initialSearch }: {
  data: BusinessData; session: SessionUser; act: Act; busy: boolean; error: string;
  mode: string; intent: string; initialSearch: string;
  go: (tab: string, search?: string) => void; signOut: () => void;
}) {
  const [query, setQuery] = useState(initialSearch);
  const defaultStatus = mode === "Quotes" ? "Awaiting quotation" : mode === "Fulfilment" ? "Fulfilment" : "All";
  const [status, setStatus] = useState(orderStatuses.some(s => s === intent) ? intent : defaultStatus);
  const [payment, setPayment] = useState("All payments");
  const [type, setType] = useState("All");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState("latest");
  const [selected, setSelected] = useState("");
  const [action, setAction] = useState<{ kind: Action; orderId?: string } | undefined>(intent === "new" ? {kind:"new"} : undefined);
  const [dialogError, setDialogError] = useState(false);
  const detail = useRef<HTMLElement>(null);
  const datePicker = useRef<HTMLDetailsElement>(null);
  const openOrders = data.orders.filter(o => !closed(o));
  const actual = data.orders.filter(o => !o.demo && o.status !== "Cancelled");
  const unread = data.conversations.reduce((sum, thread) => sum + thread.unread, 0);
  const quotes = data.orders.filter(o => o.status === "Awaiting quotation").length;
  const payments = data.orders.filter(o => o.status === "Awaiting payment").length;
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    const phoneQuery = /^[+\d ()-]{3,}$/.test(needle) ? needle.replace(/\D/g, "").replace(/^234/, "0") : "";
    return data.orders.filter(o => {
      const matches = [o.id, o.customerName, o.phone, ...o.items.map(i => i.name)]
        .some(value => value.toLocaleLowerCase().includes(needle)) ||
        (phoneQuery && o.phone.replace(/\D/g, "").replace(/^234/, "0").includes(phoneQuery));
      const created = day.format(new Date(o.createdAt));
      return matches && (status === "All" || o.status === status || (status === "Fulfilment" && fulfilment.includes(o.status))) &&
        (payment === "All payments" || o.paymentStatus === payment) && (type === "All" || orderType(o) === type) && (!from || created >= from) && (!to || created <= to);
    }).sort((a, b) => {
      const latest = Date.parse(b.createdAt) - Date.parse(a.createdAt);
      if (sort === "oldest") return -latest;
      if (sort === "highest") return b.total - a.total || latest;
      if (sort === "lowest") return a.total - b.total || latest;
      if (sort === "status") return orderStatuses.indexOf(a.status) - orderStatuses.indexOf(b.status) || latest;
      return latest;
    });
  }, [data.orders, query, status, type, from, to, sort, payment]);
  const page = useDataPage(filtered, 12, JSON.stringify([query, status, type, from, to, sort, payment]));
  const order = page.rows.find(o => o.id === selected) ?? page.rows[0];
  const clear = () => {
    setQuery(""); setStatus(defaultStatus); setPayment("All payments"); setType("All"); setFrom(""); setTo("");
    datePicker.current?.querySelector("form")?.reset();
    if (datePicker.current) datePicker.current.open = false;
  };
  const modalOrder = data.orders.find(o => o.id === action?.orderId);
  const show = (kind: Action) => {
    setDialogError(false);
    setAction({ kind, orderId: kind === "new" ? undefined : order?.id });
  };
  const choose = (id: string) => {
    setSelected(id);
    if (window.matchMedia("(max-width: 900px)").matches) {
      detail.current?.focus({ preventScroll: true });
      detail.current?.scrollIntoView({ block: "start" });
    }
  };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !action) return;
    const fields = formValues(event.currentTarget);
    const response = action.kind === "new"
      ? await act({ action: "recordOrder", order: {...fields, kind: mode === "Quotes" ? "enquiry" : undefined} })
      : modalOrder && await act(action.kind === "quote" ? {
        action: "issueQuote", id: modalOrder.id, delivery: fields.delivery, note: fields.note,
        prices: Object.fromEntries(modalOrder.items.map((_, index) => [index, fields["price" + index]])),
      } : { ...fields, action: action.kind === "note" ? "addOrderNote" : "confirmPayment", id: modalOrder.id });
    if (!response) { setDialogError(true); return; }
    setAction(undefined);
    if (action.kind === "new" && response.id) { clear(); setSelected(response.id); }
  }
  const cards = [
    { label: "Total Order Value", value: naira(actual.reduce((sum, o) => sum + o.total, 0)), caption: "Live orders, excluding cancellations", icon: ShoppingBag, theme: "blush" },
    { label: "Open Orders", value: openOrders.length, caption: quotes + " to quote · " + payments + " awaiting payment", icon: Package, theme: "cream" },
    { label: "Paid / Completed", value: data.orders.filter(o => o.status !== "Cancelled" && (o.paymentStatus === "Paid" || o.status === "Completed")).length, caption: "Paid or completed, counted once", icon: CheckCircle2, theme: "green" },
    { label: "Total Orders", value: data.orders.length, caption: data.orders.filter(o => o.demo).length + " labelled demonstration records", icon: Layers3, theme: "blush" },
  ];
  return <div className="orders-atelier">
    <header className="ops-hero">
      <div><span className="ops-eyebrow">The business of beautiful occasions</span><h1>{mode}</h1>
        <p>Manage customer orders, quotes, payments and fulfilment in one place.</p></div>
      <div className="ops-hero-actions">
        <button className="ops-primary" onClick={() => show("new")}><Plus size={17} /> New Order</button>
        <details className="ops-menu"><summary aria-label="Order notifications"><Bell size={19} />{(unread + quotes + payments) > 0 && <i />}</summary>
          <div><strong>Needs attention</strong><button onClick={e => { clear(); setStatus("Awaiting quotation"); e.currentTarget.closest("details")?.removeAttribute("open"); }}>{quotes} awaiting quotation</button>
            <button onClick={e => { clear(); setStatus("Awaiting payment"); e.currentTarget.closest("details")?.removeAttribute("open"); }}>{payments} awaiting payment</button>
            <button onClick={() => go("Live chat")}>{unread} unread chat messages</button></div>
        </details>
        <details className="ops-menu"><summary aria-label="Staff account"><span className="ops-avatar">{session.name.split(/\s+/).slice(0, 2).map(word => word[0]).join("").toUpperCase()}</span><ChevronDown size={14} /></summary>
          <div><strong>{session.name}</strong><small>{session.role}</small><button onClick={signOut}>Sign out</button></div>
        </details>
      </div>
    </header>
    <section className="ops-kpis" aria-label="Order metrics">
      {cards.map(({ label, value, caption, icon: Icon, theme }) => <article key={label} data-theme={theme}><span className="ops-icon"><Icon size={20} /></span>
        <div><h2>{label}</h2><strong>{value}</strong><p>{caption}</p></div></article>)}
    </section>
    <section className="ops-toolbar" aria-label="Filter and export orders">
      <label className="ops-search"><Search size={17} /><input aria-label="Search orders" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by Order ID, Customer, Phone, Product..." /></label>
      <select aria-label="Filter order status" value={status} onChange={e => setStatus(e.target.value)}>
        <option value="All">All Statuses</option>{orderStatuses.map(s => <option key={s}>{s}</option>)}<option>Fulfilment</option>
      </select>
      <select aria-label="Filter order type" value={type} onChange={e => setType(e.target.value)}>
        <option value="All">All Order Types</option><option>Product order</option><option>Quote order</option>
      </select>
      <select aria-label="Filter payment status" value={payment} onChange={e => setPayment(e.target.value)}><option>All payments</option><option>Paid</option><option>Unpaid</option></select>
      <details className="ops-menu ops-dates" ref={datePicker}>
        <summary><CalendarDays size={16} />{from || to ? "Date range applied" : "Select Date Range"}<ChevronDown size={14} /></summary>
        <div><form key={from + ":" + to} onSubmit={e => {
          e.preventDefault();
          const fields = formValues(e.currentTarget);
          const nextFrom = String(fields.from), nextTo = String(fields.to);
          if (nextFrom && nextTo && nextFrom > nextTo) {
            const end = e.currentTarget.elements.namedItem("to") as HTMLInputElement;
            end.setCustomValidity("Choose an end date on or after the start date.");
            end.reportValidity();
            return;
          }
          setFrom(nextFrom); setTo(nextTo);
          if (datePicker.current) datePicker.current.open = false;
        }}>
          <label>From<input name="from" type="date" defaultValue={from} onInput={e => {
            const end = e.currentTarget.form?.elements.namedItem("to") as HTMLInputElement | null;
            end?.setCustomValidity("");
          }} /></label>
          <label>To<input name="to" type="date" defaultValue={to} onInput={e => e.currentTarget.setCustomValidity("")} /></label>
          <button type="submit">Apply date range</button>
        </form></div>
      </details>
      <button type="button" onClick={clear}><RotateCcw size={15} /> Clear Filters</button>
      <button type="button" disabled={!filtered.length} onClick={() => exportOrders(filtered, "idesire-orders")}><Download size={16} /> Export</button>
    </section>
    <div className="ops-columns">
      <section className="ops-panel ops-register" id="idesire-order-register" aria-label="Order register">
        <div className="ops-card-head"><h2>Order Register <span>({filtered.length})</span></h2>
          <label className="ops-sort">Sort <select aria-label="Sort orders" value={sort} onChange={e => setSort(e.target.value)}>
            <option value="latest">Latest</option><option value="oldest">Oldest</option><option value="highest">Highest value</option><option value="lowest">Lowest value</option><option value="status">Status</option>
          </select></label>
        </div>
        <div className="ops-register-list">
          {page.rows.map(o => <button type="button" className="ops-order-row" key={o.id} aria-pressed={order?.id === o.id} onClick={() => choose(o.id)}>
            <Thumbnail src={o.items[0]?.image} />
            <span className="ops-row-copy"><strong>{o.customerName}</strong><span>{o.items[0]?.name ?? "Order"}{o.items.length > 1 ? " +" + (o.items.length - 1) : ""}</span>
              <small>{o.id}{o.demo ? " · Demo" : ""}</small>
              <span className="ops-row-meta"><b>{naira(o.total)}</b> · {date.format(new Date(o.createdAt))}</span></span>
            <span className="ops-badge" data-tone={tone(o.status)}>{o.status}</span>
          </button>)}
          {!filtered.length && <div className="ops-empty"><Search size={25} /><h3>No orders match</h3><p>Try another search or clear the filters.</p><button onClick={clear}>Clear Filters</button></div>}
        </div>
        <Pagination state={page} label="Order register pages" />
      </section>
      <section ref={detail} tabIndex={-1} className="ops-panel ops-detail" aria-label="Order details">
        {order && <a className="ops-back-register" href="#idesire-order-register">Back to order register</a>}
        {order ? <OrderDetail key={order.id + "-" + order.updatedAt} order={order} busy={busy} act={act} open={show} go={go} customers={data.customers} /> :
          <div className="ops-empty"><ClipboardList size={28} /><h2>Order Details</h2><p>Choose an order from the register to get started.</p></div>}
      </section>
    </div>
    {action && <OrderDialog title={{ new: "New Order", note: "Add internal note", quote: "Issue / Revise Quote", payment: "Confirm received payment" }[action.kind]} close={() => setAction(undefined)}>
      <form onSubmit={submit} className="ops-dialog-form">
        {action.kind === "new" && <>
          <label>Customer name<input name="customerName" autoComplete="name" required /></label>
          <label>Phone<input name="phone" type="tel" autoComplete="tel" required /></label>
          <label>Email<input name="email" type="email" autoComplete="email" /></label>
          <label>Product<select name="productId" required>{data.products.filter(p => p.status === "published").map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <label>Quantity<input name="quantity" type="number" min="1" max="100000" step="1" defaultValue="5" required /></label>
          <label>Delivery address<input name="address" autoComplete="street-address" /></label>
          <label>Order channel<select name="source"><option>Admin</option><option>Manual</option><option>WhatsApp</option></select></label>
          <label>Order notes<textarea name="notes" rows={3} /></label>
        </>}
        {action.kind === "note" && <label>Internal note<textarea name="note" rows={4} required /></label>}
        {action.kind === "quote" && modalOrder && <>
          <p>Enter the agreed unit costs, including any personalisation. Delivery is added once.</p>
          {modalOrder.items.map((item, index) => <label key={index}>Final unit cost · {item.name}<input name={"price" + index} type="number" min="0" step="0.01" defaultValue={item.unitPrice ?? ""} required /></label>)}
          <label>Delivery fee (₦)<input name="delivery" type="number" min="0" step="0.01" defaultValue={modalOrder.deliveryFee ?? 0} /></label>
          <label>Quote details<textarea name="note" rows={3} /></label>
        </>}
        {action.kind === "payment" && modalOrder && <>
          <label>Amount received (₦)<input name="amount" type="number" min="0" step="0.01" defaultValue={modalOrder.total} required /></label>
          <label>Payment reference<input name="reference" maxLength={150} required /></label>
        </>}
        {dialogError && <p role="alert" className="desk-error">{error || "The changes could not be saved. Try again."}</p>}
        <button className="ops-primary" disabled={busy}>{busy ? "Saving…" : { new: "Create order", note: "Save note", quote: "Save agreed quote", payment: "Confirm payment" }[action.kind]}</button>
      </form>
    </OrderDialog>}
  </div>;
}

function OrderDetail({ order, busy, act, open, go, customers }: {
  order: LocalOrder; busy: boolean; act: Act; open: (action: Action) => void;
  go: (tab: string, search?: string) => void; customers: BusinessData["customers"];
}) {
  const customer = customers.find(c => c.phone.replace(/\D/g, "").replace(/^234/, "0") === order.phone.replace(/\D/g, "").replace(/^234/, "0") &&
    c.email.toLowerCase() === order.email.toLowerCase());
  const index = stages.indexOf(order.status);
  const subtotal = order.items.reduce((sum, item) => sum + (item.unitPrice ?? 0) * item.quantity, 0);
  const delivery = order.deliveryFee ?? (order.history.some(event => event.text.startsWith("Quote issued:"))
    ? Math.max(0, order.total - subtotal) : 0);
  const canQuote = order.paymentStatus === "Unpaid" && !closed(order) && order.status !== "Dispatched";
  const timeline = stages.filter(s => s !== "Awaiting quotation" || orderType(order) === "Quote order");
  const history = [...order.history].reverse().sort((a,b) => Date.parse(b.at) - Date.parse(a.at));
  const cancelled = history.find(event => event.text === "Status changed to Cancelled");
  return <>
    <div className="ops-card-head ops-detail-head"><h2>Order Details</h2><span>{order.demo && <em>Demo · </em>}{order.id}</span></div>
    <form onSubmit={e => {
      e.preventDefault();
      if (busy) return;
      const values = formValues(e.currentTarget);
      const next = String(values.status ?? order.status);
      if (next !== order.status && ["Dispatched", "Cancelled", "Completed"].includes(next) &&
        !window.confirm(`Move ${order.id} to ${next}? This cannot be undone from here.`)) return;
      void act({ ...values, action: "updateOrder", id: order.id });
    }}>
      <div className="ops-detail-top">
        <section className="ops-mini ops-customer">
          <span className="ops-icon"><UserRound size={20} /></span>
          <div><h3>Customer</h3><strong>{order.customerName}</strong>
            {order.phone && <span><Phone size={13} /> {order.phone}</span>}
            {order.email && <span><Mail size={13} /> {order.email}</span>}
            {order.deliveryMethod === "pickup" && <span>Customer pickup</span>}
            {order.deliveryMethod !== "pickup" && order.deliveryState && <span className="ops-delivery-line">Delivery to {order.deliveryArea ? `${order.deliveryArea}, Abuja` : order.deliveryState} · {order.deliveryPending ? "fee to confirm (use Issue / Revise Quote)" : naira(order.deliveryFee ?? 0)}</span>}
            {order.address && <details><summary>Delivery address</summary><p>{order.address}</p></details>}
            {customer && <button type="button" onClick={() => go("Customers", customer.email || customer.phone)}>Customer history</button>}
          </div>
        </section>
        <section className="ops-mini ops-value"><h3>Order Value</h3><strong>{naira(order.total)}</strong><small>{order.status === "Awaiting quotation" ? "Estimate · quote required" : order.paymentStatus === "Paid" ? "Payment confirmed" : "Awaiting payment"}</small></section>
        <section className="ops-mini ops-status" data-tone={tone(order.status)}>
          <label>Order Status<select name="status" defaultValue={order.status}>{editableStatuses(order).map(s => <option key={s}>{s}</option>)}</select></label>
          {order.paymentStatus === "Unpaid" && order.status === "Awaiting payment" && <button type="button" onClick={() => open("payment")}>Confirm received payment</button>}
          {order.payment && <small>Confirmed {stamp.format(new Date(order.payment.confirmedAt))}</small>}
        </section>
      </div>
      <div className="ops-items-layout">
        <section><h3>Items ({order.items.length})</h3>
          <DataList data={order.items} label="Order items" resetKey={order.id} limit={5} render={rows => <div className="ops-items">{rows.map((item, i) => <article className="ops-item" key={i}>
            <Thumbnail src={item.image} />
            <div><strong>{item.name}</strong><p>{item.quantity} × {item.unitPrice === null ? "To quote" : naira(item.unitPrice)}{item.colour && " · " + item.colour}{item.size && " · " + item.size}</p>
              {item.personalisation && <details><summary>Personalisation brief</summary>{Object.entries(item.personalisation).map(([key, value]) => <p key={key}>{key.replace(/([A-Z])/g, " $1")}: {String(value)}</p>)}</details>}
            </div><b>{item.unitPrice === null ? "To quote" : naira(item.quantity * item.unitPrice)}</b>
          </article>)}</div>} />
        </section>
        <section className="ops-mini ops-summary"><h3>Order Summary</h3><dl>
          <div><dt>Subtotal</dt><dd>{naira(order.total - delivery)}</dd></div>
          <div><dt>Delivery</dt><dd>{naira(delivery)}</dd></div>
          <div><dt>Total</dt><dd>{naira(order.total)}</dd></div>
        </dl></section>
      </div>
      <section className="ops-timeline" aria-label="Order progress">
        <h3>Order progress</h3>
        {order.status === "Cancelled" ? <p>Cancelled{cancelled && " · " + stamp.format(new Date(cancelled.at))}</p> :
          <ol><li data-state="done"><span>Order placed</span><small>{stamp.format(new Date(order.createdAt))}</small></li>
            {timeline.map(stage => {
              const event = history.find(entry => entry.text === "Status changed to " + stage || (stage === "Paid" && entry.text === "Payment confirmed"));
              const time = stage === "Paid" ? order.payment?.confirmedAt ?? event?.at : stage === "Awaiting payment" ? order.quoteIssuedAt ?? event?.at : event?.at;
              const past = stages.indexOf(stage) < index;
              const recorded = !!time || (stage === "Paid" && order.paymentStatus === "Paid") ||
                (stage === "Awaiting payment" && history.some(entry => entry.text.startsWith("Order placed;"))) ||
                (stage === "Awaiting quotation" && orderType(order) === "Quote order");
              return <li key={stage} data-state={stage === order.status ? "current" : past ? recorded ? "done" : "skipped" : "future"} aria-current={stage === order.status ? "step" : undefined}>
                <span>{stage}</span>{time ? <small>{stamp.format(new Date(time))}</small> : past && !recorded && <small>Not recorded</small>}</li>;
            })}
          </ol>}
      </section>
      <div className="ops-notes-grid">
        <section className="ops-mini ops-notes"><h3><FileText size={16} /> Order Notes</h3>
          <textarea aria-label="Order notes" name="notes" rows={4} maxLength={12000} defaultValue={order.notes} placeholder="Add order instructions or delivery details." />
          <div className="ops-notes-actions">
            <small>Saved separately from the status.</small>
            <button type="button" disabled={busy} onClick={e => {
              const notes = e.currentTarget.closest("section")?.querySelector("textarea")?.value ?? "";
              void act({ action: "updateOrder", id: order.id, status: order.status, notes });
            }}>Save notes</button>
          </div>
        </section>
        <section className="ops-mini ops-activity"><h3><Clock3 size={16} /> Activity Log</h3>
          <CollapsibleSection title="Recorded events" count={history.length} defaultOpen><DataList data={history} label="Activity events" limit={5} mode="load" render={rows => <ol>{rows.map((event, i) => <li key={i}><strong>{event.text}</strong><small>{stamp.format(new Date(event.at))} · {event.actor}</small></li>)}</ol>} /></CollapsibleSection>
        </section>
      </div>
      <div className="ops-actionbar">
        <button className="ops-primary" disabled={busy}>Update status</button>
        <button type="button" onClick={() => open("note")}>Add Note</button>
        {canQuote && <button type="button" onClick={() => open("quote")}>Issue / Revise Quote</button>}
        <button type="button" onClick={() => exportOrders([order], order.id)}><Download size={16} /> Export Order</button>
      </div>
    </form>
  </>;
}
