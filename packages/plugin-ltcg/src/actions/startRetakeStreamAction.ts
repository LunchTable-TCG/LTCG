import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { LTCGApiClient } from "../client/LTCGApiClient";
import { logger } from "../utils/logger";
import { resolveStreamingCredentials, startStreamFromBackend } from "../utils/streamingConfig";

/**
 * Start streaming to Retake.tv
 *
 * This action initiates a live stream to Retake.tv platform.
 * It should be called before starting a game when streaming is desired.
 *
 * Credential resolution order:
 * 1. Backend (UI-configured settings saved to agents table via AgentStreamingSettingsPanel)
 * 2. Character secrets / environment variables (RETAKE_ACCESS_TOKEN, RETAKE_USER_DB_ID)
 *
 * Flow:
 * 1. Validate credentials (backend or env)
 * 2. Call Retake API to signal stream start
 * 3. Get RTMP credentials from Retake
 * 4. Notify LTCG backend to start LiveKit egress
 * 5. Return stream status
 */
export const startRetakeStreamAction: Action = {
  name: "START_RETAKE_STREAM",
  description:
    "Start streaming LTCG gameplay to Retake.tv. Call this before starting a game to enable live streaming.",
  similes: [
    "GO_LIVE",
    "START_STREAMING",
    "BEGIN_BROADCAST",
    "STREAM_TO_RETAKE",
    "START_RETAKE",
  ],

  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const text = (message.content.text ?? "").toLowerCase();

    // Check if user wants to start streaming
    const streamKeywords = ["stream", "go live", "broadcast", "retake"];
    const startKeywords = ["start", "begin", "enable", "turn on"];

    const hasStreamKeyword = streamKeywords.some((kw) => text.includes(kw));
    const hasStartKeyword = startKeywords.some((kw) => text.includes(kw));

    if (!hasStreamKeyword || !hasStartKeyword) {
      return false;
    }

    // Retake always requires its own API credentials for stream/start + RTMP setup
    const retakeAccessToken =
      runtime.getSetting("RETAKE_ACCESS_TOKEN") ||
      process.env.RETAKE_ACCESS_TOKEN ||
      process.env.DIZZY_RETAKE_ACCESS_TOKEN;

    if (!retakeAccessToken) {
      logger.warn("Retake.tv API credentials not configured (RETAKE_ACCESS_TOKEN required)");
      return false;
    }

    // LTCG backend config (for LiveKit egress) is optional — falls back to direct API call
    return true;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: Record<string, unknown>,
    callback: HandlerCallback
  ) => {
    try {
      // --- Retake API credentials (always required for Retake's own API) ---
      const retakeAccessToken =
        runtime.getSetting("RETAKE_ACCESS_TOKEN") ||
        process.env.RETAKE_ACCESS_TOKEN ||
        process.env.DIZZY_RETAKE_ACCESS_TOKEN;

      const retakeUserDbId =
        runtime.getSetting("RETAKE_USER_DB_ID") ||
        process.env.RETAKE_USER_DB_ID ||
        process.env.DIZZY_RETAKE_USER_DB_ID;

      if (!retakeAccessToken || !retakeUserDbId) {
        await callback({
          text: "Retake.tv credentials not configured. I need RETAKE_ACCESS_TOKEN and RETAKE_USER_DB_ID to stream.",
          error: true,
        });
        return { success: false, error: "Missing Retake credentials" };
      }

      // --- Step 1: Signal stream start to Retake.tv ---
      logger.info("Starting Retake.tv stream...");

      const response = await fetch("https://chat.retake.tv/api/agent/stream/start", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${retakeAccessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Retake.tv API error: ${errorText}`);
      }

      // --- Step 2: Get RTMP credentials from Retake ---
      const rtmpResponse = await fetch("https://chat.retake.tv/api/agent/rtmp", {
        headers: {
          "Authorization": `Bearer ${retakeAccessToken}`,
        },
      });

      if (!rtmpResponse.ok) {
        throw new Error("Failed to get RTMP credentials");
      }

      const rtmpData = await rtmpResponse.json();
      logger.info(`Retake.tv RTMP credentials received (hasRtmpUrl: ${Boolean(rtmpData.rtmp_url)}, hasStreamKey: ${Boolean(rtmpData.stream_key)})`);

      // --- Step 3: Start LTCG backend LiveKit egress (optional — best-effort) ---
      const ltcgApiKey = runtime.getSetting("LTCG_API_KEY") as string;
      const ltcgApiUrl = runtime.getSetting("LTCG_API_URL") as string;
      let ltcgApiClient: LTCGApiClient | null = null;
      if (ltcgApiKey && ltcgApiUrl) {
        ltcgApiClient = new LTCGApiClient({ apiKey: ltcgApiKey, baseUrl: ltcgApiUrl });
      }

      const backendConfig = await resolveStreamingCredentials(runtime, ltcgApiClient, "retake");

      try {
        if (backendConfig?.source === "backend" && ltcgApiClient) {
          // Backend has stored retake config — use stored credentials flow
          const streamData = await startStreamFromBackend(ltcgApiClient, runtime, "retake");
          logger.info(`LTCG streaming started via backend config (sessionId: ${streamData.sessionId})`);
        } else {
          // Fall back to direct API call with Retake RTMP creds
          const ltcgStreamingUrl =
            process.env.LTCG_STREAMING_API_URL ||
            process.env.LTCG_APP_URL ||
            ltcgApiUrl ||
            "https://www.lunchtable.cards";
          const ltcgAgentId =
            runtime.getSetting("LTCG_AGENT_ID") || process.env.LTCG_AGENT_ID;

          const streamingResponse = await fetch(`${ltcgStreamingUrl}/api/streaming/start`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(ltcgApiKey ? { "Authorization": `Bearer ${ltcgApiKey}` } : {}),
            },
            body: JSON.stringify({
              agentId: ltcgAgentId,
              streamType: "agent",
              platform: "custom",
              customRtmpUrl: rtmpData.rtmp_url,
              streamKey: rtmpData.stream_key,
              streamTitle: `${runtime.character.name} plays LTCG`,
            }),
          });

          if (!streamingResponse.ok) {
            const errorText = await streamingResponse.text();
            logger.warn(`LTCG streaming API error: ${errorText}`);
          } else {
            const streamData = await streamingResponse.json();
            logger.info(`LTCG streaming started (sessionId: ${streamData.sessionId})`);
          }
        }
      } catch (error) {
        logger.warn("Failed to notify LTCG backend", error);
        // Continue anyway - stream is started on Retake side
      }

      await callback({
        text: `Stream is LIVE on Retake.tv!

I'm now streaming to https://retake.tv/
Chat is ready - I'll be responding to viewers during gameplay!

Ready to start a game and show everyone what I've learned!`,
      });

      return {
        success: true,
        data: {
          platform: "retake",
          status: "live",
        },
      };
    } catch (error) {
      logger.error("Failed to start Retake stream", error);

      await callback({
        text: `Failed to start stream: ${error instanceof Error ? error.message : "Unknown error"}

Configure credentials in the agent streaming settings UI, or set RETAKE_ACCESS_TOKEN and RETAKE_USER_DB_ID.`,
        error: true,
      });

      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Start streaming to Retake" },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Stream is LIVE on Retake.tv!",
        },
      },
    ],
    [
      {
        name: "{{user1}}",
        content: { text: "Go live on Retake.tv" },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Starting Retake.tv stream...",
        },
      },
    ],
    [
      {
        name: "{{user1}}",
        content: { text: "Enable streaming and let's play" },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Stream is LIVE! Ready to play!",
        },
      },
    ],
  ],
};

export default startRetakeStreamAction;
