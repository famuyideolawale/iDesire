"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { OrderArtwork } from "./OrderArtwork";
import { api, watchChanges } from "../lib/local/client";
import {
  brandNames,
  homePath,
  productPath,
  orderStatuses,
  type Brand,
  type BusinessData,
  type SessionUser,
  type LocalProduct,
  type LocalOrder,
  type Conversation,
} from "../lib/local/types";
import { naira } from "../lib/products";
import AccountManagement from "./AccountManagement";
import { canManageAccounts } from "../lib/local/permissions";
import { CampaignEditor } from "./admin/shared/CampaignEditor";
import { InventoryWorkspace, CustomersWorkspace, SettingsWorkspace } from "./admin/shared/OperationsWorkspaces";
import { CollapsibleSection, DataList, Pagination, useDataPage } from "./admin/shared/Density";
import AdminOverview from "./admin/shared/AdminOverview";
import { AdminBadge, AdminSection, exportReport, orderChannel } from "./admin/shared/primitives";
import IDesireOrders from "./IDesireOrders";
import VisualPageBuilder from "./VisualPageBuilder";
type DeskData = BusinessData & {
  user: SessionUser;
  staff: SessionUser[];
  accounts: SessionUser[];
};
type Act = (input: Record<string, unknown>) => Promise<any>;
const tabs = [
  "Overview",
  "Orders",
  "Quotes",
  "Fulfilment",
  "Products",
  "Collections",
  "Promotions",
  "Reports",
  "Inventory",
  "Customers",
  "Enquiries",
  "Live chat",
  "Page builder",
  "Media",
  "Settings",
  "Accounts",
  "Activity",
];
const fmt = (s: string) =>
  new Date(s).toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
