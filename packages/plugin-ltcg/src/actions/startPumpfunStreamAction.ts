import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger } from "../utils/logger";

/**
 * Start streaming to Pump.fun
 *
 * This action initiates a live stream to Pump.fun via RTMP.
 * Users must manually configure RTMP credentials from their Pump.fun coin page.
 *
 * Prerequisites:
 * - PUMPFUN_RTMP_URL must be set in environment/secrets
 * - PUMPFUN_STREAM_KEY must be set
 * - Must be the token creator on Pump.fun
 * - Wallet-based auth (Solana)
 *
 * Flow:
 * 1. Validate Pump.fun RTMP credentials
 * 2. Call LTCG streaming API with custom RTMP URL
 * 3. Return stream status to user
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
    const text = message.content.text.toLowerCase();

    const streamKeywords = ["stream", "go live", "broadcast"];
    const platformKeywords = ["pump", "pumpfun", "pump.fun"];

    const hasStreamKeyword = streamKeywords.some((kw) => text.includes(kw));
    const hasPlatformKeyword = platformKeywords.some((kw) => text.includes(kw));

    if (!hasStreamKeyword || !hasPlatformKeyword) {
      return false;
    }

    const rtmpUrl =
      runtime.getSetting("PUMPFUN_RTMP_URL") || process.env.PUMPFUN_RTMP_URL;
    const streamKey =
      runtime.getSetting("PUMPFUN_STREAM_KEY") || process.env.PUMPFUN_STREAM_KEY;

    if (!rtmpUrl || !streamKey) {
      logger.warn("Pump.fun streaming credentials not configured");
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
      const rtmpUrl =
        runtime.getSetting("PUMPFUN_RTMP_URL") || process.env.PUMPFUN_RTMP_URL;
      const streamKey =
        runtime.getSetting("PUMPFUN_STREAM_KEY") || process.env.PUMPFUN_STREAM_KEY;

      if (!rtmpUrl || !streamKey) {
        await callback({
          text: "Pump.fun streaming credentials not configured. I need PUMPFUN_RTMP_URL and PUMPFUN_STREAM_KEY from your coin page > Start Livestream > RTMP.",
          error: true,
        });
        return { success: false, error: "Missing Pump.fun credentials" };
      }

      logger.info("Starting Pump.fun stream...");

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
          customRtmpUrl: rtmpUrl,
          streamKey,
          streamTitle: `${runtime.character.name} plays LTCG`,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LTCG streaming API error: ${errorText}`);
      }

      const streamData = await response.json();
      logger.info("Pump.fun stream started", { sessionId: streamData.sessionId });

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

Make sure PUMPFUN_RTMP_URL and PUMPFUN_STREAM_KEY are configured from your coin page.`,
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
