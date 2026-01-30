import { AuthGuard } from "@/components/auth/AuthGuard";

/**
 * Layout for all protected app routes.
 * Wraps children with AuthGuard which handles:
 * - Redirect to login if not authenticated
 * - Auto-create user in DB if authenticated but no user record
 * - Redirect to /setup-username if user has no username
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
