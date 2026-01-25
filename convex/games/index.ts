// ============================================================================
// CONVEX GAMES MODULE - INDEX
// ============================================================================
// This file re-exports all game-related functions from modular files.
// Maintains compatibility with existing api.games.* calls.

// ============================================================================
// QUERIES
// ============================================================================
export {
  listWaitingLobbies,
  getActiveLobby,
  getLobbyDetails,
  getMyPrivateLobby,
  listActiveGames,
  getGameSpectatorView,
  checkForActiveGame,
  getAvailableActions,
  getGameStateForPlayer,
  getActiveLobbiesForCleanup,
  getWaitingLobbiesForCleanup,
} from "./queries";

// ============================================================================
// LOBBY MUTATIONS
// ============================================================================
export {
  createLobby,
  joinLobby,
  joinLobbyByCode,
  cancelLobby,
  leaveLobby,
} from "./lobby";

// ============================================================================
// GAME LIFECYCLE MUTATIONS
// ============================================================================
export {
  initializeGameState,
  surrenderGame,
  updateTurn,
  forfeitGame,
  completeGame,
} from "./lifecycle";

// ============================================================================
// SPECTATOR MUTATIONS
// ============================================================================
export {
  joinAsSpectator,
  leaveAsSpectator,
} from "./spectator";

// ============================================================================
// SCHEDULED CLEANUP
// ============================================================================
export {
  cleanupStaleGames,
  cancelStaleWaitingLobby,
} from "./cleanup";
