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
 * Client for the @lunchtable-tcg/guilds Convex component.
 *
 * Usage:
 * ```ts
 * import { components } from "@convex/_generated/api";
 * import { LTCGGuilds } from "@lunchtable-tcg/guilds/client";
 *
 * const guilds = new LTCGGuilds(components.ltcgGuilds);
 *
 * export const myMutation = mutation({
 *   handler: async (ctx) => {
 *     await guilds.guilds.create(ctx, { ... });
 *   }
 * });
 * ```
 */
export class LTCGGuilds {
  public guilds: GuildsClient;
  public members: MembersClient;
  public invites: InvitesClient;

  constructor(private component: typeof api) {
    this.guilds = new GuildsClient(component);
    this.members = new MembersClient(component);
    this.invites = new InvitesClient(component);
  }
}

/**
 * Client for guild CRUD operations.
 */
export class GuildsClient {
  constructor(private component: typeof api) {}

  async create(
    ctx: RunMutationCtx,
    args: {
      ownerId: string;
      name: string;
      description?: string;
      tag?: string;
      imageUrl?: string;
      bannerUrl?: string;
      isPublic?: boolean;
      maxMembers?: number;
      metadata?: any;
    }
  ) {
    return await ctx.runMutation(this.component.guilds.create, args);
  }

  async getById(ctx: RunQueryCtx, args: { id: string }) {
    return await ctx.runQuery(this.component.guilds.getById, {
      id: args.id as any,
    });
  }

  async getByOwner(ctx: RunQueryCtx, args: { ownerId: string }) {
    return await ctx.runQuery(this.component.guilds.getByOwner, args);
  }

  async getPublicGuilds(ctx: RunQueryCtx, args?: { limit?: number }) {
    return await ctx.runQuery(this.component.guilds.getPublicGuilds, args || {});
  }

  async update(
    ctx: RunMutationCtx,
    args: {
      id: string;
      ownerId: string;
      name?: string;
      description?: string;
      tag?: string;
      imageUrl?: string;
      bannerUrl?: string;
      isPublic?: boolean;
      maxMembers?: number;
      metadata?: any;
    }
  ) {
    return await ctx.runMutation(this.component.guilds.update, {
      id: args.id as any,
      ownerId: args.ownerId,
      name: args.name,
      description: args.description,
      tag: args.tag,
      imageUrl: args.imageUrl,
      bannerUrl: args.bannerUrl,
      isPublic: args.isPublic,
      maxMembers: args.maxMembers,
      metadata: args.metadata,
    });
  }

  async disband(ctx: RunMutationCtx, args: { id: string; ownerId: string }) {
    return await ctx.runMutation(this.component.guilds.disband, {
      id: args.id as any,
      ownerId: args.ownerId,
    });
  }
}

/**
 * Client for guild member management.
 */
export class MembersClient {
  constructor(private component: typeof api) {}

  async join(ctx: RunMutationCtx, args: { guildId: string; userId: string }) {
    return await ctx.runMutation(this.component.members.join, {
      guildId: args.guildId as any,
      userId: args.userId,
    });
  }

  async leave(ctx: RunMutationCtx, args: { guildId: string; userId: string }) {
    return await ctx.runMutation(this.component.members.leave, {
      guildId: args.guildId as any,
      userId: args.userId,
    });
  }

  async kick(
    ctx: RunMutationCtx,
    args: {
      guildId: string;
      targetUserId: string;
      kickedBy: string;
    }
  ) {
    return await ctx.runMutation(this.component.members.kick, {
      guildId: args.guildId as any,
      targetUserId: args.targetUserId,
      kickedBy: args.kickedBy,
    });
  }

  async updateRole(
    ctx: RunMutationCtx,
    args: {
      guildId: string;
      targetUserId: string;
      newRole: string;
      updatedBy: string;
    }
  ) {
    return await ctx.runMutation(this.component.members.updateRole, {
      guildId: args.guildId as any,
      targetUserId: args.targetUserId,
      newRole: args.newRole,
      updatedBy: args.updatedBy,
    });
  }

