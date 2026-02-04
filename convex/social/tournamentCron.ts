/**
 * Tournament Cron Jobs
 *
 * Internal actions called by cron jobs to handle:
 * - Phase transitions (registration -> check-in -> active)
 * - No-show forfeit processing
 */

import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";

// Module-scope typed helper to avoid TS2589
type InternalApi = typeof internal;
const internalAny = internal as InternalApi;

/**
 * Process tournament phase transitions
 * Called every minute to check for tournaments that need to:
 * - Transition from registration to check-in
 * - Start (transition from check-in to active)
 */
export const processPhaseTransitions = internalAction({
  handler: async (ctx) => {
    // Get tournaments needing transitions
    const transitions = await ctx.runQuery(
      internalAny.social.tournaments.getTournamentsNeedingTransition
    );

    // Process registration -> check-in transitions
    for (const tournamentId of transitions.needCheckIn) {
      try {
        await ctx.runMutation(internalAny.social.tournaments.transitionToCheckIn, {
          tournamentId,
        });
      } catch (error) {
        console.error(`Failed to transition tournament ${tournamentId} to check-in:`, error);
      }
    }

    // Process check-in -> active transitions (start tournaments)
    for (const tournamentId of transitions.needStart) {
      try {
        await ctx.runMutation(internalAny.social.tournaments.startTournament, {
          tournamentId,
        });
      } catch (error) {
        console.error(`Failed to start tournament ${tournamentId}:`, error);
      }
    }
  },
});

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
