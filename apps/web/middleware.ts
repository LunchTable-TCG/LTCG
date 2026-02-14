import { get } from "@vercel/edge-config";
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
 * Routes that should bypass maintenance mode
 */
const maintenanceBypassRoutes = ["/maintenance", "/api", "/_next", "/favicon.ico"];

/**
 * Feature flags from Edge Config
 * Note: This is intentionally duplicated from @/lib/edge-config because
 * Edge middleware runs in a separate runtime and can't import from lib/.
 * Keep in sync with the FeatureFlags interface in edge-config.ts.
 */
interface FeatureFlags {
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
}

/**
 * Middleware for route protection and Edge Config features
 * - Checks maintenance mode from Edge Config
 * - Checks for Privy auth token cookie and redirects to login if not present
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip Edge Config checks for static assets and API routes
  const shouldCheckEdgeConfig = !pathname.startsWith("/_next") && !pathname.includes(".");

  if (shouldCheckEdgeConfig) {
    try {
      // Check maintenance mode from Edge Config (ultra-fast at edge)
      const featureFlags = await get<FeatureFlags>("featureFlags");

      if (featureFlags?.maintenanceMode) {
        // Allow bypass routes during maintenance
        const isBypassRoute = maintenanceBypassRoutes.some(
          (route) => pathname === route || pathname.startsWith(route)
        );

        if (!isBypassRoute) {
          // Redirect to maintenance page
          const maintenanceUrl = new URL("/maintenance", request.url);
          return NextResponse.redirect(maintenanceUrl);
        }
      }
    } catch {
      // Edge Config not available - continue without it
    }
  }

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
