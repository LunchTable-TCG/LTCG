import type { IAgentRuntime, Service, ServiceType } from "@elizaos/core";
import { logger } from "../utils/logger";

/**
 * Retake.tv Chat Polling Service
 *
 * Polls Retake.tv chat API for new messages and processes them
 * for the agent to respond to during streams.
 */

interface RetakeChatMessage {
  id: string;
  user: {
    username: string;
    avatar?: string;
  };
  message: string;
  timestamp: number;
  type: "chat" | "tip" | "system";
}

export class RetakeChatService implements Service {
  private runtime: IAgentRuntime | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastMessageId: string | null = null;
  private isPolling = false;

  static serviceType: ServiceType = "retake_chat" as ServiceType;

  async initialize(runtime: IAgentRuntime): Promise<void> {
    this.runtime = runtime;
    logger.info("Retake Chat Service initialized");

    // Check if Retake credentials are available
    const accessToken = this.getAccessToken();
    if (!accessToken) {
      logger.warn("Retake.tv credentials not configured - chat polling disabled");
      return;
    }

    // Start polling when streaming is active
    this.startPolling();
  }

  async cleanup(): Promise<void> {
    this.stopPolling();
    logger.info("Retake Chat Service cleaned up");
  }

  /**
   * Start polling for new chat messages
   */
  startPolling(): void {
    if (this.isPolling) {
      return;
    }

    const accessToken = this.getAccessToken();
    if (!accessToken) {
      return;
    }

    this.isPolling = true;
    logger.info("Starting Retake chat polling");

    // Poll every 3 seconds
    this.pollingInterval = setInterval(async () => {
      try {
        await this.pollChat();
      } catch (error) {
        logger.error("Error polling chat:", error);
      }
    }, 3000);
  }

  /**
   * Stop polling for chat messages
   */
  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isPolling = false;
    logger.info("Stopped Retake chat polling");
  }

  /**
   * Poll Retake.tv chat API for new messages
   */
  private async pollChat(): Promise<void> {
    const accessToken = this.getAccessToken();
    if (!accessToken || !this.runtime) {
      return;
    }

    try {
      const response = await fetch("https://chat.retake.tv/api/agent/chat", {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          logger.error("Retake.tv authentication failed - check access token");
          this.stopPolling();
          return;
        }
        throw new Error(`Chat API error: ${response.status}`);
      }

      const data = await response.json();
      const messages: RetakeChatMessage[] = data.messages || [];

      // Process new messages
      for (const message of messages) {
        // Skip if we've already processed this message
        if (this.lastMessageId && message.id <= this.lastMessageId) {
          continue;
        }

        await this.processMessage(message);
        this.lastMessageId = message.id;
      }
    } catch (error) {
      // Log but don't stop polling - network issues may be temporary
      logger.error("Failed to poll chat:", error);
    }
  }

  /**
   * Process an incoming chat message
   */
  private async processMessage(message: RetakeChatMessage): Promise<void> {
    if (!this.runtime) {
      return;
    }

    logger.info("Received chat message", {
      from: message.user.username,
      type: message.type,
      messageLength: message.message.length,
    });

    // Skip system messages
    if (message.type === "system") {
      return;
    }

    // Handle tips specially
    if (message.type === "tip") {
      await this.handleTip(message);
      return;
    }

    // Process chat messages through the agent's runtime
    // This will trigger appropriate actions/evaluators to generate a response
    try {
      const memory = {
        userId: message.user.username,
        agentId: this.runtime.agentId,
        roomId: "retake_chat",
        content: {
          text: message.message,
          source: "retake_chat",
          metadata: {
            username: message.user.username,
            avatar: message.user.avatar,
            timestamp: message.timestamp,
          },
        },
      };

      // Let the runtime process the message and generate responses
      // The agent's evaluators and actions will determine how to respond
      await this.runtime.processMessage(memory);
    } catch (error) {
      logger.error("Failed to process chat message:", error);
    }
  }

  /**
   * Handle tip notifications
   */
  private async handleTip(message: RetakeChatMessage): Promise<void> {
    logger.info("Received tip", {
      from: message.user.username,
      message: message.message,
    });

    // Send a thank you message via the chat response action
    if (this.runtime) {
      const thankYouMessage = {
        userId: message.user.username,
        agentId: this.runtime.agentId,
        roomId: "retake_chat",
        content: {
          text: `Thank you @${message.user.username} for the tip! 💖 Much appreciated!`,
          source: "retake_chat",
          action: "RETAKE_CHAT_RESPONSE",
        },
      };

      try {
        await this.runtime.processMessage(thankYouMessage);
      } catch (error) {
        logger.error("Failed to send tip thank you:", error);
      }
    }
  }

  /**
   * Get Retake.tv access token from runtime settings
   */
  private getAccessToken(): string | null {
    if (!this.runtime) {
      return null;
    }

    return (
      this.runtime.getSetting("RETAKE_ACCESS_TOKEN") ||
      process.env.RETAKE_ACCESS_TOKEN ||
      process.env.DIZZY_RETAKE_ACCESS_TOKEN ||
      null
    );
  }
}

export default RetakeChatService;
