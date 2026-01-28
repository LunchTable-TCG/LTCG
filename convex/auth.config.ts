/**
 * Convex Auth Configuration
 *
 * SECURITY: Configure authentication providers and session settings
 */
export default {
  providers: [
    {
      domain: process.env["CONVEX_SITE_URL"],
      applicationID: "convex",
    },
  ],
  // SECURITY: Session configuration (managed by @convex-dev/auth)
  // Sessions are handled server-side with secure httpOnly cookies
  // CSRF protection is built-in
};
