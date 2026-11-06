import { accountAction } from "./accounts";
import { AuthError } from "./auth";
import { randomUUID, randomBytes, scryptSync, createHash, timingSafeEqual } from "node:crypto";
import { text, required, positive, record, safeUrl } from "./store";
import { countPersonalisationWords } from "../personalisation";
import type {
  Brand,
  BusinessData,
  CmsBlock,
  LocalOrder,
  LocalProduct,
  OrderLine,
  PageContent,
  SessionUser,
  StoreDatabase,
} from "./types";
import { effectivePrice, orderStatuses } from "./types";
import { ABUJA, abujaAreas, cleanDeliverySettings, deliveryQuote, lineNeedsQuote, nigerianStates } from "../delivery";
const stamp = () => new Date().toISOString();
export const enquiryStatuses = ["New", "Contacted", "Quote sent", "Awaiting response", "Converted", "Closed"];
const MAX_MOVEMENTS = 250;
/** Keep each product's stock ledger bounded so the database does not grow forever. */
function trimMovements(inv: { movements: unknown[] }) {
  if (inv.movements.length > MAX_MOVEMENTS) inv.movements.length = MAX_MOVEMENTS;
}
export function normalPhone(value: string) {
  const digits = value.replace(/\D/g, "").replace(/^00/, "");
  return /^0[789]\d{9}$/.test(digits) ? "234" + digits.slice(1) : digits;
}
export const checkoutHash = (value: string) => createHash("sha256").update(value).digest("hex");
export function needsFinalQuote(order: LocalOrder) {
  return (order.quoteRequired ?? order.history.some(event => event.text.startsWith("Order enquiry received"))) &&
    !order.quoteIssuedAt && !(order.quoteRequired === undefined && order.history.some(event => event.text.startsWith("Quote issued:")));
}
export function holdExpired(order: LocalOrder) {
  return order.reserved && order.paymentStatus === "Unpaid" &&
    !order.demo && (order.holdUntil ? Date.parse(order.holdUntil) :
      Date.parse(order.createdAt) + 24 * 60 * 60 * 1000) <= Date.now();
}
export function availableStock(b: BusinessData, productId: string) {
  const inventory = b.inventory.find(i => i.productId === productId);
  if (!inventory) return 0;
  const expired = b.orders.filter(holdExpired).flatMap(o => o.items)
    .filter(i => i.productId === productId).reduce((sum, i) => sum + i.quantity, 0);
  return Math.max(0, inventory.stock - inventory.reserved + expired);
}
function expireHolds(b: BusinessData) {
  for (const order of b.orders.filter(holdExpired)) {
    release(b, order, "System");
    order.history.push({ at: stamp(), actor: "System", text: "Stock hold expired; availability will be checked again before payment confirmation." });
  }
}
function phoneNumber(value: unknown) {
  const phone = required(value, "Phone number", 60);
  if (!/^\d{7,15}$/.test(normalPhone(phone)))
    throw new Error("Enter a valid phone number.");
  return phone;
}
function upsertCustomer(
  b: BusinessData,
  name: string,
  phone: string,
  email: string,
  address = "",
) {
  const existing = b.customers.find(
    (c) => normalPhone(c.phone) === normalPhone(phone) &&
      c.email.toLowerCase() === email.toLowerCase(),
  );
  if (existing) return existing;
  const customer = {
    id: randomUUID(),
    name,
    phone,
    email,
    city: address,
    notes: "",
    tags: ["New customer"],
    createdAt: stamp(),
  };
  b.customers.unshift(customer);
  return customer;
}
function stockFor(b: BusinessData, id: string) {
  let inv = b.inventory.find((i) => i.productId === id);
  if (!inv) {
    inv = { productId: id, stock: 0, reserved: 0, threshold: 5, movements: [] };
    b.inventory.push(inv);
  }
  return inv;
}
export function personalisation(
  input: unknown,
): Record<string, unknown> | undefined {
  if (!input) return undefined;
  const p = record(input);
  const method = text(p.method);
  if (!["none", "text", "logo", "text-and-logo"].includes(method))
    throw new Error("Choose a valid personalisation option.");
  const wording = text(p.wording, 1500);
  if ((method === "logo" || method === "text-and-logo") && !text(p.artworkNotes, 2000))
    throw new Error("Describe the logo or artwork.");

  const hasText = method === "text" || method === "text-and-logo";
  const count = hasText ? countPersonalisationWords(wording) : 0;
  const extra = Math.max(0, count - 8);
  if (hasText && !count)
    throw new Error("Personalisation wording is required.");
  if (extra && p.extraWordingQuoteAccepted !== true)
    throw new Error("Acknowledge the additional-word quote.");
  return {
    method,
    wording: hasText ? wording : "",
    wordCount: count,
    extraWords: extra,
    productColour: text(p.productColour, 100),
    printColour: text(p.printColour, 60),
    placement: text(p.placement, 100),
    artworkNotes: text(p.artworkNotes, 2000),
    additionalNotes: text(p.additionalNotes, 3000),
    extraWordingQuoteAccepted:
      extra > 0 && p.extraWordingQuoteAccepted === true,
  };
}
export function createOrder(
  b: BusinessData,
  brand: Brand,
  input: Record<string, unknown>,
  actor: string,
  manual = false,
  customerAccountId?: string,
): LocalOrder {
  const key = text(input.checkoutKey, 64);
  if (!manual && input.source === "Website checkout" && !key)
    throw new Error("Refresh checkout before placing your order.");
  if (key && !/^[a-f0-9-]{36}$/i.test(key)) throw new Error("Invalid checkout attempt.");
  const keyHash = key ? checkoutHash(key) : undefined;
  const { checkoutKey: _key, ...details } = input;
  const fingerprint = keyHash ? checkoutHash(JSON.stringify(details)) : undefined;
  const existing = keyHash && b.orders.find(o => o.checkoutKeyHash === keyHash);
  if (existing) {
    if (existing.checkoutFingerprint !== fingerprint)
      throw new AuthError("This checkout attempt already saved a different order. Open your receipt before placing another.", 409);
    return existing;
  }
  expireHolds(b);
  const customerName = required(
      input.customerName ?? input.name,
      "Customer name",
      180,
    ),
    phone = phoneNumber(input.phone),
    email = text(input.email, 200),
    address = text(input.address, 1000);
  const deliveryMethod = input.deliveryMethod === "pickup" ? "pickup" : "delivery";
  if (!manual && input.kind !== "enquiry") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
    if (deliveryMethod === "delivery" && !address) throw new Error("Delivery address is required.");
  }
  const rawLines = Array.isArray(input.items)
    ? input.items
    : [
        {
          productId: input.productId,
          quantity: input.quantity,
          colour: input.colour,
          size: input.size,
          personalisation: input.personalisation,
        },
      ];
  if (!rawLines.length || rawLines.length > 30)
    throw new Error("Choose between one and thirty products.");
  const items: OrderLine[] = rawLines.map((value) => {
    const line = record(value);
    const product = b.products.find(
      (p) =>
        p.id === String(line.productId) || p.slug === String(line.productId),
    );
    if (!product || product.status !== "published")
      throw new Error("A selected product is unavailable.");
    const quantity = positive(
      line.quantity,
      manual ? 1 : product.minimum,
      product.maximum ?? 100000,
    );
    if (!Number.isInteger(quantity))
      throw new Error("Quantities must be whole numbers.");
    const colour = text(line.colour, 100);
    const size = text(line.size, 100);
    if ((size || (!manual && product.sizes?.length)) && !product.sizes?.includes(size))
      throw new Error("Choose an available size for " + product.name + ".");
    if (colour && !product.colours?.some(c => c.name === colour))
      throw new Error("Choose an available colour for " + product.name + ".");
    return {
      productId: product.id,
      name: product.name,
      quantity,
      unitPrice: effectivePrice(product),
      image: product.image,
      colour,
      size,
      personalisation: personalisation(line.personalisation),
    };
  });
  const quote =
    input.kind === "enquiry" ||
    items.some((i) => {
      const product = b.products.find((p) => p.id === i.productId);
      return lineNeedsQuote(product && { ...product, price: i.unitPrice }, i);
    });
  // Delivery is priced on the server from the admin's fee table, never from the browser.
  let deliveryState = "", deliveryArea = "";
  if (deliveryMethod === "delivery") {
    deliveryState = text(input.deliveryState, 60);
    deliveryArea = deliveryState === ABUJA ? text(input.deliveryArea, 60) : "";
    if (!manual && !(nigerianStates as readonly string[]).includes(deliveryState))
      throw new Error("Choose the state for delivery.");
    if (!manual && deliveryState === ABUJA && !(abujaAreas as readonly string[]).includes(deliveryArea))
      throw new Error("Choose your area in Abuja.");
  }
  const delivery = deliveryQuote(
    b.settings.delivery, b.products, items, deliveryMethod, deliveryState, deliveryArea,
  );
  const deliveryFee = delivery.fee ?? undefined;
  const subtotal = items.reduce((n, i) => n + (i.unitPrice ?? 0) * i.quantity, 0);
  const order: LocalOrder = {
    id: `${brand === "idesire" ? "IDT" : "KOK"}-${new Date().getUTCFullYear()}-${randomBytes(10).toString("hex").toUpperCase()}`,
    customerName,
    phone,
    email,
    address,
    deliveryMethod,
    items,
    total: subtotal + (deliveryFee ?? 0),
    deliveryFee,
    deliveryState: deliveryState || undefined,
    deliveryArea: deliveryArea || undefined,
    deliveryPending: deliveryMethod === "delivery" && deliveryFee === undefined ? true : undefined,
    status: quote ? "Awaiting quotation" : "Awaiting payment",
    paymentStatus: "Unpaid",
    source: manual ? (["WhatsApp", "Manual", "Admin"].includes(String(input.source)) ? String(input.source) : "Admin") : "Website",
    notes: text(input.notes ?? input.customisation, 12000),
    createdAt: stamp(),
    updatedAt: stamp(),
    history: [
      {
        at: stamp(),
        actor,
        text: quote
          ? "Order enquiry received; final quote required."
          : "Order placed; payment not yet confirmed." +
            (deliveryMethod === "pickup" ? " Pickup." : deliveryFee !== undefined
              ? ` Delivery to ${delivery.place}: ₦${deliveryFee.toLocaleString("en-NG")}.`
              : ` Delivery to ${delivery.place || "the customer"}: fee to confirm.`),
      },
    ],
    reserved: false,
    quoteRequired: quote,
    checkoutKeyHash: keyHash,
    customerAccountId,
    checkoutFingerprint: fingerprint,
  };
  if (!quote) {
    reserve(b, order, actor);
    if (!manual) order.holdUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  }
  b.orders.unshift(order);
  upsertCustomer(b, customerName, phone, email, address);
  return order;
}
/** Made-to-order, pre-order and concept items are produced on demand, so they hold no stock. */
function stockTracked(b: BusinessData, productId: string) {
  const product = b.products.find((p) => p.id === productId);
  return !product || !(product.sample || product.availability === "made" || product.availability === "preorder");
}
function reserve(b: BusinessData, order: LocalOrder, actor: string) {
  if (order.reserved) return;
  const quantities = new Map<string, number>();
  for (const item of order.items)
    if (stockTracked(b, item.productId)) quantities.set(
      item.productId,
      (quantities.get(item.productId) || 0) + item.quantity,
    );
  for (const [id, q] of quantities) {
    const inv = stockFor(b, id);
    if (inv.stock - inv.reserved < q)
      throw new Error(
        `Not enough available stock for ${order.items.find((i) => i.productId === id)?.name}. Request a quote or adjust the quantity.`,
      );
  }
  for (const [id, q] of quantities) {
    const inv = stockFor(b, id);
    inv.reserved += q;
    inv.movements.unshift({
      id: randomUUID(),
      at: stamp(),
      quantity: -q,
      reason: `Reserved for ${order.id}`,
      actor,
    });
    trimMovements(inv);
  }
  order.reserved = true;
}
function release(
  b: BusinessData,
  order: LocalOrder,
  actor: string,
  commit = false,
) {
  if (!order.reserved) return;
  for (const item of order.items) {
    if (!stockTracked(b, item.productId)) continue;
    const inv = stockFor(b, item.productId);
    inv.reserved = Math.max(0, inv.reserved - item.quantity);
    if (commit) inv.stock = Math.max(0, inv.stock - item.quantity);
    inv.movements.unshift({
      id: randomUUID(),
      at: stamp(),
      quantity: commit ? -item.quantity : item.quantity,
      reason: `${commit ? "Dispatched" : "Released"} ${order.id}`,
      actor,
    });
    trimMovements(inv);
  }
  order.reserved = false;
  delete order.holdUntil;
}
export function createEnquiry(
  b: BusinessData,
  brand: Brand,
  input: Record<string, unknown>,
) {
  const e = {
    id: `ENQ-${brand === "idesire" ? "IDT" : "KWG"}-${randomBytes(10).toString("hex").toUpperCase()}`,
    customerName: required(input.customerName ?? input.name, "Your name", 180),
    phone: phoneNumber(input.phone),
    email: text(input.email, 200),
    type: text(input.enquiryType ?? input.typeLabel, 160) || "General enquiry",
    details: required(input.details, "Enquiry details", 12000),
    status: "New",
    createdAt: stamp(),
  };
  b.enquiries.unshift(e);
  upsertCustomer(b, e.customerName, e.phone, e.email);
  return e;
}
function validateContent(value: unknown, locked: boolean): PageContent {
  const v = record(value);
  const blocks = Array.isArray(v.blocks) ? v.blocks : [];
  if (blocks.length > 35)
    throw new Error("A page can contain up to 35 sections.");
  const clean: CmsBlock[] = blocks.map((value) => {
    const x = record(value),
      type = text(x.type) as CmsBlock["type"];
    if (
      ![
        "template",
        "text",
        "image",
        "callout",
        "faq",
        "products",
        "divider",
      ].includes(type)
    )
      throw new Error("Unsupported section type.");
    return {
      id: required(x.id, "Section ID", 100),
      type,
      title: text(x.title, 500),
      body: text(x.body, 15000),
      image: safeUrl(x.image),
      alt: text(x.alt, 300),
      buttonLabel: text(x.buttonLabel, 100),
      href: safeUrl(x.href),
      visible: x.visible !== false,
    };
  });
  if (clean.filter((b) => b.type === "template").length > 1)
    throw new Error("Only one designed template is allowed.");
  if (locked && !clean.some((b) => b.type === "template" && b.visible))
    throw new Error("This page’s functional template must remain visible.");
  if (new Set(clean.map((b) => b.id)).size !== clean.length)
    throw new Error("Section IDs must be unique.");
  const elements = Array.isArray(v.elements) ? v.elements : [];
  if (elements.length > 400)
    throw new Error("A page can contain up to 400 visual edits.");
  const cleanElements = elements.map((value) => {
    const e = record(value);
    const selector = required(e.selector, "Element selector", 3000);
    if (!selector.startsWith("[data-cms-"))
      throw new Error("Invalid page element.");
    const scope = e.scope === "site" ? ("site" as const) : ("page" as const);
    const kind = text(e.kind) as "text" | "image" | "link" | "button";
    if (!["text", "image", "link", "button"].includes(kind))
      throw new Error("Unsupported element.");
    return {
      selector,
      scope,
      kind,
      ...(e.text !== undefined ? { text: text(e.text, 15000) } : {}),
      ...(e.src !== undefined
        ? { src: safeUrl(e.src), alt: text(e.alt, 500) }
        : {}),
      ...(e.href !== undefined
        ? {
            href: /^(mailto:|tel:|#)/.test(text(e.href))
              ? text(e.href, 2000)
              : safeUrl(e.href),
            linkSelector: text(e.linkSelector, 3000),
          }
        : {}),
    };
  });
  return {
    elements: cleanElements,
    title: text(v.title, 500),
    intro: text(v.intro, 5000),
    seoTitle: text(v.seoTitle, 200),
    seoDescription: text(v.seoDescription, 500),
    blocks: clean,
  };
}
export function adminAction(
  b: BusinessData,
  brand: Brand,
  input: Record<string, unknown>,
  user: SessionUser,
  db: StoreDatabase,
): unknown {
  const activeActor = db.users.find((u) => u.id === user.id);
  if (
    !activeActor ||
    activeActor.status === "Suspended" ||
    (activeActor.sessionVersion ?? 0) !== (user.sessionVersion ?? 0) ||
    !activeActor.brands.includes(brand)
  )
    throw new AuthError("Your access has changed. Sign in again.", 401);
  const action = required(input.action, "Action"),
    actor = user.name;
  expireHolds(b);
  if (action === "saveProduct") {
    const x = record(input.product),
      id = text(x.id, 180) || randomUUID(),
      price = x.price === "" || x.price === null ? null : positive(x.price);
    const p: LocalProduct = {
      id,
      name: required(x.name, "Product name", 200),
      slug: required(
        x.slug ||
          text(x.name)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-"),
        "Product slug",
        200,
      ),
      category: required(x.category, "Category", 150),
      price,
      image: safeUrl(x.image),
      description: required(x.description, "Description", 12000),
      minimum: positive(x.minimum, 1, 100000),
      unit: brand === "idesire" ? "yard" : "unit",
      status: x.status === "draft" ? "draft" : "published",
      sample: x.sample === true,
      priceConfirmed: x.priceConfirmed === true && price !== null,
    };
    const existing = b.products.find((v) => v.id === id);
    p.sku = text(x.sku, 80);
    p.collection = text(x.collection, 150);
    const parseList = (value: unknown) => [...new Set(text(value, 2000).split(",").map(item=>item.trim()).filter(Boolean))].slice(0,30);
    const existingProduct = b.products.find(product=>product.id===id);
    p.sizes = x.sizes === undefined ? existingProduct?.sizes : parseList(x.sizes);
    p.relatedIds = x.relatedIds === undefined ? existingProduct?.relatedIds : parseList(x.relatedIds).map(value => {
      const product = b.products.find(item => item.id !== id && (item.id === value || item.slug === value));
      if (!product) throw new Error("Unknown related product: " + value);
      return product.id;
    });
    p.salePrice = x.salePrice === "" || x.salePrice == null ? null : positive(x.salePrice);
    if (p.salePrice !== null && (price === null || p.salePrice >= price))
      throw new Error("Sale price must be lower than the regular price.");
    if (p.sku && b.products.some(item => item.id !== id && item.sku?.toLowerCase() === p.sku?.toLowerCase()))
      throw new Error("Another product already uses that SKU.");
    if (x.maximum !== "" && x.maximum != null) {
      p.maximum = positive(x.maximum, p.minimum, 100000);
      if (!Number.isInteger(p.maximum)) throw new Error("Maximum quantity must be a whole number.");
    } else if (x.maximum !== undefined) p.maximum = undefined;
    else p.maximum = existing?.maximum;
    p.availability = x.availability === "made" || x.availability === "preorder" ? x.availability : "stock";
    p.leadTime = text(x.leadTime, 150);
    p.deliveryFee = x.deliveryFee === undefined ? existingProduct?.deliveryFee
      : x.deliveryFee === "" || x.deliveryFee === null ? null : positive(x.deliveryFee, 0, 10_000_000);
    p.seoTitle = text(x.seoTitle, 120);
    p.seoDescription = text(x.seoDescription, 300);
    p.featured = x.featured === true;
    p.newArrival = x.newArrival === true;
    p.customisation = x.customisation === "personalised" || x.customisation === "branded" ? x.customisation : "none";
    if (x.variants !== undefined) {
      const variants = text(x.variants, 15000).split(/\r?\n/).filter(Boolean);
      if (variants.length > 30) throw new Error("Use no more than 30 colour variants.");
      p.colours = variants.map(line => {
        const [rawName, rawHex, rawImage] = line.split("|").map(value => value.trim());
        const name = required(rawName, "Variant name", 100);
        if (!/^#[0-9a-f]{6}$/i.test(rawHex || "")) throw new Error("Use a hex colour such as #74333A.");
        return {name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g,"-"), hex: rawHex, image: safeUrl(rawImage || p.image)};
      });
      if (new Set(p.colours.map(c => c.slug)).size !== p.colours.length || p.colours.some(c => !/[a-z0-9]/.test(c.slug)))
        throw new Error("Use distinct colour names containing letters or digits.");
      if (!p.colours.length) p.colours = undefined;
    }
    p.gallery = brand === "kokies" && (x.finishImage !== undefined || x.packagingImage !== undefined)
      ? [
          { src: safeUrl(x.finishImage), label: "Finish detail" },
          { src: safeUrl(x.packagingImage), label: "Packaging and scale" },
        ].filter(photo => photo.src)
      : existing?.gallery;
    if (b.products.some((v) => v.id !== id && v.slug === p.slug))
      throw new Error("Another product uses that URL slug.");
    if (existing) {
      if (x.variants === undefined) p.colours = existing.colours;
      p.yardOptions = existing.yardOptions;
      p.sourceUrl = existing.sourceUrl;
      Object.assign(existing, p);
    } else b.products.unshift(p);
    stockFor(b, id);
    return p;
  }
  if (action === "removeProduct") {
    const id = required(input.id, "Product ID");
    if (
      b.orders.some(
        (o) => o.reserved && o.items.some((i) => i.productId === id),
      )
    )
      throw new Error(
        "A product with reserved orders cannot be removed. Set it to draft instead.",
      );
    b.products = b.products.filter((p) => p.id !== id);
    return { ok: true };
  }
  if (action === "archiveMedia") {
    const id = required(input.id, "Image ID");
    const image = b.media.find((m) => m.id === id);
    if (!image) throw new Error("Image not found.");
    const used =
      b.products.some((p) => p.image === image.src) ||
      b.pages.some((p) =>
        [p.draft, p.published].some(
          (c) =>
            c.blocks.some((block) => block.image === image.src) ||
            c.elements?.some((e) => e.src === image.src),
        ),
      ) ||
      [
        ...(b.sharedDesign?.draft ?? []),
        ...(b.sharedDesign?.published ?? []),
      ].some((e) => e.src === image.src);
    if (used)
      throw new Error(
        "This image is used by a product or page. Replace it before archiving.",
      );
    b.media = b.media.filter((m) => m.id !== id);
    return { ok: true };
  }
  if (action === "saveInventory") {
    const inv = stockFor(b, required(input.id, "Product ID")),
      stock = positive(input.stock);
    if (stock < inv.reserved)
      throw new Error("Stock cannot be lower than units reserved for orders.");
    const delta = stock - inv.stock;
    inv.stock = stock;
    inv.threshold = positive(input.threshold);
    inv.movements.unshift({
      id: randomUUID(),
      at: stamp(),
      quantity: delta,
      reason: required(input.reason, "Adjustment reason", 500),
      actor,
    });
    trimMovements(inv);
    return inv;
  }
  if (action === "recordOrder")
    return createOrder(b, brand, record(input.order), actor, true);
  if (action === "confirmPayment") {
    const order = b.orders.find(o => o.id === input.id);
    if (!order || order.status !== "Awaiting payment" || order.paymentStatus !== "Unpaid")
      throw new Error("Only an unpaid order awaiting payment can be confirmed.");
    if (needsFinalQuote(order) || order.items.some(i => i.unitPrice === null))
      throw new Error("Issue the final quote first.");
    if (order.deliveryPending)
      throw new Error("Set the delivery fee first with Issue / revise quote.");
    const amount = positive(typeof input.amount === "number" ? input.amount : required(input.amount, "Amount received"), 0, Number.MAX_SAFE_INTEGER / 100);
    if (Math.round(amount * 100) !== Math.round(order.total * 100))
      throw new Error("The received amount must match the agreed total.");
    const reference = required(input.reference, "Payment reference", 150);
    reserve(b, order, actor);
    delete order.holdUntil;
    order.payment = { amount, reference, confirmedAt: stamp(), confirmedBy: actor };
    order.paymentStatus = "Paid";
    order.status = "Paid";
    order.updatedAt = stamp();
    order.history.push({ at: stamp(), actor, text: "Payment confirmed" });
    return order;
  }
  if (action === "updateOrder") {
    const o = b.orders.find((v) => v.id === input.id);
    if (!o) throw new Error("Order not found.");
    const status = text(input.status) as LocalOrder["status"];
    if (!orderStatuses.includes(status))
      throw new Error("Invalid order status.");
    if (status === o.status) {
      const notes = input.notes === undefined ? o.notes : text(input.notes, 12000);
      if (notes !== o.notes) {
        o.notes = notes;
        o.updatedAt = stamp();
        o.history.push({ at: o.updatedAt, actor, text: "Order notes updated" });
      }
      return o;
    }
    if (o.status === "Cancelled" && status !== "Cancelled")
      throw new Error("Create a new order to reopen a cancelled order.");
    if (o.status === "Completed" && status !== "Completed")
      throw new Error("Completed orders are closed.");
    if (status === "Cancelled" && o.status === "Dispatched")
      throw new Error("Dispatched orders require a separate return process.");
    if (
      o.paymentStatus === "Paid" &&
      ["Awaiting payment", "Awaiting quotation"].includes(status)
    )
      throw new Error("A paid order cannot be moved back to an unpaid status.");
    if (
      [
        "Paid",
        "Processing",
        "Ready for dispatch",
        "Dispatched",
        "Completed",
      ].includes(status) &&
      o.items.some((i) => i.unitPrice === null)
    )
      throw new Error("Issue a final quote before confirming payment.");
    if (status === "Awaiting payment" && (o.status === "Awaiting quotation" || needsFinalQuote(o)))
      throw new Error("Use Issue / revise a quote to set the final total.");
    if (["Paid", "Processing", "Ready for dispatch", "Dispatched", "Completed"].includes(status) && o.paymentStatus !== "Paid")
      throw new Error("Confirm payment before moving this order into fulfilment.");
    if (["Processing", "Ready for dispatch", "Dispatched", "Completed"].includes(status) &&
      (o.proof || (o.checkoutKeyHash && o.items.some(i => ["logo", "text-and-logo"].includes(String(i.personalisation?.method))))) &&
      !o.proof?.approvedAt)
      throw new Error("The customer must approve the artwork proof before production.");
    if (status === "Awaiting quotation") {
      release(b, o, actor);
      o.quoteRequired = true;
      delete o.quoteIssuedAt;
    }
    if (
      ["Dispatched", "Completed"].includes(o.status) &&
      !["Dispatched", "Completed"].includes(status)
    )
      throw new Error(
        "Dispatched orders cannot be moved back into production.",
      );
    if (status === "Cancelled") {
      if (["Dispatched", "Completed"].includes(o.status))
        throw new Error("Dispatched orders require a separate return process.");
      release(b, o, actor);
    } else if (
      [
        "Paid",
        "Processing",
        "Ready for dispatch",
        "Dispatched",
        "Completed",
      ].includes(status) &&
      !["Dispatched", "Completed"].includes(o.status)
    ) {
      reserve(b, o, actor);
      if (status === "Dispatched" || status === "Completed")
        release(b, o, actor, true);
    }
    o.status = status;
    o.updatedAt = stamp();
    if (input.notes !== undefined) o.notes = text(input.notes, 12000);
    o.history.push({ at: stamp(), actor, text: `Status changed to ${status}` });
    return o;
  }
  if (action === "issueQuote") {
    const o = b.orders.find((o) => o.id === input.id);
    if (!o) throw new Error("Order not found.");
    if (
      o.paymentStatus === "Paid" ||
      ["Dispatched", "Completed", "Cancelled"].includes(o.status)
    )
      throw new Error("This order can no longer be quoted.");
    const prices = record(input.prices);
    for (const [i, item] of o.items.entries()) {
      const price = positive(prices[String(i)]);
      if (price <= 0) throw new Error(`Enter a unit price above ₦0 for ${item.name}.`);
      item.unitPrice = price;
    }
    const delivery = positive(input.delivery || 0);
    o.total =
      o.items.reduce((n, i) => n + (i.unitPrice ?? 0) * i.quantity, 0) +
      delivery;
    o.status = "Awaiting payment";
    o.quoteIssuedAt = stamp();
    o.deliveryFee = delivery;
    delete o.deliveryPending;
    // Hold the stock for the quoted items so a paying customer is never blocked.
    // reserve() throws a clear message when stock is short, before anything is saved.
    reserve(b, o, actor);
    o.holdUntil = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
    o.updatedAt = stamp();
    o.history.push({
      at: stamp(),
      actor,
      text: `Quote issued: total ₦${o.total.toLocaleString()}. Delivery: ₦${delivery}. ${text(input.note, 2000)}`,
    });
    return o;
  }
  if (action === "addOrderNote") {
    const o = b.orders.find((v) => v.id === input.id);
    if (!o) throw new Error("Order not found.");
    o.history.push({
      at: stamp(),
      actor,
      text: required(input.note, "Note", 3000),
    });
    o.updatedAt = stamp();
    return o;
  }
  if (action === "saveEnquiry") {
    if (Array.isArray(input.ids)) {
      // Bulk status change from the enquiries register.
      const status = required(input.status, "Status", 80);
      if (!enquiryStatuses.includes(status)) throw new Error("Choose a valid enquiry status.");
      const ids = new Set(input.ids.slice(0, 500).map(String));
      let changed = 0;
      for (const e of b.enquiries)
        if (ids.has(e.id) && e.status !== status) { e.status = status; e.updatedAt = stamp(); changed++; }
      return { changed };
    }
    if (input.id) {
      const e = b.enquiries.find((v) => v.id === input.id);
      if (!e) throw new Error("Enquiry not found.");
      if (input.status !== undefined) {
        const status = required(input.status, "Status", 80);
        if (!enquiryStatuses.includes(status)) throw new Error("Choose a valid enquiry status.");
        e.status = status;
      }
      if (input.notes !== undefined) e.notes = text(input.notes, 5000);
      e.updatedAt = stamp();
      return e;
    }
    return createEnquiry(b, brand, record(input.enquiry));
  }
  if (action === "saveCustomer") {
    const x = record(input.customer),
      existing = b.customers.find((c) => c.id === x.id);
    const c =
      existing ??
      upsertCustomer(
        b,
        required(x.name, "Name", 180),
        required(x.phone, "Phone", 60),
        text(x.email, 200),
      );
    c.name = required(x.name, "Name", 180);
    c.email = text(x.email, 200);
    c.phone = required(x.phone, "Phone", 60);
    c.city = text(x.city, 200);
    c.notes = text(x.notes, 5000);
    c.tags = text(x.tags, 300)
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    return c;
  }
  if (action === "saveHeroSlides") {
    if (!Array.isArray(input.slides) || input.slides.length !== 3)
      throw new Error("Configure the three campaign slides.");
    const slides = input.slides.map((entry, index) => {
      const slide = record(entry);
      const href = safeUrl(slide.href);
      if (!href) throw new Error("Each slide needs a destination.");
      return {
        title: required(slide.title, "Heading", 160), eyebrow: text(slide.eyebrow, 100),
        text: text(slide.text, 500), image: safeUrl(required(slide.image, "Desktop image")),
        mobileImage: safeUrl(slide.mobileImage), alt: required(slide.alt, "Image description", 240),
        cta: required(slide.cta, "Button label", 60), href,
        position: positive(slide.position ?? index, 0, 2), visible: slide.visible !== false,
      };
    });
    if (!slides.some(slide => slide.visible)) throw new Error("Keep at least one campaign visible.");
    b.settings.heroSlides = slides;
    return slides;
  }
  if (action === "saveDelivery") {
    b.settings.delivery = cleanDeliverySettings(input.delivery);
    return b.settings.delivery;
  }
  if (action === "saveSettings") {
    const x = record(input.settings);
    for (const key of [
      "heroTitle",
      "heroText",
      "announcement",
      "email",
      "phone",
      "address",
      "openingHours",
      "chatWelcome",
    ] as const)
      if (x[key] !== undefined)
        b.settings[key] = text(x[key], key === "heroText" ? 5000 : 1000);
    if (x.instagram !== undefined) b.settings.instagram = safeUrl(x.instagram);
    if (typeof x.chatOnline === "boolean") b.settings.chatOnline = x.chatOnline;
    return b.settings;
  }
  if (
    action === "savePageDraft" ||
    action === "publishPage" ||
    action === "restorePage"
  ) {
    const p = b.pages.find((p) => p.id === input.id);
    if (!p) throw new Error("Page not found.");
    const shared = b.sharedDesign ?? { draft: [], published: [] };
    if (action === "restorePage") {
      const version = p.versions.find((v) => v.id === input.versionId);
      if (!version) throw new Error("Version not found.");
      p.draft = structuredClone(version.content);
      if (p.draft.elements) {
        shared.draft = p.draft.elements.filter((e) => e.scope === "site");
        p.draft.elements = p.draft.elements.filter((e) => e.scope !== "site");
      }
    } else if (input.content) {
      const content = validateContent(input.content, p.protected);
      if (record(input.content).elements !== undefined)
        shared.draft = (content.elements ?? []).filter(
          (e) => e.scope === "site",
        );
      content.elements = (content.elements ?? []).filter(
        (e) => e.scope !== "site",
      );
      p.draft = content;
    }
    b.sharedDesign = shared;
    if (action === "publishPage") {
      p.versions.unshift({
        id: randomUUID(),
        at: stamp(),
        actor,
        content: {
          ...structuredClone(p.published),
          elements: [
            ...(p.published.elements ?? []),
            ...structuredClone(shared.published),
          ],
        },
      });
      shared.published = structuredClone(shared.draft);
      p.versions = p.versions.slice(0, 20);
      p.published = structuredClone(p.draft);
      p.publishedAt = stamp();
      if (p.id === "home") {
        if (p.published.title) b.settings.heroTitle = p.published.title;
        if (p.published.intro) b.settings.heroText = p.published.intro;
      }
    }
    p.updatedAt = stamp();
    return p;
  }
  if (action === "chatReply") {
    const c = b.conversations.find((c) => c.id === input.id);
    if (!c) throw new Error("Conversation not found.");
    const message = {
      id: randomUUID(),
      from: "staff" as const,
      text: required(input.text, "Reply", 5000),
      at: stamp(),
      staffName: actor,
    };
    let product: LocalProduct | undefined;
    if (input.productId) {
      product = b.products.find((p) => p.id === input.productId && p.status === "published");
      if (!product) throw new Error("Recommend a published product.");
    }
    c.messages.push(
      product
        ? {
            ...message,
            product: {
              id: product.id,
              name: product.name,
              image: product.image,
              href:
                brand === "idesire"
                  ? `/product/${product.slug}`
                  : `/kokies-world-of-gift/${product.id}`,
            },
          }
        : message,
    );
    c.status = "Open";
    c.assignedTo = actor;
    c.unread = 0;
    c.updatedAt = stamp();
    return c;
  }
  if (action === "updateChat") {
    const c = b.conversations.find((c) => c.id === input.id);
    if (!c) throw new Error("Conversation not found.");
    if (
      input.status &&
      ["Waiting", "Open", "Resolved"].includes(String(input.status))
    )
      c.status = input.status as typeof c.status;
    if (input.assignedTo !== undefined)
      c.assignedTo = text(input.assignedTo, 180);
    if (input.tags !== undefined)
      c.tags = text(input.tags, 300)
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    c.unread = 0;
    c.updatedAt = stamp();
    return c;
  }
  if (action === "changePassword") {
    const current = db.users.find((u) => u.id === user.id)!;
    const old = required(input.currentPassword, "Current password", 200),
      password = required(input.newPassword, "New password", 200);
    if (!timingSafeEqual(scryptSync(old, current.salt, 64), Buffer.from(current.passwordHash, "hex")))
      throw new Error("Current password is incorrect.");
    if (password.length < 10) throw new Error("Use at least ten characters.");
    current.salt = randomBytes(16).toString("hex");
    current.passwordHash = scryptSync(password, current.salt, 64).toString(
      "hex",
    );
    current.sessionVersion = (current.sessionVersion ?? 0) + 1;
    return { ok: true };
  }
  if (
    [
      "createStaff",
      "updateStaff",
      "setStaffStatus",
      "resetStaffPassword",
      "removeStaff",
    ].includes(action)
  )
    return accountAction(action, input, user, brand, db);
  throw new Error("Unsupported action.");
}
