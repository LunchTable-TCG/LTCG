import { NextResponse } from "next/server";
import { getAnnouncement } from "@/lib/edge-config";

/**
 * GET /api/announcement
 *
 * Returns the current system announcement from Edge Config.
 * Cached for 5 minutes to reduce Edge Config reads.
 */
export async function GET() {
  try {
    const announcement = await getAnnouncement();

    return NextResponse.json(
      { announcement },
      {
        headers: {
          // Cache for 5 minutes, allow stale while revalidating
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    console.error("Failed to fetch announcement:", error);
    return NextResponse.json({ announcement: null }, { status: 200 });
  }
}

/**
 * Revalidation configuration for ISR
 */
export const revalidate = 300;
