import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/lunchtable(.*)",
  "/binder(.*)",
  "/leaderboards(.*)",
  "/match-history(.*)",
  "/play(.*)",
  "/quests(.*)",
  "/settings(.*)",
  "/shop(.*)",
  "/social(.*)",
  "/profile(.*)",
]);

export default convexAuthNextjsMiddleware(
  async (request, { convexAuth }) => {
    // Only check auth for protected routes, not sign-in pages
    if (isProtectedRoute(request)) {
      const authenticated = await convexAuth.isAuthenticated();
      if (!authenticated) {
        return nextjsMiddlewareRedirect(request, "/login");
      }
    }
    return undefined;
  },
  {
    verbose: true, // Enable detailed logging to debug auth issues
    convexUrl: process.env["NEXT_PUBLIC_CONVEX_URL"], // Explicitly set Convex URL
  }
);

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
