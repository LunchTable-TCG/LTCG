import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Cleanup stale game lobbies every minute
crons.interval(
  "cleanup stale games",
  { minutes: 1 }, // Run every 1 minute
  internal.games.cleanupStaleGames
);

// Refresh leaderboard snapshots every 5 minutes
crons.interval(
  "refresh leaderboards",
  { minutes: 5 }, // Run every 5 minutes
  internal.leaderboards.refreshAllSnapshots
);

// Run matchmaking every 10 seconds
crons.interval(
  "matchmaking",
  { seconds: 10 },
  internal.matchmaking.findMatches
);

// Cleanup expired queue entries every minute
crons.interval(
  "cleanup-matchmaking",
  { seconds: 60 },
  internal.matchmaking.cleanupExpiredEntries
);

// Finalize expired auctions every 5 minutes
crons.interval(
  "finalize-auctions",
  { minutes: 5 },
  internal.marketplace.finalizeExpiredAuctions
);

export default crons;
