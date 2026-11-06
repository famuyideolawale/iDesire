"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import type { Brand, PublicData, LocalProduct } from "./types";
import { products as fabricSeed, type Product } from "../products";
import type { GiftProduct } from "../gift-data";
export async function api<T = any>(url: string, input?: unknown): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    ...(input !== undefined
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        }
      : {}),
  });
  const data = await response.json();
  if (!response.ok)
    throw Object.assign(new Error(data.error || "Request failed."), {
      status: response.status,
    });
  return data;
}
const Context = createContext<{
  brand: Brand;
  data: PublicData | null;
  error: string;
  reload: () => void;
}>({ brand: "idesire", data: null, error: "", reload: () => {} });
export function LocalProvider({
  brand,
  initialData = null,
  children,
}: {
  brand: Brand;
  initialData?: PublicData | null;
  children: React.ReactNode;
}) {
  // Server-rendered data shows real prices and copy on first paint; the browser
  // then keeps it fresh by polling the revision number.
  const [data, setData] = useState<PublicData | null>(initialData),
    [error, setError] = useState("");
  const reload = useCallback(() => {
    const q = new URLSearchParams(location.search);
    const preview =
      q.get("cmsPreview") === "1"
        ? `?preview=1&page=${encodeURIComponent(q.get("page") || "home")}`
        : "";
    api<PublicData>(`/api/local/${brand}${preview}`)
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch((e) => setError(e.message));
  }, [brand]);
  useEffect(() => {
    const preview = new URLSearchParams(location.search).get("cmsPreview") === "1";
    if (!initialData || preview) reload();
    return watchChanges(brand, reload, preview ? -1 : (initialData?.revision ?? -1), 15000);
  }, [brand, reload, initialData]);
  return (
    <Context.Provider value={{ brand, data, error, reload }}>
      {children}
    </Context.Provider>
  );
}
export const useLocal = () => useContext(Context);
/** wa.me links need digits only, with the country code and no leading zero. */
export function whatsappNumber(phone: string | undefined, fallback: string) {
  let digits = (phone ?? "").replace(/\D/g, "").replace(/^00/, "");
  if (/^0[789]\d{9}$/.test(digits)) digits = "234" + digits.slice(1);
  return digits.length >= 10 ? digits : fallback;
}
/** iDesire catalogue: the server's products when available, the built-in list otherwise. */
export function useFabricCatalogue(): Product[] {
  const { data } = useContext(Context);
  return useMemo(() => (data ? data.products.map(asFabric) : fabricSeed), [data]);
}
export function asFabric(p: LocalProduct): Product {
  return {
    slug: p.slug,
    id: p.id, sizes: p.sizes, collection: p.collection, relatedIds: p.relatedIds, featured: p.featured, newArrival: p.newArrival,
    name: p.name,
    category: p.category,
    price: p.price ?? undefined,
    image: p.image,
    description: p.description,
    colours: p.colours,
    yardOptions: p.yardOptions,
    minimumYards: p.minimum,
    label: p.label,
    sample: p.sample,
    sourceUrl: p.sourceUrl,
  };
}
export function asGift(p: LocalProduct): GiftProduct {
  return {
    id: (/^\d+$/.test(p.id) ? Number(p.id) : p.id) as number,
    name: p.name,
    slug: p.slug,
    category: p.category,
    price: p.price ?? 0,
    minimum: p.minimum,
    quoteOnly: p.price === null,
    priceConfirmed: p.priceConfirmed === true,
    colours: p.colours,
    sku: p.sku, collection: p.collection, maximum: p.maximum, sizes: p.sizes, relatedIds: p.relatedIds,
    availability: p.availability, leadTime: p.leadTime, customisation: p.customisation,
    featured: p.featured, newArrival: p.newArrival,
    gallery: p.gallery,
    image: p.image,
    note: p.description,
    sample: p.sample,
    sourceUrl: p.sourceUrl,
  };
}

// Short revision requests keep multiple local editor/store tabs from exhausting
// the browser's HTTP/1 connection pool with long-lived event streams.
export function watchChanges(brand: Brand, callback: () => void, initialRevision = -1, intervalMs = 6000) {
  let stopped = false,
    busy = false,
    last = initialRevision;
  const poll = async () => {
    if (stopped || busy || document.hidden) return;
    busy = true;
    try {
      const result = await api<{ revision: number }>(
        `/api/local/${brand}?revision=1`,
      );
      if (!stopped && result.revision !== last) {
        last = result.revision;
        callback();
      }
    } catch {
    } finally {
      busy = false;
    }
  };
  const timer = setInterval(() => void poll(), intervalMs);
  if (initialRevision < 0) void poll();
  window.addEventListener("focus", poll);
  document.addEventListener("visibilitychange", poll);
  return () => {
    stopped = true;
    clearInterval(timer);
    window.removeEventListener("focus", poll);
    document.removeEventListener("visibilitychange", poll);
  };
}
