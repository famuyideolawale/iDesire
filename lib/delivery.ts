// Delivery zones, fees and the "does this order need a quote?" rule.
// Shared by the server (which calculates the real total) and the browser
// (which shows the same numbers before the order is placed).

export const ABUJA = "FCT Abuja";

export const nigerianStates = [
  ABUJA, "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo", "Jigawa",
  "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger",
  "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
] as const;

export const abujaAreas = [
  "Apo", "Asokoro", "Bwari", "Dawaki", "Durumi", "Dutse", "Galadimawa", "Garki", "Gudu",
  "Gwagwalada", "Gwarinpa", "Jabi", "Jahi", "Kado", "Karu", "Katampe", "Kaura", "Kubwa",
  "Kuje", "Life Camp", "Lokogoma", "Lugbe", "Mabushi", "Maitama", "Mpape", "Nyanya",
  "Utako", "Wuse", "Wuse 2", "Wuye", "Other FCT area",
] as const;

/** Fees in naira. A missing or null fee means "we confirm the fee on WhatsApp". */
export type DeliverySettings = {
  states: Record<string, number | null>;
  abujaAreas: Record<string, number | null>;
  note?: string;
};

/** Starting points for the admin's "Fill suggested fees" button. Review before saving. */
export function suggestedDeliveryFees(): DeliverySettings {
  const central = ["Asokoro", "Maitama", "Wuse", "Wuse 2", "Garki", "Utako", "Jabi", "Wuye", "Mabushi", "Jahi", "Kado", "Katampe", "Durumi"];
  const near = ["Gwarinpa", "Life Camp", "Apo", "Gudu", "Lokogoma", "Galadimawa", "Dawaki", "Kaura", "Mpape", "Dutse", "Karu", "Nyanya", "Lugbe"];
  const abuja: Record<string, number> = {};
  for (const area of abujaAreas)
    abuja[area] = central.includes(area) ? 3000 : near.includes(area) ? 4000 : 5500;
  const neighbours = ["Nasarawa", "Niger", "Kogi", "Kaduna", "Plateau"];
  const states: Record<string, number> = {};
  for (const state of nigerianStates)
    if (state !== ABUJA) states[state] = neighbours.includes(state) ? 8000 : state === "Lagos" ? 10000 : 12000;
  return { states, abujaAreas: abuja };
}

export function cleanDeliverySettings(input: unknown): DeliverySettings {
  const source = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const read = (value: unknown, names: readonly string[]) => {
    const out: Record<string, number | null> = {};
    const record = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
    for (const name of names) {
      const raw = record[name];
      if (raw === null || raw === undefined || raw === "") { out[name] = null; continue; }
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0 || n > 10_000_000) throw new Error(`Enter a valid delivery fee for ${name}.`);
      out[name] = Math.round(n);
    }
    return out;
  };
  return {
    states: read(source.states, nigerianStates.filter((s) => s !== ABUJA)),
    abujaAreas: read(source.abujaAreas, abujaAreas),
    note: typeof source.note === "string" ? source.note.trim().slice(0, 300) : undefined,
  };
}

type FeeProduct = { id: string; deliveryFee?: number | null };
type FeeLine = { productId: string };

export type DeliveryQuote = {
  /** Total delivery charge, or null when the fee for this place is not set yet. */
  fee: number | null;
  zone: number | null;
  extras: number;
  place: string;
};

/** Location fee plus each product's extra delivery fee (once per product). */
export function deliveryQuote(
  settings: DeliverySettings | undefined,
  products: FeeProduct[],
  lines: FeeLine[],
  method: "delivery" | "pickup",
  state: string,
  area: string,
): DeliveryQuote {
  if (method === "pickup") return { fee: 0, zone: 0, extras: 0, place: "Pickup" };
  const place = state === ABUJA ? (area ? `${area}, Abuja` : "") : state;
  if (!place) return { fee: null, zone: null, extras: 0, place: "" };
  const zoneRaw = state === ABUJA ? settings?.abujaAreas?.[area] : settings?.states?.[state];
  const zone = typeof zoneRaw === "number" ? zoneRaw : null;
  const ids = [...new Set(lines.map((l) => l.productId))];
  const extras = ids.reduce((sum, id) => sum + (products.find((p) => p.id === id)?.deliveryFee ?? 0), 0);
  return { fee: zone === null ? null : zone + extras, zone, extras, place };
}

type QuoteProduct = { price: number | null; sample?: boolean; colours?: { name: string }[] };
type QuoteLine = { personalisation?: Record<string, unknown> };

/**
 * A line needs a staff quote only when its price cannot be known at checkout:
 * no price, a concept product, logo or artwork work, wording beyond the
 * standard allowance, or a non-standard product colour.
 */
export function lineNeedsQuote(product: QuoteProduct | undefined, line: QuoteLine) {
  if (!product || product.price === null || product.sample) return true;
  const p = line.personalisation;
  if (!p) return false;
  const method = String(p.method ?? "none");
  if (method === "logo" || method === "text-and-logo") return true;
  if (Number(p.extraWords ?? 0) > 0) return true;
  const colour = String(p.productColour ?? "");
  // A listed colour is a standard option; a described custom colour needs a quote.
  return !!colour && colour !== "As pictured" && !product.colours?.some((c) => c.name === colour);
}
