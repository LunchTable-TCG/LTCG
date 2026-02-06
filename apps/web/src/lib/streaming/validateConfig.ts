/**
 * Validates streaming configuration at app startup.
 * Only runs if NEXT_PUBLIC_STREAMING_ENABLED=true
 */
export function validateStreamingConfig() {
  // Skip validation if streaming is not enabled
  if (process.env.NEXT_PUBLIC_STREAMING_ENABLED !== 'true') {
    return;
  }

  const required = {
    STREAMING_JWT_SECRET: process.env.STREAMING_JWT_SECRET,
    STREAM_KEY_ENCRYPTION_KEY: process.env.STREAM_KEY_ENCRYPTION_KEY,
    LIVEKIT_URL: process.env.LIVEKIT_URL,
    LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET,
    LIVEKIT_WEBHOOK_SECRET: process.env.LIVEKIT_WEBHOOK_SECRET,
    INTERNAL_API_SECRET: process.env.INTERNAL_API_SECRET,
  };

  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Streaming is enabled but missing required environment variables:\n${missing.map((key) => `  - ${key}`).join('\n')}`
    );
  }

  // Validate encryption key format (must be 32 bytes = 64 hex characters)
  const encryptionKey = process.env.STREAM_KEY_ENCRYPTION_KEY;
  if (encryptionKey) {
    try {
      const buffer = Buffer.from(encryptionKey, 'hex');
      if (buffer.length !== 32) {
        throw new Error('Invalid length');
      }
    } catch {
      throw new Error(
        'STREAM_KEY_ENCRYPTION_KEY must be 32 bytes (64 hex characters). ' +
          'Generate with: openssl rand -hex 32'
      );
    }
  }
}
