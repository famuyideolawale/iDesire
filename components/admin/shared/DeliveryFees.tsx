"use client";
import { useMemo, useState } from "react";
import { Wand2 } from "lucide-react";
import type { BusinessData } from "../../../lib/local/types";
import { ABUJA, abujaAreas, nigerianStates, suggestedDeliveryFees, type DeliverySettings } from "../../../lib/delivery";
import { naira } from "../../../lib/products";
import { Heading, Metrics, SearchField } from "./OperationsWorkspaces";

type Action = (input: Record<string, unknown>) => Promise<unknown>;
type Draft = { states: Record<string, string>; abujaAreas: Record<string, string> };
const otherStates = nigerianStates.filter((s) => s !== ABUJA);

const toDraft = (d?: DeliverySettings): Draft => ({
  states: Object.fromEntries(otherStates.map((s) => [s, d?.states?.[s] == null ? "" : String(d.states[s])])),
  abujaAreas: Object.fromEntries(abujaAreas.map((a) => [a, d?.abujaAreas?.[a] == null ? "" : String(d.abujaAreas[a])])),
});

/** Admin editor for delivery fees by Abuja area and by state. Empty = confirmed on WhatsApp. */
export function DeliveryFeesWorkspace({ data, act, busy }: { data: BusinessData; act: Action; busy: boolean }) {
  const saved = useMemo(() => toDraft(data.settings.delivery), [data.settings.delivery]);
  const [draft, setDraft] = useState<Draft>(saved);
  const [search, setSearch] = useState("");
  const [bulk, setBulk] = useState({ abuja: "", states: "" });
  const [message, setMessage] = useState("");
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const set = (group: keyof Draft, name: string, value: string) => {
    setDraft((d) => ({ ...d, [group]: { ...d[group], [name]: value.replace(/[^\d]/g, "") } }));
    setMessage("");
  };
  const fillAll = (group: keyof Draft, value: string, onlyEmpty: boolean) =>
    setDraft((d) => ({ ...d, [group]: Object.fromEntries(Object.entries(d[group]).map(([k, v]) => [k, onlyEmpty && v ? v : value])) }));
  const term = search.trim().toLowerCase();
  const match = (name: string) => !term || name.toLowerCase().includes(term);
  const priced = (group: Record<string, string>) => Object.values(group).filter(Boolean);
  const range = (group: Record<string, string>) => {
    const values = priced(group).map(Number);
    return values.length ? `${naira(Math.min(...values))} – ${naira(Math.max(...values))}` : "Not set";
  };

  const save = async () => {
    const toNumbers = (g: Record<string, string>) => Object.fromEntries(Object.entries(g).map(([k, v]) => [k, v === "" ? null : Number(v)]));
    const result = await act({ action: "saveDelivery", delivery: { states: toNumbers(draft.states), abujaAreas: toNumbers(draft.abujaAreas) } });
    if (result) setMessage("Delivery fees saved. Checkout uses them straight away.");
  };

  const table = (group: keyof Draft, names: readonly string[], label: string) => {
    const rows = names.filter(match);
    return (
      <section className="fees-card" aria-label={label}>
        <header>
          <div><h2>{label}</h2><p>{priced(draft[group]).length} of {names.length} priced · {range(draft[group])}</p></div>
          <div className="fees-bulk">
            <input inputMode="numeric" aria-label={`Fee for every ${group === "states" ? "state" : "area"}`} placeholder="₦ for all" value={group === "states" ? bulk.states : bulk.abuja}
              onChange={(e) => setBulk((b) => ({ ...b, [group === "states" ? "states" : "abuja"]: e.target.value.replace(/[^\d]/g, "") }))} />
            <button type="button" className="desk-secondary" disabled={!(group === "states" ? bulk.states : bulk.abuja)}
              onClick={() => fillAll(group, group === "states" ? bulk.states : bulk.abuja, true)}>Fill empty</button>
            <button type="button" className="desk-secondary" disabled={!(group === "states" ? bulk.states : bulk.abuja)}
              onClick={() => fillAll(group, group === "states" ? bulk.states : bulk.abuja, false)}>Set all</button>
          </div>
        </header>
        <div className="fees-grid">
          {rows.map((name) => (
            <label key={name} className="fees-row" data-empty={!draft[group][name] || undefined}>
              <span>{name}</span>
              <span className="fees-input"><i>₦</i>
                <input inputMode="numeric" value={draft[group][name] ? Number(draft[group][name]).toLocaleString("en-NG") : ""}
                  placeholder="On WhatsApp" aria-label={`Delivery fee for ${name}`}
                  onChange={(e) => set(group, name, e.target.value)} />
              </span>
            </label>
          ))}
          {!rows.length && <p className="workspace-muted">No matches.</p>}
        </div>
      </section>
    );
  };

  return (
    <div className="admin-workspace delivery-workspace">
      <Heading
        title="Delivery fees"
        description="Set what customers pay for delivery. Checkout adds the fee as soon as they choose their location, plus any extra fee set on a product."
        action={<button type="button" className="desk-secondary" onClick={() => { const s = toDraft(suggestedDeliveryFees()); setDraft((d) => ({
          states: Object.fromEntries(Object.entries(d.states).map(([k, v]) => [k, v || s.states[k]])),
          abujaAreas: Object.fromEntries(Object.entries(d.abujaAreas).map(([k, v]) => [k, v || s.abujaAreas[k]])),
        })); setMessage("Suggested fees added to empty places. Review them, then save."); }}><Wand2 size={16} /> Fill suggested fees</button>}
      />
      <Metrics items={[
        { label: "Abuja areas priced", value: `${priced(draft.abujaAreas).length}/${abujaAreas.length}`, caption: range(draft.abujaAreas) },
        { label: "States priced", value: `${priced(draft.states).length}/${otherStates.length}`, caption: range(draft.states) },
        { label: "Pickup", value: "Free", caption: "Customers collect from you" },
        { label: "Not priced", value: abujaAreas.length + otherStates.length - priced(draft.abujaAreas).length - priced(draft.states).length, caption: "Fee confirmed on WhatsApp" },
      ]} />
      <div className="fees-toolbar">
        <SearchField value={search} onChange={setSearch} label="Find a state or area" />
        <div className="fees-save">
          {message && <span role="status">{message}</span>}
          {dirty && !message && <span className="fees-unsaved">Unsaved changes</span>}
          <button type="button" className="desk-secondary" disabled={!dirty || busy} onClick={() => { setDraft(saved); setMessage(""); }}>Discard</button>
          <button type="button" className="desk-primary" disabled={!dirty || busy} onClick={() => void save()}>{busy ? "Saving…" : "Save delivery fees"}</button>
        </div>
      </div>
      <div className="fees-layout">
        {table("abujaAreas", abujaAreas, "Abuja (FCT) areas")}
        {table("states", otherStates, "Other states")}
      </div>
    </div>
  );
}
