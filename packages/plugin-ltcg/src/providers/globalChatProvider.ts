/**
 * Global Chat Provider
 *
 * Provides recent global chat messages and online user context to the LLM.
 * Allows agent to see what's being discussed in the Tavern Hall before deciding to participate.
 */

import type { IAgentRuntime, Memory, Provider, ProviderResult, State } from "@elizaos/core";
import { logger } from "@elizaos/core";
import { LTCGApiClient } from "../client/LTCGApiClient";

export const globalChatProvider: Provider = {
  name: "LTCG_GLOBAL_CHAT",
  description: "Provides recent global chat messages and online users in Tavern Hall",

  async get(runtime: IAgentRuntime, message: Memory, state: State): Promise<ProviderResult> {
    try {
      // Get API credentials
      const apiKey = runtime.getSetting("LTCG_API_KEY");
      const apiUrl = runtime.getSetting("LTCG_API_URL");

      if (!apiKey || !apiUrl) {
        return {
          text: "LTCG API credentials not configured.",
          values: { error: "MISSING_CONFIG" },
          data: {},
        };
      }

      // Create API client
      const client = new LTCGApiClient({
        apiKey: apiKey as string,
        baseUrl: apiUrl as string,
      });

      // Fetch recent chat messages (last 10 messages)
      const chatData = await client.getRecentMessages(10);
      const onlineData = await client.getOnlineUsers();

      // Format messages for LLM context
      const messageText =
        chatData.messages.length > 0
          ? chatData.messages
              .map((msg) => {
                const timestamp = new Date(msg.createdAt).toLocaleTimeString();
                const prefix = msg.isSystem ? "[SYSTEM]" : `${msg.username}:`;
                return `[${timestamp}] ${prefix} ${msg.message}`;
              })
              .join("\n")
          : "No recent messages.";

      // Format online users
      const onlineText =
        onlineData.users.length > 0
          ? onlineData.users
              .map((user) => {
                const statusEmoji =
                  user.status === "in_game" ? "🎮" : user.status === "idle" ? "💤" : "🟢";
                return `${statusEmoji} ${user.username} (${user.rank}, ${user.rankedElo} ELO)`;
              })
              .slice(0, 10)
              .join("\n")
          : "No users online.";

      // Build readable text
      const text = `Tavern Hall Chat (Last 10 Messages):
${messageText}

Online Users (${onlineData.count} total):
${onlineText}

Context:
- You can join the conversation with SEND_CHAT_MESSAGE action
- Messages are rate-limited to 5 per 10 seconds
- Use chat to banter, challenge players, or discuss strategy`;

      // Structured values
      const values = {
        messageCount: chatData.messages.length,
        onlineCount: onlineData.users.length,
        hasRecentActivity: chatData.messages.length > 0,
      };

      // Structured data for programmatic access
      const data = {
        messages: chatData.messages,
        onlineUsers: onlineData.users,
        latestMessage: chatData.messages[chatData.messages.length - 1] || null,
      };

      return { text, values, data };
    } catch (error) {
      logger.error({ error }, "Error fetching global chat");

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error fetching global chat";

      return {
        text: `Error fetching global chat: ${errorMessage}`,
        values: { error: "FETCH_ERROR" },
        data: { errorDetails: error },
      };
    }
  },
};
