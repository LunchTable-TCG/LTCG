import { ModelType, Service, type IAgentRuntime } from "@elizaos/core";
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
    /** Author's DB ID (used for self-message detection) */
    authorId?: string;
  };
  message: string;
  timestamp: number;
  type: "chat" | "tip" | "system";
}

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

export class RetakeChatService extends Service {
  private pollingInterval: NodeJS.Timeout | null = null;
  private readonly seenMessageIds = new Set<string>();
  private readonly maxTrackedMessageIds = 500;
  private isPolling = false;
  private lastReplyAt = 0;
  private readonly chatReplyCooldownMs = Math.max(
    1000,
    Number.parseInt(process.env.LTCG_RETAKE_CHAT_REPLY_COOLDOWN_MS || "8000", 10) || 8000
  );
  private readonly pollIntervalMs = Math.max(
    1000,
    Number.parseInt(process.env.LTCG_RETAKE_CHAT_POLL_INTERVAL_MS || "3000", 10) || 3000
  );
  private readonly useLlmForChat = isEnabled(
    process.env.LTCG_RETAKE_CHAT_USE_LLM ?? this.runtime.getSetting("LTCG_RETAKE_CHAT_USE_LLM")
  );
  private readonly selfUsernames = new Set<string>();

  static override serviceType = "retake_chat";
  capabilityDescription = "Polls Retake.tv chat for viewer messages during streams";

  static override async start(runtime: IAgentRuntime): Promise<Service> {
    const service = new RetakeChatService(runtime);
    await service.initialize();
    return service;
  }

  static override async stop(_runtime: IAgentRuntime): Promise<void> {
    // Cleanup handled by instance stop()
  }

  async initialize(): Promise<void> {
    logger.info("Retake Chat Service initialized");
    this.selfUsernames.clear();
    const candidateNames = [
      this.runtime.character?.name,
      this.runtime.character?.username,
      this.runtime.getSetting("LTCG_AGENT_NAME"),
      this.runtime.getSetting("RETAKE_USERNAME"),
      process.env.LTCG_AGENT_NAME,
      process.env.RETAKE_USERNAME,
    ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);
    for (const candidate of candidateNames) {
      this.selfUsernames.add(candidate.trim().toLowerCase());
    }

    // Check if Retake credentials are available
    const accessToken = this.getAccessToken();
    const userDbId = this.getUserDbId();
    if (!accessToken || !userDbId) {
      logger.warn("Retake.tv chat credentials not configured - chat polling disabled");
      return;
    }

    // Start polling when streaming is active
    this.startPolling();
  }

