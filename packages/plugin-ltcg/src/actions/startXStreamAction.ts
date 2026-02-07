import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger } from "../utils/logger";

/**
 * Start streaming to X (Twitter)
 *
 * This action initiates a live stream to X via RTMP.
 * Users must manually configure RTMP credentials from X Media Studio.
 *
 * Prerequisites:
 * - X_RTMP_URL must be set in environment/secrets
 * - X_STREAM_KEY must be set
 * - X Premium subscription ($8+/mo) required
 *
 * Flow:
 * 1. Validate X RTMP credentials
 * 2. Call LTCG streaming API with custom RTMP URL
 * 3. Return stream status to user
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
    const text = message.content.text.toLowerCase();

    const streamKeywords = ["stream", "go live", "broadcast"];
    const platformKeywords = ["x", "twitter"];

    const hasStreamKeyword = streamKeywords.some((kw) => text.includes(kw));
    const hasPlatformKeyword = platformKeywords.some((kw) => text.includes(kw));

    if (!hasStreamKeyword || !hasPlatformKeyword) {
      return false;
    }

    const rtmpUrl =
      runtime.getSetting("X_RTMP_URL") || process.env.X_RTMP_URL;
    const streamKey =
      runtime.getSetting("X_STREAM_KEY") || process.env.X_STREAM_KEY;

    if (!rtmpUrl || !streamKey) {
      logger.warn("X streaming credentials not configured");
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
        runtime.getSetting("X_RTMP_URL") || process.env.X_RTMP_URL;
      const streamKey =
        runtime.getSetting("X_STREAM_KEY") || process.env.X_STREAM_KEY;

      if (!rtmpUrl || !streamKey) {
        await callback({
          text: "X streaming credentials not configured. I need X_RTMP_URL and X_STREAM_KEY from Media Studio > Producer.",
          error: true,
        });
        return { success: false, error: "Missing X credentials" };
      }

      logger.info("Starting X stream...");

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
          platform: "x",
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
      logger.info("X stream started", { sessionId: streamData.sessionId });

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

Make sure X_RTMP_URL and X_STREAM_KEY are configured from Media Studio.`,
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
