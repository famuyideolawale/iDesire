import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes, createHash, randomUUID } from "node:crypto";
import {
  readVisitorChat,
  parseBrand,
  mutate,
  record,
  required,
  text,
} from "../../../../../lib/local/store";
import { checkOrigin } from "../../../../../lib/local/auth";
import { body, failure } from "../../../../../lib/local/http";
import { limitRequest } from "../../../../../lib/local/rate-limit";

const MAX_MESSAGES = 300;
const MAX_CONVERSATIONS = 2000;
const MAX_NEW_PER_DAY = 200;
export const dynamic = "force-dynamic";
const hash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
async function identity(brand: string) {
  return (
    (await cookies()).get("visitor-" + brand)?.value ||
    randomBytes(32).toString("hex")
  );
}
function response(value: unknown, brand: string, token: string) {
  const r = NextResponse.json(value, {
    headers: { "Cache-Control": "no-store" },
  });
  r.cookies.set("visitor-" + brand, token, {
    httpOnly: true,
    secure: process.env.RENDER === "true",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 86400,
  });
  return r;
}
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ brand: string }> },
) {
  try {
    const brand = parseBrand((await params).brand),
      token = (await cookies()).get("visitor-" + brand)?.value;
    return NextResponse.json(
      await readVisitorChat(brand, token ? hash(token) : undefined),
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
    limitRequest(request, "chat", 20, 5 * 60_000);
    const brand = parseBrand((await params).brand),
      token = await identity(brand),
      input = record(await body(request));
    const message = required(input.text, "Message", 2000);
    const c = await mutate(
      brand,
      "Website visitor",
      "Sent chat message",
      "chat",
      (b) => {
        let c = b.conversations.find((c) => c.visitorHash === hash(token));
        if (!c) {
          const dayAgo = Date.now() - 86_400_000;
          if (b.conversations.filter((x) => Date.parse(x.createdAt) > dayAgo).length >= MAX_NEW_PER_DAY)
            throw new Error("Chat is busy right now. Please message us on WhatsApp.");
          c = {
            id: "CHAT-" + randomUUID(),
            visitorHash: hash(token),
            name: text(input.name, 180) || "Website visitor",
            email: text(input.email, 200),
            status: "Waiting",
            assignedTo: "",
            tags: [],
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            unread: 0,
          };
          b.conversations.unshift(c);
          if (b.conversations.length > MAX_CONVERSATIONS) {
            // Drop the oldest resolved conversations first.
            const resolved = b.conversations.filter((x) => x.status === "Resolved");
            const drop = new Set(resolved.slice(-(b.conversations.length - MAX_CONVERSATIONS)).map((x) => x.id));
            b.conversations = b.conversations.filter((x) => !drop.has(x.id));
          }
        }
        if (c.messages.length >= MAX_MESSAGES)
          throw new Error("This conversation is full. Please start again on WhatsApp.");
        if (text(input.name)) c.name = text(input.name, 180);
        c.messages.push({
          id: randomUUID(),
          from: "visitor",
          text: message,
          at: new Date().toISOString(),
        });
        c.updatedAt = new Date().toISOString();
        c.status = c.status === "Resolved" ? "Waiting" : c.status;
        c.unread++;
        return {
          id: c.id,
          name: c.name,
          status: c.status,
          messages: c.messages,
        };
      },
    );
    return response({ conversation: c }, brand, token);
  } catch (e) {
    return failure(e);
  }
}
