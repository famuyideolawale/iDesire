"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import { canManageAccount } from "../lib/local/permissions";
import { brandNames, type Brand, type SessionUser } from "../lib/local/types";
import { Dialog, Empty, Heading, Metrics, SearchField } from "./admin/shared/OperationsWorkspaces";
import { Pagination, useDataPage } from "./admin/shared/Density";
import { AdminBadge, AdminSection } from "./admin/shared/primitives";

const roles = ["Manager", "Owner", "Developer"] as const;
const businesses = Object.keys(brandNames) as Brand[];
const roleAccess: Record<SessionUser["role"], string> = {
  Developer: "Manages both businesses and can manage all staff roles.",
  Owner: "Manages assigned businesses and can manage Managers whose business access is within those assignments.",
  Manager: "Works in assigned businesses and cannot manage staff accounts.",
};
type Result = { account?: SessionUser; username?: string; password?: string; removed?: string };
type Credentials = { username: string; password: string };
type Mode = "create" | "edit" | "reset" | "status" | "remove";
const statusOf = (account: SessionUser) => account.status ?? "Active";
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();

export default function AccountManagement({ user, accounts, brand, act, error, openSecurity }: {
  user: SessionUser; accounts: SessionUser[]; brand: Brand; error: string;
  act: (input: Record<string, unknown>) => Promise<Result | null>;
  openSecurity: () => void;
}) {
  const [selected, setSelected] = useState(user.id);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [mobileDetail, setMobileDetail] = useState(false);
  const [mode, setMode] = useState<Mode | null>(null);
  const [target, setTarget] = useState<SessionUser | null>(null);
  const [working, setWorking] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [copyMessage, setCopyMessage] = useState("");
  const detailRef = useRef<HTMLElement>(null);
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());
  const search = query.trim().toLowerCase();
  const visible = accounts.filter(a => (!role || a.role === role) && (!status || statusOf(a) === status)
    && [a.name, a.username, a.email].join(" ").toLowerCase().includes(search));
  const directory = useDataPage(visible, 10, JSON.stringify([search, role, status]));
  const account = visible.find(a => a.id === selected) ?? directory.rows[0];
  const isSelf = account?.id === user.id;
  const editable = !!account && canManageAccount(user, account);
  const active = accounts.filter(a => statusOf(a) === "Active");
  const resetFilters = () => { setQuery(""); setRole(""); setStatus(""); };
  const show = (next: Mode, a?: SessionUser) => {
    setAttempted(false);
    setTarget(a ?? null);
    setMode(next);
  };
  const run = async (input: Record<string, unknown>) => {
    setAttempted(true);
    setWorking(true);
    try {
      const result = await act(input);
      if (!result) return;
      if (result.account) {
        setSelected(result.account.id);
        if (mode === "create" || mode === "edit" || mode === "status") resetFilters();
      }
      if (result.removed) { setSelected(user.id); setMobileDetail(false); }
      setMode(null);
      if (result.password && result.username) {
        setCopyMessage("");
        setCredentials({ username: result.username, password: result.password });
      }
    } finally { setWorking(false); }
  };
  const choose = (id: string) => {
    setSelected(id);
    setMobileDetail(true);
    if (matchMedia("(max-width: 860px)").matches) requestAnimationFrame(() => {
      detailRef.current?.focus({ preventScroll: true });
      detailRef.current?.scrollIntoView({ block: "start" });
    });
  };
  const back = () => {
    setMobileDetail(false);
    requestAnimationFrame(() => rowRefs.current.get(account?.id ?? "")?.focus());
  };
  const suspended = target?.status === "Suspended";
  const confirmation = mode === "reset" ? {
    title: "Regenerate password", text: "The previous password will stop working and existing sessions will end.", label: "Generate replacement password", action: "resetStaffPassword",
  } : mode === "remove" ? {
    title: "Delete account", text: "This permanently removes the staff account and ends its access to both workspaces. This cannot be undone.", label: "Delete account permanently", action: "removeStaff",
  } : {
    title: suspended ? "Reinstate account" : "Suspend account",
    text: suspended ? "This person will be able to sign in again with their assigned access." : "This person will no longer be able to sign in, and their existing sessions will end.",
    label: suspended ? "Confirm reinstatement" : "Confirm suspension", action: "setStaffStatus",
  };
  return <div className="admin-workspace access-workspace">
    <Heading title="Accounts" description="Manage staff access, business permissions and account security."
      action={<button className="desk-primary" onClick={() => show("create")}><Plus size={17} /> Create account</button>} />
    <Metrics items={[
      { label: "Total accounts", value: accounts.length }, { label: "Active accounts", value: active.length },
      { label: "Managers", value: accounts.filter(a => a.role === "Manager").length },
      { label: "Businesses covered", value: new Set(active.flatMap(a => a.brands)).size, caption: "By active accounts" },
    ]} />
    <div className="access-grid" data-detail={mobileDetail && !!account}>
      <AdminSection title="Staff directory" className="access-directory">
        <p className="workspace-muted">{user.role === "Developer" ? "Accounts across both businesses" : "Accounts visible to your role"} · {visible.length} of {accounts.length}</p>
        <div className="access-filters">
          <SearchField label="Search name, username or email" value={query} onChange={setQuery} />
          <div className="access-filter-selects">
            <select aria-label="Filter account role" value={role} onChange={event => setRole(event.target.value)}><option value="">All roles</option>{roles.filter(r => accounts.some(a => a.role === r)).map(r => <option key={r}>{r}</option>)}</select>
            <select aria-label="Filter account status" value={status} onChange={event => setStatus(event.target.value)}><option value="">All statuses</option><option>Active</option><option>Suspended</option></select>
          </div>
        </div>
        {visible.length ? <ul className="access-list">{directory.rows.map(a => <li key={a.id}><button type="button"
          ref={node => { if (node) rowRefs.current.set(a.id, node); else rowRefs.current.delete(a.id); }}
          aria-pressed={account?.id === a.id} onClick={() => choose(a.id)}>
          <span className="workspace-avatar" aria-hidden="true">{initials(a.name)}</span>
          <span className="access-row-text"><strong>{a.name}{a.id === user.id ? " · You" : ""}</strong><small>{a.username || a.email}</small>
            <span className="access-row-meta"><span>{a.role}</span><AdminBadge>{statusOf(a)}</AdminBadge></span>
            <small>{a.brands.map(b => brandNames[b]).join(" · ") || "No assigned businesses"}</small></span>
          <ArrowRight size={16} aria-hidden="true" className="access-row-arrow" />
        </button></li>)}</ul> : <Empty>{accounts.length ? "No staff accounts match these filters." : "No staff accounts are visible."}
          {accounts.length > 0 && <button onClick={resetFilters}>Clear filters</button>}</Empty>}
        <Pagination state={directory} label="Staff directory pages" />
      </AdminSection>
      <section className="admin-section access-detail" ref={detailRef} tabIndex={-1} aria-label="Selected account">
        {!account ? <><h2>Account access</h2><Empty>Find a staff member in the directory or create an account to assign business access.</Empty></> : <>
          <button type="button" className="access-back" onClick={back}><ArrowLeft size={16} /> Staff directory</button>
          <div className="workspace-profile-header">
            <span className="workspace-avatar" aria-hidden="true">{initials(account.name)}</span>
            <div><h2>{account.name}{isSelf ? " · You" : ""}</h2><p className="workspace-muted">{account.role} account</p></div>
            <AdminBadge>{statusOf(account)}</AdminBadge>
          </div>
          <div className="access-section"><h3>Account details</h3>
            <dl className="access-identity"><div><dt>Username</dt><dd>{account.username || account.email || "Not set"}</dd></div><div><dt>Email</dt><dd>{account.email || "Not set"}</dd></div><div><dt>Role</dt><dd>{account.role}</dd></div></dl>
          </div>
          <div className="access-section"><h3>Business access</h3><p className="workspace-muted">{roleAccess[account.role]}</p>
            {account.status === "Suspended" && <p className="access-restriction">Access is paused until this account is reinstated.</p>}
            <ul className="access-businesses">{account.brands.map(b => <li key={b}><strong>{brandNames[b]}</strong><span>{account.status === "Suspended" ? "Access paused" : "Access granted"}</span></li>)}</ul>
            {!account.brands.length && <p>No businesses assigned.</p>}
          </div>
          <div className="access-section"><h3>Account actions</h3>
            <div className="desk-actions">
              {editable && <button className="desk-primary" onClick={() => show("edit", account)}>Edit account{isSelf ? "" : " & access"}</button>}
              {editable && !isSelf && <button onClick={() => show("reset", account)}>Regenerate password</button>}
              {isSelf && <button onClick={openSecurity}>Change my password</button>}
            </div>
            {isSelf && <p className="access-restriction">Your own role and business access cannot be changed here.</p>}
            {!editable && !isSelf && <p className="access-restriction">Your role cannot modify this account. {roleAccess[user.role]}</p>}
            {editable && !isSelf && <div className="access-sensitive"><h4>Access controls</h4>
              <p className="workspace-muted">Changes to role, business access or password end existing sessions.</p>
              <div className="desk-actions"><button className={account.status === "Suspended" ? undefined : "access-danger"} onClick={() => show("status", account)}>{account.status === "Suspended" ? "Reinstate account" : "Suspend account"}</button>
              {user.role === "Developer" && <button className="access-danger" onClick={() => show("remove", account)}>Delete account</button>}</div>
            </div>}
          </div>
        </>}
      </section>
    </div>
    {(mode === "create" || mode === "edit") && <Dialog title={mode === "create" ? "Create a staff account" : "Edit staff account"} close={() => { if (!working) setMode(null); }} error={attempted && !working ? error : ""}>
      <AccountForm user={user} account={target ?? undefined} brand={brand} working={working} onSave={data => run({
        action: target ? "updateStaff" : "createStaff", ...data, ...(target ? { id: target.id } : {}),
      })} />
    </Dialog>}
    {mode && mode !== "create" && mode !== "edit" && target && <Dialog title={confirmation.title} close={() => { if (!working) setMode(null); }} error={attempted && !working ? error : ""}>
      <p><strong>{target.name}</strong> · {target.username || target.email}</p><p>{confirmation.text}</p>
      <div className="desk-actions"><button autoFocus disabled={working} onClick={() => setMode(null)}>Cancel</button><button className={mode === "remove" || (mode === "status" && !suspended) ? "access-danger-solid" : "desk-primary"} disabled={working} onClick={() => void run({ action: confirmation.action, id: target.id, ...(mode === "status" ? { status: suspended ? "Active" : "Suspended" } : {}) })}>{working ? "Working…" : confirmation.label}</button></div>
    </Dialog>}
    {credentials && <Dialog title="Account credentials" close={() => setCredentials(null)} error="">
      <p>Copy the generated password before closing. It will only be shown once.</p>
      <div className="desk-fields"><label>Username<input aria-label="Generated account username" readOnly value={credentials.username} /></label>
      <label>Generated password<input aria-label="Generated account password" readOnly value={credentials.password} autoComplete="off" /></label></div>
      <div className="desk-actions"><button className="desk-primary" onClick={async () => {
        try { await navigator.clipboard.writeText(`Username: ${credentials.username}\nPassword: ${credentials.password}`); setCopyMessage("Credentials copied."); }
        catch { setCopyMessage("Could not copy automatically. Select and copy the credentials above."); }
      }}>Copy credentials</button><button onClick={() => setCredentials(null)}>Done</button></div>
      {copyMessage && <p className="access-restriction" role="status">{copyMessage}</p>}
    </Dialog>}
  </div>;
}

