import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger } from "../utils/logger";

/**
 * Stop streaming to Retake.tv
 *
 * This action stops an active Retake.tv stream.
 * Should be called after a game ends or when manually stopping the stream.
 */
export const stopRetakeStreamAction: Action = {
  name: "STOP_RETAKE_STREAM",
  description:
    "Stop the active Retake.tv stream. Call this after finishing gameplay or to manually end the broadcast.",
  similes: [
    "END_STREAM",
    "STOP_STREAMING",
    "END_BROADCAST",
    "STOP_RETAKE",
    "GO_OFFLINE",
  ],

  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text.toLowerCase();

    // Check if user wants to stop streaming
    const streamKeywords = ["stream", "broadcast", "retake", "live"];
    const stopKeywords = ["stop", "end", "finish", "turn off", "offline"];

    const hasStreamKeyword = streamKeywords.some((kw) => text.includes(kw));
    const hasStopKeyword = stopKeywords.some((kw) => text.includes(kw));

    if (!hasStreamKeyword || !hasStopKeyword) {
      return false;
    }

    // Check if credentials are available (only stop if configured)
    const accessToken =
      runtime.getSetting("RETAKE_ACCESS_TOKEN") ||
      process.env.RETAKE_ACCESS_TOKEN ||
      process.env.DIZZY_RETAKE_ACCESS_TOKEN;

    return !!accessToken;
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

      if (!accessToken) {
        await callback({
          text: "No active stream found to stop.",
        });
        return { success: false, error: "No stream active" };
      }

      // Signal stream stop to Retake.tv
      logger.info("Stopping Retake.tv stream...");

      const response = await fetch("https://chat.retake.tv/api/agent/stream/stop", {
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

      logger.info("Retake.tv stream stopped successfully");

      // Notify LTCG backend to stop streaming
      const ltcgApiUrl = process.env.LTCG_API_URL || "https://lunchtable.cards";

      try {
        await fetch(`${ltcgApiUrl}/api/streaming/stop`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            agentId: runtime.agentId,
          }),
        });
      } catch (error) {
        logger.warn("Failed to notify LTCG backend of stream stop", error);
        // Continue anyway
      }

      await callback({
        text: `📴 Stream ended!

Thanks to everyone who watched! That was a great session.

Check out the VOD and highlights on Retake.tv. See you next stream! 👋`,
      });

      return {
        success: true,
        data: {
          platform: "retake",
          status: "ended",
        },
      };
    } catch (error) {
      logger.error("Failed to stop Retake stream", error);

      await callback({
        text: `⚠️ Error stopping stream: ${error instanceof Error ? error.message : "Unknown error"}

The stream may have already ended or there was a connection issue.`,
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
        content: { text: "Stop the stream" },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "📴 Stream ended! Thanks for watching!",
        },
      },
    ],
    [
      {
        name: "{{user1}}",
        content: { text: "End broadcast" },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Stopping stream...",
        },
      },
    ],
  ],
};

export default stopRetakeStreamAction;