function values(form: HTMLFormElement) {
  return Object.fromEntries(new FormData(form).entries());
}
function Badge({ children }: { children: React.ReactNode }) {
  return <AdminBadge>{children}</AdminBadge>;
}
export default function BusinessAdmin({ brand }: { brand: Brand }) {
  const [data, setData] = useState<DeskData | null>(null),
    [session, setSession] = useState<SessionUser | null>(null),
    [loading, setLoading] = useState(true),
    [tab, setTab] = useState("Overview"),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [search, setSearch] = useState("");
  const gift = brand === "kokies";
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [intent, setIntent] = useState("");
  const [initialSearch, setInitialSearch] = useState("");
  const orderSection = ["Orders", "Quotes", "Fulfilment"].includes(tab);
  const overview = tab === "Overview" || tab === "Reports";
  const redesignedWorkspace = ["Inventory", "Customers", "Settings", "Accounts"].includes(tab);
  const atelierOrders = !gift && orderSection && !!data;
  const go = (section: string, term = "", next = "") => {
    if (section !== tab) window.scrollTo({ top: 0, behavior: "instant" });
    setNavigationOpen(false); setTab(section); setSearch(term); setInitialSearch(term); setIntent(next); setNotice("");
  };
  const load = useCallback(async () => {
    try {
      const d = await api<DeskData>(`/api/local/admin/${brand}`);
      setData(d);
      setSession(d.user);
      setError("");
    } catch (e) {
      if ((e as { status?: number }).status === 401) {
        setSession(null);
        setData(null);
      }
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [brand]);
  useEffect(() => {
    api<{ user: SessionUser | null }>("/api/local/session")
      .then((s) => {
        setSession(s.user);
        if (s.user) void load();
        else setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [load]);
  useEffect(() => {
    if (!session) return;
    return watchChanges(brand, () => void load());
  }, [brand, session?.id, load]);
  const act: Act = async (input) => {
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const r = await api(`/api/local/admin/${brand}`, input);
      await load();
      setNotice("Changes saved.");
      return r.result;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  };
  async function logout() {
    await fetch("/api/local/session", { method: "DELETE" });
    setSession(null);
    setData(null);
  }
  if (loading)
    return (
      <div className={`business-desk ${brand}-desk`}>
        <div className="desk-login">
          <h1>Opening {brandNames[brand]}…</h1>
        </div>
      </div>
    );
  if (!session)
    return (
      <div className={`business-desk ${brand}-desk`}>
        <div className="desk-login">
          <span className="desk-kicker">
            {gift
              ? "THE GIFT HOUSE / STAFF ACCESS"
              : "iDESIRE / BUSINESS OPERATIONS"}
          </span>
          <h1>{gift ? "A thoughtful workspace." : "Behind every occasion."}</h1>
          <p>Sign in to {brandNames[brand]}.</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const v = values(e.currentTarget);
              setBusy(true);
              try {
                const s = await api("/api/local/session", v);
                setSession(s.user);
                await load();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Username or email
              <input
                name="username"
                type="text"
                autoComplete="username"
                required
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </label>
            <button className="desk-primary" disabled={busy}>
              Sign in
            </button>
          </form>
          {error && (
            <p role="alert" className="desk-error">
              {error}
            </p>
          )}
          <Link href={homePath(brand)}>← Back to the website</Link>
        </div>
      </div>
    );
  const nav = (
    <nav id="admin-navigation" className={navigationOpen ? "admin-nav-open" : ""} aria-label={`${brandNames[brand]} admin sections`}>
      {tabs
        .filter((t) => t !== "Accounts" || canManageAccounts(session))
        .map((t) => (
          <button
            key={t}
            aria-current={tab === t ? "page" : undefined}
            onClick={() => {
              go(t);
            }}
          >
            {({ Overview: gift ? "Gift desk" : "Dashboard", "Page builder": "Brand Studio", "Live chat": "Conversations", Activity: "Audit trail" } as Record<string, string>)[t] ?? t}
            {t === "Live chat" &&
              data?.conversations.some((c) => c.unread > 0) && (
                <b className="unread-dot">
                  {data.conversations.reduce((n, c) => n + c.unread, 0)}
                </b>
              )}
          </button>
        ))}
    </nav>
  );
  return (
    <div className={`business-desk ${brand}-desk`} aria-busy={busy}>
      <header className="desk-header">
        <Link href={homePath(brand)} className="desk-wordmark">
          {gift ? (
            <>
              Kokies<span>WORLD OF GIFTS / GIFT HOUSE DESK</span>
            </>
          ) : (
            <>
              iDesire<span>TRADS / OPERATIONS</span>
            </>
          )}
        </Link>
        <div className="desk-actions">
          <label className="desk-brand-select">
            Working in
            <select
              aria-label="Switch business workspace"
              value={brand}
              onChange={(e) =>
                location.assign(
                  e.target.value === "kokies" ? "/admin/kokies" : "/admin",
                )
              }
            >
              {session.brands.map((b) => (
                <option key={b} value={b}>
                  {brandNames[b]}
                </option>
              ))}
            </select>
          </label>
          <Link className="desk-button" href={homePath(brand)} target="_blank">
            View website ↗
          </Link>
          <button onClick={() => void logout()}>Sign out</button>
        </div>
      </header>
      <div className="desk-layout">
        <button type="button" className="admin-nav-toggle" aria-controls="admin-navigation" aria-expanded={navigationOpen} onClick={() => setNavigationOpen(!navigationOpen)}>
          {navigationOpen ? "Close workspace menu" : "Workspace menu"} · {tab}
        </button>
        {nav}
        <main
          className={`desk-main desk-mode-${tab.toLowerCase().replaceAll(" ", "-")} ${tab === "Page builder" ? "desk-builder-mode" : ""}`}
        >
          {!atelierOrders && !(data && (overview || redesignedWorkspace)) && <div className="desk-title">
            <div>
              <span className="desk-kicker">
                {gift
                  ? "MAKE EVERY DETAIL COUNT"
                  : "THE BUSINESS OF BEAUTIFUL OCCASIONS"}
              </span>
              <h1>
                {tab === "Overview"
                  ? gift
                    ? "Welcome to the gift house."
                    : "Your business, at a glance."
                  : tab}
              </h1>
              <p>
                {brandNames[brand]} · {session.name} · {session.role}
              </p>
            </div>
            <Badge>LOCAL WORKSPACE · LIVE DATA</Badge>
          </div>}
          {error && (
            <p role="alert" className="desk-error">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="desk-notice">
              {notice}
            </p>
          )}
          {!data ? (
            <p>
              Unable to open this workspace. {error}{" "}
              <button onClick={() => void load()}>Retry</button>
            </p>
          ) : (
            <>
              {!atelierOrders && !overview && !redesignedWorkspace && <p className="desk-demo-note">
                Demonstration records are labelled “Demo”. New website
                submissions arrive here automatically. Payments are confirmed
                manually.
              </p>}
              {!atelierOrders && ["Products", "Orders", "Quotes", "Fulfilment", "Enquiries"].includes(
                tab,
              ) && (
                <input
                  className="desk-search"
                  aria-label={`Search ${tab}`}
                  placeholder={`Search ${tab.toLowerCase()}…`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              )}
              {overview && <AdminOverview key={tab} data={data} brand={brand} session={session} go={go} reports={tab === "Reports"} signOut={() => void logout()} />}
              {tab === "Collections" && <AdminSection title="Catalogue collections">
                <DataList data={[...new Set(data.products.map(p => p.collection || p.category))]} label="Collections" limit={12} render={rows => <div className="admin-collection-grid">{rows.map(collection => {
                  const members = data.products.filter(p => (p.collection || p.category) === collection);
                  return <button key={collection} onClick={() => go("Products", collection)}>{members[0]?.image && <img src={members[0].image} alt="" />}<strong>{collection}</strong><small>{members.length} products</small></button>;
                })}</div>} />
              </AdminSection>}
              {tab === "Promotions" && <AdminSection title="Sale pricing">
                <p>Manage sale prices in the product catalogue. Active sale prices are used at checkout.</p>
                <button className="desk-primary" onClick={() => go("Products")}>Manage product pricing</button>
                <DataList data={data.products.filter(p => p.salePrice !== undefined && p.salePrice !== null)} label="Sale products" render={rows => <div>{rows.map(p => <div className="desk-row desk-log" key={p.id}><strong>{p.name}</strong><span>{naira(p.salePrice!)}</span><button onClick={() => go("Products",p.name)}>Open product</button></div>)}</div>} />
              </AdminSection>}
              {tab === "Products" && (
                <Products data={data} brand={brand} act={act} search={search} startNew={intent === "new"} />
              )}{" "}
              {orderSection && (
                gift ? <Orders key={tab} data={data} act={act} search={search} brand={brand} refresh={load} mode={tab} intent={intent} /> :
                  <IDesireOrders key={tab} data={data} session={session} act={act} busy={busy} error={error}
                    mode={tab} intent={intent} initialSearch={initialSearch} go={go}
                    signOut={() => void logout()} />
              )}{" "}
              {tab === "Inventory" && <InventoryWorkspace data={data} brand={brand} act={act} busy={busy} error={error} />}{" "}
              {tab === "Customers" && (
                <CustomersWorkspace data={data} brand={brand} act={act} busy={busy} error={error} search={search} setSearch={setSearch} openOrder={id => go("Orders", id)} />
              )}{" "}
              {tab === "Enquiries" && (
                <Enquiries data={data} act={act} search={search} />
              )}{" "}
              {tab === "Live chat" && <Inbox data={data} act={act} />}{" "}
              {tab === "Page builder" && (
                <><CampaignEditor data={data} brand={brand} save={act} /><VisualPageBuilder
                  pages={data.pages}
                  sharedDraft={data.sharedDesign?.draft ?? []}
                  brand={brand}
                  act={act}
                  media={data.media}
                /></>
              )}{" "}
              {tab === "Media" && (
                <MediaLibrary
                  data={data}
                  brand={brand}
                  refresh={load}
                  act={act}
                  onError={setError}
                />
              )}{" "}
              {tab === "Settings" && <SettingsWorkspace data={data} brand={brand} act={act} busy={busy} error={error} user={data.user} staff={data.staff} go={go} initialSection={intent === "security" ? "Data & security" : undefined} />}
              {tab === "Accounts" && canManageAccounts(data.user) && (
                <AccountManagement
                  user={data.user}
                  accounts={data.accounts}
                  brand={brand}
                  act={act}
                  error={error}
                  openSecurity={() => go("Settings", "", "security")}
                />
              )}{" "}
              {tab === "Activity" && (
                <section className="desk-card">
                  <h2>Workspace audit trail</h2>
                  <DataList data={data.audit} label="Audit events" limit={20} render={rows => <div>{rows.map((a) => (
                    <div className="desk-row desk-log" key={a.id}>
                      <span>
                        <strong>{a.action}</strong>
                        <small>{a.entity}</small>
                      </span>
                      <span>
                        {a.actor}
                        <small>{fmt(a.at)}</small>
                      </span>
                    </div>
                  ))}</div>} />
                </section>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
function Products({
  data,
  brand,
  act,
  search, startNew,
}: {
  data: DeskData;
  brand: Brand;
  act: Act;
  search: string; startNew: boolean;
}) {
  const [selected, setSelected] = useState<LocalProduct | null>(null),
    [newItem, setNew] = useState(startNew);
  const [category, setCategory] = useState("");
  const [productSort, setProductSort] = useState("catalogue");
  const productResults = data.products.filter(p => (!category || p.category === category) &&
    [p.name, p.category, p.sku, p.collection].join(" ").toLowerCase().includes(search.trim().toLowerCase()));
  if (productSort === "name") productResults.sort((a,b) => a.name.localeCompare(b.name));
  if (productSort === "price") productResults.sort((a,b) => (a.price ?? Infinity) - (b.price ?? Infinity));

  return (
    <>
      <div className="desk-row">
        <p>
          {data.products.length} products ·{" "}
          {brand === "kokies" ? "Gifts and souvenirs" : "Fabrics and Asoebi"}
        </p>
        <button
          className="desk-primary"
          onClick={() => {
            setSelected(null);
            setNew(true);
          }}
        >
          + Add product
        </button>
      </div>
      {(selected || newItem) && (
        <section className="desk-card">
          <h2>{selected ? "Edit product" : "New product"}</h2>
          <form
            key={selected?.id || "new"}
            onSubmit={async (e) => {
              e.preventDefault();
              const v = values(e.currentTarget);
              const result = await act({
                action: "saveProduct",
                product: {
                  ...v,
                  id: selected?.id,
                  price: v.price === "" ? null : Number(v.price),
                  minimum: Number(v.minimum),
                  sample: v.sample === "on",
                  featured: v.featured === "on",
                  newArrival: v.newArrival === "on",
                  priceConfirmed: v.priceConfirmed === "on",
                },
              });
              if (result) {
                setSelected(null);
                setNew(false);
              }
            }}
          >
            <div className="desk-fields">
              <label>
                Name
                <input name="name" defaultValue={selected?.name} required />
              </label>
              <label className="wide">Colour variants (one per line: name | #hex | image path)
                <textarea name="variants" rows={3} defaultValue={selected?.colours?.map(c => [c.name,c.hex,c.image].join(" | ")).join("\n")} />
              </label>
              <label>Sizes (comma separated)<input name="sizes" defaultValue={selected?.sizes?.join(", ")} /></label>
              <label>Related products (IDs or slugs)<input name="relatedIds" defaultValue={selected?.relatedIds?.join(", ")} /></label>
              <label>SKU<input name="sku" defaultValue={selected?.sku} /></label>
              <label>Collection<input name="collection" defaultValue={selected?.collection} /></label>
              <label>Sale price (₦)<input name="salePrice" type="number" min="0" step="0.01" defaultValue={selected?.salePrice ?? ""} /></label>
              <label>Maximum quantity<input name="maximum" type="number" min="1" step="1" defaultValue={selected?.maximum} /></label>
              <label>Customisation<select name="customisation" defaultValue={selected?.customisation ?? (brand === "kokies" ? "personalised" : "none")}><option value="none">Non-personalised</option><option value="personalised">Personalised</option><option value="branded">Branded</option></select></label>
              <label>Lead time<input name="leadTime" defaultValue={selected?.leadTime} placeholder="e.g. 5–7 working days" /></label>
              <label>Availability<select name="availability" defaultValue={selected?.availability ?? "stock"}><option value="stock">Stock tracked</option><option value="made">Made to order</option><option value="preorder">Pre-order</option></select></label>
              <label>SEO title<input name="seoTitle" defaultValue={selected?.seoTitle} /></label>
              <label>SEO description<input name="seoDescription" defaultValue={selected?.seoDescription} /></label>
              <label className="desk-check"><input type="checkbox" name="featured" defaultChecked={selected?.featured} /> Featured product</label>
              <label className="desk-check"><input type="checkbox" name="newArrival" defaultChecked={selected?.newArrival} /> New arrival</label>
              <label>
                URL slug
                <input name="slug" defaultValue={selected?.slug} />
              </label>
              <label>
                Category
                <input
                  name="category"
                  defaultValue={selected?.category}
                  required
                />
              </label>
              <label>
                Price / {brand === "idesire" ? "yard" : "unit"} (₦, blank for
                quote)
                <input
                  name="price"
                  type="number"
                  min="0"
                  defaultValue={selected?.price ?? ""}
                />
              </label>
              <label>
                Minimum quantity
                <input
                  name="minimum"
                  type="number"
                  min="1"
                  step="1"
                  defaultValue={
                    selected?.minimum ?? (brand === "kokies" ? 100 : 5)
                  }
                  required
                />
              </label>
              <label>
                Status
                <select
                  name="status"
                  defaultValue={selected?.status || "draft"}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </label>
              <label>
                Image
                <input
                  name="image"
                  defaultValue={selected?.image}
                  list="media-options"
                  required
                />
              </label>
              {brand === "kokies" && <>
                <label>Finish detail photo<input name="finishImage" list="media-options" defaultValue={selected?.gallery?.find(photo => photo.label === "Finish detail")?.src} /></label>
                <label>Packaging and scale photo<input name="packagingImage" list="media-options" defaultValue={selected?.gallery?.find(photo => photo.label === "Packaging and scale")?.src} /></label>
              </>}
              <datalist id="media-options">
                {data.media.map((m) => (
                  <option key={m.id} value={m.src}>
                    {m.name}
                  </option>
                ))}
              </datalist>
              {brand === "kokies" && <label className="desk-check">
                <input type="checkbox" name="priceConfirmed" defaultChecked={selected?.priceConfirmed} />
                Confirm this unit price for checkout
              </label>}
              <label className="desk-check">
                <input
                  name="sample"
                  type="checkbox"
                  defaultChecked={selected?.sample}
                />
                Sample concept
              </label>
              <label className="wide">
                Description
                <textarea
                  name="description"
                  rows={4}
                  defaultValue={selected?.description}
                  required
                />
              </label>
            </div>
            <div className="desk-actions">
              <button className="desk-primary">Save product</button>
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setNew(false);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}
      <div className="workspace-toolbar admin-catalogue-tools">
        <select aria-label="Filter product category" value={category} onChange={e => setCategory(e.target.value)}><option value="">All categories</option>{[...new Set(data.products.map(p => p.category))].sort().map(name => <option key={name}>{name}</option>)}</select>
        <select aria-label="Sort products" value={productSort} onChange={e => setProductSort(e.target.value)}><option value="catalogue">Catalogue order</option><option value="name">Name A–Z</option><option value="price">Lowest price</option></select>
      </div>
      <DataList data={productResults} label="Products" limit={12} resetKey={JSON.stringify([search, category, productSort])} render={rows => <div className="desk-product-grid">{rows.map(p => (
            <article className="desk-product" key={p.id}>
              <img src={p.image} alt={p.name} loading="lazy" />
              <div>
                <Badge>
                  {p.status}
                  {p.sample ? " · Sample" : ""}
                </Badge>
                <h3>{p.name}</h3>
                <p>{p.category}</p>
                <strong>
                  {p.price === null ? "Quote on request" : naira(p.price)} /{" "}
                  {p.unit}
                </strong>
                <div className="desk-actions">
                  <button
                    onClick={() => {
                      setSelected(p);
                      setNew(false);
                    }}
                  >
                    Edit
                  </button>
                  <Link href={productPath(brand, p)} target="_blank">
                    Open ↗
                  </Link>
                  <button
                    onClick={() => {
                      if (confirm(`Remove ${p.name} from this catalogue?`))
                        void act({ action: "removeProduct", id: p.id });
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </article>
          ))}</div>} />
    </>
  );
}
function Orders({
  brand, refresh,
  data,
  act,
  search, mode, intent,
}: {
  brand: Brand; refresh: () => Promise<void>;
  data: DeskData;
  act: Act;
  search: string; mode: string; intent: string;
}) {
  const [id, setId] = useState(""),
    [filter, setFilter] = useState(orderStatuses.some(s => s === intent) ? intent : mode === "Quotes" ? "Awaiting quotation" : mode === "Fulfilment" ? "Fulfilment" : "All"),
    [creating, setCreating] = useState(intent === "new");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [payment, setPayment] = useState("All payments");
  const [sort, setSort] = useState("Latest");
  const filtered = data.orders.filter(o => (filter === "All" || o.status === filter || (filter === "Fulfilment" && ["Paid","Processing","Ready for dispatch","Dispatched"].includes(o.status))) && (payment === "All payments" || o.paymentStatus === payment) && (!from || o.createdAt.slice(0,10) >= from) && (!to || o.createdAt.slice(0,10) <= to) && JSON.stringify(o).toLowerCase().includes(search.toLowerCase())).sort((a,b) => sort === "Highest value" ? b.total-a.total : sort === "Oldest" ? Date.parse(a.createdAt)-Date.parse(b.createdAt) : Date.parse(b.createdAt)-Date.parse(a.createdAt));
  const page = useDataPage(filtered, 12, JSON.stringify([search, filter, payment, from, to, sort]));
  const order = data.orders.find((o) => o.id === id);
  return (
    <div className="gift-order-workspace">
      <div className="gift-order-summary"><strong>{filtered.length} matching gift orders</strong><span>{filtered.filter(o => o.status === "Awaiting quotation").length} to quote</span><span>{filtered.filter(o => o.status === "Ready for dispatch").length} ready to pack</span></div>
      <div className="desk-row gift-order-controls">
        <div className="order-queues" aria-label="Order queues">
          {[["Awaiting quotation", "Quotes"], ["Awaiting payment", "Verify payments"], ["Fulfilment", "Fulfilment"]].map(([value, label]) => (
            <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>
          ))}
        </div>
        <select
          aria-label="Filter order status"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option>All</option>
          <option>Fulfilment</option>
          {orderStatuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <label>Payment<select value={payment} onChange={e => setPayment(e.target.value)}><option>All payments</option><option>Paid</option><option>Unpaid</option></select></label>
        <label>From<input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label><label>To<input type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
        <label>Sort<select value={sort} onChange={e => setSort(e.target.value)}><option>Latest</option><option>Oldest</option><option>Highest value</option></select></label>
        <button onClick={() => exportReport("kokies-orders", [["Order","Channel","Status","Total"],...filtered.map(o=>[o.id,orderChannel(o),o.status,o.total])])}>Export</button>
        <button onClick={() => setCreating(!creating)}>+ Record order</button>
      </div>
      {creating && (
        <section className="desk-card">
          <h2>Record an order</h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const v = values(e.currentTarget);
              const r = await act({ action: "recordOrder", order: { ...v, kind: mode === "Quotes" ? "enquiry" : undefined } });
              if (r) {
                setId(r.id);
                setCreating(false);
              }
            }}
          >
            <div className="desk-fields">
              <label>
                Customer name
                <input name="customerName" required />
              </label>
              <label>
                Phone
                <input name="phone" required />
              </label>
              <label>
                Email
                <input name="email" type="email" />
              </label>
              <label>
                Product
                <select name="productId">
                  {data.products
                    .filter((p) => p.status === "published")
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Quantity
                <input
                  name="quantity"
                  type="number"
                  min="1"
                  step="1"
                  defaultValue={5}
                  required
                />
              </label>
              <label>
                Delivery address
                <input name="address" />
              </label>
              <label className="wide">
                Notes
                <textarea name="notes" />
              </label>
            </div>
            <button className="desk-primary">Create order</button>
          </form>
        </section>
      )}
      <div className="desk-split">
        <div className="desk-list">
          {page.rows.map((o) => (
              <button
                key={o.id}
                aria-pressed={id === o.id}
                onClick={() => setId(o.id)}
              >
                {o.items[0]?.image && <img src={o.items[0].image} alt="" />}
                <span>
                  <strong>{o.customerName}</strong>
                  <small>{o.items[0]?.name} · {o.items.reduce((sum,i)=>sum+i.quantity,0)} units</small>
                  <small>{orderChannel(o)}{o.items.some(i=>i.personalisation && i.personalisation.method !== "none") ? " · Personalisation" : ""}</small>
                  <small>
                    {o.id}
                    {o.demo ? " · Demo" : ""}
                  </small>
                </span>
                <Badge>{o.status}</Badge>
                <b>{naira(o.total)}</b>
              </button>
            ))}
          <Pagination state={page} label="Gift order pages" />
        </div>
        <section className="desk-card desk-detail">
          {order ? (
            <OrderDetail
              brand={brand} refresh={refresh}
              key={order.id + "-" + order.updatedAt}
              order={order}
              act={act}
            />
          ) : (
            <>
              <h2>Order desk</h2>
              <p>
                Select an order to review items, personalisation, contact
                details and its history.
              </p>
              <p>
                Confirm payment manually after checking your payment records.
                Stock is reserved on checkout and deducted on dispatch.
              </p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
function OrderDetail({ order: o, act, brand, refresh }: { order: LocalOrder; act: Act; brand: Brand; refresh: () => Promise<void> }) {
  return (
    <>
      <div className="desk-row">
        <h2>{o.customerName}</h2>
        {o.demo && <Badge>Demo</Badge>}
      </div>
      <p>
        {o.id} · {fmt(o.createdAt)}
      </p>
      <p>
        {o.phone}
        <br />
        {o.email}
        <br />
        {o.deliveryMethod === "pickup" ? "Customer pickup" : o.address}
      </p>
      <Badge>{o.paymentStatus}</Badge>
      <DataList data={o.items} label="Order items" limit={5} render={rows => <div>{rows.map((i, n) => (
        <article className="desk-order-item" key={n}>
          <img src={i.image} alt={i.name} />
          <div>
            <h3>{i.name}</h3>
            <p>
              {i.quantity} ×{" "}
              {i.unitPrice === null ? "To quote" : naira(i.unitPrice)}{" "}
              {i.colour && `· ${i.colour}`}{i.size && " · " + i.size}
            </p>
            {i.personalisation && (
              <details open>
                <summary>Personalisation brief</summary>
                {Object.entries(i.personalisation).map(([k, v]) => (
                  <p key={k}>
                    <strong>{k.replace(/([A-Z])/g, " $1")}: </strong>
                    {String(v)}
                  </p>
                ))}
              </details>
            )}
          </div>
        </article>
      ))}</div>} />
      <h3>Recorded order total {naira(o.total)}</h3>
      <p>
        Personalisation and delivery costs need a confirmed quote where
        applicable.
      </p>
      {o.paymentStatus === "Unpaid" && o.status === "Awaiting payment" && (
        <details>
          <summary>Confirm received payment</summary>
          <form onSubmit={e => {
            e.preventDefault();
            void act({ action: "confirmPayment", id: o.id, ...values(e.currentTarget) });
          }}>
            <label>Amount received (₦)<input name="amount" type="number" min="0" step="0.01" defaultValue={o.total} required /></label>
            <label>Payment reference<input name="reference" maxLength={150} required /></label>
            <button className="desk-primary">Confirm payment</button>
          </form>
        </details>
      )}
      {o.payment && <p>Payment {o.payment.reference} confirmed by {o.payment.confirmedBy} · {fmt(o.payment.confirmedAt)}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const v = values(e.currentTarget);
          void act({ action: "updateOrder", id: o.id, ...v });
        }}
      >
        <label>
          Status
          <select name="status" defaultValue={o.status}>
            {orderStatuses.filter(s => s === o.status || (o.paymentStatus === "Paid"
              ? ["Processing", "Ready for dispatch", "Dispatched", "Completed", "Cancelled"].includes(s)
              : ["Awaiting quotation", "Cancelled"].includes(s))).map(s => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Order notes
          <textarea name="notes" defaultValue={o.notes} rows={3} />
        </label>
        <button className="desk-primary">Update order</button>
      </form>
      <details>
        <summary>Issue / revise a quote</summary>
        <p>
          Enter the confirmed unit cost including agreed personalisation.
          Delivery is added once.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const v = values(e.currentTarget);
            const prices = Object.fromEntries(
              o.items.map((_, i) => [String(i), v["price" + i]]),
            );
            void act({
              action: "issueQuote",
              id: o.id,
              prices,
              delivery: v.delivery,
              note: v.note,
            });
          }}
        >
          {o.items.map((item, i) => (
            <label key={i}>
              Final unit cost · {item.name}
              <input
                name={"price" + i}
                type="number"
                min="0"
                defaultValue={item.unitPrice ?? ""}
                required
              />
            </label>
          ))}
          <label>
            Delivery fee (₦)
            <input name="delivery" type="number" min="0" defaultValue="0" />
          </label>
          <label>
            Quote details
            <textarea name="note" />
          </label>
          <button>Save agreed quote</button>
        </form>
      </details>
      {brand === "kokies" && <OrderArtwork key={o.id} reference={o.id} staff hasArtwork={!!o.artwork} proof={o.proof}
        editable={["Awaiting quotation", "Awaiting payment", "Paid"].includes(o.status)} refresh={refresh} />}
      <h3>History & staff notes</h3>
      <CollapsibleSection title="Order history" count={o.history.length}><DataList data={o.history} label="History events" limit={8} render={rows => <div>{rows.map((h, i) => (
        <div className="desk-log" key={i}>
          <p>{h.text}</p>
          <small>
            {h.actor} · {fmt(h.at)}
          </small>
        </div>
      ))}</div>} /></CollapsibleSection>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const r = await act({
            action: "addOrderNote",
            id: o.id,
            note: new FormData(form).get("note"),
          });
          if (r) form.reset();
        }}
      >
        <label>
          Add internal note
          <textarea name="note" required />
        </label>
        <button>Add note</button>
      </form>
    </>
  );
}
function Enquiries({
  data,
  act,
  search,
}: {
  data: DeskData;
  act: Act;
  search: string;
}) {
  return (
    <DataList data={data.enquiries.filter(e => JSON.stringify(e).toLowerCase().includes(search.toLowerCase()))} label="Enquiries" limit={8} resetKey={search} render={rows => <div className="desk-two">{rows.map(e => (
          <article className="desk-card" key={e.id}>
            <div className="desk-row">
              <h2>{e.customerName}</h2>
              <Badge>
                {e.status}
                {e.demo ? " · Demo" : ""}
              </Badge>
            </div>
            <small>
              {e.id} · {fmt(e.createdAt)}
            </small>
            <h3>{e.type}</h3>
            <p style={{ whiteSpace: "pre-line" }}>{e.details}</p>
            <p>
              {e.email}
              <br />
              {e.phone}
            </p>
            <form
              onSubmit={(v) => {
                v.preventDefault();
                void act({
                  action: "saveEnquiry",
                  id: e.id,
                  status: new FormData(v.currentTarget).get("status"),
                });
              }}
            >
              <label>
                Status
                <select name="status" defaultValue={e.status}>
                  {[
                    "New",
                    "Contacted",
                    "Quote sent",
                    "Awaiting response",
                    "Converted",
                    "Closed",
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <button>Update enquiry</button>
            </form>
          </article>
        ))}</div>} />
  );
}
function Inbox({ data, act }: { data: DeskData; act: Act }) {
  const [id, setId] = useState(""),
    [filter, setFilter] = useState("All");
  const c = data.conversations.find((c) => c.id === id);
  return (
    <>
      <div className="desk-row">
        <p>
          Customer messages arrive live. Replies go only to the originating
          visitor.
        </p>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Conversation status"
        >
          <option>All</option>
          <option>Waiting</option>
          <option>Open</option>
          <option>Resolved</option>
        </select>
      </div>
      <div className="desk-split">
        <div><DataList data={data.conversations.filter(c => filter === "All" || c.status === filter)} label="Conversations" limit={12} resetKey={filter} render={rows => <div className="desk-list">{rows.map(c => (
              <button
                key={c.id}
                aria-pressed={id === c.id}
                onClick={() => {
                  setId(c.id);
                  if (c.unread) void act({ action: "updateChat", id: c.id });
                }}
              >
                <strong>
                  {c.name}
                  {c.unread > 0 ? ` · ${c.unread} new` : ""}
                </strong>
                <small>{c.messages.at(-1)?.text}</small>
                <Badge>
                  {c.status}
                  {c.demo ? " · Demo" : ""}
                </Badge>
              </button>
            ))}</div>} /></div>
        <section className="desk-card">
          {c ? (
            <ChatDetail key={c.id} conversation={c} data={data} act={act} />
          ) : (
            <>
              <h2>Live conversation desk</h2>
              <p>
                Select a customer to reply, assign a teammate or recommend a
                product.
              </p>
            </>
          )}
        </section>
      </div>
    </>
  );
}
function ChatDetail({
  conversation: c,
  data,
  act,
}: {
  conversation: Conversation;
  data: DeskData;
  act: Act;
}) {
  return (
    <>
      <h2>{c.name}</h2>
      <p>{c.email || "Visitor has not shared an email."}</p>
      <small>{data.user.brands.length === 1 ? brandNames[data.user.brands[0]] : "Current brand inbox"}</small>
      {c.email && <div>{data.orders.filter(o => o.email.toLowerCase() === c.email.toLowerCase()).slice(0,3).map(o => <p key={o.id}>{o.id} · {o.status}</p>)}</div>}
      <DataList data={[...c.messages].reverse()} label="Messages, newest first" limit={15} resetKey={c.id} render={rows => <div className="desk-chat-thread">
        {[...rows].reverse().map((m) => (
          <article key={m.id} className={`desk-message ${m.from}`}>
            <strong>
              {m.from === "visitor" ? c.name : m.staffName || "Team"}
            </strong>
            <p>{m.text}</p>
            {m.product && (
              <a href={m.product.href} target="_blank" rel="noreferrer">
                <img src={m.product.image} alt="" />
                {m.product.name} ↗
              </a>
            )}
            <small>{fmt(m.at)}</small>
          </article>
        ))}
      </div>} />
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const r = await act({
            action: "chatReply",
            id: c.id,
            ...values(form),
          });
          if (r) form.reset();
        }}
      >
        <label>
          Reply to customer
          <textarea name="text" rows={3} required maxLength={5000} />
        </label>
        <label>
          Recommend a product (optional)
          <select name="productId">
            <option value="">No product</option>
            {data.products
              .filter((p) => p.status === "published")
              .map((p) => (
                <option value={p.id} key={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </label>
        <button className="desk-primary">Send reply</button>
      </form>
      <form
        key={c.updatedAt}
        onSubmit={(e) => {
          e.preventDefault();
          void act({
            action: "updateChat",
            id: c.id,
            ...values(e.currentTarget),
          });
        }}
      >
        <div className="desk-fields">
          <label>
            Status
            <select name="status" defaultValue={c.status}>
              <option>Waiting</option>
              <option>Open</option>
              <option>Resolved</option>
            </select>
          </label>
          <label>
            Assign teammate
            <select name="assignedTo" defaultValue={c.assignedTo}>
              <option value="">Unassigned</option>
              {data.staff.map((s) => (
                <option key={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
          <label>
            Tags (comma separated)
            <input name="tags" defaultValue={c.tags.join(", ")} />
          </label>
        </div>
        <button>Save conversation details</button>
      </form>
    </>
  );
}
function MediaLibrary({
  data,
  brand,
  refresh,
  act,
  onError,
}: {
  data: DeskData;
  brand: Brand;
  refresh: () => Promise<void>;
  act: Act;
  onError: (e: string) => void;
}) {
  const [status, setStatus] = useState("");
  return (
    <>
      <section className="desk-card">
        <h2>Brand media library</h2>
        <p>
          Upload a JPEG, PNG or WebP up to 5 MB.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            setStatus("Uploading…");
            try {
              const r = await fetch(`/api/local/media/${brand}`, {
                method: "POST",
                body: new FormData(form),
              });
              const d = await r.json();
              if (!r.ok) throw new Error(d.error);
              await refresh();
              form.reset();
              setStatus(
                "Image uploaded. Copy its path into a product or select it in Brand Studio.",
              );
            } catch (e) {
              onError((e as Error).message);
              setStatus("");
            }
          }}
        >
          <label>
            Image file
            <input
              name="file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
            />
          </label>
          <label>
            Image description
            <input name="alt" required />
          </label>
          <button className="desk-primary">Upload image</button>
        </form>
        <p role="status">{status}</p>
      </section>
      <DataList data={data.media} label="Media" limit={12} render={rows => <div className="desk-product-grid">{rows.map(m => (
          <article className="desk-product" key={m.id}>
            <img src={m.src} alt={m.alt} loading="lazy" />
            <div>
              <h3>{m.name}</h3>
              <button
                onClick={() => void act({ action: "archiveMedia", id: m.id })}
              >
                Archive from library
              </button>
              <label>
                Image path
                <input
                  readOnly
                  value={m.src}
                  onFocus={(e) => e.target.select()}
                />
              </label>
            </div>
          </article>
        ))}</div>} />
    </>
  );
}
