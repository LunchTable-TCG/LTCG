/**
 * Send Chat Message Action
 *
 * Sends a message to the global chat (Tavern Hall).
 * Allows agent to participate in community conversations, banter, and social interactions.
 * Rate limited to 5 messages per 10 seconds by the backend.
 */

import type {
  Action,
  ActionResult,
  Content,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "@elizaos/core";
import { logger } from "@elizaos/core";
import { LTCGApiClient } from "../client/LTCGApiClient";

export const sendChatMessageAction: Action = {
  name: "SEND_CHAT_MESSAGE",
  similes: ["CHAT", "SAY", "TALK_IN_CHAT", "TAVERN_CHAT"],
  description: "Send a message to the global chat (Tavern Hall)",

  validate: async (runtime: IAgentRuntime, _message: Memory, _state: State): Promise<boolean> => {
    try {
      // Check if chat is enabled
      const chatEnabled = runtime.getSetting("LTCG_CHAT_ENABLED") !== "false";
      if (!chatEnabled) {
        logger.debug("Chat is disabled");
        return false;
      }

      // Check API credentials
      const apiKey = runtime.getSetting("LTCG_API_KEY") as string;
      const apiUrl = runtime.getSetting("LTCG_API_URL") as string;

      if (!apiKey || !apiUrl) {
        logger.warn("LTCG API credentials not configured");
        return false;
      }

      return true;
    } catch (error) {
      logger.error({ error }, "Error validating send chat message action");
      return false;
    }
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: any,
    callback: HandlerCallback
  ): Promise<ActionResult> => {
    try {
      logger.info("Handling SEND_CHAT_MESSAGE action");

      // Get message content from state or message
      // LLM will provide the message content in the response
      let chatMessage = (message.content as any)?.text || message.content || "";

      // If no explicit message provided, this shouldn't happen as LLM should provide it
      if (!chatMessage || typeof chatMessage !== "string") {
        throw new Error("No chat message content provided");
      }

      // Trim and validate message
      chatMessage = chatMessage.trim();

      if (chatMessage.length === 0) {
        await callback?.({
          text: "Cannot send empty message",
          actions: ["SEND_CHAT_MESSAGE"],
          source: message.content.source,
          thought: "Attempted to send empty chat message",
        } as Content);

        return {
          success: false,
          text: "Cannot send empty message",
          values: {
            error: "EMPTY_MESSAGE",
          },
          data: {},
        };
      }

      if (chatMessage.length > 500) {
        await callback?.({
          text: "Message too long (max 500 characters)",
          actions: ["SEND_CHAT_MESSAGE"],
          source: message.content.source,
          thought: "Message exceeds character limit",
        } as Content);

        return {
          success: false,
          text: "Message too long",
          values: {
            error: "MESSAGE_TOO_LONG",
            maxLength: 500,
            actualLength: chatMessage.length,
          },
          data: {},
        };
      }

      // Get API credentials
      const apiKey = runtime.getSetting("LTCG_API_KEY") as string;
      const apiUrl = runtime.getSetting("LTCG_API_URL") as string;

      // Create API client
      const client = new LTCGApiClient({
        apiKey,
        baseUrl: apiUrl,
      });

      // Send message
      const result = await client.sendChatMessage(chatMessage);

      logger.info({ messageId: result.messageId }, "Chat message sent successfully");

      // Notify callback
      await callback?.({
        text: chatMessage,
        actions: ["SEND_CHAT_MESSAGE"],
        source: message.content.source,
        thought: "Sent message to global chat",
      } as Content);

      return {
        success: true,
        text: chatMessage,
        values: {
          messageId: result.messageId,
          timestamp: result.timestamp,
          actionName: "SEND_CHAT_MESSAGE",
        },
        data: {
          messageId: result.messageId,
          content: chatMessage,
          timestamp: result.timestamp,
        },
      };
    } catch (error) {
      logger.error({ error }, "Error sending chat message");

      const errorMessage = error instanceof Error ? error.message : "Failed to send chat message";

      // Check for rate limit error
      if (errorMessage.includes("rate limit") || errorMessage.includes("RATE_LIMIT")) {
        await callback?.({
          text: "Rate limited. Please wait before sending another message (5 messages per 10 seconds).",
          actions: ["SEND_CHAT_MESSAGE"],
          source: message.content.source,
          thought: "Hit chat rate limit",
        } as Content);

        return {
          success: false,
          text: "Rate limited",
          values: {
            error: "RATE_LIMIT",
            retryAfter: 10000, // 10 seconds
          },
          data: { errorDetails: error },
        };
      }

      await callback?.({
        text: `Failed to send message: ${errorMessage}`,
        actions: ["SEND_CHAT_MESSAGE"],
        source: message.content.source,
        thought: `Error sending chat message: ${errorMessage}`,
      } as Content);

      return {
        success: false,
        text: `Failed to send message: ${errorMessage}`,
        values: {
          error: "SEND_FAILED",
        },
        data: { errorDetails: error },
      };
    }
  },

  examples: [
    [
      {
        name: "{{name1}}",
        content: {
          text: "You should join the global chat",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "Anyone up for a match? Looking for a challenge!",
          actions: ["SEND_CHAT_MESSAGE"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "Say something in chat",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "Just finished an intense game. GG to my opponent!",
          actions: ["SEND_CHAT_MESSAGE"],
        },
      },
    ],
  ],
};
