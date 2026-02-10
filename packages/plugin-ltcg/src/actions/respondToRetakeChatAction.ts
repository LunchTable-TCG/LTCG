import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { ModelType } from "@elizaos/core";
import { logger } from "../utils/logger";

function isEnabled(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
  }
  return false;
}

function buildDeterministicReply(username: string, viewerMessage: string): string {
  const lowered = viewerMessage.toLowerCase();

  if (lowered.includes("gg")) {
    return `@${username} gg - appreciate you being here while we grind these lines.`;
  }
  if (lowered.includes("?")) {
    return `@${username} good question - I'm reading board state and taking the safest line this turn.`;
  }
  if (lowered.includes("attack")) {
    return `@${username} I'm checking lethal and trap risk before I commit to attacks.`;
  }
  if (lowered.includes("deck")) {
    return `@${username} this list is tuned for steady board control and clean battle phase pressure.`;
  }

  return `@${username} thanks for the message - I'm locked in on this turn.`;
}

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
    const source = typeof message.content.source === "string" ? message.content.source : "";

    // Check if there's an active stream (has credentials)
    const accessToken =
      runtime.getSetting("RETAKE_ACCESS_TOKEN") ||
      process.env.RETAKE_ACCESS_TOKEN ||
      process.env.DIZZY_RETAKE_ACCESS_TOKEN;
    const userDbId =
      runtime.getSetting("RETAKE_USER_DB_ID") ||
      process.env.RETAKE_USER_DB_ID ||
      process.env.DIZZY_RETAKE_USER_DB_ID;

    if (!accessToken || !userDbId) {
      return false; // No active stream
    }

    // Always allow direct Retake chat events from the chat polling service.
    if (source === "retake_chat") {
      return true;
    }

    // Allow explicit manual requests to speak in stream chat.
    return /\b(retake|stream\s*chat|chat)\b/.test(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
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

      const source = typeof message.content.source === "string" ? message.content.source : "";
      const viewerMessage = (message.content.text ?? "").trim();
      const metadata =
        message.content.metadata && typeof message.content.metadata === "object"
          ? (message.content.metadata as Record<string, unknown>)
          : undefined;
      const username =
        typeof metadata?.username === "string" && metadata.username.trim().length > 0
          ? metadata.username.trim()
          : "viewer";
      const useLlmForChat = isEnabled(
        runtime.getSetting("LTCG_RETAKE_CHAT_USE_LLM") ?? process.env.LTCG_RETAKE_CHAT_USE_LLM
      );

      let chatMessage = viewerMessage;
      if (source === "retake_chat") {
        if (!useLlmForChat) {
          chatMessage = buildDeterministicReply(username, viewerMessage);
        } else {
          try {
            const generated = await runtime.useModel(ModelType.TEXT_SMALL, {
              prompt: `You are a live TCG streamer replying to chat.

Viewer (@${username}) said: "${viewerMessage}"

Write one concise friendly response as plain text.
Rules:
- 1 sentence, max 180 characters
- no markdown, no quotes, no emojis
- mention the viewer as @${username}
- stay in gameplay context`,
              temperature: 0.4,
              maxTokens: 80,
            });

            if (typeof generated === "string" && generated.trim().length > 0) {
              chatMessage = generated.trim().replace(/^["']|["']$/g, "");
            } else {
              chatMessage = buildDeterministicReply(username, viewerMessage);
            }
          } catch (generationError) {
            logger.debug(
              { error: generationError },
              "Failed to generate Retake chat response, using deterministic fallback"
            );
            chatMessage = buildDeterministicReply(username, viewerMessage);
          }
        }
      }

      if (!chatMessage.trim()) {
        return { success: false, error: "Empty chat message" };
      }

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
          message: chatMessage.trim(),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Retake.tv chat API error: ${errorText}`);
      }

      logger.info("Chat message sent successfully");

      // Also send via callback for local chat
      if (callback) {
        await callback({
          text: `[To Retake Chat] ${chatMessage}`,
        });
      }

      return {
        success: true,
        data: {
          platform: "retake",
          messageSent: chatMessage.trim(),
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