  async transferOwnership(
    ctx: RunMutationCtx,
    args: {
      guildId: string;
      currentOwnerId: string;
      newOwnerId: string;
    }
  ) {
    return await ctx.runMutation(this.component.members.transferOwnership, {
      guildId: args.guildId as any,
      currentOwnerId: args.currentOwnerId,
      newOwnerId: args.newOwnerId,
    });
  }

  async getMembers(ctx: RunQueryCtx, args: { guildId: string }) {
    return await ctx.runQuery(this.component.members.getMembers, {
      guildId: args.guildId as any,
    });
  }

  async getMemberCount(ctx: RunQueryCtx, args: { guildId: string }) {
    return await ctx.runQuery(this.component.members.getMemberCount, {
      guildId: args.guildId as any,
    });
  }

  async getPlayerGuild(ctx: RunQueryCtx, args: { userId: string }) {
    return await ctx.runQuery(this.component.members.getPlayerGuild, args);
  }
}

/**
 * Client for guild invite system.
 */
export class InvitesClient {
  constructor(private component: typeof api) {}

  async createInvite(
    ctx: RunMutationCtx,
    args: {
      guildId: string;
      inviterId: string;
      inviteeId: string;
    }
  ) {
    return await ctx.runMutation(this.component.invites.createInvite, {
      guildId: args.guildId as any,
      inviterId: args.inviterId,
      inviteeId: args.inviteeId,
    });
  }

  async createInviteLink(
    ctx: RunMutationCtx,
    args: {
      guildId: string;
      createdBy: string;
      maxUses?: number;
      expiresIn?: number;
    }
  ) {
    return await ctx.runMutation(this.component.invites.createInviteLink, {
      guildId: args.guildId as any,
      createdBy: args.createdBy,
      maxUses: args.maxUses,
      expiresIn: args.expiresIn,
    });
  }

  async acceptInvite(
    ctx: RunMutationCtx,
    args: {
      inviteId: string;
      userId: string;
    }
  ) {
    return await ctx.runMutation(this.component.invites.acceptInvite, {
      inviteId: args.inviteId as any,
      userId: args.userId,
    });
  }

  async useInviteLink(
    ctx: RunMutationCtx,
    args: {
      code: string;
      userId: string;
    }
  ) {
    return await ctx.runMutation(this.component.invites.useInviteLink, args);
  }

  async declineInvite(
    ctx: RunMutationCtx,
    args: {
      inviteId: string;
      userId: string;
    }
  ) {
    return await ctx.runMutation(this.component.invites.declineInvite, {
      inviteId: args.inviteId as any,
      userId: args.userId,
    });
  }

  async cancelInvite(
    ctx: RunMutationCtx,
    args: {
      inviteId: string;
      cancelledBy: string;
    }
  ) {
    return await ctx.runMutation(this.component.invites.cancelInvite, {
      inviteId: args.inviteId as any,
      cancelledBy: args.cancelledBy,
    });
  }

  async getPendingInvites(ctx: RunQueryCtx, args: { userId: string }) {
    return await ctx.runQuery(this.component.invites.getPendingInvites, args);
  }

  async getGuildInvites(
    ctx: RunQueryCtx,
    args: {
      guildId: string;
      status?: string;
    }
  ) {
    return await ctx.runQuery(this.component.invites.getGuildInvites, {
      guildId: args.guildId as any,
      status: args.status,
    });
  }

  async getGuildInviteLinks(ctx: RunQueryCtx, args: { guildId: string }) {
    return await ctx.runQuery(this.component.invites.getGuildInviteLinks, {
      guildId: args.guildId as any,
    });
  }

  async deleteInviteLink(
    ctx: RunMutationCtx,
    args: {
      linkId: string;
      deletedBy: string;
    }
  ) {
    return await ctx.runMutation(this.component.invites.deleteInviteLink, {
      linkId: args.linkId as any,
      deletedBy: args.deletedBy,
    });
  }
}
