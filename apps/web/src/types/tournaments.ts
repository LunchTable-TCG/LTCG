import type { Id } from "@convex/_generated/dataModel";

export type TournamentTab = "active" | "community" | "history";

export interface TournamentStats {
  tournamentsPlayed: number;
  tournamentsWon: number;
  totalPrizeWon: number;
  bestPlacement?: number;
  winRate: number;
}

export interface TournamentHistoryEntry {
  _id: Id<"tournamentHistory">;
  tournamentId: Id<"tournaments">;
  tournamentName: string;
  placement: number;
  prizeWon: number;
  matchesPlayed: number;
  matchesWon: number;
  completedAt: number;
  maxPlayers: number;
}

export interface Tournament {
  _id: Id<"tournaments">;
  name: string;
  description: string;
  status: "registration" | "checkin" | "active" | "completed" | "cancelled";
  maxPlayers: number;
  registeredCount: number;
  startTime: number;
  prizePool: number;
  entryFee?: number;
  format?: string;
  creatorId?: Id<"users">;
  joinCode?: string;
}
