/**
 * Admin Asset Upload API Route
 *
 * Handles Vercel Blob client uploads for admin users.
 * Uses handleUpload to generate secure upload tokens and process completion callbacks.
 */

import * as generatedApi from "@convex/_generated/api";
import { del, list } from "@vercel/blob";
import { type HandleUploadBody, handleUpload } from "@vercel/blob/client";
import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";

// biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
const apiAny = (generatedApi as any).api;

// CORS helper - dynamically set origin based on request
function getCorsHeaders(request?: Request) {
  const origin = request?.headers.get("origin") || "";
  const allowedOrigins = [
    "https://ltcg-admin.vercel.app",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    process.env["ADMIN_APP_URL"],
  ].filter(Boolean);

  // Check if origin is allowed
  const isAllowed = allowedOrigins.includes(origin);

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : allowedOrigins[0] || "",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

// Note: Use getCorsHeaders(request) in each handler for dynamic origin matching

function createConvexClient() {
  const convexUrl = process.env["NEXT_PUBLIC_CONVEX_URL"]?.trim();
  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
  }
  return new ConvexHttpClient(convexUrl);
}

function getBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}

async function requireAdminAuth(request: Request, headers: Record<string, string>) {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401, headers });
  }

  const convex = createConvexClient();
  convex.setAuth(token);

  const currentUser = await convex.query(apiAny.core.users.currentUser, {});
  if (!currentUser?._id) {
    return NextResponse.json({ error: "Invalid authentication token" }, { status: 401, headers });
  }

  const adminRole = await convex.query(apiAny.admin.admin.getMyAdminRole, {});
  if (!adminRole) {
    return NextResponse.json({ error: "Admin role required" }, { status: 403, headers });
  }

  return null;
}

/**
 * OPTIONS /api/admin/upload
 *
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: Request): Promise<NextResponse> {
  return NextResponse.json({}, { headers: getCorsHeaders(request) });
}

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
  const headers = getCorsHeaders(request);
  const body = (await request.json()) as HandleUploadBody;

  try {
    const requiresUserAuth = body.type === "blob.generate-client-token";
    if (requiresUserAuth) {
      const authError = await requireAdminAuth(request, headers);
      if (authError) {
        return authError;
      }
    }

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

    return NextResponse.json(jsonResponse, { headers });
  } catch (error) {
    console.error("Admin upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 400, headers }
    );
  }
}

/**
 * DELETE /api/admin/upload
 *
 * Deletes a file from Vercel Blob storage.
 * Called before removing metadata from Convex.
 */
/**
 * GET /api/admin/upload
 *
 * Lists all files in Vercel Blob storage.
 * Used for syncing blob assets to Convex metadata.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const headers = getCorsHeaders(request);
  try {
    const authError = await requireAdminAuth(request, headers);
    if (authError) {
      return authError;
    }

    const allBlobs: Array<{
      url: string;
      pathname: string;
      size: number;
      uploadedAt: string;
    }> = [];

    let cursor: string | undefined;

    // Paginate through all blobs
    do {
      const result = await list({ cursor, limit: 1000 });
      allBlobs.push(
        ...result.blobs.map((blob) => ({
          url: blob.url,
          pathname: blob.pathname,
          size: blob.size,
          uploadedAt: blob.uploadedAt.toISOString(),
        }))
      );
      cursor = result.hasMore ? result.cursor : undefined;
    } while (cursor);

    return NextResponse.json(
      {
        blobs: allBlobs,
        count: allBlobs.length,
      },
      { headers }
    );
  } catch (error) {
    console.error("List blobs error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list blobs" },
      { status: 500, headers }
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
  const headers = getCorsHeaders(request);
  try {
    const authError = await requireAdminAuth(request, headers);
    if (authError) {
      return authError;
    }

    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Missing or invalid blob URL" }, { status: 400, headers });
    }

    // Validate the URL is from our blob storage
    const blobBaseUrl = process.env["NEXT_PUBLIC_BLOB_BASE_URL"];
    if (blobBaseUrl && !url.startsWith(blobBaseUrl)) {
      return NextResponse.json({ error: "Invalid blob URL" }, { status: 400, headers });
    }

    await del(url);

    return NextResponse.json({ success: true }, { headers });
  } catch (error) {
    console.error("Admin delete error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 500, headers }
    );
  }
}
