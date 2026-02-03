/**
 * PostHog Errors API Route
 *
 * Fetches error data grouped by page for the error heatmap.
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
    const dateFrom =
      searchParams.get("date_from") || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch error events
    const events = await posthogApi.getEvents({
      event: "error_occurred",
      date_from: dateFrom,
      limit: 1000,
    });

    // Group errors by page
    const errorsByPage: Record<
      string,
      {
        count: number;
        errors: Array<{
          message: string;
          code?: string;
          timestamp: string;
          errorType: string;
        }>;
      }
    > = {};

    // Also track error types
    const errorsByType: Record<string, number> = {};

    // Track errors over time (daily)
    const errorsByDay: Record<string, number> = {};

    for (const event of events.results) {
      // Group by page
      const url = (event.properties["$current_url"] as string) || "unknown";
      let pathname: string;
      try {
        pathname = new URL(url, "http://localhost").pathname;
      } catch {
        pathname = url;
      }

      if (!errorsByPage[pathname]) {
        errorsByPage[pathname] = { count: 0, errors: [] };
      }
      const pageEntry = errorsByPage[pathname];
      if (pageEntry) {
        pageEntry.count++;

        // Keep last 5 errors per page for details
        if (pageEntry.errors.length < 5) {
          pageEntry.errors.push({
            message: (event.properties["error_message"] as string) || "Unknown error",
            code: event.properties["error_code"] as string | undefined,
            timestamp: event.timestamp,
            errorType: (event.properties["error_type"] as string) || "unknown",
          });
        }
      }

      // Group by error type
      const errorType = (event.properties["error_type"] as string) || "unknown";
      errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;

      // Group by day
      const day = event.timestamp.split("T")[0] || "unknown";
      errorsByDay[day] = (errorsByDay[day] || 0) + 1;
    }

    // Convert to sorted arrays
    const pageErrors = Object.entries(errorsByPage)
      .map(([page, data]) => ({ page, ...data }))
      .sort((a, b) => b.count - a.count);

    const typeErrors = Object.entries(errorsByType)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    const dailyErrors = Object.entries(errorsByDay)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      summary: {
        totalErrors: events.results.length,
        uniquePages: Object.keys(errorsByPage).length,
        period: `Last 7 days`,
      },
      byPage: pageErrors,
      byType: typeErrors,
      byDay: dailyErrors,
      configured: true,
    });
  } catch (error) {
    console.error("PostHog errors API error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch error data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
