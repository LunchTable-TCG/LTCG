/**
 * Feedback Media Upload API Route
 *
 * Handles Vercel Blob client uploads for feedback screenshots and recordings.
 * Uses handleUpload to generate secure upload tokens and process completion callbacks.
 */

import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

// Allowed content types for feedback uploads
const ALLOWED_CONTENT_TYPES = [
  // Images (screenshots)
  "image/jpeg",
  "image/png",
  "image/webp",
  // Videos (screen recordings)
  "video/webm",
  "video/mp4",
];

/**
 * POST /api/feedback/upload
 *
 * Handles two types of requests:
 * 1. Token generation for client uploads (type: "blob.generate-client-token")
 * 2. Upload completion callback (type: "blob.upload-completed")
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        // Parse client payload for feedback metadata
        let parsedPayload: { feedbackType?: string; mediaType?: string } = {};
        if (clientPayload) {
          try {
            parsedPayload = JSON.parse(clientPayload);
          } catch {
            // Invalid payload, continue with defaults
          }
        }

        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          addRandomSuffix: true, // Add random suffix to prevent naming conflicts
          maximumSizeInBytes: 50 * 1024 * 1024, // 50MB max for screen recordings
          tokenPayload: JSON.stringify({
            feedbackType: parsedPayload.feedbackType || "bug",
            mediaType: parsedPayload.mediaType || "screenshot",
            uploadedAt: Date.now(),
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // This callback is called by Vercel after upload completes
        // Note: This won't work on localhost - use ngrok for local testing
        console.log("Feedback media upload completed:", {
          url: blob.url,
          pathname: blob.pathname,
          contentType: blob.contentType,
          tokenPayload,
        });

        // The widget will receive the blob URL from the upload() call
        // and include it when calling the Convex feedback.submit mutation
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("Feedback upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 }
    );
  }
}
