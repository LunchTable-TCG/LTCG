/**
 * PostHog Sessions API Route
 *
 * Fetches session recording data from PostHog for the admin panel.
 */

import { posthogApi } from "@/lib/posthog";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Check if PostHog is configured
    const config = posthogApi.getConfig();
    if (!config.configured) {
      return NextResponse.json(
        {
          error: "PostHog not configured",
          details: "Set POSTHOG_PRIVATE_API_KEY and POSTHOG_PROJECT_ID environment variables",
          configured: false,
        },
        { status: 503 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    const dateFrom = searchParams.get("date_from") || undefined;
    const dateTo = searchParams.get("date_to") || undefined;
    const hasErrors = searchParams.get("has_errors") === "true";
    const personUuid = searchParams.get("person_uuid") || undefined;

    // Fetch sessions from PostHog
    const sessions = await posthogApi.getSessions({
      limit,
      offset,
      date_from: dateFrom,
      date_to: dateTo,
      has_console_error: hasErrors,
      person_uuid: personUuid,
    });

    // Add replay URLs to each session
    const sessionsWithUrls = sessions.results.map((session) => ({
      ...session,
      replay_url: posthogApi.getSessionReplayUrl(session.id),
    }));

    return NextResponse.json({
      sessions: sessionsWithUrls,
      count: sessions.count,
      hasMore: !!sessions.next,
      configured: true,
    });
  } catch (error) {
    console.error("PostHog sessions API error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch sessions",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
