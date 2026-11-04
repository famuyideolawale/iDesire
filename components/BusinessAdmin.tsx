"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
  type Customer,
  type Conversation,
} from "../lib/local/types";
import { naira } from "../lib/products";
import AccountManagement from "./AccountManagement";
import { canManageAccounts } from "../lib/local/permissions";
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
  "Products",
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
  return <span className="desk-badge">{children}</span>;
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
      setNotice("Saved to the local server.");
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
    <nav aria-label={`${brandNames[brand]} admin sections`}>
      {tabs
        .filter((t) => t !== "Accounts" || canManageAccounts(session))
        .map((t) => (
          <button
            key={t}
            aria-current={tab === t ? "page" : undefined}
            onClick={() => {
              setTab(t);
              setSearch("");
              setNotice("");
            }}
          >
            {t}
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
        {nav}
        <main
          className={`desk-main ${tab === "Page builder" ? "desk-builder-mode" : ""}`}
        >
          <div className="desk-title">
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
          </div>
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
              <p className="desk-demo-note">
                Demonstration records are labelled “Demo”. New website
                submissions arrive here automatically. Payments are confirmed
                manually.
              </p>
              {["Products", "Orders", "Customers", "Enquiries"].includes(
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
              {tab === "Overview" && <Overview data={data} go={setTab} />}{" "}
              {tab === "Products" && (
                <Products data={data} brand={brand} act={act} search={search} />
              )}{" "}
              {tab === "Orders" && (
                <Orders data={data} act={act} search={search} />
              )}{" "}
              {tab === "Inventory" && <Inventory data={data} act={act} />}{" "}
              {tab === "Customers" && (
                <Customers data={data} act={act} search={search} />
              )}{" "}
              {tab === "Enquiries" && (
                <Enquiries data={data} act={act} search={search} />
              )}{" "}
              {tab === "Live chat" && <Inbox data={data} act={act} />}{" "}
              {tab === "Page builder" && (
                <VisualPageBuilder
                  pages={data.pages}
                  sharedDraft={data.sharedDesign?.draft ?? []}
                  brand={brand}
                  act={act}
                  media={data.media}
                />
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
              {tab === "Settings" && <Settings data={data} act={act} />}
              {tab === "Accounts" && canManageAccounts(data.user) && (
                <AccountManagement
                  user={data.user}
                  accounts={data.accounts}
                  brand={brand}
                  act={act}
                />
              )}{" "}
              {tab === "Activity" && (
                <section className="desk-card">
                  <h2>Workspace audit trail</h2>
                  {data.audit.slice(0, 100).map((a) => (
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
                  ))}
                </section>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
function Overview({ data, go }: { data: DeskData; go: (t: string) => void }) {
  const stats = [
    [
      "Open orders",
      data.orders.filter((o) => !["Completed", "Cancelled"].includes(o.status))
        .length,
      "Orders",
    ],
    [
      "Collected revenue",
      naira(
        data.orders
          .filter((o) => o.paymentStatus === "Paid")
          .reduce((n, o) => n + o.total, 0),
      ),
      "Orders",
    ],
    [
      "Waiting conversations",
      data.conversations.filter((c) => c.status === "Waiting").length,
      "Live chat",
    ],
    [
      "Low stock alerts",
      data.inventory.filter(
        (i) =>
          data.products.some((p) => p.id === i.productId) &&
          i.stock - i.reserved <= i.threshold,
      ).length,
      "Inventory",
    ],
  ];
  return (
    <>
      <div className="desk-stats">
        {stats.map(([label, n, t]) => (
          <button key={String(label)} onClick={() => go(String(t))}>
            <span>{label}</span>
            <strong>{n}</strong>
            <small>View details ↗</small>
          </button>
        ))}
      </div>
      <div className="desk-two">
        <section className="desk-card">
          <div className="desk-row">
            <h2>Orders in motion</h2>
            <button onClick={() => go("Orders")}>All orders ↗</button>
          </div>
          {data.orders
            .filter((o) => !["Cancelled", "Completed"].includes(o.status))
            .slice(0, 6)
            .map((o) => (
              <div className="desk-row desk-log" key={o.id}>
                <span>
                  <strong>{o.customerName}</strong>
                  <small>
                    {o.id} {o.demo ? "· Demo" : ""}
                  </small>
                </span>
                <Badge>{o.status}</Badge>
              </div>
            ))}
        </section>
        <section className="desk-card">
          <h2>Your next actions</h2>
          <p>
            {data.enquiries.filter((e) => e.status === "New").length} new
            enquiries need a response.
          </p>
          <p>
            {data.conversations.reduce((n, c) => n + c.unread, 0)} unread chat
            messages.
          </p>
          <div className="desk-actions">
            <button onClick={() => go("Enquiries")}>Review enquiries</button>
            <button onClick={() => go("Page builder")}>
              Open Brand Studio
            </button>
          </div>
          <h3>Newsletter audience</h3>
          <p>
            {data.subscribers.length} subscribers registered with this brand.
          </p>
          {data.subscribers.slice(0, 4).map((s) => (
            <small className="desk-line" key={s.id}>
              {s.email}
            </small>
          ))}
        </section>
      </div>
    </>
  );
}
function Products({
  data,
  brand,
  act,
  search,
}: {
  data: DeskData;
  brand: Brand;
  act: Act;
  search: string;
}) {
  const [selected, setSelected] = useState<LocalProduct | null>(null),
    [newItem, setNew] = useState(false);
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
              <datalist id="media-options">
                {data.media.map((m) => (
                  <option key={m.id} value={m.src}>
                    {m.name}
                  </option>
                ))}
              </datalist>
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
      <div className="desk-product-grid">
        {data.products
          .filter((p) =>
            (p.name + " " + p.category)
              .toLowerCase()
              .includes(search.toLowerCase()),
          )
          .map((p) => (
            <article className="desk-product" key={p.id}>
              <img src={p.image} alt={p.name} />
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
          ))}
      </div>
    </>
  );
}
function Orders({
  data,
  act,
  search,
}: {
  data: DeskData;
  act: Act;
  search: string;
}) {
  const [id, setId] = useState(""),
    [filter, setFilter] = useState("All"),
    [creating, setCreating] = useState(false);
  const order = data.orders.find((o) => o.id === id);
  return (
    <>
      <div className="desk-row">
        <select
          aria-label="Filter order status"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option>All</option>
          {orderStatuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <button onClick={() => setCreating(!creating)}>+ Record order</button>
      </div>
      {creating && (
        <section className="desk-card">
          <h2>Record an order</h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const v = values(e.currentTarget);
              const r = await act({ action: "recordOrder", order: v });
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
          {data.orders
            .filter(
              (o) =>
                (filter === "All" || o.status === filter) &&
                JSON.stringify(o).toLowerCase().includes(search.toLowerCase()),
            )
            .map((o) => (
              <button
                key={o.id}
                aria-pressed={id === o.id}
                onClick={() => setId(o.id)}
              >
                <span>
                  <strong>{o.customerName}</strong>
                  <small>
                    {o.id}
                    {o.demo ? " · Demo" : ""}
                  </small>
                </span>
                <Badge>{o.status}</Badge>
                <b>{naira(o.total)}</b>
              </button>
            ))}
        </div>
        <section className="desk-card desk-detail">
          {order ? (
            <OrderDetail
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
    </>
  );
}
function OrderDetail({ order: o, act }: { order: LocalOrder; act: Act }) {
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
        {o.address}
      </p>
      <Badge>{o.paymentStatus}</Badge>
      {o.items.map((i, n) => (
        <article className="desk-order-item" key={n}>
          <img src={i.image} alt={i.name} />
          <div>
            <h3>{i.name}</h3>
            <p>
              {i.quantity} ×{" "}
              {i.unitPrice === null ? "To quote" : naira(i.unitPrice)}{" "}
              {i.colour && `· ${i.colour}`}
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
      ))}
      <h3>Recorded order total {naira(o.total)}</h3>
      <p>
        Personalisation and delivery costs need a confirmed quote where
        applicable.
      </p>
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
            {orderStatuses.map((s) => (
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
      <h3>History & staff notes</h3>
      {o.history.map((h, i) => (
        <div className="desk-log" key={i}>
          <p>{h.text}</p>
          <small>
            {h.actor} · {fmt(h.at)}
          </small>
        </div>
      ))}
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
function Inventory({ data, act }: { data: DeskData; act: Act }) {
  return (
    <div className="desk-card">
      <h2>Stock & movement ledger</h2>
      <p>
        Available = physical stock − reserved stock. Every adjustment requires a
        reason.
      </p>
      {data.inventory.map((i) => {
        const p = data.products.find((p) => p.id === i.productId);
        return !p ? null : (
          <details className="desk-inventory" key={i.productId}>
            <summary>
              <strong>{p.name}</strong>
              <span>
                {i.stock} physical / {i.reserved} reserved /{" "}
                {i.stock - i.reserved} available
              </span>
              {i.stock - i.reserved <= i.threshold && <Badge>Low stock</Badge>}
            </summary>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void act({
                  action: "saveInventory",
                  id: i.productId,
                  ...values(e.currentTarget),
                });
              }}
            >
              <div className="desk-fields">
                <label>
                  Physical stock
                  <input
                    name="stock"
                    type="number"
                    min={i.reserved}
                    step="1"
                    defaultValue={i.stock}
                    required
                  />
                </label>
                <label>
                  Low stock threshold
                  <input
                    name="threshold"
                    type="number"
                    min="0"
                    defaultValue={i.threshold}
                    required
                  />
                </label>
                <label>
                  Adjustment reason
                  <input
                    name="reason"
                    required
                    placeholder="Restock, stock count correction…"
                  />
                </label>
              </div>
              <button>Save adjustment</button>
            </form>
            {i.movements.slice(0, 10).map((m) => (
              <p key={m.id}>
                {m.quantity > 0 ? "+" : ""}
                {m.quantity} · {m.reason}
                <small className="desk-line">
                  {m.actor} · {fmt(m.at)}
                </small>
              </p>
            ))}
          </details>
        );
      })}
    </div>
  );
}
function Customers({
  data,
  act,
  search,
}: {
  data: DeskData;
  act: Act;
  search: string;
}) {
  const [id, setId] = useState("");
  const c = data.customers.find((c) => c.id === id);
  return (
    <div className="desk-split">
      <div className="desk-list">
        <button onClick={() => setId("new")}>+ Add customer</button>
        {data.customers
          .filter((c) =>
            JSON.stringify(c).toLowerCase().includes(search.toLowerCase()),
          )
          .map((c) => (
            <button key={c.id} onClick={() => setId(c.id)}>
              <strong>{c.name}</strong>
              <small>
                {c.email} · {c.phone}
              </small>
              <span>
                {c.tags.join(" · ")} {c.demo ? "· Demo" : ""}
              </span>
            </button>
          ))}
      </div>
      <section className="desk-card">
        {id ? (
          <>
            <h2>{c?.name || "New customer"}</h2>
            <form
              key={id}
              onSubmit={(e) => {
                e.preventDefault();
                void act({
                  action: "saveCustomer",
                  customer: { ...values(e.currentTarget), id: c?.id },
                });
              }}
            >
              <div className="desk-fields">
                <label>
                  Name
                  <input name="name" defaultValue={c?.name} required />
                </label>
                <label>
                  Phone
                  <input name="phone" defaultValue={c?.phone} required />
                </label>
                <label>
                  Email
                  <input name="email" type="email" defaultValue={c?.email} />
                </label>
                <label>
                  City
                  <input name="city" defaultValue={c?.city} />
                </label>
                <label>
                  Tags (comma separated)
                  <input name="tags" defaultValue={c?.tags.join(", ")} />
                </label>
                <label className="wide">
                  Staff notes
                  <textarea name="notes" defaultValue={c?.notes} />
                </label>
              </div>
              <button className="desk-primary">Save customer</button>
            </form>
            <h3>Order history</h3>
            {data.orders
              .filter((o) => c && (o.phone === c.phone || o.email === c.email))
              .map((o) => (
                <p key={o.id}>
                  {o.id} · {o.status} · {naira(o.total)}
                </p>
              ))}
          </>
        ) : (
          <>
            <h2>Customer book</h2>
            <p>Select a customer for notes, tags and order history.</p>
          </>
        )}
      </section>
    </div>
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
    <div className="desk-two">
      {data.enquiries
        .filter((e) =>
          JSON.stringify(e).toLowerCase().includes(search.toLowerCase()),
        )
        .map((e) => (
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
        ))}
    </div>
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
        <div className="desk-list">
          {data.conversations
            .filter((c) => filter === "All" || c.status === filter)
            .map((c) => (
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
            ))}
        </div>
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
      <div className="desk-chat-thread">
        {c.messages.map((m) => (
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
      </div>
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
          Upload a JPEG, PNG or WebP up to 5 MB. Files are stored on the local
          server.
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
      <div className="desk-product-grid">
        {data.media.map((m) => (
          <article className="desk-product" key={m.id}>
            <img src={m.src} alt={m.alt} />
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
        ))}
      </div>
    </>
  );
}
function Settings({ data, act }: { data: DeskData; act: Act }) {
  return (
    <div className="desk-two">
      <section className="desk-card">
        <h2>Brand settings</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const v = values(e.currentTarget);
            void act({
              action: "saveSettings",
              settings: { ...v, chatOnline: v.chatOnline === "on" },
            });
          }}
        >
          <div className="desk-fields single">
            {Object.entries(data.settings)
              .filter(([key]) => key !== "chatOnline")
              .map(([key, value]) => (
                <label key={key}>
                  {key.replace(/([A-Z])/g, " $1")}
                  <input name={key} defaultValue={String(value)} />
                </label>
              ))}
            <label className="desk-check">
              <input
                type="checkbox"
                name="chatOnline"
                defaultChecked={data.settings.chatOnline}
              />
              Team available in live chat
            </label>
          </div>
          <button className="desk-primary">Save brand settings</button>
        </form>
      </section>
      <section className="desk-card">
        <h2>Your account</h2>
        <p>
          {data.user.name} · {data.user.role}
          <br />
          {data.user.username || data.user.email}
        </p>
        {canManageAccounts(data.user) && (
          <p>Create and manage staff in the Accounts section.</p>
        )}
        <h3>Change your password</h3>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const r = await act({ action: "changePassword", ...values(form) });
            if (r) form.reset();
          }}
        >
          <label>
            Current password
            <input
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          <label>
            New password
            <input
              name="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={10}
              required
            />
          </label>
          <button>Update password</button>
        </form>
        <h3>Local data</h3>
        <button
          onClick={() => {
            const { user, staff, ...backup } = data;
            const a = document.createElement("a");
            a.href = URL.createObjectURL(
              new Blob([JSON.stringify(backup, null, 2)], {
                type: "application/json",
              }),
            );
            a.download =
              "workspace-export-" +
              new Date().toISOString().slice(0, 10) +
              ".json";
            a.click();
            URL.revokeObjectURL(a.href);
          }}
        >
          Export this workspace
        </button>
        <p>
          Records are stored in .local/store.json on this computer. The previous
          save is kept as a backup. This is a local workspace; external payment
          and delivery services are not connected.
        </p>
      </section>
    </div>
  );
}