  async stop(): Promise<void> {
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
    const userDbId = this.getUserDbId();
    if (!accessToken || !userDbId) {
      return;
    }

    this.isPolling = true;
    logger.info({ pollIntervalMs: this.pollIntervalMs }, "Starting Retake chat polling");

    // Poll at configured interval
    this.pollingInterval = setInterval(async () => {
      try {
        await this.pollChat();
      } catch (error) {
        logger.error("Error polling chat:", error);
      }
    }, this.pollIntervalMs);
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
    const userDbId = this.getUserDbId();
    if (!accessToken || !userDbId) {
      return;
    }

    try {
      const response = await fetch(
        `https://chat.retake.tv/api/agent/stream/comments?userDbId=${encodeURIComponent(userDbId)}`,
        {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        if (response.status === 401) {
          logger.error("Retake.tv authentication failed - check access token");
          this.stopPolling();
          return;
        }
        if (response.status === 404) {
          // Chat endpoint not available (stream not live yet) — silently skip
          return;
        }
        throw new Error(`Chat API error: ${response.status}`);
      }

      const data = await response.json();
      const rawMessages = Array.isArray(data)
        ? data
        : Array.isArray((data as Record<string, unknown>).messages)
          ? ((data as Record<string, unknown>).messages as unknown[])
          : Array.isArray((data as Record<string, unknown>).comments)
            ? ((data as Record<string, unknown>).comments as unknown[])
            : [];

      // Process new messages
      for (const rawMessage of rawMessages) {
        const message = this.normalizeMessage(rawMessage);
        if (!message) {
          logger.debug({ keys: rawMessage && typeof rawMessage === "object" ? Object.keys(rawMessage as object) : typeof rawMessage }, "Dropped unparseable Retake comment");
          continue;
        }

        if (this.seenMessageIds.has(message.id)) {
          continue;
        }

        const handled = await this.processMessage(message);
        if (handled) {
          this.trackMessageId(message.id);
        }
        // If not handled (cooldown), don't track — it'll be retried next poll
      }
    } catch (error) {
      // Log briefly but don't stop polling - network issues may be temporary
      const msg = error instanceof Error ? error.message : String(error);
      logger.debug(`Retake chat poll error: ${msg}`);
    }
  }

  private normalizeMessage(rawMessage: unknown): RetakeChatMessage | null {
    if (!rawMessage || typeof rawMessage !== "object") {
      return null;
    }
    const message = rawMessage as Record<string, unknown>;
    const user =
      message.user && typeof message.user === "object"
        ? (message.user as Record<string, unknown>)
        : undefined;
    const author =
      message.author && typeof message.author === "object"
        ? (message.author as Record<string, unknown>)
        : undefined;

    const id = this.firstNonEmptyString(
      message.id,
      message._id,
      message.commentId,
      message.messageId
    );
    const text = this.firstNonEmptyString(
      message.message,
      message.text,
      message.comment,
      message.content
    );
    const username = this.firstNonEmptyString(
      user?.username,
      user?.name,
      user?.handle,
      author?.fusername,
      author?.username,
      author?.name,
      message.username,
      message.author
    );

    if (!id || !text || !username) {
      return null;
    }

    const avatar = this.firstNonEmptyString(
      user?.avatar,
      user?.image,
      author?.favatar,
      author?.avatar,
      message.avatar
    );
    const timestampRaw =
      typeof message.timestamp === "number"
        ? message.timestamp
        : typeof message.createdAt === "number"
          ? message.createdAt
          : typeof message.timestamp === "string"
            ? Date.parse(message.timestamp)
            : typeof message.createdAt === "string"
              ? Date.parse(message.createdAt)
              : Date.now();
    const timestamp = Number.isFinite(timestampRaw) ? timestampRaw : Date.now();
    const typeValue = this.firstNonEmptyString(message.type);
    const type: RetakeChatMessage["type"] =
      typeValue === "tip" || typeValue === "system" ? typeValue : "chat";

    // Extract author DB ID for self-message detection
    const authorId = this.firstNonEmptyString(
      author?._id,
      author?.id,
      author?.userDbId,
      user?._id,
      user?.id,
      message.userId,
      message.userDbId
    );

    return {
      id,
      user: {
        username,
        ...(avatar ? { avatar } : {}),
        ...(authorId ? { authorId } : {}),
      },
      message: text,
      timestamp,
      type,
    };
  }

  private firstNonEmptyString(...values: unknown[]): string | undefined {
    for (const value of values) {
      if (typeof value === "string" && value.trim().length > 0) {
        return value.trim();
      }
    }
    return undefined;
  }

  private trackMessageId(messageId: string): void {
    this.seenMessageIds.add(messageId);
    if (this.seenMessageIds.size > this.maxTrackedMessageIds) {
      const oldest = this.seenMessageIds.values().next().value;
      if (oldest) {
        this.seenMessageIds.delete(oldest);
      }
    }
  }

  /**
   * Process an incoming chat message.
   * @returns true if permanently handled (replied, self, system, tip), false if cooldown-skipped
   */
  private async processMessage(message: RetakeChatMessage): Promise<boolean> {
    logger.info(
      `Received chat message from ${message.user.username} (${message.type}, ${message.message.length} chars)`
    );

    // Skip system messages
    if (message.type === "system") {
      return true;
    }

    if (this.isSelfMessage(message.user.username, message.user.authorId)) {
      logger.debug({ username: message.user.username, authorId: message.user.authorId }, "Skipping self-authored Retake chat message");
      return true;
    }

    // Handle tips specially
    if (message.type === "tip") {
      await this.handleTip(message);
      return true;
    }

    const now = Date.now();
    if (now - this.lastReplyAt < this.chatReplyCooldownMs) {
      logger.debug(
        `Chat reply cooldown active (${this.chatReplyCooldownMs}ms) — deferring message from @${message.user.username}`
      );
      return false;
    }

    // Reply directly so chat responses are reliable even when action routing is delayed.
    try {
      const reply = await this.buildReply(message.user.username, message.message);
      if (!reply.trim()) {
        return true;
      }

      await this.sendChatMessage(reply.trim());
      this.lastReplyAt = Date.now();
      return true;
    } catch (error) {
      logger.error("Failed to send Retake chat reply:", error);
      return true; // Don't retry failed sends — avoid spam
    }
  }

  /**
   * Handle tip notifications
   */
  private async handleTip(message: RetakeChatMessage): Promise<void> {
    logger.info(
      `Received tip from ${message.user.username}: ${message.message}`
    );

    try {
      await this.sendChatMessage(`Thank you @${message.user.username} for the tip! Much appreciated!`);
      this.lastReplyAt = Date.now();
    } catch (error) {
      logger.error("Failed to send tip thank you:", error);
    }
  }

  private isSelfMessage(username: string, authorId?: string): boolean {
    if (this.selfUsernames.has(username.trim().toLowerCase())) {
      return true;
    }
    // Check if the author's DB ID matches the agent's configured userDbId
    if (authorId) {
      const myUserDbId = this.getUserDbId();
      if (myUserDbId && authorId === myUserDbId) {
        // Cache this username so future checks are faster
        this.selfUsernames.add(username.trim().toLowerCase());
        return true;
      }
    }
    return false;
  }

  private async buildReply(username: string, viewerMessage: string): Promise<string> {
    if (!this.useLlmForChat) {
      return buildDeterministicReply(username, viewerMessage);
    }

    try {
      const generated = await this.runtime.useModel(ModelType.TEXT_SMALL, {
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
        return generated.trim().replace(/^["']|["']$/g, "");
      }
    } catch (error) {
      logger.debug({ error }, "Failed to generate LLM Retake chat reply, using deterministic fallback");
    }

    return buildDeterministicReply(username, viewerMessage);
  }

  private async sendChatMessage(chatMessage: string): Promise<void> {
    const accessToken = this.getAccessToken();
    const userDbId = this.getUserDbId();
    if (!accessToken || !userDbId) {
      throw new Error("Retake chat credentials are missing");
    }

    const response = await fetch("https://chat.retake.tv/api/agent/chat/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userDbId,
        message: chatMessage,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => `status ${response.status}`);
      throw new Error(`Retake chat API error (${response.status}): ${errorText}`);
    }

    // Track the sent message ID to prevent echo on next poll
    try {
      const body = await response.json() as Record<string, unknown>;
      const sentId =
        typeof body._id === "string" ? body._id
        : typeof body.id === "string" ? body.id
        : typeof body.commentId === "string" ? body.commentId
        : null;
      if (sentId) {
        this.trackMessageId(sentId);
      }
    } catch {
      // Response may not have a JSON body — that's fine
    }
  }

  /**
   * Get Retake.tv access token from runtime settings
   */
  private getAccessToken(): string | null {
    const token =
      this.runtime.getSetting("RETAKE_ACCESS_TOKEN") ||
      process.env.RETAKE_ACCESS_TOKEN ||
      process.env.DIZZY_RETAKE_ACCESS_TOKEN ||
      null;

    return typeof token === "string" ? token : null;
  }

  private getUserDbId(): string | null {
    const userDbId =
      this.runtime.getSetting("RETAKE_USER_DB_ID") ||
      process.env.RETAKE_USER_DB_ID ||
      process.env.DIZZY_RETAKE_USER_DB_ID ||
      null;

    return typeof userDbId === "string" && userDbId.trim().length > 0 ? userDbId.trim() : null;
  }
}

export default RetakeChatService;
