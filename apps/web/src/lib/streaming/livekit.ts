import {
  EgressClient,
  EgressStatus,
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
 * Check whether a specific egress is currently active.
 */
export async function isWebEgressActive(egressId: string): Promise<boolean> {
  const client = getEgressClient();
  const [egress] = await client.listEgress({ egressId });
  if (!egress) {
    return false;
  }

  return egress.status === EgressStatus.EGRESS_ACTIVE || egress.status === EgressStatus.EGRESS_STARTING;
}

/**
 * Stop active web-overlay egresses that no longer map to active Convex sessions.
 * This prevents duplicate/orphaned streams from fighting each other.
 */
export async function stopOrphanedOverlayEgresses(activeEgressIds: string[]): Promise<string[]> {
  const client = getEgressClient();
  const activeSet = new Set(activeEgressIds.filter((id) => typeof id === "string" && id.length > 0));
  const egresses = await client.listEgress({ active: true });
  const stopped: string[] = [];

  for (const egress of egresses) {
    const isActive =
      egress.status === EgressStatus.EGRESS_ACTIVE ||
      egress.status === EgressStatus.EGRESS_STARTING;
    if (!isActive) {
      continue;
    }

    const isOverlayWebEgress =
      egress.request.case === "web" &&
      typeof egress.request.value.url === "string" &&
      egress.request.value.url.includes("/stream/overlay");

    if (!isOverlayWebEgress) {
      continue;
    }

    if (activeSet.has(egress.egressId)) {
      continue;
    }

    try {
      await client.stopEgress(egress.egressId);
      stopped.push(egress.egressId);
    } catch (error) {
      console.warn("Failed to stop orphaned overlay egress:", {
        egressId: egress.egressId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return stopped;
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
