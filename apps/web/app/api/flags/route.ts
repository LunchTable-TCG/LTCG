import { NextResponse } from "next/server";
import { getFlags } from "@/lib/flags";

/**
 * GET /api/flags
 *
 * Returns current feature flags for client-side consumption.
 * Cached for 60 seconds to reduce Edge Config reads.
 */
export async function GET() {
  try {
    const flags = await getFlags();

    return NextResponse.json(flags, {
      headers: {
        // Cache for 60 seconds, allow stale while revalidating
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("Failed to fetch feature flags:", error);
    return NextResponse.json(
      { error: "Failed to fetch feature flags" },
      { status: 500 }
    );
  }
}

/**
 * Revalidation configuration for ISR
 */
export const revalidate = 60;
