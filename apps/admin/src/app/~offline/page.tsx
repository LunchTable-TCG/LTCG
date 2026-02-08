"use client";

/**
 * Offline Fallback Page
 *
 * Displayed when the user is offline and the requested page
 * is not available in the service worker cache.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCwIcon, WifiOffIcon } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="pb-4">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <WifiOffIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">You&apos;re Offline</CardTitle>
          <CardDescription>
            It looks like you&apos;ve lost your internet connection.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Some features may be limited while you&apos;re offline. Previously visited pages may
            still be available from cache.
          </p>

          <div className="flex flex-col gap-3">
            <button type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <RefreshCwIcon className="h-4 w-4" />
              Try Again
            </button>

            <a
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              Go to Dashboard
            </a>
          </div>

          <div className="pt-4 text-xs text-muted-foreground">
            <p>Tips while offline:</p>
            <ul className="mt-2 list-disc list-inside text-left">
              <li>Check your Wi-Fi or mobile data connection</li>
              <li>Try moving to an area with better signal</li>
              <li>Previously cached pages should still work</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Metadata must be defined in a separate layout or page file for client components
// The title will be managed by the browser/PWA shell
