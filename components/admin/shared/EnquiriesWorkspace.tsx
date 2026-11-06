"use client";
import { useEffect, useMemo, useState } from "react";
import { Download, Mail, MessageCircle, Phone } from "lucide-react";
import type { BusinessData, Enquiry } from "../../../lib/local/types";
import { Pagination, useDataPage } from "./Density";
import { AdminBadge, exportReport } from "./primitives";
import { Heading, Metrics, SearchField } from "./OperationsWorkspaces";

type Action = (input: Record<string, unknown>) => Promise<unknown>;
type Props = { data: BusinessData; act: Action; busy: boolean; search: string; setSearch: (value: string) => void };

// Keep in step with enquiryStatuses in lib/local/actions.ts.
const statuses = ["New", "Contacted", "Quote sent", "Awaiting response", "Converted", "Closed"];
const open = new Set(["New", "Contacted", "Quote sent", "Awaiting response"]);
const periods = [["7", "Last 7 days"], ["30", "Last 30 days"], ["90", "Last 90 days"], ["", "All time"]] as const;
const sorts = ["Newest first", "Oldest first", "Waiting longest"] as const;
const PAGE = 25;
const DAY = 86_400_000;

const fullDate = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" });
function age(value: string) {
  const ms = Date.now() - Date.parse(value);
  if (ms < 3_600_000) return Math.max(1, Math.round(ms / 60_000)) + "m";
  if (ms < DAY) return Math.round(ms / 3_600_000) + "h";
  if (ms < 30 * DAY) return Math.round(ms / DAY) + "d";
  return new Date(value).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}
const digits = (phone: string) => {
  const d = phone.replace(/\D/g, "").replace(/^00/, "");
  return /^0[789]\d{9}$/.test(d) ? "234" + d.slice(1) : d;
};
const lower = (s: string) => s.toLowerCase();

