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
