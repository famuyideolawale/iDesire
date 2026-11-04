"use client";
import { useState } from "react";
import { canManageAccount } from "../lib/local/permissions";
import { brandNames, type Brand, type SessionUser } from "../lib/local/types";
type Act = (input: Record<string, unknown>) => Promise<any>;
type Credentials = { username: string; password: string };
export default function AccountManagement({
  user,
  accounts,
  brand,
  act,
}: {
  user: SessionUser;
  accounts: SessionUser[];
  brand: Brand;
  act: Act;
}) {
  const [selected, setSelected] = useState(""),
    [query, setQuery] = useState(""),
    [credentials, setCredentials] = useState<Credentials | null>(null),
    [pending, setPending] = useState<"suspend" | "reset" | null>(null),
    [working, setWorking] = useState(false),
    [copied, setCopied] = useState(false);
  const account = accounts.find((a) => a.id === selected);
  const run = async (input: Record<string, unknown>) => {
    setWorking(true);
    try {
      const r = await act(input);
      if (r?.password) {
        setCredentials({ username: r.username, password: r.password });
        setCopied(false);
      }
      if (r) setPending(null);
      return r;
    } finally {
      setWorking(false);
    }
  };
  return (
    <>
      <div className="desk-row">
        <div>
          <h2>
            {user.role === "Developer"
              ? "Accounts across both businesses"
              : "Staff accounts"}
          </h2>
          <p>
            Create and manage staff access, business permissions and passwords.
          </p>
        </div>
        <button
          className="desk-primary"
          onClick={() => {
            setSelected("new");
            setPending(null);
          }}
        >
          + Create account
        </button>
      </div>
      {credentials && (
        <section className="desk-card account-credentials" role="status">
          <h3>Account credentials</h3>
          <p>
            Copy this password now. It is not stored in a readable form and will
            not be shown again after you close this panel.
          </p>
          <div className="desk-fields">
            <label>
              Username
              <input
                aria-label="Generated account username"
                readOnly
                value={credentials.username}
              />
            </label>
            <label>
              Generated password
              <input
                aria-label="Generated account password"
                readOnly
                value={credentials.password}
                autoComplete="off"
              />
            </label>
          </div>
          <div className="desk-actions">
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    `Username: ${credentials.username}\nPassword: ${credentials.password}`,
                  );
                  setCopied(true);
                } catch {
                  setCopied(false);
                }
              }}
            >
              {copied ? "Copied" : "Copy credentials"}
            </button>
            <button onClick={() => setCredentials(null)}>
              Close credentials
            </button>
          </div>
        </section>
      )}
      <div className="desk-split account-workspace">
        <section>
          <input
            className="desk-search"
            aria-label="Search staff accounts"
            placeholder="Search name, username or email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="desk-list">
            {accounts
              .filter((a) =>
                [a.name, a.username, a.email]
                  .join(" ")
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map((a) => (
                <button
                  key={a.id}
                  aria-pressed={selected === a.id}
                  onClick={() => {
                    setSelected(a.id);
                    setPending(null);
                  }}
                >
                  <strong>
                    {a.name}
                    {a.id === user.id ? " · You" : ""}
                  </strong>
                  <small>
                    {a.username || a.email}{" "}
                    {a.username && a.email ? "· " + a.email : ""}
                  </small>
                  <div className="desk-actions">
                    <span className="desk-badge">{a.role}</span>
                    <span
                      className={`desk-badge ${a.status === "Suspended" ? "account-suspended" : ""}`}
                    >
                      {a.status || "Active"}
                    </span>
                  </div>
                  <small>
                    {a.brands.map((b) => brandNames[b]).join(" · ")}
                  </small>
                </button>
              ))}
          </div>
        </section>
        <section className="desk-card">
          {selected === "new" || account ? (
            <>
              {" "}
              <h2>
                {account ? "Manage " + account.name : "Create a staff account"}
              </h2>
              {account && !canManageAccount(user, account) ? (
                <p>Your role cannot modify this account.</p>
              ) : (
                <>
                  <AccountForm
                    key={account?.id || "new"}
                    user={user}
                    account={account}
                    brand={brand}
                    working={working}
                    onSave={async (data) => {
                      const r = await run({
                        action: account ? "updateStaff" : "createStaff",
                        ...data,
                        ...(account ? { id: account.id } : {}),
                      });
                      if (r?.account) setSelected(r.account.id);
                    }}
                  />
                  {account && account.id !== user.id && (
                    <div className="account-admin-actions">
                      <h3>Account controls</h3>
                      <p>
                        Suspension, access changes and password resets sign this
                        person out of existing sessions.
                      </p>
                      <div className="desk-actions">
                        <button
                          disabled={working}
                          onClick={() => {
                            setPending("suspend");
                          }}
                        >
                          {account.status === "Suspended"
                            ? "Reinstate account"
                            : "Suspend account"}
                        </button>
                        <button
                          disabled={working}
                          onClick={() => setPending("reset")}
                        >
                          Regenerate password
                        </button>
                      </div>
                      {pending && (
                        <div className="account-confirm">
                          <p>
                            {pending === "reset"
                              ? `Generate a replacement password for ${account.username || account.email}? The previous password will stop working.`
                              : account.status === "Suspended"
                                ? `Restore access for ${account.name}?`
                                : `Suspend ${account.name}? They will no longer be able to sign in or use existing sessions.`}
                          </p>
                          <div className="desk-actions">
                            <button
                              className="desk-primary"
                              disabled={working}
                              onClick={() =>
                                void run(
                                  pending === "reset"
                                    ? {
                                        action: "resetStaffPassword",
                                        id: account.id,
                                      }
                                    : {
                                        action: "setStaffStatus",
                                        id: account.id,
                                        status:
                                          account.status === "Suspended"
                                            ? "Active"
                                            : "Suspended",
                                      },
                                )
                              }
                            >
                              {pending === "reset"
                                ? "Generate replacement password"
                                : account.status === "Suspended"
                                  ? "Confirm reinstate"
                                  : "Confirm suspension"}
                            </button>
                            <button onClick={() => setPending(null)}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {account?.id === user.id && (
                    <p className="visual-help">
                      Use Settings to change your own password. Your Developer
                      access stays enabled while you manage other accounts.
                    </p>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              <h2>Choose an account</h2>
              <p>
                Select a staff account to edit its details, role and business
                access, or create a new account.
              </p>
              <p>
                Developers manage both businesses and all staff roles. Owners
                manage managers within their assigned businesses. Managers
                cannot manage accounts.
              </p>
            </>
          )}
        </section>
      </div>
    </>
  );
}
function AccountForm({
  user,
  account,
  brand,
  working,
  onSave,
}: {
  user: SessionUser;
  account?: SessionUser;
  brand: Brand;
  working: boolean;
  onSave: (v: Record<string, unknown>) => Promise<void>;
}) {
  const [role, setRole] = useState<SessionUser["role"]>(
      account?.role || "Manager",
    ),
    [brands, setBrands] = useState<Brand[]>(account?.brands || [brand]);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await onSave({
          ...Object.fromEntries(new FormData(e.currentTarget).entries()),
          role,
          brands: role === "Developer" ? ["idesire", "kokies"] : brands,
        });
      }}
    >
      <div className="desk-fields">
        <label>
          Display name
          <input
            name="name"
            aria-label="Account display name"
            defaultValue={account?.name}
            required
            maxLength={180}
          />
        </label>
        <label>
          Username
          <input
            name="username"
            aria-label="Account username"
            defaultValue={account?.username || account?.email}
            required
            minLength={3}
            maxLength={80}
            autoComplete="off"
          />
        </label>
        <label>
          Email (optional)
          <input
            name="email"
            aria-label="Account email"
            type="email"
            defaultValue={account?.email}
          />
        </label>
        <label>
          Role
          <select
            aria-label="Account role"
            value={role}
            onChange={(e) => setRole(e.target.value as SessionUser["role"])}
            disabled={account?.id === user.id}
          >
            <option>Manager</option>
            {user.role === "Developer" && (
              <>
                <option>Owner</option>
                <option>Developer</option>
              </>
            )}
          </select>
        </label>
      </div>
      <fieldset className="account-brands">
        <legend>Business access</legend>
        {(["idesire", "kokies"] as Brand[])
          .filter((b) => user.role === "Developer" || user.brands.includes(b))
          .map((b) => (
            <label className="desk-check" key={b}>
              <input
                type="checkbox"
                checked={role === "Developer" || brands.includes(b)}
                disabled={role === "Developer"}
                onChange={(e) =>
                  setBrands(
                    e.target.checked
                      ? [...brands, b]
                      : brands.filter((x) => x !== b),
                  )
                }
              />
              {brandNames[b]}
            </label>
          ))}
      </fieldset>
      {!account && (
        <p>A strong password will be generated when you create this account.</p>
      )}
      <button className="desk-primary" disabled={working}>
        {working
          ? "Saving…"
          : account
            ? "Save account changes"
            : "Create account & generate password"}
      </button>
    </form>
  );
}
