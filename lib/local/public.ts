import { availableStock } from "./actions";
import { effectivePrice, type BusinessData, type PublicData } from "./types";

/** The storefront's public view of a business. Never includes orders, customers or chats. */
export function buildPublicData(
  b: BusinessData,
  options: { preview?: boolean; pageId?: string | null } = {},
): PublicData {
  const preview = options.preview === true;
  return {
    revision: b.revision,
    previewAuthorized: preview,
    sharedElements: preview ? (b.sharedDesign?.draft ?? []) : (b.sharedDesign?.published ?? []),
    products: b.products
      .filter((p) => p.status === "published")
      .map((p) => ({ ...p, price: effectivePrice(p) })),
    inventory: b.inventory.map((i) => ({
      productId: i.productId,
      available: availableStock(b, i.productId),
    })),
    settings: b.settings,
    pages: b.pages.map((p) => ({
      id: p.id,
      path: p.path,
      published: preview && options.pageId === p.id ? p.draft : p.published,
    })),
  };
}
