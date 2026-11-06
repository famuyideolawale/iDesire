import { NextResponse } from "next/server";
import {
  readBusiness,
  readRevision,
  parseBrand,
  mutate,
  record,
  required,
  text,
} from "../../../../lib/local/store";
import { checkOrigin, requireUser } from "../../../../lib/local/auth";
import { body, failure } from "../../../../lib/local/http";
import { checkoutHash, createOrder, createEnquiry, holdExpired, needsFinalQuote, normalPhone } from "../../../../lib/local/actions";
import { customerToken, signedInCustomer } from "../../../../lib/local/customer-auth";
import { limitRequest } from "../../../../lib/local/rate-limit";
import { type LocalOrder } from "../../../../lib/local/types";
import { buildPublicData } from "../../../../lib/local/public";

function orderStatus(o: LocalOrder) {
  return {
    id: o.id,
    reference: o.id,
    status: o.status === "Awaiting payment" && needsFinalQuote(o) ? "Awaiting quotation" : o.status,
    paymentStatus: o.paymentStatus,
    total: o.total,
    quoteIssuedAt: o.quoteIssuedAt,
    hasArtwork: !!o.artwork,
    proof: o.proof && { id: o.proof.id, approvedAt: o.proof.approvedAt },
    deliveryFee: o.deliveryFee,
    deliveryPending: o.deliveryPending,
    deliveryPlace: o.deliveryMethod === "pickup" ? "Pickup" : o.deliveryArea ? `${o.deliveryArea}, Abuja` : o.deliveryState,
    holdUntil: holdExpired(o) ? undefined : o.holdUntil,
    items: o.items.map(i => ({ name: i.name, quantity: i.quantity })),
    updatedAt: o.updatedAt,
    history: o.history.filter(h => h.text.startsWith("Status") || h.text === "Payment confirmed")
      .map(h => ({ at: h.at, text: h.text })),
  };
}
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ brand: string }> },
) {
  try {
    const brand = parseBrand((await params).brand);
    const query = new URL(request.url).searchParams;
    if (query.get("revision") === "1")
      return NextResponse.json(
        { revision: await readRevision(brand) },
        { headers: { "Cache-Control": "no-store" } },
      );
    const b = await readBusiness(brand);
    const preview = query.get("preview") === "1";
    if (preview) await requireUser(brand);
    return NextResponse.json(
      buildPublicData(b, { preview, pageId: query.get("page") }),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ brand: string }> },
) {
  try {
    checkOrigin(request);
    const brand = parseBrand((await params).brand);
    const input = record(await body(request));
    if (input.type === "receipt") {
      limitRequest(request, "receipt", 60, 60_000);
      const key = required(input.key, "Receipt key", 64);
      const b = await readBusiness(brand);
      const order = b.orders.find(o => o.checkoutKeyHash === checkoutHash(key));
      return order
        ? NextResponse.json(orderStatus(order), { headers: { "Cache-Control": "no-store" } })
        : NextResponse.json({ error: "This receipt has not been saved." }, { status: 404 });
    }
    if (input.type === "track") {
      limitRequest(request, "track", 20, 5 * 60_000);
      const b = await readBusiness(brand),
        reference = required(input.reference, "Reference", 150).toLowerCase(),
        suppliedPhone = text(input.phone, 60),
        phone = normalPhone(suppliedPhone);
      const o = b.orders.find(
        (o) =>
          o.id.toLowerCase() === reference &&
          (!suppliedPhone || (!!phone && normalPhone(o.phone) === phone)),
      );
      if (o) {
        const status = orderStatus(o);
        return NextResponse.json(suppliedPhone ? status : {
          reference: status.reference,
          status: status.status,
          paymentStatus: status.paymentStatus,
          updatedAt: status.updatedAt,
        }, { headers: { "Cache-Control": "no-store" } });
      }
      const e = b.enquiries.find(
        (e) =>
          e.id.toLowerCase() === reference &&
          (!suppliedPhone || (!!phone && normalPhone(e.phone) === phone)),
      );
      return e
        ? NextResponse.json({
            reference: e.id,
            status: e.status,
            updatedAt: e.createdAt,
          }, { headers: { "Cache-Control": "no-store" } })
        : NextResponse.json(
            { error: suppliedPhone ? "That phone number does not match this reference." : "We could not find that reference. Check it and try again." },
            { status: 404 },
          );
    }
    if (input.type === "order" || input.type === "enquiry")
      limitRequest(request, "order", 30, 5 * 60_000);
    else if (input.type === "subscribe")
      limitRequest(request, "subscribe", 5, 10 * 60_000);
    else throw new Error("Unsupported request.");
    const token = input.type === "order" ? await customerToken(brand) : "";
    const result = await mutate(
      brand,
      "Website visitor",
      String(input.type),
      "website",
      (b, db) => {
        if (input.type === "order") {
          const account = signedInCustomer(db, brand, token);
          return orderStatus(createOrder(b, brand, input, "Website visitor", false, account?.id));
        }
        if (input.type === "enquiry") return createEnquiry(b, brand, input);
        if (input.type === "subscribe") {
          const email = required(input.email, "Email", 200).toLowerCase();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
            throw new Error("Enter a valid email address.");
          if (!b.subscribers.some((s) => s.email === email))
            b.subscribers.push({
              id: crypto.randomUUID(),
              email,
              createdAt: new Date().toISOString(),
            });
          return { ok: true };
        }
        throw new Error("Unsupported request.");
      },
    );
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return failure(e);
  }
}
