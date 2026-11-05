import { randomUUID } from "node:crypto";
import { checkOrigin, AuthError, sessionUser } from "../../../../lib/local/auth";
import { checkoutHash, normalPhone } from "../../../../lib/local/actions";
import { readBusiness, mutate, required } from "../../../../lib/local/store";
import { loadMedia, saveMedia, imageUpload } from "../../../../lib/local/media";
import { limitRequest } from "../../../../lib/local/rate-limit";
import { failure } from "../../../../lib/local/http";
import type { LocalOrder } from "../../../../lib/local/types";

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    limitRequest(request, "artwork", 30, 60_000);
    if (Number(request.headers.get("content-length")) > 6 * 1024 * 1024)
      throw new Error("Choose an image no larger than 5 MB.");
    const form = await request.formData();
    const reference = required(form.get("reference"), "Order reference", 150).toLowerCase();
    const phone = normalPhone(String(form.get("phone") ?? ""));
    const key = String(form.get("key") ?? "").slice(0, 64);
    const user = await sessionUser();
    const staff = !key && !phone && user?.brands.includes("kokies") ? user : null;
    function matches(o: LocalOrder) {
      return o.id.toLowerCase() === reference && (!!staff ||
        (!!key && o.checkoutKeyHash === checkoutHash(key)) ||
        (!!phone && normalPhone(o.phone) === phone));
    }
    const order = (await readBusiness("kokies")).orders.find(matches);
    if (!order) throw new AuthError("No matching order.", 404);
    const action = form.get("action");
    if (action === "view-proof" || action === "view-artwork") {
      const image = action === "view-proof" ? order.proof : order.artwork;
      if (action === "view-proof" && order.proof?.id !== form.get("proofId"))
        throw new Error("The proof has changed. Refresh to see the latest version.");
      if (!image) throw new AuthError("No image has been uploaded.", 404);
      return new Response(new Uint8Array(await loadMedia(image.file)), {
        headers: { "Content-Type": image.contentType, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
      });
    }
    const upload = action === "upload-proof" || action === "upload-artwork";
    if (!upload && action !== "approve-proof") throw new Error("Unknown artwork action.");
    if (action === "upload-proof" && !staff) throw new AuthError("Staff access is required.", 403);
    if (action === "approve-proof" && staff) throw new AuthError("The customer must approve the proof.", 403);
    const image = upload ? await imageUpload(form.get("file")) : undefined;
    await mutate("kokies", staff?.name ?? "Customer", String(action), order.id, async (business, db) => {
      if (staff && !db.users.some(u => u.id === staff.id && u.status !== "Suspended" &&
        (u.sessionVersion ?? 0) === (staff.sessionVersion ?? 0) && u.brands.includes("kokies")))
        throw new AuthError("Your access has changed.", 401);
      const current = business.orders.find(matches);
      if (!current || !["Awaiting quotation", "Awaiting payment", "Paid"].includes(current.status))
        throw new Error("Artwork can only change before production starts.");
      const now = new Date().toISOString();
      if (image) {
        const asset = { file: "private-" + randomUUID() + "." + image.extension, contentType: image.contentType };
        await saveMedia(asset.file, image.bytes, image.contentType);
        if (action === "upload-artwork") {
          current.artwork = asset;
          delete current.proof;
        } else {
          current.proof = { ...asset, id: randomUUID(), uploadedAt: now };
        }
      } else {
        if (!current.proof || current.proof.id !== form.get("proofId"))
          throw new Error("The proof has changed. Refresh and review the latest version.");
        current.proof.approvedAt ??= now;
      }
      current.updatedAt = now;
      current.history.push({ at: now, actor: staff?.name ?? "Customer", text:
        action === "approve-proof" ? "Proof approved" : action === "upload-proof" ? "Proof uploaded" : "Artwork uploaded" });
    });
    return Response.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