function AccountForm({ user, account, brand, working, onSave }: {
  user: SessionUser; account?: SessionUser; brand: Brand; working: boolean;
  onSave: (input: Record<string, unknown>) => Promise<void>;
}) {
  const [role, setRole] = useState<SessionUser["role"]>(account?.role ?? "Manager");
  const [brands, setBrands] = useState<Brand[]>(account?.brands ?? [brand]);
  const self = account?.id === user.id;
  const allowed = businesses.filter(b => user.role === "Developer" || user.brands.includes(b));
  return <form onSubmit={event => {
    event.preventDefault();
    void onSave({ ...Object.fromEntries(new FormData(event.currentTarget)), role, brands: role === "Developer" ? businesses : brands });
  }}>
    <fieldset className="workspace-fieldset" disabled={working}><legend>Personal information</legend>
      <div className="desk-fields">
        <label>Display name<input name="name" defaultValue={account?.name} required maxLength={180} /></label>
        <label>Username<input name="username" defaultValue={account?.username || account?.email} required minLength={3} maxLength={80} autoComplete="off" /></label>
        <label className="wide">Email (optional)<input name="email" type="email" defaultValue={account?.email} maxLength={200} /></label>
      </div>
    </fieldset>
    <fieldset className="workspace-fieldset" disabled={working || self}><legend>Role & business access</legend>
      <label>Account role<select value={role} onChange={event => setRole(event.target.value as SessionUser["role"])}>{roles.filter(r => user.role === "Developer" || r === "Manager").map(r => <option key={r}>{r}</option>)}</select></label>
      <p>{roleAccess[role]}</p>
      {allowed.map(b => <label className="desk-check" key={b}><input type="checkbox" checked={role === "Developer" || brands.includes(b)} disabled={role === "Developer"}
        onChange={event => setBrands(event.target.checked ? [...brands, b] : brands.filter(x => x !== b))} />{brandNames[b]}</label>)}
    </fieldset>
    {self && <p className="workspace-muted">Your current role and business access are protected.</p>}
    {role !== "Developer" && !brands.length && <p role="status">Select at least one business.</p>}
    {!account && <fieldset className="workspace-fieldset"><legend>Security</legend><p>A password is generated when the account is created. Copy it before closing the credentials dialog.</p></fieldset>}
    <button className="desk-primary" disabled={working || (role !== "Developer" && !brands.length)}>{working ? "Saving…" : account ? "Save account changes" : "Create account & generate password"}</button>
  </form>;
}
