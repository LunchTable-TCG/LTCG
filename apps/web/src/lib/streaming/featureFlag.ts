/**
 * Feature flag for streaming
 * Enabled by default for all agents
 */

export const STREAMING_ENABLED = true;

export function isStreamingAvailable(): boolean {
  // Check if LiveKit is configured
  const hasLiveKit = Boolean(
    process.env.LIVEKIT_URL && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET
  );

  // Check if encryption is configured
  const hasEncryption = Boolean(process.env.STREAM_KEY_ENCRYPTION_KEY);

  // Check if JWT secret is configured
  const hasJWT = Boolean(process.env.STREAMING_JWT_SECRET);

  return STREAMING_ENABLED && hasLiveKit && hasEncryption && hasJWT;
}
