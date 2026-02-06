import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

/**
 * Encrypt a stream key for secure storage
 * Format: iv:authTag:encrypted (all hex encoded)
 */
export function encryptStreamKey(plainKey: string): string {
  const encryptionKey = process.env.STREAM_KEY_ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error("STREAM_KEY_ENCRYPTION_KEY not configured");
  }

  const key = Buffer.from(encryptionKey, "hex");
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
  const encryptionKey = process.env.STREAM_KEY_ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error("STREAM_KEY_ENCRYPTION_KEY not configured");
  }

  const [ivHex, authTagHex, encrypted] = encryptedKey.split(":");
  if (!ivHex || !authTagHex || !encrypted) {
    throw new Error("Invalid encrypted key format");
  }

  const key = Buffer.from(encryptionKey, "hex");
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
  platform: "twitch" | "youtube" | "custom" | "retake",
  streamKey: string,
  customRtmpUrl?: string
): string {
  switch (platform) {
    case "twitch":
      return `rtmp://live.twitch.tv/app/${streamKey}`;
    case "youtube":
      return `rtmp://a.rtmp.youtube.com/live2/${streamKey}`;
    case "retake":
      // Retake uses rtmps:// (secure RTMP) with Mux
      return `rtmps://global-live.mux.com:443/app/${streamKey}`;
    case "custom":
      if (!customRtmpUrl) {
        throw new Error("Custom RTMP URL required for custom platform");
      }
      return customRtmpUrl.includes(streamKey) ? customRtmpUrl : `${customRtmpUrl}/${streamKey}`;
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}
