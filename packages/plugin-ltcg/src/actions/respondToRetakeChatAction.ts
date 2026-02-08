import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger} from "../utils/logger";

/**
 * Respond to Retake.tv Chat
 *
 * This action allows the agent to send messages to Retake.tv chat
 * in response to viewer questions or comments during a stream.
 *
 * The agent can engage with viewers by:
 * - Answering strategy questions
 * - Explaining gameplay decisions
 * - Acknowledging tips and support
 * - Building community engagement
 */
export const respondToRetakeChatAction: Action = {
  name: "RETAKE_CHAT_RESPONSE",
  description:
    "Send a message to Retake.tv chat during a live stream. Use this to engage with viewers, answer questions, or provide commentary.",
  similes: [
    "CHAT_WITH_VIEWERS",
    "RESPOND_TO_CHAT",
    "TALK_TO_STREAM",
    "MESSAGE_VIEWERS",
    "ENGAGE_CHAT",
  ],

  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const text = (message.content.text ?? "").toLowerCase();

    // Check if this is a chat/viewer engagement context
    const chatKeywords = [
      "chat",
      "viewers",
      "stream",
      "audience",
      "watching",
      "everyone",
    ];

    // Check if there's an active stream (has credentials)
    const accessToken =
      runtime.getSetting("RETAKE_ACCESS_TOKEN") ||
      process.env.RETAKE_ACCESS_TOKEN ||
      process.env.DIZZY_RETAKE_ACCESS_TOKEN;

    if (!accessToken) {
      return false; // No active stream
    }

    // If message mentions chat/viewers, this might be a good action
    return chatKeywords.some((kw) => text.includes(kw));
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
        // No stream active, just respond normally
        return { success: false, error: "No active stream" };
      }

      // Extract the message to send to chat
      // This would typically be the agent's response to a viewer question
      const chatMessage = message.content.text ?? "";

      // Send message to Retake.tv chat
      logger.info(`Sending message to Retake chat (${chatMessage.length} chars)`);

      const response = await fetch("https://chat.retake.tv/api/agent/chat/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userDbId,
          message: chatMessage,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Retake.tv chat API error: ${errorText}`);
      }

      logger.info("Chat message sent successfully");

      // Also send via callback for local chat
      await callback({
        text: `💬 [To Retake Chat]: ${chatMessage}`,
      });

      return {
        success: true,
        data: {
          platform: "retake",
          messageSent: chatMessage,
          timestamp: Date.now(),
        },
      };
    } catch (error) {
      logger.error("Failed to send Retake chat message", error);

      // Don't show error to user - just log it
      // The message was still processed locally

      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: "{{viewer1}}",
        content: { text: "What's your strategy this game?" },
      },
      {
        name: "Dizzy",
        content: {
          text: "I'm focusing on board control - building up my defenses before going aggressive. The key is baiting out their trap cards first!",
        },
      },
    ],
    [
      {
        name: "{{viewer1}}",
        content: { text: "Should you attack or set this turn?" },
      },
      {
        name: "Dizzy",
        content: {
          text: "Good question chat! I'm thinking set - my opponent has 2 face-down cards and 1500 LP left. If I set now, I can bait their trap and finish next turn safely.",
        },
      },
    ],
  ],
};

export default respondToRetakeChatAction;
