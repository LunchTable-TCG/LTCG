import { AccessToken } from "livekit-server-sdk";

const LIVEKIT_URL = process.env.LIVEKIT_URL!;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY!;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET!;

/**
 * Generate a LiveKit access token for egress operations
 */
async function generateEgressToken(): Promise<string> {
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    ttl: "10m",
  });

  at.addGrant({
    roomRecord: true,
    canUpdateOwnMetadata: true,
  });

  return await at.toJwt();
}

/**
 * Get the LiveKit API base URL (convert wss:// to https://)
 */
function getApiUrl(): string {
  return LIVEKIT_URL.replace("wss://", "https://");
}

/**
 * Start a Web Egress session to capture a URL and stream to RTMP
 */
export async function startWebEgress(params: {
  overlayUrl: string;
  rtmpUrl: string;
  sessionId?: string;
}): Promise<{ egressId: string }> {
  const token = await generateEgressToken();

  const egressRequest = {
    url: params.overlayUrl,
    video_only: false,
    stream_outputs: [
      {
        protocol: 0, // RTMP
        urls: [params.rtmpUrl],
      },
    ],
    await_start_signal: true,
    video: {
      width: 1920,
      height: 1080,
      framerate: 30,
    },
  };

  const response = await fetch(`${getApiUrl()}/twirp/livekit.Egress/StartWebEgress`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(egressRequest),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LiveKit egress failed: ${error}`);
  }

  const result = await response.json();
  return { egressId: result.egress_id };
}

/**
 * Stop an active Web Egress session
 */
export async function stopWebEgress(egressId: string): Promise<void> {
  const token = await generateEgressToken();

  const response = await fetch(`${getApiUrl()}/twirp/livekit.Egress/StopEgress`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ egress_id: egressId }),
  });

  if (!response.ok) {
    const error = await response.text();
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
  const token = await generateEgressToken();

  const response = await fetch(`${getApiUrl()}/twirp/livekit.Egress/UpdateStream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      egress_id: params.egressId,
      add_output_urls: params.addUrls,
      remove_output_urls: params.removeUrls,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update stream: ${error}`);
  }
}

/**
 * Check if LiveKit is configured
 */
export function isLiveKitConfigured(): boolean {
  return Boolean(LIVEKIT_URL && LIVEKIT_API_KEY && LIVEKIT_API_SECRET);
}
