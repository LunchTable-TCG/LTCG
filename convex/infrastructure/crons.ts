import { cronJobs } from "convex/server";
import { internal } from "../_generated/api";

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
crons.interval("matchmaking", { seconds: 10 }, internal.matchmaking.findMatches);

// Cleanup expired queue entries every minute
crons.interval("cleanup-matchmaking", { seconds: 60 }, internal.matchmaking.cleanupExpiredEntries);

// Finalize expired auctions every 5 minutes
crons.interval("finalize-auctions", { minutes: 5 }, internal.marketplace.finalizeExpiredAuctions);

// Cleanup expired quests every hour
crons.interval(
  "cleanup-expired-quests",
  { hours: 1 },
  internal.progression.quests.cleanupExpiredQuests
);

// Generate daily quests every day at midnight UTC
crons.daily(
  "generate-daily-quests",
  { hourUTC: 0, minuteUTC: 0 },
  internal.progression.quests.generateDailyQuestsForAll
);

// Generate weekly quests every Monday at midnight UTC
crons.weekly(
  "generate-weekly-quests",
  { hourUTC: 0, minuteUTC: 0, dayOfWeek: "monday" },
  internal.progression.quests.generateWeeklyQuestsForAll
);

// Cleanup old notifications (30 days+) every day at 2 AM UTC
crons.daily(
  "cleanup-old-notifications",
  { hourUTC: 2, minuteUTC: 0 },
  internal.progression.notifications.cleanupOldNotifications
);

// Send welcome emails to new users every hour
crons.interval(
  "send-welcome-emails",
  { hours: 1 },
  internal.welcomeEmails.sendWelcomeEmailsToNewUsers
);

export default crons;
