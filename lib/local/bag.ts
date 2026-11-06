"use client";
import { useEffect, useState } from "react";
import type { Brand } from "./types";
export type BagLine = {
  productId: string;
  quantity: number;
  colour?: string;
  size?: string;
  personalisation?: Record<string, unknown>;
};
export function readBag(brand: Brand): BagLine[] {
  try {
    const v = JSON.parse(localStorage.getItem(`bag-${brand}`) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
export function saveBag(brand: Brand, lines: BagLine[]) {
  localStorage.setItem(`bag-${brand}`, JSON.stringify(lines));
  window.dispatchEvent(new Event("bag-change"));
}
export function addToBag(brand: Brand, line: BagLine) {
  const lines = readBag(brand);
  const existing = lines.find(
    (l) =>
      l.productId === line.productId &&
      l.colour === line.colour && l.size === line.size &&
      JSON.stringify(l.personalisation) ===
        JSON.stringify(line.personalisation),
  );
  if (existing) existing.quantity += line.quantity;
  else lines.push(line);
  saveBag(brand, lines);
}

/** Number of lines in a brand's bag, kept in sync across components and tabs. */
export function useBagCount(brand: Brand) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const load = () => setCount(readBag(brand).length);
    load();
    const onStorage = (e: StorageEvent) => { if (e.key === `bag-${brand}`) load(); };
    window.addEventListener("bag-change", load);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("bag-change", load);
      window.removeEventListener("storage", onStorage);
    };
  }, [brand]);
  return count;
}