export function EnquiriesWorkspace({ data, act, busy, search, setSearch }: Props) {
  const [status, setStatus] = useState("Open");
  const [type, setType] = useState("");
  const [period, setPeriod] = useState("");
  const [sort, setSort] = useState<(typeof sorts)[number]>("Newest first");
  const [selectedId, setSelectedId] = useState("");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("Contacted");

  const enquiries = data.enquiries;
  const types = useMemo(() => [...new Set(enquiries.map((e) => e.type))].sort(), [enquiries]);
  const counts = useMemo(() => {
    const map: Record<string, number> = { All: enquiries.length, Open: 0 };
    for (const e of enquiries) {
      map[e.status] = (map[e.status] ?? 0) + 1;
      if (open.has(e.status)) map.Open++;
    }
    return map;
  }, [enquiries]);

  const visible = useMemo(() => {
    const term = lower(search.trim());
    const phoneTerm = search.replace(/\D/g, "");
    const since = period ? Date.now() - Number(period) * DAY : 0;
    const list = enquiries.filter((e) =>
      (status === "All" || (status === "Open" ? open.has(e.status) : e.status === status)) &&
      (!type || e.type === type) &&
      (!since || Date.parse(e.createdAt) >= since) &&
      (!term ||
        lower([e.id, e.customerName, e.email, e.phone, e.type, e.details, e.notes ?? ""].join(" ")).includes(term) ||
        (phoneTerm.length >= 4 && digits(e.phone).includes(phoneTerm.replace(/^0/, ""))))
    );
    const time = (e: Enquiry) => Date.parse(e.createdAt);
    if (sort === "Oldest first") return list.sort((a, b) => time(a) - time(b));
    if (sort === "Waiting longest")
      return list.sort((a, b) => Number(open.has(b.status)) - Number(open.has(a.status)) || time(a) - time(b));
    return list.sort((a, b) => time(b) - time(a));
  }, [enquiries, status, type, period, sort, search]);

  const page = useDataPage(visible, PAGE, JSON.stringify([status, type, period, sort, search]));
  const selected = enquiries.find((e) => e.id === selectedId) ?? page.rows[0];
  useEffect(() => setChecked(new Set()), [status, type, period, search]);

  const weekAgo = Date.now() - 7 * DAY;
  const stale = enquiries.filter((e) => e.status === "New" && Date.now() - Date.parse(e.createdAt) > 2 * DAY).length;
  const decided = enquiries.filter((e) => e.status === "Converted" || e.status === "Closed").length;
  const converted = counts.Converted ?? 0;

  const allOnPage = page.rows.length > 0 && page.rows.every((e) => checked.has(e.id));
  const toggle = (id: string) => setChecked((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const exportCsv = () => exportReport("enquiries", [
    ["Reference", "Received", "Name", "Phone", "Email", "Type", "Status", "Details", "Notes"],
    ...visible.map((e) => [e.id, fullDate.format(new Date(e.createdAt)), e.customerName, e.phone, e.email, e.type, e.status, e.details, e.notes ?? ""]),
  ]);

  return (
    <div className="admin-workspace enquiries-workspace">
      <Heading
        title="Enquiries"
        description="Every question, quote request and brief from the website, in one queue."
        action={<button className="desk-secondary" type="button" onClick={exportCsv}><Download size={16} /> Export {visible.length}</button>}
      />
      <Metrics items={[
        { label: "Open", value: counts.Open, caption: "New, contacted or awaiting reply" },
        { label: "Needs a first reply", value: stale, caption: "New for more than 48 hours" },
        { label: "This week", value: enquiries.filter((e) => Date.parse(e.createdAt) >= weekAgo).length, caption: "Received in the last 7 days" },
        { label: "Converted", value: decided ? Math.round((converted / decided) * 100) + "%" : "–", caption: `${converted} of ${decided} closed enquiries` },
      ]} />

      <div className="enq-status-tabs" role="tablist" aria-label="Filter by status">
        {["Open", ...statuses, "All"].map((s) => (
          <button key={s} type="button" role="tab" aria-selected={status === s} onClick={() => setStatus(s)}>
            {s}<span>{counts[s] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="enq-toolbar">
        <SearchField value={search} onChange={setSearch} label="Search name, phone, email, reference or message" />
        <select aria-label="Enquiry type" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          {types.map((t) => <option key={t}>{t}</option>)}
        </select>
        <select aria-label="Received" value={period} onChange={(e) => setPeriod(e.target.value)}>
          {periods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as (typeof sorts)[number])}>
          {sorts.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="enq-layout">
        <section className="enq-register" aria-label="Enquiry register">
          {checked.size > 0 && (
            <div className="enq-bulk" role="region" aria-label="Bulk actions">
              <strong>{checked.size} selected</strong>
              <label>Set status
                <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
                  {statuses.map((s) => <option key={s}>{s}</option>)}
                </select>
              </label>
              <button className="desk-primary" type="button" disabled={busy} onClick={async () => {
                await act({ action: "saveEnquiry", ids: [...checked], status: bulkStatus });
                setChecked(new Set());
              }}>Apply</button>
              <button type="button" className="enq-link" onClick={() => setChecked(new Set())}>Clear</button>
            </div>
          )}
          <div className="enq-table" role="table" aria-label={`${visible.length} enquiries`}>
            <div className="enq-row enq-head" role="row">
              <span role="columnheader">
                <input type="checkbox" aria-label="Select all on this page" checked={allOnPage} onChange={() => setChecked((prev) => {
                  const next = new Set(prev);
                  for (const e of page.rows) if (allOnPage) next.delete(e.id); else next.add(e.id);
                  return next;
                })} />
              </span>
              <span role="columnheader">Customer</span>
              <span role="columnheader">Enquiry</span>
              <span role="columnheader">Received</span>
              <span role="columnheader">Status</span>
            </div>
            {page.rows.map((e) => (
              <div key={e.id} role="row" className="enq-row" aria-selected={selected?.id === e.id}
                data-stale={e.status === "New" && Date.now() - Date.parse(e.createdAt) > 2 * DAY || undefined}>
                <span role="cell"><input type="checkbox" aria-label={`Select ${e.customerName}`} checked={checked.has(e.id)} onChange={() => toggle(e.id)} /></span>
                <button type="button" role="cell" className="enq-open" onClick={() => setSelectedId(e.id)}>
                  <b>{e.customerName}</b><small>{e.phone}</small>
                </button>
                <button type="button" role="cell" className="enq-open enq-summary" onClick={() => setSelectedId(e.id)}>
                  <b>{e.type}{e.demo ? " · Demo" : ""}</b><small>{e.details}</small>
                </button>
                <span role="cell" className="enq-age" title={fullDate.format(new Date(e.createdAt))}>{age(e.createdAt)}</span>
                <span role="cell"><AdminBadge>{e.status}</AdminBadge></span>
              </div>
            ))}
            {!visible.length && <p className="enq-empty">No enquiries match these filters.</p>}
          </div>
          <Pagination state={page} label="Enquiry pages" />
        </section>

        {selected && <EnquiryDetail key={selected.id} enquiry={selected} act={act} busy={busy} orders={data.orders} />}
      </div>
    </div>
  );
}

function EnquiryDetail({ enquiry: e, act, busy, orders }: { enquiry: Enquiry; act: Action; busy: boolean; orders: BusinessData["orders"] }) {
  const [notes, setNotes] = useState(e.notes ?? "");
  const phone = digits(e.phone);
  const history = orders.filter((o) => digits(o.phone).slice(-10) === phone.slice(-10) || (e.email && o.email.toLowerCase() === e.email.toLowerCase()));
  const reply = encodeURIComponent(`Hi ${e.customerName.split(" ")[0]}, thank you for your enquiry (${e.id}). `);
  return (
    <aside className="enq-detail" aria-label={`Enquiry from ${e.customerName}`}>
      <header>
        <div><small>{e.id}</small><h2>{e.customerName}</h2><p>{e.type} · {fullDate.format(new Date(e.createdAt))}</p></div>
        <AdminBadge>{e.status}</AdminBadge>
      </header>
      <div className="enq-contact">
        {e.phone && <a href={`https://wa.me/${phone}?text=${reply}`} target="_blank" rel="noreferrer"><MessageCircle size={15} /> WhatsApp</a>}
        {e.phone && <a href={`tel:${e.phone}`}><Phone size={15} /> Call</a>}
        {e.email && <a href={`mailto:${e.email}?subject=${encodeURIComponent("Your enquiry " + e.id)}`}><Mail size={15} /> Email</a>}
      </div>
      <dl className="enq-facts">
        <div><dt>Phone</dt><dd>{e.phone || "Not given"}</dd></div>
        <div><dt>Email</dt><dd>{e.email || "Not given"}</dd></div>
        <div><dt>Orders</dt><dd>{history.length ? `${history.length} linked` : "None yet"}</dd></div>
      </dl>
      <section><h3>Message</h3><p className="enq-message">{e.details}</p></section>
      <section>
        <h3>Status</h3>
        <div className="enq-status-pick" role="radiogroup" aria-label="Enquiry status">
          {statuses.map((s) => (
            <button key={s} type="button" role="radio" aria-checked={e.status === s} disabled={busy}
              onClick={() => s !== e.status && void act({ action: "saveEnquiry", id: e.id, status: s })}>{s}</button>
          ))}
        </div>
      </section>
      <section>
        <h3>Internal notes</h3>
        <textarea rows={4} maxLength={5000} value={notes} onChange={(ev) => setNotes(ev.target.value)} placeholder="Who followed up, what was agreed, next step…" />
        <div className="enq-notes-actions">
          <small>{e.updatedAt ? `Updated ${fullDate.format(new Date(e.updatedAt))}` : "Only staff see these notes."}</small>
          <button type="button" className="desk-secondary" disabled={busy || notes === (e.notes ?? "")} onClick={() => void act({ action: "saveEnquiry", id: e.id, notes })}>Save notes</button>
        </div>
      </section>
      {history.length > 0 && (
        <section><h3>Recent orders</h3>
          <ul className="enq-orders">{history.slice(0, 3).map((o) => <li key={o.id}><span>{o.id}</span><AdminBadge>{o.status}</AdminBadge></li>)}</ul>
        </section>
      )}
    </aside>
  );
}
