import { NextResponse } from "next/server";
import {
  checkOrigin,
  login,
  makeSession,
  sessionUser,
} from "../../../../lib/local/auth";
import { body, failure } from "../../../../lib/local/http";
import { mutate } from "../../../../lib/local/store";
import { limitRequest } from "../../../../lib/local/rate-limit";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json(
    { user: await sessionUser() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    limitRequest(request, "signin", 15, 5 * 60_000);
    const input = await body(request);
    const user = await login(
      String(input.username || input.email || ""),
      String(input.password || ""),
    );
    if (!user)
      return NextResponse.json(
        { error: "Username or password is incorrect." },
        { status: 401 },
      );
    const response = NextResponse.json({ user });
    response.cookies.set("dual-admin-session", await makeSession(user), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.RENDER === "true" || new URL(request.url).protocol === "https:",
      path: "/",
      maxAge: 8 * 3600,
    });
    return response;
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(request: Request) {
  try {
    checkOrigin(request);
    // Revoke the signed token server-side, so a copied cookie stops working too.
    const user = await sessionUser();
    if (user)
      await mutate(user.brands[0], user.name, "Signed out", user.id, (_b, db) => {
        const account = db.users.find((u) => u.id === user.id);
        if (account) account.sessionVersion = (account.sessionVersion ?? 0) + 1;
      });
    const response = NextResponse.json({ ok: true });
    response.cookies.set("dual-admin-session", "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (e) {
    return failure(e);
  }
}
