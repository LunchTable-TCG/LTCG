import { AccessToken } from "livekit-server-sdk";

/**
 * Generate a LiveKit access token for a user to join a room
 */
export async function generateRoomToken(params: {
  roomName: string;
  participantIdentity: string;
  participantName?: string;
  metadata?: string;
}): Promise<string> {
  const apiKey = process.env.LIVEKIT_API_KEY?.trim();
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();

  if (!apiKey || !apiSecret) {
    throw new Error("LiveKit credentials not configured");
  }

  const token = new AccessToken(apiKey, apiSecret, {
    identity: params.participantIdentity,
    name: params.participantName,
    metadata: params.metadata,
  });

  token.addGrant({
    roomJoin: true,
    room: params.roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return await token.toJwt();
}

/**
 * Get LiveKit server URL
 */
export function getLiveKitUrl(): string {
  const url = process.env.LIVEKIT_URL?.trim();
  if (!url) {
    throw new Error("LIVEKIT_URL not configured");
  }
  return url;
}

/**
 * Generate unique room name for streaming session
 */
export function generateRoomName(sessionId: string): string {
  return `stream-${sessionId}`;
}
