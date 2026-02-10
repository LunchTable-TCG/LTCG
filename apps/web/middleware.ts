import type { StreamType } from "@/lib/streaming/types";
import { get } from "@vercel/edge-config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

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
 * Verify JWT token for stream overlay access
 */
async function verifyOverlayToken(token: string) {
  const secret = process.env.STREAMING_JWT_SECRET?.trim();
  if (!secret) {
    console.error("STREAMING_JWT_SECRET not configured");
    return null;
  }

  try {
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, secretKey);

    return {
      sessionId: payload.sessionId as string,
      streamType: payload.streamType as StreamType,
      entityId: payload.entityId as string,
    };
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}

/**
 * Middleware for route protection and Edge Config features
 * - Checks maintenance mode from Edge Config
 * - Validates JWT tokens for stream overlay pages
 * - Checks for Privy auth token cookie and redirects to login if not present
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Validate JWT token for stream overlay pages
  if (pathname.startsWith("/stream/overlay")) {
    // Allow probe methods used by egress/browser health checks.
    // Enforcing redirect-based auth on HEAD/OPTIONS causes false offline flaps.
    if (request.method === "HEAD" || request.method === "OPTIONS") {
      return NextResponse.next();
    }

    const previewMode = request.nextUrl.searchParams.get("preview");
    const isOverlayPreview =
      previewMode === "live" || previewMode === "waiting" || previewMode === "error";
    const allowOverlayPreview =
      isOverlayPreview &&
      (process.env.NODE_ENV !== "production" || process.env.ALLOW_OVERLAY_PREVIEW === "1");

    // Allow deterministic visual QA preview mode in non-production contexts.
    if (allowOverlayPreview) {
      return NextResponse.next();
    }

    const token = request.nextUrl.searchParams.get("token");
    const sessionId = request.nextUrl.searchParams.get("sessionId");

    if (!token || !sessionId) {
      const unauthorizedUrl = new URL("/unauthorized", request.url);
      unauthorizedUrl.searchParams.set("reason", "missing_credentials");
      return NextResponse.redirect(unauthorizedUrl);
    }

    try {
      const verified = await verifyOverlayToken(token);

      // Diagnostic logging
      console.log("[Middleware] Token validation:", {
        hasToken: !!token,
        hasSessionId: !!sessionId,
        verified: !!verified,
        tokenSessionId: verified?.sessionId,
        urlSessionId: sessionId,
        match: verified?.sessionId === sessionId
      });

      if (!verified || verified.sessionId !== sessionId) {
        const unauthorizedUrl = new URL("/unauthorized", request.url);
        unauthorizedUrl.searchParams.set("reason", "invalid_token");
        return NextResponse.redirect(unauthorizedUrl);
      }
    } catch (error) {
      const unauthorizedUrl = new URL("/unauthorized", request.url);
      unauthorizedUrl.searchParams.set("reason", "verification_failed");
      return NextResponse.redirect(unauthorizedUrl);
    }
  }

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
