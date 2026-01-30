import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Protected routes that require authentication
 */
const protectedRoutes = [
  "/lunchtable",
  "/binder",
  "/leaderboards",
  "/match-history",
  "/play",
  "/quests",
  "/settings",
  "/shop",
  "/social",
  "/profile",
];

/**
 * Middleware for route protection
 * Checks for Privy auth token cookie and redirects to login if not present
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the current path is a protected route
  const isProtected = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isProtected) {
    // Privy stores auth state in cookies - check for privy-token
    const privyToken = request.cookies.get("privy-token");

    if (!privyToken) {
      // Redirect to login if not authenticated
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
