import {
  EgressClient,
  EncodingOptionsPreset,
  StreamOutput,
  StreamProtocol,
} from "livekit-server-sdk";

// Strip any trailing newlines from environment variables (Vercel CLI bug adds \n)
const LIVEKIT_URL = process.env.LIVEKIT_URL?.trim() || "";
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY?.trim() || "";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET?.trim() || "";

/**
 * Get the LiveKit API base URL (convert wss:// to https://)
 */
function getApiUrl(): string {
  return LIVEKIT_URL.replace("wss://", "https://");
}

/**
 * Get or create EgressClient instance
 */
function getEgressClient(): EgressClient {
  const url = getApiUrl();
  console.log("[LiveKit] Creating EgressClient:", {
    url,
    hasApiKey: Boolean(LIVEKIT_API_KEY),
    hasApiSecret: Boolean(LIVEKIT_API_SECRET),
  });
  return new EgressClient(url, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
}

/**
 * Start a Web Egress session to capture a URL and stream to RTMP
 */
export async function startWebEgress(params: {
  overlayUrl: string;
  rtmpUrls: string[];
  sessionId?: string;
}): Promise<{ egressId: string }> {
  const client = getEgressClient();

  const result = await client.startWebEgress(
    params.overlayUrl,
    new StreamOutput({
      protocol: StreamProtocol.RTMP,
      urls: params.rtmpUrls,
    }),
    {
      encodingOptions: EncodingOptionsPreset.H264_1080P_60,
    }
  );

  return { egressId: result.egressId };
}

/**
 * Stop an active Web Egress session
 */
export async function stopWebEgress(egressId: string): Promise<void> {
  const client = getEgressClient();

  try {
    await client.stopEgress(egressId);
  } catch (error) {
    console.warn("Failed to stop egress (may already be stopped):", error);
  }
}

/**
 * Update RTMP stream destinations
 */
export async function updateStreamUrls(params: {
  egressId: string;
  addUrls?: string[];
  removeUrls?: string[];
}): Promise<void> {
  const client = getEgressClient();

  await client.updateStream(params.egressId, params.addUrls, params.removeUrls);
}

/**
 * Check if LiveKit is configured
 */
export function isLiveKitConfigured(): boolean {
  return Boolean(LIVEKIT_URL && LIVEKIT_API_KEY && LIVEKIT_API_SECRET);
}
