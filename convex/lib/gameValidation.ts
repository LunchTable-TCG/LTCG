/**
 * Game Validation Helpers
 *
 * Centralized validation functions for gameplay mutations.
 * Ensures game state consistency and prevents actions on inactive games.
 */

import type { GenericDatabaseReader } from "convex/server";
import type { DataModel } from "../_generated/dataModel";
import type { Id } from "../_generated/dataModel";
import { ErrorCode, createError } from "./errorCodes";

type DatabaseReader = GenericDatabaseReader<DataModel>;

/**
 * Validates that a game is still active and can accept actions.
 *
 * This should be called at the start of gameplay mutations (after authentication)
 * to prevent players from performing actions on games that have ended.
 *
 * @param db - Database reader from mutation context
 * @param lobbyId - The game lobby ID to validate
 * @throws Error with GAME_NOT_FOUND code if lobby doesn't exist
 * @throws Error with GAME_NOT_ACTIVE code if game is not active
 */
export async function validateGameActive(
  db: DatabaseReader,
  lobbyId: Id<"gameLobbies">
): Promise<void> {
  const lobby = await db.get(lobbyId);
  if (!lobby) {
    throw createError(ErrorCode.NOT_FOUND_LOBBY, { lobbyId });
  }

  // Check if game has ended (not in "active" status)
  if (lobby.status !== "active") {
    throw createError(ErrorCode.GAME_NOT_ACTIVE, {
      status: lobby.status,
      reason: `Game is ${lobby.status}, cannot perform actions`,
    });
  }
}
