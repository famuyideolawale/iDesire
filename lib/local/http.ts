import { NextResponse } from "next/server";
import { AuthError } from "./auth";
export function failure(error: unknown) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "The request failed." },
    { status: error instanceof AuthError ? error.status : 400 },
  );
}
export async function body(request: Request) {
  const size = Number(request.headers.get("content-length") || 0);
  if (size > 2000000) throw new Error("Request is too large.");
  return await request.json();
}
