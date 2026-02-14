/**
 * Admin API Endpoints
 *
 * Operator-level endpoints for managing game configuration and seeding cards.
 */

import * as generatedApi from "../_generated/api";
// biome-ignore lint/suspicious/noExplicitAny: Convex internal type workaround for TS2589
const api = (generatedApi as any).api;
import { httpAction } from "../_generated/server";
import {
  corsPreflightResponse,
  errorResponse,
  parseJsonBody,
  successResponse,
} from "./middleware/responses";

/**
 * GET /api/admin/config
 */
export const getConfig = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }
  if (request.method !== "GET") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only GET method is allowed", 405);
  }
  try {
    const config = await ctx.runQuery(api.admin.gameConfig.getConfig, {});
    return successResponse(config);
  } catch (error) {
    return errorResponse(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Failed to get config",
      500,
    );
  }
});

/**
 * PUT /api/admin/config
 */
export const updateConfig = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }
  if (request.method !== "PUT") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only PUT method is allowed", 405);
  }
  try {
    const body = await parseJsonBody<{
      updates: Record<string, unknown>;
      updatedBy?: string;
    }>(request);
    if (body instanceof Response) return body;

    if (!body.updates || typeof body.updates !== "object") {
      return errorResponse("VALIDATION_ERROR", "updates must be an object", 400);
    }

    await ctx.runMutation(api.admin.gameConfig.updateConfig, {
      updates: JSON.stringify(body.updates),
      updatedBy: body.updatedBy,
    });

    const config = await ctx.runQuery(api.admin.gameConfig.getConfig, {});
    return successResponse(config);
  } catch (error) {
    return errorResponse(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Failed to update config",
      500,
    );
  }
});

/**
 * POST /api/admin/seed-cards
 */
export const seedCards = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }
  if (request.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only POST method is allowed", 405);
  }
  try {
    const body = await parseJsonBody<{
      cards: Array<Record<string, unknown>>;
    }>(request);
    if (body instanceof Response) return body;

    if (!Array.isArray(body.cards) || body.cards.length === 0) {
      return errorResponse("VALIDATION_ERROR", "cards must be a non-empty array", 400);
    }

    let seeded = 0;
    for (const card of body.cards) {
      await ctx.runMutation(api.admin.seedCard.insertCard, {
        name: card.name as string,
        rarity: card.rarity as string,
        archetype: (card.archetype as string) ?? "",
        cardType: card.cardType as string,
        attack: card.attack as number | undefined,
        defense: card.defense as number | undefined,
        cost: (card.cost as number) ?? 0,
        level: card.level as number | undefined,
        attribute: card.attribute as string | undefined,
        spellType: card.spellType as string | undefined,
        trapType: card.trapType as string | undefined,
        viceType: card.viceType as string | undefined,
        ability: card.ability,
        flavorText: card.flavorText as string | undefined,
        imageUrl: card.imageUrl as string | undefined,
        isActive: true,
        createdAt: Date.now(),
      });
      seeded++;
    }

    return successResponse({ seeded, total: body.cards.length });
  } catch (error) {
    return errorResponse(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Failed to seed cards",
      500,
    );
  }
});
