import { v } from "convex/values";
import * as generatedApi from "../../_generated/api";
import { action } from "../../_generated/server";
// biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
const internalAny = (generatedApi as any).internal;
import { SignJWT } from "jose";

type VideoGrant = {
  roomJoin: boolean;
  room: string;
  canPublish?: boolean;
  canSubscribe?: boolean;
  canPublishData?: boolean;
  roomAdmin?: boolean;
};

/**
 * Mint a LiveKit access token for a participant
 * This is server-side only - NEVER expose API secrets to clients
 *
 * Uses jose library directly instead of livekit-server-sdk to avoid Node.js dependencies
 */
export const mintAccessToken = action({
  args: {
    roomName: v.string(),
    identity: v.string(),
    name: v.optional(v.string()),
    ttlSeconds: v.optional(v.number()),
    grants: v.optional(
      v.object({
        canPublish: v.optional(v.boolean()),
        canSubscribe: v.optional(v.boolean()),
        canPublishData: v.optional(v.boolean()),
        canPublishAudio: v.optional(v.boolean()),
        canPublishVideo: v.optional(v.boolean()),
        canUpdateOwnMetadata: v.optional(v.boolean()),
        roomAdmin: v.optional(v.boolean()),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Get LiveKit credentials from environment
    const apiKey = process.env["LIVEKIT_API_KEY"]?.trim();
    const apiSecret = process.env["LIVEKIT_API_SECRET"]?.trim();
    const livekitUrl = process.env["LIVEKIT_URL"]?.trim();

    if (!apiKey || !apiSecret || !livekitUrl) {
      throw new Error(
        "LiveKit credentials not configured (LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL)"
      );
    }

    // Default grants
    const grants = args.grants || {
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canPublishAudio: true,
      canPublishVideo: true,
      canUpdateOwnMetadata: false,
      roomAdmin: false,
    };

    // Default TTL: 1 hour
    const ttl = args.ttlSeconds || 3600;
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + ttl;

    // Build LiveKit video grant (matches LiveKit's AccessToken format)
    const videoGrant: VideoGrant = {
      roomJoin: true,
      room: args.roomName,
    };

    if (grants.canPublish !== undefined) videoGrant.canPublish = grants.canPublish;
    if (grants.canSubscribe !== undefined) videoGrant.canSubscribe = grants.canSubscribe;
    if (grants.canPublishData !== undefined) videoGrant.canPublishData = grants.canPublishData;
    if (grants.roomAdmin !== undefined) videoGrant.roomAdmin = grants.roomAdmin;

    // Sign JWT token using jose
    const secretKey = new TextEncoder().encode(apiSecret);
    const jwt = await new SignJWT({
      video: videoGrant,
      name: args.name,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setSubject(args.identity)
      .setIssuer(apiKey)
      .setAudience(apiKey)
      .setIssuedAt(now)
      .setExpirationTime(expiresAt)
      .sign(secretKey);

    // Audit: record token issuance
    await ctx.runMutation(internalAny.livekit.internal.mutations.recordTokenGrant, {
      roomName: args.roomName,
      identity: args.identity,
      grants,
      issuedAt: Date.now(),
      expiresAt: expiresAt * 1000,
    });

    return {
      token: jwt,
      livekitUrl,
      expiresAt: expiresAt * 1000,
    };
  },
});
