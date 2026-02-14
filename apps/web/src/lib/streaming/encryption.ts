import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { StreamingPlatform } from "./platforms";
import { requiresCustomRtmpUrl } from "./platforms";

const ALGORITHM = "aes-256-gcm";

/**
 * Encrypt a stream key for secure storage
 * Format: iv:authTag:encrypted (all hex encoded)
 */
export function encryptStreamKey(plainKey: string): string {
  const encryptionKey = process.env.STREAM_KEY_ENCRYPTION_KEY?.trim();
  if (!encryptionKey) {
    throw new Error("STREAM_KEY_ENCRYPTION_KEY not configured");
  }

  const key = Buffer.from(encryptionKey, "hex");
  if (key.length !== 32) {
    throw new Error("STREAM_KEY_ENCRYPTION_KEY must be 64 hex characters (32 bytes)");
  }
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainKey, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt a stream key from storage
 */
export function decryptStreamKey(encryptedKey: string): string {
  const encryptionKey = process.env.STREAM_KEY_ENCRYPTION_KEY?.trim();
  if (!encryptionKey) {
    throw new Error("STREAM_KEY_ENCRYPTION_KEY not configured");
  }

  const [ivHex, authTagHex, encrypted] = encryptedKey.split(":");
  if (!ivHex || !authTagHex || !encrypted) {
    throw new Error("Invalid encrypted key format");
  }

  const key = Buffer.from(encryptionKey, "hex");
  if (key.length !== 32) {
    throw new Error("STREAM_KEY_ENCRYPTION_KEY must be 64 hex characters (32 bytes)");
  }
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Build RTMP URL for a given platform and stream key
 */
export function buildRtmpUrl(
  platform: StreamingPlatform,
  streamKey: string,
  customRtmpUrl?: string
): string {
  const normalizedStreamKey = streamKey.trim();
  if (!normalizedStreamKey) {
    throw new Error("Stream key is required");
  }

  switch (platform) {
    case "twitch":
      return withStreamKey(
        normalizeOptionalOverride(customRtmpUrl, platform) ?? process.env.NEXT_PUBLIC_TWITCH_RTMP_URL ?? "rtmps://live.twitch.tv/app",
        normalizedStreamKey
      );
    case "youtube":
      return withStreamKey(
        normalizeOptionalOverride(customRtmpUrl, platform) ?? process.env.NEXT_PUBLIC_YOUTUBE_RTMP_URL ?? "rtmps://a.rtmp.youtube.com/live2",
        normalizedStreamKey
      );
    case "kick":
      return withStreamKey(
        normalizeOptionalOverride(customRtmpUrl, platform) ??
          process.env.NEXT_PUBLIC_KICK_RTMP_URL ?? "rtmps://fa723fc1b171.global-contribute.live-video.net:443/app",
        normalizedStreamKey
      );
    case "custom":
    case "retake":
    case "x":
    case "pumpfun":
      return withStreamKey(
        normalizeRequiredCustomRtmpBaseUrl(customRtmpUrl, platform),
        normalizedStreamKey
      );
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

function normalizeRequiredCustomRtmpBaseUrl(
  customRtmpUrl: string | undefined,
  platform: StreamingPlatform
): string {
  if (!requiresCustomRtmpUrl(platform)) {
    throw new Error(`RTMP URL is not expected for ${platform}`);
  }

  const trimmed = customRtmpUrl?.trim();
  if (!trimmed) {
    throw new Error(`RTMP URL required for ${platform} platform`);
  }

  return normalizeProvidedRtmpBaseUrl(trimmed, platform);
}

function normalizeOptionalOverride(
  customRtmpUrl: string | undefined,
  platform: StreamingPlatform
): string | undefined {
  const trimmed = customRtmpUrl?.trim();
  if (!trimmed) {
    return undefined;
  }
  return normalizeProvidedRtmpBaseUrl(trimmed, platform);
}

function normalizeProvidedRtmpBaseUrl(rtmpUrl: string, platform: StreamingPlatform): string {
  if (!/^rtmps?:\/\//i.test(rtmpUrl)) {
    throw new Error(`RTMP URL for ${platform} must start with rtmp:// or rtmps://`);
  }

  return rtmpUrl.replace(/\/+$/, "");
}

function withStreamKey(rtmpBaseUrl: string, streamKey: string): string {
  if (
    rtmpBaseUrl.endsWith(`/${streamKey}`) ||
    rtmpBaseUrl.includes(`/${streamKey}?`) ||
    rtmpBaseUrl.includes(`/${streamKey}#`)
  ) {
    return rtmpBaseUrl;
  }
  return `${rtmpBaseUrl}/${streamKey}`;
}
