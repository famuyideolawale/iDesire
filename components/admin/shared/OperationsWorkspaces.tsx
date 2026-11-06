"use client";
import { useMemo, useEffect, useRef, useState, type ReactNode } from "react";
import { Search, X, Plus, SlidersHorizontal, Download } from "lucide-react";
import { brandNames, type Brand, type BusinessData, type Customer, type SessionUser, type StoreSettings } from "../../../lib/local/types";
import { canManageAccounts } from "../../../lib/local/permissions";
import { naira } from "../../../lib/products";
import { CollapsibleSection, DataList, Pagination, useDataPage } from "./Density";
import { AdminBadge, AdminSection } from "./primitives";

type Action = (input: Record<string, unknown>) => Promise<any>;
type Props = { data: BusinessData; brand: Brand; act: Action; busy: boolean; error: string };
const numbers = new Intl.NumberFormat("en-NG");
const date = (value: string) => new Date(value).toLocaleDateString("en-NG", { dateStyle: "medium", timeZone: "Africa/Lagos" });
const movementTime = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" });
const fields = (form: HTMLFormElement) => Object.fromEntries(new FormData(form));
const lower = (s: string) => s.trim().toLowerCase();
const phoneKey = (s: string) => s.replace(/\D/g, "").replace(/^(?:234|0)(?=\d{10}$)/, "");

