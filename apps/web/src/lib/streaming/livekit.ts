import { EgressClient, EncodingOptionsPreset, StreamProtocol } from "livekit-server-sdk";

const LIVEKIT_URL = process.env.LIVEKIT_URL!;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY!;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET!;

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
  return new EgressClient(getApiUrl(), LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
}

/**
 * Start a Web Egress session to capture a URL and stream to RTMP
 */
export async function startWebEgress(params: {
  overlayUrl: string;
  rtmpUrl: string;
  sessionId?: string;
}): Promise<{ egressId: string }> {
  const client = getEgressClient();

  const result = await client.startWebEgress({
    url: params.overlayUrl,
    streamOutputs: [
      {
        protocol: StreamProtocol.RTMP,
        urls: [params.rtmpUrl],
      },
    ],
    preset: EncodingOptionsPreset.H264_1080P_30,
  });

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

  await client.updateStream(egressId, {
    addOutputUrls: params.addUrls,
    removeOutputUrls: params.removeUrls,
  });
}

/**
 * Check if LiveKit is configured
 */
export function isLiveKitConfigured(): boolean {
  return Boolean(LIVEKIT_URL && LIVEKIT_API_KEY && LIVEKIT_API_SECRET);
}
