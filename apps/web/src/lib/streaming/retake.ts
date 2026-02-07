/**
 * Retake.tv API Integration
 *
 * Handles registration, RTMP credentials, and stream lifecycle for retake.tv
 * Docs: https://retake.tv/skill.md
 */

const RETAKE_BASE_URL = 'https://chat.retake.tv';

export interface RetakeRegistration {
  agent_name: string;
  agent_description: string;
  image_url: string; // Must be 1:1 square ratio, jpg/png, publicly hosted
  wallet_address: string; // Base-compatible ETH address for LP fee collection
}

export interface RetakeCredentials {
  access_token: string;
  userDbId: string;
}

export interface RetakeRTMPConfig {
  url: string; // rtmps://global-live.mux.com:443/app
  key: string; // Stream key
}

export interface RetakeStreamStatus {
  is_live: boolean;
  viewer_count?: number;
  uptime?: number;
}

/**
 * Register a new agent on Retake.tv
 * Store the returned access_token and userDbId - they don't expire
 */
export async function registerRetakeAgent(
  registration: RetakeRegistration
): Promise<RetakeCredentials> {
  const response = await fetch(`${RETAKE_BASE_URL}/api/agent/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(registration),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Retake.tv registration failed: ${error}`);
  }

  const data = await response.json();

  if (!data.access_token || !data.userDbId) {
    throw new Error('Retake.tv registration incomplete: missing credentials');
  }

  return {
    access_token: data.access_token,
    userDbId: data.userDbId,
  };
}

/**
 * Get RTMP streaming credentials for an agent
 * Returns URL and stream key
 */
export async function getRetakeRTMPCredentials(
  accessToken: string
): Promise<RetakeRTMPConfig> {
  const response = await fetch(`${RETAKE_BASE_URL}/api/agent/rtmp`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Retake.tv RTMP credentials: ${error}`);
  }

  const data = await response.json();

  return {
    url: data.rtmp_url, // Already includes rtmps://
    key: data.stream_key,
  };
}

/**
 * Build complete RTMP URL for Retake.tv
 * Format: rtmps://global-live.mux.com:443/app/STREAM_KEY
 */
export function buildRetakeRTMPUrl(streamKey: string): string {
  return `rtmps://global-live.mux.com:443/app/${streamKey}`;
}

/**
 * Signal stream start to Retake.tv
 * MUST be called BEFORE pushing RTMP data
 * Creates Clanker token on first stream
 */
export async function startRetakeStream(accessToken: string): Promise<void> {
  const response = await fetch(`${RETAKE_BASE_URL}/api/agent/stream/start`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to start Retake.tv stream: ${error}`);
  }
}

/**
 * Signal stream stop to Retake.tv
 */
export async function stopRetakeStream(accessToken: string): Promise<void> {
  const response = await fetch(`${RETAKE_BASE_URL}/api/agent/stream/stop`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to stop Retake.tv stream: ${error}`);
  }
}

/**
 * Get current stream status
 * Use to verify stream is live after starting
 */
export async function getRetakeStreamStatus(
  accessToken: string
): Promise<RetakeStreamStatus> {
  const response = await fetch(`${RETAKE_BASE_URL}/api/agent/stream/status`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Retake.tv stream status: ${error}`);
  }

  return await response.json();
}

/**
 * Send a chat message as the agent
 */
export async function sendRetakeChat(
  accessToken: string,
  userDbId: string,
  message: string
): Promise<void> {
  const response = await fetch(`${RETAKE_BASE_URL}/api/agent/chat/send`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userDbId,
      message,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send Retake.tv chat: ${error}`);
  }
}

/**
 * Get chat comments for the stream
 */
export async function getRetakeComments(
  accessToken: string,
  userDbId: string
): Promise<any[]> {
  const response = await fetch(
    `${RETAKE_BASE_URL}/api/agent/stream/comments?userDbId=${userDbId}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Retake.tv comments: ${error}`);
  }

  return await response.json();
}
