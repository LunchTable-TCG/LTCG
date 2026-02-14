"use client";

import type { TournamentMatch } from "@/hooks/social/useTournament";
import { cn } from "@/lib/utils";
import type { Id } from "@convex/_generated/dataModel";
import { Clock, Crown, Swords, User } from "lucide-react";
import Link from "next/link";

interface MatchCardProps {
  match: TournamentMatch;
  currentUserId?: Id<"users">;
  compact?: boolean;
}

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    color: "text-gray-400",
    bg: "bg-gray-500/10 border-gray-500/20",
  },
  ready: {
    label: "Ready",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
  active: {
    label: "Live",
    color: "text-green-400",
    bg: "bg-green-500/10 border-green-500/20",
  },
  completed: {
    label: "Completed",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
  },
  forfeit: {
    label: "Forfeit",
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
  },
};

function PlayerSlot({
  playerName,
  isWinner,
  isCurrentUser,
  isEmpty,
}: {
  playerName?: string;
  isWinner: boolean;
  isCurrentUser: boolean;
  isEmpty: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors",
        isEmpty
          ? "bg-black/20 border-[#3d2b1f] border-dashed"
          : isWinner
            ? "bg-[#d4af37]/10 border-[#d4af37]/30"
            : "bg-black/30 border-[#3d2b1f]",
        isCurrentUser && "ring-1 ring-[#d4af37]/50"
      )}
    >
      <div
        className={cn(
          "w-6 h-6 rounded flex items-center justify-center",
          isEmpty ? "bg-[#3d2b1f]/30" : isWinner ? "bg-[#d4af37]/20" : "bg-[#3d2b1f]/50"
        )}
      >
        {isEmpty ? (
          <Clock className="w-3 h-3 text-[#a89f94]/50" />
        ) : isWinner ? (
          <Crown className="w-3 h-3 text-[#d4af37]" />
        ) : (
          <User className="w-3 h-3 text-[#a89f94]" />
        )}
      </div>
      <span
        className={cn(
          "text-sm font-medium truncate",
          isEmpty
            ? "text-[#a89f94]/50 italic"
            : isWinner
              ? "text-[#d4af37] font-bold"
              : "text-[#e8e0d5]",
          isCurrentUser && "underline underline-offset-2"
        )}
      >
        {isEmpty ? "TBD" : playerName || "Unknown"}
        {isCurrentUser && " (You)"}
      </span>
    </div>
  );
}

export function MatchCard({ match, currentUserId, compact = false }: MatchCardProps) {
  const statusConfig = STATUS_CONFIG[match.status];

  const isPlayer1Winner = match.winnerId === match.player1Id;
  const isPlayer2Winner = match.winnerId === match.player2Id;
  const isCurrentUserPlayer1 = currentUserId === match.player1Id;
  const isCurrentUserPlayer2 = currentUserId === match.player2Id;
  const isCurrentUserInMatch = isCurrentUserPlayer1 || isCurrentUserPlayer2;

  const content = (
    <div
      className={cn(
        "relative rounded-xl border transition-all",
        isCurrentUserInMatch
          ? "tcg-chat-leather border-[#d4af37]/30 shadow-lg"
          : "bg-black/30 border-[#3d2b1f]",
        match.status === "active" && "border-green-500/30",
        match.lobbyId && "hover:border-[#d4af37]/50 cursor-pointer"
      )}
    >
      {/* Status Badge */}
      <div
        className={cn(
          "absolute -top-2 right-3 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border",
          statusConfig.bg,
          statusConfig.color
        )}
      >
        {statusConfig.label}
      </div>

      <div className={cn("p-3", compact && "p-2")}>
        {/* Match Number */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold text-[#a89f94] uppercase tracking-wider">
            Match {match.matchNumber}
          </span>
          {match.status === "active" && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              LIVE
            </span>
          )}
        </div>

        {/* Players */}
        <div className="space-y-2">
          <PlayerSlot
            playerName={match.player1Username}
            isWinner={isPlayer1Winner}
            isCurrentUser={isCurrentUserPlayer1}
            isEmpty={!match.player1Id}
          />

          {/* VS Divider */}
          <div className="flex items-center gap-2 px-3">
            <div className="flex-1 h-px bg-[#3d2b1f]" />
            <div className="w-6 h-6 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center">
              <Swords className="w-3 h-3 text-[#d4af37]" />
            </div>
            <div className="flex-1 h-px bg-[#3d2b1f]" />
          </div>

          <PlayerSlot
            playerName={match.player2Username}
            isWinner={isPlayer2Winner}
            isCurrentUser={isCurrentUserPlayer2}
            isEmpty={!match.player2Id}
          />
        </div>

        {/* Win Reason (if completed) */}
        {match.status === "completed" && match.winReason && match.winReason !== "game_win" && (
          <div className="mt-2 text-center">
            <span className="text-[10px] text-[#a89f94] uppercase tracking-wider">
              {match.winReason === "bye"
                ? "Bye"
                : match.winReason === "opponent_forfeit"
                  ? "Forfeit"
                  : "No-show"}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  // Wrap in link if there's an active game
  if (match.lobbyId && (match.status === "active" || match.status === "ready")) {
    return (
      <Link href={`/game/${match.lobbyId}`} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
