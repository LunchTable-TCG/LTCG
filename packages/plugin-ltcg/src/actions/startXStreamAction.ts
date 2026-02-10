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
 * Start streaming to X (Twitter)
 *
 * This action initiates a live stream to X via RTMP.
 * Credential resolution order:
 * 1. Backend (UI-configured settings saved to agents table)
 * 2. Character secrets / environment variables (X_RTMP_URL, X_STREAM_KEY)
 */
export const startXStreamAction: Action = {
  name: "START_X_STREAM",
  description:
    "Start streaming LTCG gameplay to X (Twitter). Call this before starting a game to enable live streaming on X.",
  similes: [
    "STREAM_TO_X",
    "STREAM_TO_TWITTER",
    "GO_LIVE_ON_X",
    "START_X_BROADCAST",
    "BROADCAST_TO_TWITTER",
  ],

  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const text = (message.content.text ?? "").toLowerCase();

    const streamKeywords = ["stream", "go live", "broadcast"];
    const platformKeywords = ["x", "twitter"];

    const hasStreamKeyword = streamKeywords.some((kw) => text.includes(kw));
    const hasPlatformKeyword = platformKeywords.some((kw) => text.includes(kw));

    if (!hasStreamKeyword || !hasPlatformKeyword) {
      return false;
    }

    // Check backend config first, then env
    const apiKey = runtime.getSetting("LTCG_API_KEY") as string;
    const apiUrl = runtime.getSetting("LTCG_API_URL") as string;
    let apiClient: LTCGApiClient | null = null;
    if (apiKey && apiUrl) {
      apiClient = new LTCGApiClient({ apiKey, baseUrl: apiUrl });
    }

    const config = await resolveStreamingCredentials(runtime, apiClient, "x");
    if (!config) {
      logger.warn("X streaming credentials not configured (checked backend + env)");
      return false;
    }

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
      const apiKey = runtime.getSetting("LTCG_API_KEY") as string;
      const apiUrl = runtime.getSetting("LTCG_API_URL") as string;
      let apiClient: LTCGApiClient | null = null;
      if (apiKey && apiUrl) {
        apiClient = new LTCGApiClient({ apiKey, baseUrl: apiUrl });
      }

      const config = await resolveStreamingCredentials(runtime, apiClient, "x");
      if (!config) {
        await callback({
          text: "X streaming credentials not configured. Set them in the agent streaming settings UI, or add X_RTMP_URL and X_STREAM_KEY to your character secrets.",
          error: true,
        });
        return { success: false, error: "Missing X credentials" };
      }

      logger.info(`Starting X stream (source: ${config.source})...`);

      let streamData: { sessionId?: string };

      if (config.source === "backend" && apiClient) {
        // Use stored credentials — server decrypts key
        streamData = await startStreamFromBackend(apiClient, runtime, "x");
      } else {
        // Use env credentials — send plaintext key to server
        const ltcgStreamingUrl =
          process.env.LTCG_STREAMING_API_URL ||
          process.env.LTCG_APP_URL ||
          process.env.NEXT_PUBLIC_APP_URL ||
          "https://www.lunchtable.cards";
        const ltcgApiKey = process.env.LTCG_API_KEY;
        const ltcgAgentId =
          runtime.getSetting("LTCG_AGENT_ID") || process.env.LTCG_AGENT_ID;

        const response = await fetch(`${ltcgStreamingUrl}/api/streaming/start`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(ltcgApiKey
              ? {
                  "Authorization": `Bearer ${ltcgApiKey}`,
                  "x-api-key": ltcgApiKey,
                }
              : {}),
          },
          body: JSON.stringify({
            agentId: ltcgAgentId,
            streamType: "agent",
            platform: "x",
            customRtmpUrl: config.customRtmpUrl,
            streamKey: config.streamKey,
            streamTitle: `${runtime.character.name} plays LTCG`,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`LTCG streaming API error: ${errorText}`);
        }

        streamData = await response.json();
      }

      logger.info(`X stream started (sessionId: ${streamData.sessionId})`);

      await callback({
        text: `Stream is LIVE on X (Twitter)!

Broadcasting gameplay now. Viewers can watch on your X profile.
Ready to play!`,
      });

      return {
        success: true,
        data: {
          platform: "x",
          status: "live",
          sessionId: streamData.sessionId,
        },
      };
    } catch (error) {
      logger.error("Failed to start X stream", error);

      await callback({
        text: `Failed to start X stream: ${error instanceof Error ? error.message : "Unknown error"}

Configure credentials in the agent streaming settings UI, or set X_RTMP_URL and X_STREAM_KEY.`,
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
        content: { text: "Start streaming to X" },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Stream is LIVE on X (Twitter)!",
        },
      },
    ],
    [
      {
        name: "{{user1}}",
        content: { text: "Go live on Twitter" },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Starting X stream...",
        },
      },
    ],
  ],
};

export default startXStreamAction;