export function Heading({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <header className="workspace-heading"><div><h1>{title}</h1><p>{description}</p></div>
    <div className="workspace-tools"><span className="workspace-environment">Workspace <span aria-hidden="true">·</span> Live data</span>{action}</div>
  </header>;
}
export function Metrics({ items }: { items: { label: string; value: string | number; caption?: string }[] }) {
  return <dl className="workspace-metrics">{items.map(({ label, value, caption }) => <div key={label}>
    <dt>{label}</dt><dd>{typeof value === "number" ? numbers.format(value) : value}</dd>{caption && <small>{caption}</small>}
  </div>)}</dl>;
}
export function SearchField({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  return <label className="workspace-search"><Search size={17} aria-hidden="true" /><input type="search" aria-label={label} placeholder={label} value={value} onChange={event => onChange(event.target.value)} /></label>;
}
export function Empty({ children }: { children: ReactNode }) {
  return <p className="workspace-empty" role="status">{children}</p>;
}
export function Dialog({ title, close, children, error }: { title: string; close: () => void; children: ReactNode; error: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return <dialog ref={ref} className="workspace-dialog" aria-labelledby="workspace-dialog-title" onCancel={event => { event.preventDefault(); close(); }}>
    <header><h2 id="workspace-dialog-title">{title}</h2><button type="button" aria-label="Close dialog" onClick={close}><X size={18} /></button></header>
    {error && <p role="alert" className="desk-error">{error}</p>}{children}
  </dialog>;
}

export function InventoryWorkspace({ data, act, busy, error }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [selected, setSelected] = useState("");
  const products = new Map(data.products.map(product => [product.id, product]));
  const rows = data.inventory.flatMap(stock => {
    const product = products.get(stock.productId);
    if (!product) return [];
    const available = stock.stock - stock.reserved;
    const low = available <= stock.threshold;
    const status = available <= 0 ? "Out of stock" : low ? "Low stock" : stock.reserved ? "Reserved" : "Healthy";
    return [{ stock, product, available, low, status }];
  });
  const visible = rows.filter(row => (!lowOnly || row.low) && (!category || row.product.category === category) && lower([row.product.name, row.product.sku].join(" ")).includes(lower(query)));
  const page = useDataPage(visible, 15, JSON.stringify([query, category, lowOnly]));
  const current = rows.find(row => row.stock.productId === selected);
  const count = (key: "stock" | "reserved") => rows.reduce((total, row) => total + row.stock[key], 0);
  const units = new Set(rows.map(row => row.product.unit));
  const unitLabel = units.size === 1 ? units.has("yard") ? "yards" : "units" : "stock across tracked products";
  return <div className="admin-workspace inventory-workspace">
    <Heading title="Inventory" description="Manage stock, reservations and availability across your catalogue." action={<button className="desk-primary" disabled={!rows.length} onClick={() => setSelected((visible[0] ?? rows[0]).stock.productId)}><Plus size={17} /> Adjust stock</button>} />
    <Metrics items={[
      { label: "Physical stock", value: count("stock"), caption: unitLabel },
      { label: "Reserved", value: count("reserved"), caption: "Committed stock" },
      { label: "Available", value: count("stock") - count("reserved"), caption: "Ready to allocate" },
      { label: "Low stock", value: rows.filter(row => row.low).length, caption: "At or below threshold" },
    ]} />
    <AdminSection title="Stock & movement">
      <p className="workspace-muted">Available stock is the physical count less reservations.</p>
      <div className="workspace-toolbar">
        <SearchField value={query} onChange={setQuery} label="Search by product or SKU" />
        <select aria-label="Product category" value={category} onChange={event => setCategory(event.target.value)}><option value="">All categories</option>{[...new Set(rows.map(row => row.product.category))].sort().map(category => <option key={category}>{category}</option>)}</select>
        <button type="button" aria-pressed={lowOnly} onClick={() => setLowOnly(!lowOnly)}><SlidersHorizontal size={15} /> Low stock only</button>
      </div>
      {visible.length ? <table className="workspace-stock-table">
        <caption className="workspace-sr">Current stock and reservations</caption>
        <thead><tr><th scope="col">Product</th><th scope="col">Physical</th><th scope="col">Reserved</th><th scope="col">Available</th><th scope="col">Status</th><th scope="col"><span className="workspace-sr">Actions</span></th></tr></thead>
        <tbody>{page.rows.map(({ stock, product, available, status }) => <tr key={stock.productId}>
          <th scope="row"><div className="workspace-stock-product">{product.image && <img src={product.image} alt="" loading="lazy" />}<span>{product.name}<small>{[product.sku, product.category].filter(Boolean).join(" · ")}</small></span></div></th>
          <td data-label="Physical">{numbers.format(stock.stock)}</td><td data-label="Reserved">{numbers.format(stock.reserved)}</td>
          <td data-label="Available"><strong>{numbers.format(available)}</strong></td>
          <td className="workspace-stock-status"><AdminBadge>{status}</AdminBadge></td>
          <td className="workspace-stock-action"><button type="button" aria-label={`Adjust stock for ${product.name}`} onClick={() => setSelected(stock.productId)}>Adjust</button></td>
        </tr>)}</tbody>
      </table> : <Empty>{rows.length ? "No products match these filters." : "There are no inventory records yet."} {(query || category || lowOnly) && <button type="button" onClick={() => { setQuery(""); setCategory(""); setLowOnly(false); }}>Clear filters</button>}</Empty>}
      <Pagination state={page} label="Inventory pages" /><p className="workspace-count">{visible.length} of {rows.length} products</p>
    </AdminSection>
    {current && <Dialog title="Stock adjustment" close={() => setSelected("")} error={error}>
      <label>Product<select value={selected} onChange={event => setSelected(event.target.value)}>{rows.map(({ product }) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
      <p className="workspace-muted">{numbers.format(current.stock.reserved)} reserved · {numbers.format(current.available)} available</p>
      <form key={selected} onSubmit={async event => {
        event.preventDefault();
        if (await act({ action: "saveInventory", id: selected, ...fields(event.currentTarget) })) setSelected("");
      }}>
        <div className="desk-fields"><label>Physical stock<input name="stock" type="number" min={current.stock.reserved} step={1} defaultValue={current.stock.stock} required /></label>
          <label>Low stock threshold<input name="threshold" type="number" min={0} defaultValue={current.stock.threshold} required /></label>
          <label className="wide">Adjustment reason<input name="reason" required placeholder="Restock or stock count correction" /></label></div>
        <button className="desk-primary" disabled={busy}>{busy ? "Saving…" : "Save adjustment"}</button>
      </form>
      <CollapsibleSection key={selected} title="Stock movements" count={current.stock.movements.length}><DataList data={current.stock.movements} label="Stock movements" limit={6} render={rows => <ul className="workspace-ledger">{rows.map(m => <li key={m.id}><strong>{m.quantity > 0 ? "+" : ""}{m.quantity} · {m.reason}</strong><small>{m.actor} · {movementTime.format(new Date(m.at))}</small></li>)}</ul>} /></CollapsibleSection>
    </Dialog>}
  </div>;
}

type CustomerProps = Props & { search: string; setSearch: (s: string) => void; openOrder: (id: string) => void };
export function CustomersWorkspace({ data, act, busy, error, search, setSearch, openOrder }: CustomerProps) {
  const [selected, setSelected] = useState("");
  const [segment, setSegment] = useState("All");
  const [tab, setTab] = useState("Overview");
  const [editing, setEditing] = useState<"new" | "profile" | "notes" | null>(null);
  const detail = useRef<HTMLElement>(null);
  const recent = (value: string) => Date.parse(value) >= Date.now() - 30 * 86400000;
  const profiles = useMemo(() => {
    const lookup = new Map<string, BusinessData["orders"]>();
    for (const order of data.orders) {
      const prefix = order.demo ? "demo" : "live";
      for (const [kind, value] of [["email", lower(order.email)], ["phone", phoneKey(order.phone)]]) {
        if (!value) continue;
        const key = prefix + ":" + kind + ":" + value;
        const matches = lookup.get(key);
        if (matches) matches.push(order);
        else lookup.set(key, [order]);
      }
    }
    return data.customers.map(customer => {
      const prefix = customer.demo ? "demo" : "live";
      const orders = [...new Set([
        ...(lookup.get(prefix + ":email:" + lower(customer.email)) ?? []),
        ...(lookup.get(prefix + ":phone:" + phoneKey(customer.phone)) ?? []),
      ])].sort((a,b) => b.createdAt.localeCompare(a.createdAt));
      const paid = orders.filter(order => order.paymentStatus === "Paid");
      const value = paid.reduce((sum, order) => sum + (order.payment?.amount ?? order.total), 0);
      const vip = customer.tags.some(tag => lower(tag) === "vip");
      return { customer, orders, paid, value, vip };
    });
  }, [data.orders, data.customers]);
  const visible = profiles.filter(({ customer: c, vip }) =>
    (segment !== "VIP" || vip) && (segment !== "Recent" || recent(c.createdAt)) &&
    (lower([c.name, c.email, c.phone, c.city, c.notes, ...c.tags].join(" ")).includes(lower(search)) || (!!phoneKey(search) && /^[+\d\s()-]+$/.test(search) && phoneKey(c.phone).includes(phoneKey(search))))
  );
  const directory = useDataPage(visible, 12, JSON.stringify([search, segment]));
  const profile = directory.rows.find(row => row.customer.id === selected) ?? directory.rows[0];
  const c = profile?.customer;
  const realPaid = data.orders.filter(order => !order.demo && order.paymentStatus === "Paid");
  const customerForm = editing === "new" ? undefined : c;
  const orderList = (limit?: number) => !profile?.orders.length ? <Empty>No orders linked to this contact yet.</Empty> :
    <DataList data={profile.orders} label="Customer orders" resetKey={profile.customer.id + tab} mode={limit ? "preview" : "page"} limit={limit ?? 10} render={rows => <ul className="workspace-customer-orders">{rows.map(order => <li key={order.id}>
      <button type="button" onClick={() => openOrder(order.id)}><span><strong>{order.id}</strong><small>{order.items.map(item => item.name).join(", ")}</small></span>
        <span>{date(order.createdAt)}</span><strong>{naira(order.total)}</strong><AdminBadge>{order.status}</AdminBadge></button>
    </li>)}</ul>} />;
  return <div className="admin-workspace customers-workspace">
    <Heading title="Customers" description="See who shops with you, what they ordered and how to follow up." action={<button className="desk-primary" onClick={() => setEditing("new")}><Plus size={17} /> Add customer</button>} />
    <Metrics items={[
      { label: "Customers", value: data.customers.length, caption: "Customer records" },
      { label: "VIP customers", value: profiles.filter(row => row.vip).length, caption: "Tagged VIP" },
      { label: "Paid orders", value: realPaid.filter(order => recent(order.createdAt)).length, caption: "Placed in the last 30 days" },
      { label: "Customer value", value: naira(realPaid.reduce((total, order) => total + (order.payment?.amount ?? order.total), 0)), caption: "Recorded payments, excluding demos" },
    ]} />
    <div className="workspace-customer-grid">
      <AdminSection title="Customer book" className="workspace-directory">
        <p className="workspace-muted">{visible.length} of {profiles.length} customers</p>
        <SearchField value={search} onChange={setSearch} label="Search name, email or phone" />
        <div className="workspace-segments" aria-label="Customer filters">{["All", "VIP", "Recent"].map(filter => <button type="button" key={filter} aria-pressed={segment === filter} onClick={() => setSegment(filter)}>{filter}</button>)}</div>
        {visible.length ? <ul className="workspace-directory-list">{directory.rows.map(row => <li key={row.customer.id}><button type="button" aria-pressed={c?.id === row.customer.id} onClick={() => {
          setSelected(row.customer.id); setTab("Overview");
          if (matchMedia("(max-width: 860px)").matches) { detail.current?.focus({ preventScroll: true }); detail.current?.scrollIntoView({ block: "start" }); }
        }}><span className="workspace-avatar" aria-hidden="true">{row.customer.name[0]?.toUpperCase()}</span>
          <span><strong>{row.customer.name}</strong><small>{row.customer.email || row.customer.phone}</small><small>{[...row.customer.tags, ...(row.customer.demo ? ["Demo"] : [])].join(" · ")}</small></span>
          <b>{row.value ? naira(row.value) : "—"}</b></button></li>)}</ul> : <Empty>{profiles.length ? "No customers match these filters." : "Add your first customer to start the directory."} {(search || segment !== "All") && <button onClick={() => { setSearch(""); setSegment("All"); }}>Clear filters</button>}</Empty>}
        <Pagination state={directory} label="Customer directory pages" />
      </AdminSection>
      <section className="admin-section workspace-profile" ref={detail} tabIndex={-1} aria-label="Customer profile">
        {c && profile ? <>
          <div className="workspace-profile-header"><span className="workspace-avatar" aria-hidden="true">{c.name[0]?.toUpperCase()}</span><div>
            <h2>{c.name}</h2><p className="workspace-muted">Customer since {date(c.createdAt)}{c.demo ? " · Demo" : ""}</p>
            <p className="workspace-contact">{c.phone && <a href={`tel:${c.phone}`}>{c.phone}</a>}{c.email && <a href={`mailto:${c.email}`}>{c.email}</a>}{c.city && <span>{c.city}</span>}</p>
            {c.tags.length > 0 && <div className="workspace-tags">{c.tags.map((tag, index) => <AdminBadge key={index}>{tag}</AdminBadge>)}</div>}
          </div><button type="button" onClick={() => setEditing("profile")}>Edit customer</button></div>
          <Metrics items={[{ label: "Lifetime paid", value: naira(profile.value) }, { label: "Orders", value: profile.orders.length }, { label: "Average paid order", value: profile.paid.length ? naira(profile.value / profile.paid.length) : "—" }]} />
          <div className="workspace-tabbar" aria-label="Customer profile sections">{["Overview", "Orders", "Notes"].map(section => <button type="button" key={section} aria-pressed={tab === section} onClick={() => setTab(section)}>{section}</button>)}</div>
          {tab !== "Notes" && <><div className="workspace-section-heading"><h3>{tab === "Overview" ? "Recent orders" : "Order history"}</h3>{tab === "Overview" && profile.orders.length > 3 && <button onClick={() => setTab("Orders")}>View all orders</button>}</div>{orderList(tab === "Overview" ? 3 : undefined)}</>}
          {tab !== "Orders" && <div className="workspace-notes"><div className="workspace-section-heading"><h3>Staff notes</h3><button type="button" onClick={() => setEditing("notes")}>{c.notes ? "Edit notes" : "Add note"}</button></div><p>{c.notes || "No staff notes yet."}</p></div>}
        </> : <><h2>Customer profile</h2><Empty>A matching customer will appear here.</Empty></>}
      </section>
    </div>
    {editing && <Dialog title={editing === "new" ? "Add customer" : editing === "notes" ? "Staff notes" : "Edit customer"} close={() => setEditing(null)} error={error}>
      <form onSubmit={async event => {
        event.preventDefault();
        const existing = customerForm && { ...customerForm, tags: customerForm.tags.join(", ") };
        const saved: Customer | null = await act({ action: "saveCustomer", customer: { ...existing, ...fields(event.currentTarget) } });
        if (saved) { setSelected(saved.id); if (editing !== "notes") { setSegment("All"); setSearch(""); setTab("Overview"); } setEditing(null); }
      }}>
        <div className="desk-fields">
          {editing !== "notes" && <>
            <label>Name<input name="name" defaultValue={customerForm?.name} required /></label>
            <label>Phone<input type="tel" name="phone" defaultValue={customerForm?.phone} required /></label>
            <label>Email<input name="email" type="email" defaultValue={customerForm?.email} /></label>
            <label>City<input name="city" defaultValue={customerForm?.city} /></label>
            <label className="wide">Tags (comma separated)<input name="tags" defaultValue={customerForm?.tags.join(", ")} /></label>
          </>}
          <label className="wide">Staff notes<textarea name="notes" rows={5} defaultValue={customerForm?.notes} /></label>
        </div>
        <button className="desk-primary" disabled={busy}>{busy ? "Saving…" : editing === "notes" ? "Save notes" : "Save customer"}</button>
      </form>
    </Dialog>}
  </div>;
}

type BrandDraft = Omit<StoreSettings, "heroSlides">;
const brandGroups = [
  { title: "Storefront", fields: [["heroTitle", "Hero title"], ["heroText", "Hero text"], ["announcement", "Announcement"]] },
  { title: "Contact & visiting", fields: [["email", "Email"], ["phone", "Phone / WhatsApp"], ["instagram", "Instagram"], ["address", "Address"], ["openingHours", "Opening hours"]] },
  { title: "Live chat", fields: [["chatWelcome", "Chat welcome message"]] },
] as const;
function brandDraft({ heroSlides: _, ...values }: StoreSettings): BrandDraft { return values; }
type SettingsProps = Props & { user: SessionUser; staff: SessionUser[]; go: (section: string) => void; initialSection?: string };
export function SettingsWorkspace({ data, brand, act, busy, user, staff, go, initialSection }: SettingsProps) {
  const [section, setSection] = useState(initialSection ?? "Brand");
  const [edits, setEdits] = useState<Partial<BrandDraft>>({});
  const [saved, setSaved] = useState(false);
  const baseline = brandDraft(data.settings);
  const draft = { ...baseline, ...edits };
  const dirty = (Object.keys(edits) as (keyof BrandDraft)[]).some(key => draft[key] !== baseline[key]);
  const canManage = canManageAccounts(user);
  const edit = <K extends keyof BrandDraft>(key: K, value: BrandDraft[K]) => { setEdits(previous => ({ ...previous, [key]: value })); setSaved(false); };
  const exportWorkspace = () => {
    const { user: _, staff: __, ...backup } = data as BusinessData & { user?: SessionUser; staff?: SessionUser[] };
    const link = document.createElement("a");
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
    link.href = url;
    link.download = "workspace-export-" + new Date().toISOString().slice(0, 10) + ".json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <div className="admin-workspace settings-workspace">
    <Heading title="Settings" description={`Manage how ${brandNames[brand]} appears and communicates, and how staff access the workspace.`} />
    <div className="workspace-tabbar workspace-settings-nav" aria-label="Settings sections">
      {["Brand", "Account", ...(canManage ? ["Team"] : []), "Data & security"].map(item => <button key={item} type="button" aria-pressed={section === item} onClick={() => setSection(item)}>{item}{item === "Brand" && dirty ? " · Unsaved" : ""}</button>)}
    </div>
    {section === "Brand" && <form className="workspace-settings-form" onSubmit={async event => {
      event.preventDefault();
      if (await act({ action: "saveSettings", settings: edits })) { setEdits({}); setSaved(true); }
    }}>
      <div className="workspace-settings-grid">
        <AdminSection title="Brand presence"><p className="workspace-muted">Update what customers see and how they reach your team.</p>
          {brandGroups.map(group => <CollapsibleSection key={group.title} title={group.title} defaultOpen={group.title === "Storefront"}><fieldset disabled={busy} className="workspace-fieldset" aria-label={group.title}><div className="desk-fields">
            {group.fields.map(([key, label]) => <label key={key} className={["heroTitle","heroText","announcement","address","chatWelcome"].includes(key) ? "wide" : undefined}>{label}
              {key === "heroText" || key === "chatWelcome" ? <textarea rows={3} value={draft[key]} onChange={event => edit(key, event.target.value)} /> :
                <input type={key === "email" ? "email" : key === "phone" ? "tel" : "text"} value={draft[key]} onChange={event => edit(key, event.target.value)} />}
            </label>)}
            {group.title === "Live chat" && <label className="desk-check wide"><input type="checkbox" checked={draft.chatOnline} onChange={event => edit("chatOnline", event.target.checked)} /> Team available in live chat</label>}
          </div></fieldset></CollapsibleSection>)}
        </AdminSection>
        <aside className="workspace-preview"><AdminSection title="Storefront preview">
          <p className="workspace-muted">A preview of the copy in this form. Changes go live when saved.</p>
          <div className="workspace-preview-card">{draft.announcement && <small>{draft.announcement}</small>}<strong>{draft.heroTitle || "Homepage heading"}</strong><p>{draft.heroText}</p></div>
          <p className="workspace-muted">Individual hero slides are managed in the page builder.</p><button type="button" onClick={() => go("Page builder")}>Open page builder</button>
        </AdminSection></aside>
      </div>
      <footer className="workspace-save-bar"><span role="status">{busy ? "Saving…" : dirty ? "You have unsaved brand changes." : saved ? "Brand settings saved." : "Brand settings are up to date."}</span>
        {dirty && <button type="button" disabled={busy} onClick={() => { setEdits({}); setSaved(false); }}>Reset changes</button>}
        <button className="desk-primary" disabled={!dirty || busy}>Save changes</button>
      </footer>
    </form>}
    {section === "Account" && <AdminSection title="Your account"><div className="workspace-profile-header"><span className="workspace-avatar" aria-hidden="true">{user.name[0]?.toUpperCase()}</span><div><h3>{user.name}</h3><p>{user.role} · {user.username || user.email}</p></div><AdminBadge>{user.status ?? "Active"}</AdminBadge></div><button onClick={() => setSection("Data & security")}>Manage password</button></AdminSection>}
    {section === "Team" && canManage && <AdminSection title="Workspace team"><p className="workspace-muted">Manage access, permissions and staff accounts in Accounts.</p>
      <DataList data={staff} label="Staff" render={rows => <ul className="workspace-ledger">{rows.map(person => <li key={person.id}><strong>{person.name}</strong><small>{person.role} · {person.status ?? "Active"}</small></li>)}</ul>} />
      <button className="desk-primary" onClick={() => go("Accounts")}>Manage accounts</button>
    </AdminSection>}
    {section === "Data & security" && <div className="workspace-settings-grid">
      <AdminSection title="Password security"><p className="workspace-muted">Use at least 10 characters. After updating your password, sign in again with the new one.</p>
        <form onSubmit={async event => {
          event.preventDefault();
          const form = event.currentTarget;
          if (await act({ action: "changePassword", ...fields(form) })) form.reset();
        }}><div className="desk-fields single">
          <label>Current password<input name="currentPassword" type="password" autoComplete="current-password" required /></label>
          <label>New password<input name="newPassword" type="password" autoComplete="new-password" minLength={10} required /></label>
        </div><button className="desk-primary" disabled={busy}>Update password</button></form>
      </AdminSection>
      <AdminSection title="Workspace data"><p>Download a JSON snapshot of this workspace, including settings, customers, products and orders.</p>
        <button type="button" onClick={exportWorkspace}><Download size={16} /> Export workspace</button>
      </AdminSection>
    </div>}
  </div>;
}
