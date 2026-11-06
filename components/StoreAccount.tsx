"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../lib/local/client";
import { brandNames, homePath, type Brand } from "../lib/local/types";
import { naira } from "../lib/products";

type AccountData = {
  account: {name:string; email:string} | null;
  orders?: {reference:string; status:string; total:number; createdAt:string}[];
};

export default function StoreAccount({brand}:{brand:Brand}) {
  const endpoint = "/api/local/customer-account/" + brand;
  const [data,setData] = useState<AccountData>();
  const [register,setRegister] = useState(false);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const load = useCallback(async () => setData(await api<AccountData>(endpoint)),[endpoint]);
  useEffect(() => { void load().catch(error => setError(error.message)); },[load]);
  const prefix = brand === "kokies" ? homePath(brand) : "";
  return <div className="page-shell track-page">
    <div className="page-hero"><span className="eyebrow">{brandNames[brand]}</span><h1>Your account</h1><p>Review orders placed while signed in to this shop.</p></div>
    <section className="track-card">
      {error && <p role="alert">{error}</p>}
      {!data ? error ? <button className="button button-outline" onClick={() => void load().catch(error => setError(error.message))}>Retry</button> : <p role="status">Loading your account…</p> : data.account ? <>
        <h2>{data.account.name}</h2><p>{data.account.email}</p>
        <button className="button button-outline" disabled={busy} onClick={async () => {
          setBusy(true);setError("");
          try { await api(endpoint,{action:"logout"});await load(); }
          catch(error) { setError((error as Error).message); } finally { setBusy(false); }
        }}>Sign out</button>
        <h3>Your orders</h3>
        {data.orders?.length ? <ul>{data.orders.map(order => <li key={order.reference}>
          <Link href={prefix + "/track-order?reference=" + encodeURIComponent(order.reference)}>{order.reference}</Link> · {order.status} · {naira(order.total)}
        </li>)}</ul> : <p>Orders placed while signed in will appear here.</p>}
      </> : <>
        <h2>{register ? "Create a shop account" : "Sign in"}</h2>
        <form onSubmit={async event => {
          event.preventDefault();
          if (busy) return;
          const fields = Object.fromEntries(new FormData(event.currentTarget));
          setBusy(true);setError("");
          try { await api(endpoint,{...fields,action:register ? "register" : "login"});await load(); }
          catch(error) { setError((error as Error).message); } finally { setBusy(false); }
        }}>
          {register && <label>Name<input name="name" autoComplete="name" maxLength={100} required /></label>}
          <label>Email<input name="email" type="email" autoComplete="email" required /></label>
          <label>Password<input name="password" type="password" minLength={10} maxLength={200} autoComplete={register ? "new-password" : "current-password"} required /></label>
          <button className="button button-dark" disabled={busy}>{busy ? "Please wait…" : register ? "Create account" : "Sign in"}</button>
        </form>
        <button type="button" className="button button-outline" onClick={() => {setRegister(!register);setError("");}}>{register ? "I already have an account" : "Create an account"}</button>
      </>}
    </section>
  </div>;
}
