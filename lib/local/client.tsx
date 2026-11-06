"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import type { Brand, PublicData, LocalProduct } from "./types";
import type { Product } from "../products";
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
  children,
}: {
  brand: Brand;
  children: React.ReactNode;
}) {
  const [data, setData] = useState<PublicData | null>(null),
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
    setData(null);
    reload();
    return watchChanges(brand, reload);
  }, [brand, reload]);
  return (
    <Context.Provider value={{ brand, data, error, reload }}>
      {children}
    </Context.Provider>
  );
}
export const useLocal = () => useContext(Context);
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
export function watchChanges(brand: Brand, callback: () => void) {
  let stopped = false,
    busy = false,
    last = -1;
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
  const timer = setInterval(() => void poll(), 6000);
  void poll();
  window.addEventListener("focus", poll);
  document.addEventListener("visibilitychange", poll);
  return () => {
    stopped = true;
    clearInterval(timer);
    window.removeEventListener("focus", poll);
    document.removeEventListener("visibilitychange", poll);
  };
}
