/**
 * Tournament Cron Jobs
 *
 * Internal actions called by cron jobs to handle:
 * - No-show forfeit processing
 *
 * Note: Phase transitions (registration -> check-in -> active) are now
 * scheduled per-tournament via ctx.scheduler.runAt() in createTournament.
 * User tournament expiry is also scheduled per-tournament at creation time.
 */

import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";

// Module-scope typed helper to avoid TS2589
type InternalApi = typeof internal;
const internalAny = internal as InternalApi;

/**
 * Process no-show forfeits
 * Called every minute to check for matches where a player hasn't shown up
 */
export const processNoShowForfeits = internalAction({
  handler: async (ctx) => {
    // Get matches that have timed out
    const timedOutMatches = await ctx.runQuery(internalAny.social.tournaments.getTimedOutMatches);

    for (const match of timedOutMatches) {
      // Determine which player is the no-show
      // If both players are missing, forfeit both (match cancelled)
      // If only one is missing, forfeit the missing player

      // For now, we'll forfeit the match if either player hasn't joined
      // The game lobby system should track which players have connected
      // Here we simply forfeit player2 if they haven't joined (player1 is host)

      try {
        if (match.player2Id) {
          await ctx.runMutation(internalAny.social.tournaments.forfeitNoShowMatch, {
            matchId: match.matchId,
            noShowPlayerId: match.player2Id,
          });
        }
      } catch (error) {
        console.error(`Failed to process no-show for match ${match.matchId}:`, error);
      }
    }
  },
});

