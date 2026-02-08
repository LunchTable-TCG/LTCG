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
 * Start streaming to Pump.fun
 *
 * This action initiates a live stream to Pump.fun via RTMP.
 * Users must manually configure RTMP credentials from their Pump.fun coin page,
 * either in the web UI (AgentStreamingSettingsPanel) or via env/character secrets.
 *
 * Credential resolution order:
 * 1. Backend (UI-configured settings saved to agents table)
 * 2. Character secrets / environment variables (PUMPFUN_RTMP_URL, PUMPFUN_STREAM_KEY)
 */
export const startPumpfunStreamAction: Action = {
  name: "START_PUMPFUN_STREAM",
  description:
    "Start streaming LTCG gameplay to Pump.fun. Call this before starting a game to enable live streaming on your coin page.",
  similes: [
    "STREAM_TO_PUMPFUN",
    "STREAM_TO_PUMP",
    "GO_LIVE_ON_PUMPFUN",
    "START_PUMP_BROADCAST",
    "BROADCAST_TO_PUMP",
  ],

  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const text = (message.content.text ?? "").toLowerCase();

    const streamKeywords = ["stream", "go live", "broadcast"];
    const platformKeywords = ["pump", "pumpfun", "pump.fun"];

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

    const config = await resolveStreamingCredentials(runtime, apiClient, "pumpfun");
    if (!config) {
      logger.warn("Pump.fun streaming credentials not configured (checked backend + env)");
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

      const config = await resolveStreamingCredentials(runtime, apiClient, "pumpfun");
      if (!config) {
        await callback({
          text: "Pump.fun streaming credentials not configured. Set them in the agent streaming settings UI, or add PUMPFUN_RTMP_URL and PUMPFUN_STREAM_KEY to your character secrets.",
          error: true,
        });
        return { success: false, error: "Missing Pump.fun credentials" };
      }

      logger.info(`Starting Pump.fun stream (source: ${config.source})...`);

      let streamData: { sessionId?: string };

      if (config.source === "backend" && apiClient) {
        // Use stored credentials — server decrypts key
        streamData = await startStreamFromBackend(apiClient, runtime, "pumpfun");
      } else {
        // Use env credentials — send plaintext key to server
        const ltcgStreamingUrl =
          process.env.LTCG_STREAMING_API_URL ||
          process.env.LTCG_APP_URL ||
          process.env.LTCG_API_URL ||
          "https://www.lunchtable.cards";
        const ltcgApiKey = process.env.LTCG_API_KEY;
        const ltcgAgentId =
          runtime.getSetting("LTCG_AGENT_ID") || process.env.LTCG_AGENT_ID;

        const response = await fetch(`${ltcgStreamingUrl}/api/streaming/start`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${ltcgApiKey}`,
          },
          body: JSON.stringify({
            agentId: ltcgAgentId,
            streamType: "agent",
            platform: "pumpfun",
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

      logger.info(`Pump.fun stream started (sessionId: ${streamData.sessionId})`);

      await callback({
        text: `Stream is LIVE on Pump.fun!

Broadcasting gameplay on your coin page now. Holders can watch live.
Ready to play!`,
      });

      return {
        success: true,
        data: {
          platform: "pumpfun",
          status: "live",
          sessionId: streamData.sessionId,
        },
      };
    } catch (error) {
      logger.error("Failed to start Pump.fun stream", error);

      await callback({
        text: `Failed to start Pump.fun stream: ${error instanceof Error ? error.message : "Unknown error"}

Configure credentials in the agent streaming settings UI, or set PUMPFUN_RTMP_URL and PUMPFUN_STREAM_KEY.`,
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
        content: { text: "Start streaming to Pump.fun" },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Stream is LIVE on Pump.fun!",
        },
      },
    ],
    [
      {
        name: "{{user1}}",
        content: { text: "Go live on pump" },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Starting Pump.fun stream...",
        },
      },
    ],
  ],
};

export default startPumpfunStreamAction;
