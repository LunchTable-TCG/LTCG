import "server-only";

import * as generatedApi from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { ConvexHttpClient } from "convex/browser";

// biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
const apiAny = (generatedApi as any).api;

type AuthResult = {
  isInternal: boolean;
  isAgentApiKey: boolean;
  bearerToken: string | null;
  userId: Id<"users"> | null;
  agentId: Id<"agents"> | null;
};

type AgentLookupResult = {
  isAgentApiKey: boolean;
  userId: Id<"users"> | null;
  agentId: Id<"agents"> | null;
};

function createConvexClient() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
  }
  return new ConvexHttpClient(convexUrl);
}

function getBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    const apiKeyHeader = request.headers.get("x-api-key")?.trim();
    return apiKeyHeader && apiKeyHeader.length > 0 ? apiKeyHeader : null;
  }
  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}

async function resolveAgentApiKeyIdentity(
  convex: ConvexHttpClient,
  bearerToken: string | null,
  envAgentApiKey: string | undefined
): Promise<AgentLookupResult> {
  if (!bearerToken) {
    return { isAgentApiKey: false, userId: null, agentId: null };
  }

  // Avoid extra lookup for likely JWT tokens.
  const looksLikeAgentKey = bearerToken.startsWith("ltcg_");
  const matchesEnvAgentKey = Boolean(envAgentApiKey && bearerToken === envAgentApiKey);
  if (!looksLikeAgentKey && !matchesEnvAgentKey) {
    return { isAgentApiKey: false, userId: null, agentId: null };
  }

  try {
    const agent = await convex.query(apiAny.agents.agents.getAgentByApiKey, {
      apiKey: bearerToken,
    });

    if (!agent?.agentId) {
      // Keep backward compatibility for legacy single-key deployments,
      // but without an agent binding.
      if (matchesEnvAgentKey) {
        return { isAgentApiKey: true, userId: null, agentId: null };
      }
      return { isAgentApiKey: false, userId: null, agentId: null };
    }

    return {
      isAgentApiKey: true,
      userId: (agent.userId as Id<"users">) ?? null,
      agentId: agent.agentId as Id<"agents">,
    };
  } catch {
    if (matchesEnvAgentKey) {
      return { isAgentApiKey: true, userId: null, agentId: null };
    }
    return { isAgentApiKey: false, userId: null, agentId: null };
  }
}

/**
 * Resolve request auth context for streaming routes.
 *
 * This function RESOLVES identity — it does NOT enforce access control.
 * Callers MUST check the returned fields (userId, isInternal, isAgentApiKey)
 * and return 401/403 as appropriate for their route.
 *
 * Supports:
 * - Internal auth via X-Internal-Auth header
 * - Agent auth via LTCG_API_KEY bearer token
 * - User auth via Privy bearer token (validated through Convex auth context)
 * - No credentials → returns all-null result (callers decide whether to reject)
 */
export async function resolveStreamingAuth(request: Request): Promise<AuthResult> {
  const internalSecret = process.env.INTERNAL_API_SECRET?.trim();
  const internalHeader = request.headers.get("X-Internal-Auth")?.trim();
  const bearerToken = getBearerToken(request);
  const agentApiKey = process.env.LTCG_API_KEY?.trim();

  const isInternal = Boolean(internalSecret && internalHeader && internalHeader === internalSecret);
  if (isInternal) {
    return { isInternal: true, isAgentApiKey: false, bearerToken, userId: null, agentId: null };
  }

  // No bearer token: return unauthenticated result — callers enforce access
  if (!bearerToken) {
    return {
      isInternal: false,
      isAgentApiKey: false,
      bearerToken: null,
      userId: null,
      agentId: null,
    };
  }

  const convex = createConvexClient();
  const agentLookup = await resolveAgentApiKeyIdentity(convex, bearerToken, agentApiKey);
  if (agentLookup.isAgentApiKey) {
    return {
      isInternal: false,
      isAgentApiKey: true,
      bearerToken,
      userId: agentLookup.userId,
      agentId: agentLookup.agentId,
    };
  }

  // Bearer token present but not agent key: resolve as Privy user
  try {
    convex.setAuth(bearerToken);
    const currentUser = await convex.query(apiAny.core.users.currentUser, {});
    return {
      isInternal: false,
      isAgentApiKey: false,
      bearerToken,
      userId: currentUser?._id ?? null,
      agentId: null,
    };
  } catch {
    return {
      isInternal: false,
      isAgentApiKey: false,
      bearerToken,
      userId: null,
      agentId: null,
    };
  }
}
