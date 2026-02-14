import { cronJobs } from "convex/server";
// Workaround for TS2589 (excessively deep type instantiation)
import * as generatedApi from "../_generated/api";
// biome-ignore lint/suspicious/noExplicitAny: Convex internal type workaround for TS2589
const internal = (generatedApi as any).internal;
// biome-ignore lint/suspicious/noExplicitAny: Convex deep type workaround
const internalAny = internal as any;

const crons = cronJobs();

// ============================================================================
// GAMEPLAY CRONS (active)
// ============================================================================

// Cleanup stale game lobbies every minute
crons.interval(
  "cleanup stale games",
  { minutes: 1 },
  internalAny.gameplay.games.cleanup.cleanupStaleGames
);

// Cleanup expired challenge lobbies and refund wagers every minute
crons.interval(
  "cleanup expired challenges",
  { minutes: 1 },
  internalAny.gameplay.games.lobby.cleanupExpiredChallenges
);

// ============================================================================
// NOTE: All other cron jobs have been moved to their respective component
// packages. They will be re-wired when the orchestration layer is built
// on top of the component clients.
// ============================================================================

export default crons;
