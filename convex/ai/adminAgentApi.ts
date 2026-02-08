/**
 * Admin Agent API Endpoints
 *
 * Provides the API layer for the Admin Assistant chat interface.
 * Handles thread management, message sending, and streaming responses.
 *
 * All endpoints require admin authentication (moderator role or higher).
 */

import { v } from "convex/values";
import * as generatedApi from "../_generated/api";
// biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
const apiAny = (generatedApi as any).api;
import { components } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { action } from "../_generated/server";
import { internalAny } from "../lib/internalHelpers";
import { adminAgent } from "./adminAgent";
import { setDatabaseApiKeys } from "./providers";

/**
 * Load API keys from database and set them for provider use
 */
async function loadDatabaseApiKeys(ctx: ActionCtx) {
  // Get OpenRouter key from database
  const openrouterKey = await ctx.runQuery(apiAny.admin.aiConfig.getAIConfigValue, {
    key: "ai.apikey.openrouter",
  });

  // Get Vercel/Gateway key from database
  const gatewayKey = await ctx.runQuery(apiAny.admin.aiConfig.getAIConfigValue, {
    key: "ai.apikey.vercel",
  });

  // Set the keys for provider use
  setDatabaseApiKeys({
    openrouter:
      typeof openrouterKey === "string" && openrouterKey.length > 0 ? openrouterKey : undefined,
    gateway: typeof gatewayKey === "string" && gatewayKey.length > 0 ? gatewayKey : undefined,
  });
}

// Type for thread data returned from the agent component
// Note: userId is stored as string (not Id<"users">) in the agent component
type ThreadDoc = {
  _id: string;
  _creationTime: number;
  userId?: string;
  title?: string;
  summary?: string;
  status?: string;
};

// =============================================================================
// Thread Management
// =============================================================================

/**
 * Get or create a chat thread for an admin user
 *
 * Creates a new thread if the admin doesn't have an active one,
 * otherwise returns the most recent active thread.
 */
export const getOrCreateThread = action({
  args: {},
  handler: async (
    ctx
  ): Promise<{
    threadId: string;
    title: string;
    createdAt: number;
    isNew: boolean;
  }> => {
    // Verify admin authentication using currentUser query
    const currentUser: Doc<"users"> | null = await ctx.runQuery(apiAny.core.users.currentUser, {});

    if (!currentUser) {
      throw new Error("Authentication required");
    }

    // Verify moderator role or higher
    const adminRole = await ctx.runQuery(apiAny.admin.admin.getMyAdminRole, {});
    if (!adminRole) {
      throw new Error("Admin role required");
    }

    // Check for existing thread
    const existingThreads: { page: ThreadDoc[]; continueCursor: string | null } =
      await ctx.runQuery(components.agent.threads.listThreadsByUserId, {
        userId: currentUser._id,
        paginationOpts: { numItems: 1, cursor: null },
      });

    if (existingThreads.page.length > 0) {
      const thread: ThreadDoc | undefined = existingThreads.page[0];
      if (thread) {
        return {
          threadId: thread._id,
          title: thread.title || "Admin Assistant",
          createdAt: thread._creationTime,
          isNew: false,
        };
      }
    }

    // Create new thread
    const { threadId }: { threadId: string } = await adminAgent.createThread(ctx, {
      userId: currentUser._id,
      title: "Admin Assistant Chat",
    });

    return {
      threadId,
      title: "Admin Assistant Chat",
      createdAt: Date.now(),
      isNew: true,
    };
  },
});

/**
 * Get message history for a thread
 */
export const getThreadHistory = action({
  args: {
    threadId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Verify authentication
    const user = await ctx.runQuery(apiAny.core.users.currentUser, {});

    if (!user) {
      throw new Error("Authentication required");
    }

    // Verify admin role
    const adminRole = await ctx.runQuery(apiAny.admin.admin.getMyAdminRole, {});
    if (!adminRole) {
      throw new Error("Admin role required");
    }

    // Get thread to verify ownership
    const thread = await ctx.runQuery(components.agent.threads.getThread, {
      threadId: args.threadId,
    });

    if (!thread) {
      throw new Error("Thread not found");
    }

    // Verify thread belongs to this user
    if (thread.userId !== user._id) {
      throw new Error("Access denied");
    }

    // Get messages using the component API
    const messages = await ctx.runQuery(components.agent.messages.listMessagesByThreadId, {
      threadId: args.threadId,
      order: "asc",
      paginationOpts: {
        numItems: args.limit ?? 50,
        cursor: null,
      },
    });

    return {
      threadId: args.threadId,
      messages: messages.page.map((msg) => ({
        id: msg._id,
        // The message type uses 'text' instead of 'content' in the component
        role: msg.tool ? "tool" : "assistant",
        content: msg.text ?? "",
        createdAt: msg._creationTime,
      })),
      hasMore: messages.continueCursor !== null,
    };
  },
});

