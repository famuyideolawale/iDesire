import { NextResponse } from "next/server";
import {
  checkOrigin,
  login,
  makeSession,
  sessionUser,
} from "../../../../lib/local/auth";
import { body, failure } from "../../../../lib/local/http";
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
