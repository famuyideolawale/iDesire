"use client";
import { useLocal, asGift } from "./local/client";
import { useEffect, useState } from "react";
import type { GiftPersonalisation } from "./personalisation";
import { giftProducts, sampleGiftProducts } from "./gift-data";
import type { GiftProduct, GiftOrder } from "./gift-data";
export * from "./gift-data";
export function readLocal<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}
export function useGiftCatalogue() {
  const { data } = useLocal();
  return data ? data.products.map(asGift) : giftProducts;
}
/**
 * Gifts to list in the shop and on the home page. Sample concepts that reuse a
 * real product's photo are left out, so the same picture never appears twice.
 * Their own pages still work, and they return once they have their own photo.
 */
export function listedGifts(products: GiftProduct[]) {
  const realImages = new Set(products.filter((p) => !p.sample).map((p) => p.image));
  return products.filter((p) => !p.sample || !realImages.has(p.image));
}

// Copy legacy gift records before either workspace saves a brand-specific register.
export function migrateGiftRecords() {
  const legacy = readLocal<
    {
      id: string;
      customer: string;
      phone: string;
      item: string;
      amount: string;
      status: string;
      date: string;
      notes: string;
    }[]
  >("idesire-orders-v1", []).filter(
    (o) => o.id.startsWith("KOK") || o.id.startsWith("KWG"),
  );
  const current = readLocal<GiftOrder[]>("kokies-demo-orders", []);
  const imported = legacy
    .filter((o) => !current.some((x) => x.reference === o.id))
    .map((o) => ({
      reference: o.id,
      business: "Kokies World of Gifts",
      product: o.item,
      quantity: 1,
      unitPrice: Number(o.amount) || 0,
      estimatedTotal: Number(o.amount) || 0,
      customerName: o.customer,
      phone: o.phone,
      event: "Imported legacy record · " + o.date,
      customisation: o.notes,
      status: o.status,
      createdAt: "",
    }));
  if (imported.length)
    localStorage.setItem(
      "kokies-demo-orders",
      JSON.stringify([...current, ...imported]),
    );
  const enquiries = readLocal<
    {
      id: string;
      customer: string;
      phone: string;
      type: string;
      date: string;
      status: string;
      notes: string;
    }[]
  >("idesire-enquiries-v1", []).filter((o) => o.id.includes("KOK"));
  const saved = readLocal<GiftOrder[]>("kokies-enquiries-v1", []);
  const incoming = enquiries
    .filter((o) => !saved.some((x) => x.reference === o.id))
    .map((o) => ({
      reference: o.id,
      business: "Kokies World of Gifts",
      product: o.type,
      quantity: 0,
      unitPrice: 0,
      estimatedTotal: 0,
      customerName: o.customer,
      phone: o.phone,
      event: "Imported legacy enquiry · " + o.date,
      customisation: o.notes,
      status: o.status,
      createdAt: "",
    }));
  if (incoming.length)
    localStorage.setItem(
      "kokies-enquiries-v1",
      JSON.stringify([...saved, ...incoming]),
    );
}

export function readGiftCatalogue(): GiftProduct[] {
  let saved = readLocal<GiftProduct[]>("kokies-products-v1", giftProducts);
  if (typeof window === "undefined" || !Array.isArray(saved))
    return giftProducts;
  try {
    const revised = saved.map((item) => {
      const old = legacySampleGiftProducts.find((p) => p.id === item.id);
      const current = sampleGiftProducts.find((p) => p.id === item.id);
      if (!old || !current) return item;
      const unchanged = Object.entries(old).every(
        ([key, value]) =>
          (item as unknown as Record<string, unknown>)[key] === value,
      );
      return unchanged ? { ...item, ...current } : item;
    });
    if (revised.some((item, index) => item !== saved[index])) {
      localStorage.setItem("kokies-products-v1", JSON.stringify(revised));
      saved = revised;
    }

    if (!localStorage.getItem("kokies-sample-expansion-v1")) {
      const next = [
        ...saved,
        ...sampleGiftProducts.filter((p) => !saved.some((x) => x.id === p.id)),
      ];
      localStorage.setItem("kokies-products-v1", JSON.stringify(next));
      localStorage.setItem("kokies-sample-expansion-v1", "1");
      return next;
    }
  } catch {}
  return saved;
}

const legacySampleGiftProducts: GiftProduct[] = [
  {
    id: 9,
    name: "Signature Wine Gift Hamper",
    category: "Curated Gift Set Concepts",
    price: 65000,
    image: "/campaigns/kokies-logo-hero.webp",
    note: "Sample concept with illustrative campaign photography: a coordinated wine-and-cream notebook, drinkware and gift presentation. Contents, availability and demo pricing require client approval.",
    slug: "signature-wine-gift-hamper",
    sample: true,
  },
  {
    id: 10,
    name: "Personalised Keepsake Duo",
    category: "Personalised Gift Concepts",
    price: 42000,
    image: "/campaigns/kokies-personal-hero.webp",
    note: "Sample concept featuring a personalised tumbler and flask with a gift card and presentation. Illustrative campaign image; contents, finish and demo price are subject to a confirmed quote.",
    slug: "personalised-keepsake-duo",
    sample: true,
  },
  {
    id: 11,
    name: "Executive Welcome Gift Set",
    category: "Corporate Gift Set Concepts",
    price: 58000,
    image: "/campaigns/kokies-corporate-hero.webp",
    note: "Sample concept for team welcomes and client appreciation: notebook, drinkware, pen and presentation box. Image illustrates multiple sets; displayed demo price is per proposed set, with contents and availability to confirm.",
    slug: "executive-welcome-gift-set",
    sample: true,
  },
];
