import { SignJWT, jwtVerify } from "jose";

/**
 * Generate a JWT token for overlay page access
 * This prevents unauthorized access to stream overlay pages
 */
export async function generateOverlayToken(
  sessionId: string,
  streamType: "user" | "agent",
  entityId: string
): Promise<string> {
  const secret = process.env.STREAMING_JWT_SECRET?.trim();
  if (!secret) {
    throw new Error("STREAMING_JWT_SECRET not configured");
  }

  const secretKey = new TextEncoder().encode(secret);

  return await new SignJWT({
    sessionId,
    streamType,
    entityId,
    type: "overlay_access",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .setIssuedAt()
    .sign(secretKey);
}

/**
 * Verify and decode an overlay access token
 */
export async function verifyOverlayToken(token: string): Promise<{
  sessionId: string;
  streamType: "user" | "agent";
  entityId: string;
} | null> {
  const secret = process.env.STREAMING_JWT_SECRET?.trim();
  if (!secret) {
    console.error("STREAMING_JWT_SECRET not configured");
    return null;
  }

  try {
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, secretKey);

    return {
      sessionId: payload.sessionId as string,
      streamType: payload.streamType as "user" | "agent",
      entityId: payload.entityId as string,
    };
  } catch (error) {
    console.error("Token verification failed:", error);
    console.error("Secret length:", secret?.length);
    console.error("Has trailing newline:", secret?.endsWith('\\n'));
    return null;
  }
}

/**
 * Generate an API token for streaming operations
 * Used for server-to-server communication
 */
export async function generateStreamingApiToken(
  userId: string,
  permissions: string[] = ["read", "write"]
): Promise<string> {
  const secret = process.env.STREAMING_JWT_SECRET?.trim();
  if (!secret) {
    throw new Error("STREAMING_JWT_SECRET not configured");
  }

  const secretKey = new TextEncoder().encode(secret);

  return await new SignJWT({
    userId,
    permissions,
    type: "streaming_api",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .setIssuedAt()
    .sign(secretKey);
}
