import type {
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
} from "convex/server";
import type { api } from "../component/_generated/api.js";

type RunQueryCtx = {
  runQuery: GenericQueryCtx<GenericDataModel>["runQuery"];
};

type RunMutationCtx = {
  runMutation: GenericMutationCtx<GenericDataModel>["runMutation"];
};

export type { RunQueryCtx, RunMutationCtx };

// Re-export the component API type for UseApi
export type { api };

/**
 * Client for the @lunchtable-tcg/social Convex component.
 *
 * Usage:
 * ```ts
 * import { components } from "@convex/_generated/api";
 * import { LTCGSocial } from "@lunchtable-tcg/social/client";
 *
 * const social = new LTCGSocial(components.ltcgSocial);
 *
 * export const myMutation = mutation({
 *   handler: async (ctx) => {
 *     await social.friends.sendRequest(ctx, { ... });
 *   }
 * });
 * ```
 */
export class LTCGSocial {
  public friends: FriendsClient;
  public messages: MessagesClient;
  public presence: PresenceClient;

  constructor(private component: typeof api) {
    this.friends = new FriendsClient(component);
    this.messages = new MessagesClient(component);
    this.presence = new PresenceClient(component);
  }
}

/**
 * Client for friend system operations.
 */
export class FriendsClient {
  constructor(private component: typeof api) {}

  async sendRequest(
    ctx: RunMutationCtx,
    args: {
      fromUserId: string;
      toUserId: string;
      metadata?: any;
    }
  ) {
    return await ctx.runMutation(this.component.friends.sendRequest, args);
  }

  async acceptRequest(
    ctx: RunMutationCtx,
    args: {
      requestId: string;
      userId: string;
    }
  ) {
    return await ctx.runMutation(this.component.friends.acceptRequest, {
      requestId: args.requestId as any,
      userId: args.userId,
    });
  }

  async declineRequest(
    ctx: RunMutationCtx,
    args: {
      requestId: string;
      userId: string;
    }
  ) {
    return await ctx.runMutation(this.component.friends.declineRequest, {
      requestId: args.requestId as any,
      userId: args.userId,
    });
  }

  async removeFriend(
    ctx: RunMutationCtx,
    args: {
      userId: string;
      friendId: string;
    }
  ) {
    return await ctx.runMutation(this.component.friends.removeFriend, args);
  }

  async blockUser(
    ctx: RunMutationCtx,
    args: {
      userId: string;
      blockedUserId: string;
      metadata?: any;
    }
  ) {
    return await ctx.runMutation(this.component.friends.blockUser, args);
  }

  async unblockUser(
    ctx: RunMutationCtx,
    args: {
      userId: string;
      blockedUserId: string;
    }
  ) {
    return await ctx.runMutation(this.component.friends.unblockUser, args);
  }

  async getFriends(ctx: RunQueryCtx, args: { userId: string }) {
    return await ctx.runQuery(this.component.friends.getFriends, args);
  }

  async getPendingRequests(ctx: RunQueryCtx, args: { userId: string }) {
    return await ctx.runQuery(this.component.friends.getPendingRequests, args);
  }

  async getFriendshipStatus(
    ctx: RunQueryCtx,
    args: {
      userId: string;
      otherUserId: string;
    }
  ) {
    return await ctx.runQuery(this.component.friends.getFriendshipStatus, args);
  }
}

/**
 * Client for direct messaging operations.
 */
export class MessagesClient {
  constructor(private component: typeof api) {}

  async sendMessage(
    ctx: RunMutationCtx,
    args: {
      senderId: string;
      recipientId: string;
      content: string;
      metadata?: any;
    }
  ) {
    return await ctx.runMutation(this.component.messages.sendMessage, args);
  }

  async getConversation(
    ctx: RunQueryCtx,
    args: {
      userId1: string;
      userId2: string;
    }
  ) {
    return await ctx.runQuery(this.component.messages.getConversation, args);
  }

  async getMessages(
    ctx: RunQueryCtx,
    args: {
      conversationId: string;
      limit?: number;
      before?: number;
    }
  ) {
    return await ctx.runQuery(this.component.messages.getMessages, {
      conversationId: args.conversationId as any,
      limit: args.limit,
      before: args.before,
    });
  }

  async getConversations(ctx: RunQueryCtx, args: { userId: string }) {
    return await ctx.runQuery(this.component.messages.getConversations, args);
  }

  async markRead(
    ctx: RunMutationCtx,
    args: {
      conversationId: string;
      userId: string;
    }
  ) {
    return await ctx.runMutation(this.component.messages.markRead, {
      conversationId: args.conversationId as any,
      userId: args.userId,
    });
  }
}

/**
 * Client for presence and notification operations.
 */
export class PresenceClient {
  constructor(private component: typeof api) {}

  async updatePresence(
    ctx: RunMutationCtx,
    args: {
      userId: string;
      status: string;
      currentActivity?: string;
      metadata?: any;
    }
  ) {
    return await ctx.runMutation(this.component.presence.updatePresence, args);
  }

  async getPresence(ctx: RunQueryCtx, args: { userId: string }) {
    return await ctx.runQuery(this.component.presence.getPresence, args);
  }

  async getBulkPresence(ctx: RunQueryCtx, args: { userIds: string[] }) {
    return await ctx.runQuery(this.component.presence.getBulkPresence, args);
  }

  async createNotification(
    ctx: RunMutationCtx,
    args: {
      userId: string;
      type: string;
      title: string;
      message: string;
      data?: any;
      metadata?: any;
    }
  ) {
    return await ctx.runMutation(
      this.component.presence.createNotification,
      args
    );
  }

  async getNotifications(
    ctx: RunQueryCtx,
    args: {
      userId: string;
      limit?: number;
      unreadOnly?: boolean;
    }
  ) {
    return await ctx.runQuery(this.component.presence.getNotifications, args);
  }

  async markNotificationRead(
    ctx: RunMutationCtx,
    args: {
      notificationId: string;
      userId: string;
    }
  ) {
    return await ctx.runMutation(
      this.component.presence.markNotificationRead,
      {
        notificationId: args.notificationId as any,
        userId: args.userId,
      }
    );
  }

  async clearNotifications(ctx: RunMutationCtx, args: { userId: string }) {
    return await ctx.runMutation(
      this.component.presence.clearNotifications,
      args
    );
  }
}