/**
 * List all threads for an admin user
 */
export const listThreads = action({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    threads: Array<{
      threadId: string;
      title: string;
      summary?: string;
      createdAt: number;
      status?: string;
    }>;
    hasMore: boolean;
  }> => {
    // Verify authentication
    const currentUser: Doc<"users"> | null = await ctx.runQuery(apiAny.core.users.currentUser, {});

    if (!currentUser) {
      throw new Error("Authentication required");
    }

    // Verify admin role
    const adminRole = await ctx.runQuery(apiAny.admin.admin.getMyAdminRole, {});
    if (!adminRole) {
      throw new Error("Admin role required");
    }

    const threadsResult: { page: ThreadDoc[]; continueCursor: string | null } = await ctx.runQuery(
      components.agent.threads.listThreadsByUserId,
      {
        userId: currentUser._id,
        paginationOpts: {
          numItems: args.limit ?? 20,
          cursor: null,
        },
      }
    );

    return {
      threads: threadsResult.page.map((thread: ThreadDoc) => ({
        threadId: thread._id,
        title: thread.title || "Admin Assistant",
        summary: thread.summary,
        createdAt: thread._creationTime,
        status: thread.status,
      })),
      hasMore: threadsResult.continueCursor !== null,
    };
  },
});

// =============================================================================
// Message Handling
// =============================================================================

/**
 * Send a message and get a response (non-streaming)
 *
 * For simple interactions where streaming is not needed.
 */
export const sendMessage = action({
  args: {
    threadId: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    // Load API keys from database first
    await loadDatabaseApiKeys(ctx);

    // Verify authentication using currentUser query
    const user = await ctx.runQuery(apiAny.core.users.currentUser, {});

    if (!user) {
      throw new Error("Authentication required");
    }

    // Verify admin role
    const adminRole = await ctx.runQuery(apiAny.admin.admin.getMyAdminRole, {});
    if (!adminRole) {
      throw new Error("Admin role required");
    }

    // Verify thread ownership
    const thread = await ctx.runQuery(components.agent.threads.getThread, {
      threadId: args.threadId,
    });

    if (!thread || thread.userId !== user._id) {
      throw new Error("Thread not found or access denied");
    }

    // Validate message
    const trimmedMessage = args.message.trim();
    if (trimmedMessage.length === 0) {
      throw new Error("Message cannot be empty");
    }
    if (trimmedMessage.length > 4000) {
      throw new Error("Message too long (max 4000 characters)");
    }

    // Generate response using the agent
    // biome-ignore lint/suspicious/noExplicitAny: @convex-dev/agent type inference workaround
    const promptArgs = { prompt: trimmedMessage } as any;
    const result = await adminAgent.generateText(ctx, { threadId: args.threadId }, promptArgs);

    // Log the agent action for audit (using internalAny to avoid type issues)
    await ctx.runMutation(internalAny.ai.adminAgentAudit.logAgentResponse, {
      adminId: user._id,
      threadId: args.threadId,
      promptLength: trimmedMessage.length,
      responseLength: result.text.length,
      toolCallCount: result.toolCalls?.length ?? 0,
    });

    return {
      messageId: result.messageId,
      text: result.text,
      toolCalls: result.toolCalls,
      usage: result.usage,
    };
  },
});

/**
 * Send a message with streaming response
 *
 * For real-time feedback during agent responses.
 * Saves stream deltas to the database for client subscription.
 */
