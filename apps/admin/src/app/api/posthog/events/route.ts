/**
 * PostHog Events API Route
 *
 * Fetches event data from PostHog for error tracking and analytics.
 */

import { posthogApi } from "@/lib/posthog";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Check if PostHog is configured
    const config = posthogApi.getConfig();
    if (!config.configured) {
      return NextResponse.json(
        {
          error: "PostHog not configured",
          configured: false,
        },
        { status: 503 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const eventType = searchParams.get("event") || undefined;
    const dateFrom = searchParams.get("date_from") || undefined;
    const dateTo = searchParams.get("date_to") || undefined;
    const limit = Number.parseInt(searchParams.get("limit") || "100");

    // Fetch events from PostHog
    const events = await posthogApi.getEvents({
      event: eventType,
      date_from: dateFrom,
      date_to: dateTo,
      limit,
    });

    return NextResponse.json({
      events: events.results,
      hasMore: !!events.next,
      configured: true,
    });
  } catch (error) {
    console.error("PostHog events API error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch events",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
