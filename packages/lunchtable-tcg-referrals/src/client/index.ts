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
export type { api };

/**
 * Client for the @lunchtable-tcg/referrals Convex component.
 *
 * Usage:
 * ```ts
 * import { components } from "@convex/_generated/api";
 * import { LTCGReferrals } from "@lunchtable-tcg/referrals";
 *
 * const referrals = new LTCGReferrals(components.ltcgReferrals);
 *
 * export const myMutation = mutation({
 *   handler: async (ctx) => {
 *     await referrals.referrals.getReferralLink(ctx, userId);
 *   }
 * });
 * ```
 */
export class LTCGReferrals {
  public referrals: ReferralsClient;

  constructor(private component: typeof api) {
    this.referrals = new ReferralsClient(component);
  }
}

// ============================================================================
// REFERRALS CLIENT
// ============================================================================

export class ReferralsClient {
  constructor(private component: typeof api) {}

  async createReferralLink(ctx: RunMutationCtx, userId: string, code: string) {
    return await ctx.runMutation(this.component.referrals.createReferralLink, {
      userId,
      code,
    });
  }

  async getReferralLink(ctx: RunQueryCtx, userId: string) {
    return await ctx.runQuery(this.component.referrals.getReferralLink, {
      userId,
    });
  }

  async getReferralLinkByCode(ctx: RunQueryCtx, code: string) {
    return await ctx.runQuery(this.component.referrals.getReferralLinkByCode, {
      code,
    });
  }

  async incrementLinkUses(ctx: RunMutationCtx, linkId: string) {
    return await ctx.runMutation(this.component.referrals.incrementLinkUses, {
      linkId: linkId as any,
    });
  }

  async deactivateUserLinks(ctx: RunMutationCtx, userId: string) {
    return await ctx.runMutation(this.component.referrals.deactivateUserLinks, {
      userId,
    });
  }

  async recordReferral(
    ctx: RunMutationCtx,
    referrerId: string,
    referredUserId: string,
    referralCode: string
  ) {
    return await ctx.runMutation(this.component.referrals.recordReferral, {
      referrerId,
      referredUserId,
      referralCode,
    });
  }

  async getReferralsByReferrer(ctx: RunQueryCtx, referrerId: string) {
    return await ctx.runQuery(
      this.component.referrals.getReferralsByReferrer,
      { referrerId }
    );
  }

  async getReferralCount(ctx: RunQueryCtx, referrerId: string) {
    return await ctx.runQuery(this.component.referrals.getReferralCount, {
      referrerId,
    });
  }
}