export const streamMessage = action({
  args: {
    threadId: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    // Load API keys from database first
    await loadDatabaseApiKeys(ctx);

    // Verify authentication using currentUser query
    const user = await ctx.runQuery(apiAny.core.users.currentUser, {});

    if (!user) {
      throw new Error("Authentication required");
    }

    // Verify admin role
    const adminRole = await ctx.runQuery(apiAny.admin.admin.getMyAdminRole, {});
    if (!adminRole) {
      throw new Error("Admin role required");
    }

    // Verify thread ownership
    const thread = await ctx.runQuery(components.agent.threads.getThread, {
      threadId: args.threadId,
    });

    if (!thread || thread.userId !== user._id) {
      throw new Error("Thread not found or access denied");
    }

    // Validate message
    const trimmedMessage = args.message.trim();
    if (trimmedMessage.length === 0) {
      throw new Error("Message cannot be empty");
    }
    if (trimmedMessage.length > 4000) {
      throw new Error("Message too long (max 4000 characters)");
    }

    // Stream response using the agent with delta saving
    // biome-ignore lint/suspicious/noExplicitAny: @convex-dev/agent type inference workaround
    const streamPromptArgs = { prompt: trimmedMessage } as any;
    const result = await adminAgent.streamText(ctx, { threadId: args.threadId }, streamPromptArgs, {
      saveStreamDeltas: true,
    });

    // Collect the full response for logging
    let fullText = "";
    for await (const textPart of result.textStream) {
      fullText += textPart;
    }

    // Log the agent action (using internalAny to avoid type issues)
    await ctx.runMutation(internalAny.ai.adminAgentAudit.logAgentResponse, {
      adminId: user._id,
      threadId: args.threadId,
      promptLength: trimmedMessage.length,
      responseLength: fullText.length,
      toolCallCount: 0, // Tool calls aren't easily available from stream
    });

    return {
      messageId: result.messageId,
      text: fullText,
    };
  },
});

// =============================================================================
// Thread Cleanup
// =============================================================================

/**
 * Delete a thread and all its messages
 */
export const deleteThread = action({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify authentication
    const user = await ctx.runQuery(apiAny.core.users.currentUser, {});

    if (!user) {
      throw new Error("Authentication required");
    }

    // Verify admin role
    const adminRole = await ctx.runQuery(apiAny.admin.admin.getMyAdminRole, {});
    if (!adminRole) {
      throw new Error("Admin role required");
    }

    // Verify thread ownership
    const thread = await ctx.runQuery(components.agent.threads.getThread, {
      threadId: args.threadId,
    });

    if (!thread) {
      return { success: false, error: "Thread not found" };
    }

    if (thread.userId !== user._id) {
      return { success: false, error: "Access denied" };
    }

    // Delete thread synchronously (handles cleanup of messages)
    await adminAgent.deleteThreadSync(ctx, { threadId: args.threadId });

    return { success: true };
  },
});

/**
 * Clear all threads for the current admin (useful for cleanup)
 */
export const clearAllThreads = action({
  args: {},
  handler: async (ctx) => {
    // Verify authentication
    const user = await ctx.runQuery(apiAny.core.users.currentUser, {});

    if (!user) {
      throw new Error("Authentication required");
    }

    // Verify full admin role for bulk delete
    const adminRole = await ctx.runQuery(apiAny.admin.admin.getMyAdminRole, {});
    if (!adminRole || adminRole.role === "moderator") {
      throw new Error("Full admin role required for bulk delete");
    }

    // Get all threads for user
    const threads = await ctx.runQuery(components.agent.threads.listThreadsByUserId, {
      userId: user._id,
      paginationOpts: { numItems: 100, cursor: null },
    });

    // Delete each thread
    let deletedCount = 0;
    for (const thread of threads.page) {
      await adminAgent.deleteThreadSync(ctx, { threadId: thread._id });
      deletedCount++;
    }

    return { success: true, deletedCount };
  },
});

// =============================================================================
// Stream Subscription
// =============================================================================

/**
 * Get stream deltas for a message (for real-time updates)
 */
export const getStreamDeltas = action({
  args: {
    threadId: v.string(),
    messageId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify authentication
    const user = await ctx.runQuery(apiAny.core.users.currentUser, {});

    if (!user) {
      throw new Error("Authentication required");
    }

    // Verify admin role
    const adminRole = await ctx.runQuery(apiAny.admin.admin.getMyAdminRole, {});
    if (!adminRole) {
      throw new Error("Admin role required");
    }

    // Get the deltas from the agent component
    const deltas = await ctx.runQuery(components.agent.streams.listDeltas, {
      threadId: args.threadId,
      cursors: [{ streamId: args.messageId, cursor: 0 }],
    });

    return deltas;
  },
});
