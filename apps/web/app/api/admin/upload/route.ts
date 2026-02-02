/**
 * Admin Asset Upload API Route
 *
 * Handles Vercel Blob client uploads for admin users.
 * Uses handleUpload to generate secure upload tokens and process completion callbacks.
 */

import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { del } from "@vercel/blob";
import { NextResponse } from "next/server";

// Allowed content types for admin uploads
const ALLOWED_CONTENT_TYPES = [
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  // Videos
  "video/mp4",
  "video/webm",
  // Audio
  "audio/mpeg",
  "audio/wav",
  // Documents (for flexibility)
  "application/pdf",
];

/**
 * POST /api/admin/upload
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
        // Parse client payload for admin validation
        // In production, you'd validate the admin JWT here
        // For now, we trust the payload since the admin app controls the request
        let parsedPayload: { category?: string; description?: string } = {};
        if (clientPayload) {
          try {
            parsedPayload = JSON.parse(clientPayload);
          } catch {
            // Invalid payload, continue with defaults
          }
        }

        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          addRandomSuffix: false, // Keep original filenames for asset management
          maximumSizeInBytes: 50 * 1024 * 1024, // 50MB max
          tokenPayload: JSON.stringify({
            category: parsedPayload.category || "other",
            description: parsedPayload.description || "",
            uploadedAt: Date.now(),
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // This callback is called by Vercel after upload completes
        // Note: This won't work on localhost - use ngrok for local testing
        console.log("Admin blob upload completed:", {
          url: blob.url,
          pathname: blob.pathname,
          contentType: blob.contentType,
          tokenPayload,
        });

        // The admin UI will call the Convex mutation to save metadata
        // after receiving the blob result from the upload() call
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("Admin upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/admin/upload
 *
 * Deletes a file from Vercel Blob storage.
 * Called before removing metadata from Convex.
 */
export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid blob URL" },
        { status: 400 }
      );
    }

    // Validate the URL is from our blob storage
    const blobBaseUrl = process.env["NEXT_PUBLIC_BLOB_BASE_URL"];
    if (blobBaseUrl && !url.startsWith(blobBaseUrl)) {
      return NextResponse.json(
        { error: "Invalid blob URL" },
        { status: 400 }
      );
    }

    await del(url);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin delete error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 500 }
    );
  }
}
