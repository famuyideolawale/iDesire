import { NextResponse, type NextRequest } from "next/server";

// Tells the root layout which page is being rendered, so it can load the right
// storefront's data on the server instead of after the page appears.
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-pathname", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!api|_next|media|favicon|fonts|products|kokies/|campaigns|.*\\.[a-z0-9]+$).*)"],
};
