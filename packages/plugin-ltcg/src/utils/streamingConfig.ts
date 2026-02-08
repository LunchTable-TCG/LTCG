/**
 * Streaming credential resolution helper.
 *
 * Checks backend (UI-configured) settings first, then falls back to
 * character/env settings. This ensures developers who configure streaming
 * via the web UI don't need to duplicate settings in their character file.
 */

import type { IAgentRuntime } from "@elizaos/core";
import type { LTCGApiClient } from "../client/LTCGApiClient";
import { logger } from "./logger";

export interface ResolvedStreamingConfig {
  source: "backend" | "env";
  platform: string;
  hasStreamKey: boolean;
  rtmpUrl: string | null;
  /** Only present when source is "env" — the plaintext key for the start request */
  streamKey?: string;
  /** Only present when source is "env" — custom RTMP URL override */
  customRtmpUrl?: string;
}

interface BackendConfig {
  enabled: boolean;
  platform: string | null;
  hasStreamKey: boolean;
  rtmpUrl: string | null;
  autoStart: boolean;
  keepAlive: boolean;
  voiceTrackUrl: string | null;
  voiceVolume: number | null;
  voiceLoop: boolean;
  visualMode: "webcam" | "profile-picture";
  profilePictureUrl: string | null;
}

/**
 * Platform-specific env var mappings.
 * Each platform has its own stream key + optional RTMP URL env vars.
 */
const PLATFORM_ENV_KEYS: Record<string, { keyVars: string[]; rtmpVars: string[] }> = {
  retake: {
    keyVars: ["RETAKE_ACCESS_TOKEN", "DIZZY_RETAKE_ACCESS_TOKEN"],
    rtmpVars: [],
  },
  pumpfun: {
    keyVars: ["PUMPFUN_STREAM_KEY"],
    rtmpVars: ["PUMPFUN_RTMP_URL"],
  },
  x: {
    keyVars: ["X_STREAM_KEY"],
    rtmpVars: ["X_RTMP_URL"],
  },
  twitch: {
    keyVars: ["TWITCH_STREAM_KEY"],
    rtmpVars: ["TWITCH_RTMP_URL"],
  },
  kick: {
    keyVars: ["KICK_STREAM_KEY"],
    rtmpVars: ["KICK_RTMP_URL"],
  },
  youtube: {
    keyVars: ["YOUTUBE_STREAM_KEY"],
    rtmpVars: ["YOUTUBE_RTMP_URL"],
  },
};

/** Extract a string setting from the runtime (getSetting returns string | boolean | number | null). */
function getStringSetting(runtime: IAgentRuntime, key: string): string | undefined {
  const v = runtime.getSetting(key);
  return typeof v === "string" ? v : undefined;
}

/**
 * Resolve streaming credentials for a given platform.
 *
 * 1. Tries the backend (UI-configured settings saved to agents table)
 * 2. Falls back to character secrets / env vars
 * 3. Returns null if no credentials found anywhere
 */
export async function resolveStreamingCredentials(
  runtime: IAgentRuntime,
  apiClient: LTCGApiClient | null,
  platform: string,
): Promise<ResolvedStreamingConfig | null> {
  const agentId = getStringSetting(runtime, "LTCG_AGENT_ID") || process.env.LTCG_AGENT_ID;

  // 1. Try backend config
  if (apiClient && agentId) {
    try {
      const config = await apiClient.getStreamingConfig(agentId) as BackendConfig;
      if (
        config?.enabled &&
        config.hasStreamKey &&
        config.platform === platform
      ) {
        logger.info(`Using backend-stored streaming config for ${platform}`);
        return {
          source: "backend",
          platform,
          hasStreamKey: true,
          rtmpUrl: config.rtmpUrl,
        };
      }
    } catch (error) {
      logger.debug("Backend streaming config not available, falling back to env", error);
    }
  }

  // 2. Fall back to character/env settings
  const envMapping = PLATFORM_ENV_KEYS[platform];
  if (!envMapping) {
    return null;
  }

  let streamKey: string | undefined;
  for (const keyVar of envMapping.keyVars) {
    streamKey = getStringSetting(runtime, keyVar) || process.env[keyVar];
    if (streamKey) break;
  }

  if (!streamKey) {
    return null;
  }

  let customRtmpUrl: string | undefined;
  for (const rtmpVar of envMapping.rtmpVars) {
    customRtmpUrl = getStringSetting(runtime, rtmpVar) || process.env[rtmpVar];
    if (customRtmpUrl) break;
  }

  logger.info(`Using env/character streaming config for ${platform}`);
  return {
    source: "env",
    platform,
    hasStreamKey: true,
    rtmpUrl: customRtmpUrl || null,
    streamKey,
    customRtmpUrl,
  };
}

/**
 * Start a stream using backend-stored credentials.
 * Calls /api/streaming/start with useStoredCredentials=true.
 */
export async function startStreamFromBackend(
  apiClient: LTCGApiClient,
  runtime: IAgentRuntime,
  platform: string,
) {
  const agentId = getStringSetting(runtime, "LTCG_AGENT_ID") || process.env.LTCG_AGENT_ID;
  if (!agentId) {
    throw new Error("LTCG_AGENT_ID is required for backend-stored streaming");
  }

  return apiClient.startStreamWithStoredCredentials({
    agentId,
    platform,
    streamTitle: `${runtime.character.name} plays LTCG`,
  });
}
