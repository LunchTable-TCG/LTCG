import type {
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
} from "convex/server";
import type { api } from "../component/_generated/api.js";

type RunQueryCtx = { runQuery: GenericQueryCtx<GenericDataModel>["runQuery"] };
type RunMutationCtx = { runMutation: GenericMutationCtx<GenericDataModel>["runMutation"] };

export type { RunQueryCtx, RunMutationCtx };
export type { api };

export class LTCGStreaming {
  public sessions: SessionsClient;
  public destinations: DestinationsClient;

  constructor(private component: typeof api) {
    this.sessions = new SessionsClient(component);
    this.destinations = new DestinationsClient(component);
  }
}

class SessionsClient {
  constructor(private component: typeof api) {}

  async createSession(ctx: RunMutationCtx, args: any) {
    return await ctx.runMutation(this.component.sessions.createSession, args);
  }
  async getSession(ctx: RunQueryCtx, sessionId: string) {
    return await ctx.runQuery(this.component.sessions.getSession, { sessionId: sessionId as any });
  }
  async getSessionByEgress(ctx: RunQueryCtx, egressId: string) {
    return await ctx.runQuery(this.component.sessions.getSessionByEgress, { egressId });
  }
  async getActiveSessions(ctx: RunQueryCtx) {
    return await ctx.runQuery(this.component.sessions.getActiveSessions, {});
  }
  async getSessionsByUser(ctx: RunQueryCtx, userId: string, limit?: number) {
    return await ctx.runQuery(this.component.sessions.getSessionsByUser, { userId, limit });
  }
  async getSessionsByAgent(ctx: RunQueryCtx, agentId: string, limit?: number) {
    return await ctx.runQuery(this.component.sessions.getSessionsByAgent, { agentId, limit });
  }
  async updateSession(ctx: RunMutationCtx, sessionId: string, updates: any) {
    return await ctx.runMutation(this.component.sessions.updateSession, { sessionId: sessionId as any, updates });
  }
  async endSession(ctx: RunMutationCtx, sessionId: string, endReason?: string, stats?: any) {
    return await ctx.runMutation(this.component.sessions.endSession, { sessionId: sessionId as any, endReason, stats });
  }
}

class DestinationsClient {
  constructor(private component: typeof api) {}

  async addDestination(ctx: RunMutationCtx, args: any) {
    return await ctx.runMutation(this.component.destinations.addDestination, args);
  }
  async removeDestination(ctx: RunMutationCtx, destinationId: string) {
    return await ctx.runMutation(this.component.destinations.removeDestination, { destinationId: destinationId as any });
  }
  async getDestinations(ctx: RunQueryCtx, sessionId: string) {
    return await ctx.runQuery(this.component.destinations.getDestinations, { sessionId: sessionId as any });
  }
  async getActiveDestinations(ctx: RunQueryCtx, sessionId: string) {
    return await ctx.runQuery(this.component.destinations.getActiveDestinations, { sessionId: sessionId as any });
  }
}
