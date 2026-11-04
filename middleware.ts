import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets, public files, service worker, and API routes bypass page redirects
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/icons") ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js" ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check authentication cookie presence
  const token = request.cookies.get("auth_token")?.value;
  const isAuthenticated = Boolean(token && (await verifyToken(token)));
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup");

  // 1. If not authenticated and trying to access a protected app page -> Redirect to /login
  if (!isAuthenticated && !isAuthPage) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    const response = NextResponse.redirect(loginUrl);
    if (token) response.cookies.delete("auth_token");
    return response;
  }

  // 2. If already authenticated and trying to visit /login or /signup -> Redirect to dashboard /
  if (isAuthenticated && isAuthPage) {
    const homeUrl = new URL("/", request.url);
    return NextResponse.redirect(homeUrl);
  }

  const response = NextResponse.next();
  if (token && !isAuthenticated) response.cookies.delete("auth_token");
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
