import { StreamConvexProvider } from "./providers";

/**
 * Route-group layout for streaming overlays.
 *
 * This does NOT render <html>/<body> — the root layout already does that.
 * We just override the Convex provider so overlay pages get a plain
 * ConvexProvider (no Privy auth) for unauthenticated spectator queries.
 */
export default function StreamLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <StreamConvexProvider>{children}</StreamConvexProvider>;
}
