import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger } from "../utils/logger";

/**
 * Start streaming to Retake.tv
 *
 * This action initiates a live stream to Retake.tv platform.
 * It should be called before starting a game when streaming is desired.
 *
 * Prerequisites:
 * - RETAKE_ACCESS_TOKEN must be set in environment/secrets
 * - RETAKE_USER_DB_ID must be set
 * - Agent must be registered on Retake.tv
 *
 * Flow:
 * 1. Validate Retake credentials
 * 2. Call Retake API to signal stream start
 * 3. Notify LTCG backend to enable streaming
 * 4. Return stream status to user
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
    const text = message.content.text.toLowerCase();

    // Check if user wants to start streaming
    const streamKeywords = ["stream", "go live", "broadcast", "retake"];
    const startKeywords = ["start", "begin", "enable", "turn on"];

    const hasStreamKeyword = streamKeywords.some((kw) => text.includes(kw));
    const hasStartKeyword = startKeywords.some((kw) => text.includes(kw));

    if (!hasStreamKeyword || !hasStartKeyword) {
      return false;
    }

    // Check if Retake credentials are available
    const accessToken =
      runtime.getSetting("RETAKE_ACCESS_TOKEN") ||
      process.env.RETAKE_ACCESS_TOKEN ||
      process.env.DIZZY_RETAKE_ACCESS_TOKEN;

    if (!accessToken) {
      logger.warn("Retake.tv credentials not configured");
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
      // Get Retake.tv credentials
      const accessToken =
        runtime.getSetting("RETAKE_ACCESS_TOKEN") ||
        process.env.RETAKE_ACCESS_TOKEN ||
        process.env.DIZZY_RETAKE_ACCESS_TOKEN;

      const userDbId =
        runtime.getSetting("RETAKE_USER_DB_ID") ||
        process.env.RETAKE_USER_DB_ID ||
        process.env.DIZZY_RETAKE_USER_DB_ID;

      if (!accessToken || !userDbId) {
        await callback({
          text: "⚠️ Retake.tv credentials not configured. I need RETAKE_ACCESS_TOKEN and RETAKE_USER_DB_ID to stream.",
          error: true,
        });
        return { success: false, error: "Missing Retake credentials" };
      }

      // Signal stream start to Retake.tv
      logger.info("Starting Retake.tv stream...");

      const response = await fetch("https://chat.retake.tv/api/agent/stream/start", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Retake.tv API error: ${errorText}`);
      }

      // Get RTMP credentials
      const rtmpResponse = await fetch("https://chat.retake.tv/api/agent/rtmp", {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });

      if (!rtmpResponse.ok) {
        throw new Error("Failed to get RTMP credentials");
      }

      const rtmpData = await rtmpResponse.json();
      logger.info("Retake.tv stream started successfully", {
        rtmpUrl: rtmpData.url,
      });

      // Notify LTCG backend to enable streaming
      // This triggers the LiveKit egress to capture overlay and stream to Retake
      const ltcgApiUrl = process.env.LTCG_API_URL || "https://www.lunchtable.cards";
      const ltcgApiKey = process.env.LTCG_API_KEY;

      try {
        const streamingResponse = await fetch(`${ltcgApiUrl}/api/streaming/start`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${ltcgApiKey}`,
          },
          body: JSON.stringify({
            agentId: runtime.agentId,
            streamType: "agent",
            platform: "custom",
            customRtmpUrl: rtmpData.url,
            streamKey: rtmpData.key,
            streamTitle: `${runtime.character.name} plays LTCG`,
          }),
        });

        if (!streamingResponse.ok) {
          const errorText = await streamingResponse.text();
          logger.warn("LTCG streaming API error", { error: errorText });
        } else {
          const streamData = await streamingResponse.json();
          logger.info("LTCG streaming started", { sessionId: streamData.sessionId });
        }
      } catch (error) {
        logger.warn("Failed to notify LTCG backend", error);
        // Continue anyway - stream is started on Retake side
      }

      await callback({
        text: `🎬 Stream is LIVE on Retake.tv!

I'm now streaming to https://retake.tv/
Chat is ready - I'll be responding to viewers during gameplay!

Ready to start a game and show everyone what I've learned! 🎮⚔️`,
      });

      return {
        success: true,
        data: {
          platform: "retake",
          status: "live",
          accessToken, // For internal use
          userDbId,
          rtmpUrl: rtmpData.url,
          rtmpKey: rtmpData.key,
        },
      };
    } catch (error) {
      logger.error("Failed to start Retake stream", error);

      await callback({
        text: `❌ Failed to start stream: ${error instanceof Error ? error.message : "Unknown error"}

Make sure Retake.tv credentials are configured correctly.`,
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
          text: "🎬 Stream is LIVE on Retake.tv!",
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
          text: "🎬 Stream is LIVE! Ready to play!",
        },
      },
    ],
  ],
};

export default startRetakeStreamAction;
