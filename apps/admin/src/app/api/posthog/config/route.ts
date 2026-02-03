/**
 * PostHog Config API Route
 *
 * Returns PostHog configuration status for the admin panel.
 */

import { posthogApi } from "@/lib/posthog";
import { NextResponse } from "next/server";

export async function GET() {
  const config = posthogApi.getConfig();

  return NextResponse.json({
    ...config,
    instructions: !config.configured
      ? [
          "To enable PostHog analytics in the admin panel:",
          "1. Go to PostHog dashboard → Project Settings → Personal API Keys",
          "2. Create a new Personal API Key with read access",
          "3. Add POSTHOG_PRIVATE_API_KEY to your environment variables",
          "4. Add POSTHOG_PROJECT_ID (from your project URL) to environment variables",
          "5. Restart the admin server",
        ]
      : undefined,
  });
}
