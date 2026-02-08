"use client";

import { useGameLobby, useMatchmaking, useSpectator } from "@/hooks";
import { logError } from "@/lib/errorHandling";
import type { MatchMode } from "@/types/common";
import { cn } from "@/lib/utils";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";
import {
  ChevronRight,
  Clock,
  Eye,
  Flame,
  Loader2,
  Plus,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Users,
  Waves,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Element } from "@/types/cards";
import { CreateGameModal } from "./CreateGameModal";
import { JoinConfirmDialog } from "./JoinConfirmDialog";

type GameStatus = "waiting" | "active";
type TabType = "join" | "watch";
type GameMode = "all" | "casual" | "ranked";

// Type for lobby data from Convex query
interface WaitingLobbyData {
  id: string;
  hostUsername: string;
  hostRank: string;
  deckArchetype: string;
  mode: string;
  createdAt: number;
  isPrivate: boolean;
}

interface GameLobbyEntry {
  id: string;
  hostName: string;
  hostRank: string;
  hostAvatar?: string;
  deckArchetype: Element;
  mode: MatchMode;
  createdAt: number;
  status: GameStatus;
  opponentName?: string;
  opponentRank?: string;
  turnNumber?: number;
  spectatorCount?: number;
}

const ARCHETYPE_CONFIG = {
  fire: {
    icon: Flame,
    color: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
  },
  water: {
    icon: Waves,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
  },
  earth: {
    icon: Shield,
    color: "text-slate-400",
    bg: "bg-slate-500/10",
    border: "border-slate-400/30",
  },
  wind: {
    icon: Zap,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
  },
};

const RANK_COLORS: Record<string, string> = {
  Bronze: "text-orange-400",
  Silver: "text-gray-300",
  Gold: "text-yellow-500",
  Platinum: "text-blue-400",
  Diamond: "text-cyan-400",
  Master: "text-purple-400",
  Legend: "text-yellow-400",
};

function formatWaitTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes === 1) return "1 min";
  return `${minutes} mins`;
}

export function GameLobby() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("join");
  const [modeFilter, setModeFilter] = useState<GameMode>("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [joiningGame, setJoiningGame] = useState<GameLobbyEntry | null>(null);
  const [quickMatchMode, setQuickMatchMode] = useState<MatchMode>("casual");

  // Use custom hooks
  const {
    waitingLobbies: lobbiesData,
    myLobby: myActiveLobby,
    createLobby,
    joinLobby: joinLobbyAction,
    cancelLobby,
  } = useGameLobby();

  const { activeGames: activeGamesData } = useSpectator();

  const { isInQueue: isSearching, joinQueue, leaveQueue } = useMatchmaking();

  const forceCloseGame = useMutation(api.admin.mutations.forceCloseMyGame);

  // Convert API data to component format
  // Filter out the user's own lobby from the waiting games list
  const waitingGames: GameLobbyEntry[] =
    (lobbiesData as WaitingLobbyData[] | undefined)
      ?.filter((lobby: WaitingLobbyData) => lobby.id !== myActiveLobby?._id)
      .map((lobby: WaitingLobbyData) => ({
        id: lobby.id,
        hostName: lobby.hostUsername,
        hostRank: lobby.hostRank,
        deckArchetype: lobby.deckArchetype as "fire" | "water" | "earth" | "wind",
        mode: lobby.mode as MatchMode,
        createdAt: lobby.createdAt,
        status: "waiting" as const,
      })) || [];

  interface ActiveGameData {
    lobbyId: string;
    hostUsername: string;
    deckArchetype: string;
    mode: string;
    startedAt?: number;
    opponentUsername?: string;
    turnNumber?: number;
    spectatorCount?: number;
  }

  const activeGames: GameLobbyEntry[] =
    activeGamesData?.map((game: ActiveGameData) => ({
      id: game.lobbyId,
      hostName: game.hostUsername,
      hostRank: "Bronze", // Rank not included in query, using default
      deckArchetype: game.deckArchetype as "fire" | "water" | "earth" | "wind",
      mode: game.mode as MatchMode,
      createdAt: game.startedAt || 0,
      status: "active" as const,
      opponentName: game.opponentUsername,
      turnNumber: game.turnNumber,
      spectatorCount: game.spectatorCount,
    })) || [];

  const handleCreateGame = async (data: {
    mode: MatchMode;
    isPrivate?: boolean;
    allowSpectators?: boolean;
  }) => {
    try {
      const result = await createLobby(data.mode, data.isPrivate || false, {
        allowSpectators: data.allowSpectators,
      });
      setIsCreateModalOpen(false);

      // Redirect to game page immediately after creating
      if (result?.lobbyId) {
        router.push(`/game/${result.lobbyId}`);
      }
    } catch (error) {
      logError("create lobby", error);
    }
  };

  const handleCancelMyLobby = async () => {
    if (!myActiveLobby) return;

    try {
      await cancelLobby();
    } catch (error) {
      logError("cancel lobby", error);
    }
  };

  const handleQuickMatch = async () => {
    try {
      await joinQueue(quickMatchMode);
    } catch (error) {
      logError("join queue", error);
    }
  };

  const handleCancelSearch = async () => {
    try {
      await leaveQueue();
    } catch (error) {
      logError("leave queue", error);
    }
  };

  const handleJoinGame = async (game: GameLobbyEntry) => {
    // Auto-cancel user's old lobby before joining (only if waiting)
    if (myActiveLobby && myActiveLobby.status === "waiting") {
      try {
        await cancelLobby();
      } catch (error) {
        logError("cancel old lobby", error);
      }
    }
    setJoiningGame(game);
  };

  const handleWatchGame = (gameId: string) => {
    router.push(`/game/${gameId}`);
  };

  const confirmJoin = async () => {
    if (!joiningGame) return;

    try {
      const result = await joinLobbyAction(joiningGame.id as Id<"gameLobbies">);
      setJoiningGame(null);

      // Redirect to game page after successfully joining
      if (result?.lobbyId) {
        router.push(`/game/${result.lobbyId}`);
      }
    } catch (error) {
      logError("join game", error);
      setJoiningGame(null);
    }
  };

  return (
    <div data-testid="game-lobby" className="h-full flex flex-col">
      {/* Header with Create Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-black text-[#e8e0d5] uppercase tracking-tight flex items-center gap-3">
            <Swords className="w-7 h-7 text-[#d4af37]" />
            Battle Arena
          </h2>
          <p className="text-xs text-[#a89f94] mt-1 uppercase tracking-widest">
            Challenge opponents or spectate live matches
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Game Active - Show game */}
          {myActiveLobby && myActiveLobby.status === "active" && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600/20 border border-green-500/30 text-green-400">
              <Swords className="w-4 h-4" />
              <span className="text-sm font-bold">Game in progress!</span>
              <button
                type="button"
                onClick={() => router.push(`/game/${myActiveLobby._id}`)}
                className="ml-2 px-3 py-1 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs font-bold uppercase transition-colors"
              >
                View Game
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await forceCloseGame({});
                  } catch (error) {
                    logError("force close game", error);
                  }
                }}
                className="ml-2 px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-bold uppercase transition-colors"
              >
                Force Close
              </button>
            </div>
          )}

          {/* My Active Lobby Status */}
          {myActiveLobby && myActiveLobby.status === "waiting" && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#d4af37]/20 border border-[#d4af37]/30 text-[#d4af37]">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm font-bold">Waiting for opponent...</span>
              <button
                type="button"
                onClick={handleCancelMyLobby}
                className="ml-2 px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-bold uppercase transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Quick Match / Matchmaking Status */}
          {!myActiveLobby && !isSearching && (
            <div className="flex items-center gap-0">
              {/* Mode Selector */}
              <div className="flex rounded-l-lg overflow-hidden border border-r-0 border-[#3d2b1f] bg-black/40 h-10">
                <button
                  type="button"
                  onClick={() => setQuickMatchMode("casual")}
                  className={cn(
                    "px-3 text-[11px] font-bold uppercase tracking-widest transition-all flex items-center gap-1.5",
                    quickMatchMode === "casual"
                      ? "bg-linear-to-r from-green-600 to-green-500 text-[#fef9e6]"
                      : "text-[#a89f94] hover:text-[#e8e0d5] hover:bg-white/5"
                  )}
                  title="Casual - No rank changes"
                >
                  <Users className="w-3.5 h-3.5" />
                  Casual
                </button>
                <button
                  type="button"
                  onClick={() => setQuickMatchMode("ranked")}
                  className={cn(
                    "px-3 text-[11px] font-bold uppercase tracking-widest transition-all flex items-center gap-1.5",
                    quickMatchMode === "ranked"
                      ? "bg-linear-to-r from-amber-600 to-yellow-500 text-[#1a1614]"
                      : "text-[#a89f94] hover:text-[#e8e0d5] hover:bg-white/5"
                  )}
                  title="Ranked - Affects your rank"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  Ranked
                </button>
              </div>
              {/* Quick Match Button */}
              <button
                type="button"
                onClick={handleQuickMatch}
                className="h-10 px-4 rounded-r-lg tcg-button-primary text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-shadow"
              >
                <Sparkles className="w-4 h-4" />
                Quick Match
              </button>
            </div>
          )}

          {/* Matchmaking Status with Details */}
          {!myActiveLobby && isSearching && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-300">
              <Loader2 className="w-4 h-4 animate-spin" />
              <div className="flex flex-col">
                <span className="text-sm font-bold">Searching for opponent...</span>
                <span className="text-xs text-purple-400 flex items-center gap-1">
                  {quickMatchMode === "ranked" ? (
                    <>
                      <Trophy className="w-3 h-3 text-amber-400" />
                      <span className="text-amber-400">Ranked</span>
                    </>
                  ) : (
                    <>
                      <Users className="w-3 h-3 text-green-400" />
                      <span className="text-green-400">Casual</span>
                    </>
                  )}{" "}
                  match
                </span>
              </div>
              <button
                type="button"
                onClick={handleCancelSearch}
                className="ml-2 px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-bold uppercase transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Create Game Button */}
          {!myActiveLobby && (
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="tcg-button-primary h-12 px-6 font-black uppercase tracking-wider text-white flex items-center gap-2 shadow-lg hover:shadow-xl transition-shadow"
            >
              <Plus className="w-5 h-5" />
              Create Game
            </button>
          )}
        </div>
      </div>

      {/* Mode Filter */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex rounded-lg overflow-hidden border border-[#3d2b1f] bg-black/30">
          {(["all", "casual", "ranked"] as GameMode[]).map((mode) => (
            <button
              type="button"
              key={mode}
              onClick={() => setModeFilter(mode)}
              className={cn(
                "px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all",
                modeFilter === mode
                  ? mode === "ranked"
                    ? "bg-linear-to-r from-amber-600 to-yellow-500 text-[#1a1614]"
                    : mode === "casual"
                      ? "bg-linear-to-r from-green-600 to-green-500 text-white"
                      : "bg-[#d4af37] text-[#1a1614]"
                  : "text-[#a89f94] hover:text-[#e8e0d5] hover:bg-white/5"
              )}
            >
              {mode === "all" ? "All Games" : mode}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setActiveTab("join")}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold uppercase tracking-wide text-sm transition-all",
            activeTab === "join"
              ? "bg-[#d4af37] text-[#1a1614] shadow-lg"
              : "bg-black/30 text-[#a89f94] border border-[#3d2b1f] hover:border-[#d4af37]/50 hover:text-[#e8e0d5]"
          )}
        >
          <Users className="w-4 h-4" />
          Join Game
          <span
            className={cn(
              "ml-1 px-2 py-0.5 rounded-full text-[10px] font-black",
              activeTab === "join"
                ? "bg-[#1a1614]/20 text-[#1a1614]"
                : "bg-[#d4af37]/20 text-[#d4af37]"
            )}
          >
            {waitingGames.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("watch")}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold uppercase tracking-wide text-sm transition-all",
            activeTab === "watch"
              ? "bg-[#d4af37] text-[#1a1614] shadow-lg"
              : "bg-black/30 text-[#a89f94] border border-[#3d2b1f] hover:border-[#d4af37]/50 hover:text-[#e8e0d5]"
          )}
        >
          <Eye className="w-4 h-4" />
          Watch
          <span
            className={cn(
              "ml-1 px-2 py-0.5 rounded-full text-[10px] font-black",
              activeTab === "watch"
                ? "bg-[#1a1614]/20 text-[#1a1614]"
                : "bg-[#d4af37]/20 text-[#d4af37]"
            )}
          >
            {activeGames.length}
          </span>
        </button>
      </div>

      {/* Game List */}
      <div
        data-testid="lobby-players"
        className="flex-1 overflow-y-auto space-y-3 pr-2 tcg-scrollbar-thin"
      >
        {activeTab === "join" ? (
          waitingGames.length > 0 ? (
            waitingGames.map((game: GameLobbyEntry) => (
              <WaitingGameCard key={game.id} game={game} onJoin={() => handleJoinGame(game)} />
            ))
          ) : (
            <EmptyState
              icon={Users}
              title="No Games Available"
              description={
                modeFilter === "all"
                  ? "Be the first to create a game!"
                  : `No ${modeFilter} games available`
              }
            />
          )
        ) : activeGames.length > 0 ? (
          activeGames.map((game: GameLobbyEntry) => (
            <ActiveGameCard key={game.id} game={game} onWatch={handleWatchGame} />
          ))
        ) : (
          <EmptyState
            icon={Eye}
            title="No Active Games"
            description="No battles are currently in progress"
          />
        )}
      </div>

      {/* Create Game Modal */}
      <CreateGameModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateGame}
      />

      {/* Join Confirm Dialog */}
      {joiningGame && (
        <JoinConfirmDialog
          game={joiningGame}
          onConfirm={confirmJoin}
          onCancel={() => setJoiningGame(null)}
        />
      )}
    </div>
  );
}

function WaitingGameCard({ game, onJoin }: { game: GameLobbyEntry; onJoin: () => void }) {
  const archetype = ARCHETYPE_CONFIG[game.deckArchetype];
  const ArchetypeIcon = archetype.icon;

  return (
    <div
      data-testid="lobby-player"
      data-lobby-id={game.id}
      className="group relative p-4 rounded-xl tcg-chat-leather border border-[#3d2b1f] hover:border-[#d4af37]/50 transition-all shadow-lg hover:shadow-xl overflow-hidden"
    >
      <div className="ornament-corner ornament-corner-tl opacity-30" />
      <div className="ornament-corner ornament-corner-tr opacity-30" />

      <div className="flex items-center justify-between gap-4 relative z-10">
        {/* Host Info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Archetype Icon */}
          <div
            className={cn(
              "w-12 h-12 rounded-lg flex items-center justify-center border shrink-0",
              archetype.bg,
              archetype.border
            )}
          >
            <ArchetypeIcon className={cn("w-6 h-6", archetype.color)} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span data-testid="host-indicator" className="font-black text-[#e8e0d5] truncate">
                {game.hostName}
              </span>
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wider",
                  RANK_COLORS[game.hostRank] || "text-[#a89f94]"
                )}
              >
                {game.hostRank}
              </span>
              {/* Mode Badge */}
              <span
                className={cn(
                  "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider",
                  game.mode === "ranked"
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "bg-green-500/20 text-green-400 border border-green-500/30"
                )}
              >
                {game.mode}
              </span>
            </div>
            <div
              data-testid="player-ready"
              className="flex items-center gap-2 text-[11px] text-[#a89f94]"
            >
              <Clock className="w-3 h-3" />
              <span>Waiting {formatWaitTime(game.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Join Button */}
        <button
          type="button"
          onClick={onJoin}
          className="shrink-0 h-10 px-5 rounded-lg bg-linear-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-bold uppercase tracking-wide text-sm flex items-center gap-2 shadow-lg transition-all group-hover:scale-105"
        >
          Join
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function ActiveGameCard({
  game,
  onWatch,
}: {
  game: GameLobbyEntry;
  onWatch?: (gameId: string) => void;
}) {
  const archetype = ARCHETYPE_CONFIG[game.deckArchetype];
  const ArchetypeIcon = archetype.icon;

  return (
    <div
      data-testid="lobby-player"
      data-lobby-id={game.id}
      className="group relative p-4 rounded-xl tcg-chat-leather border border-[#3d2b1f] hover:border-[#d4af37]/50 transition-all shadow-lg hover:shadow-xl overflow-hidden"
    >
      <div className="ornament-corner ornament-corner-tl opacity-30" />
      <div className="ornament-corner ornament-corner-tr opacity-30" />

      <div className="flex items-center justify-between gap-4 relative z-10">
        {/* Match Info */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* VS Display */}
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center border",
                archetype.bg,
                archetype.border
              )}
            >
              <ArchetypeIcon className={cn("w-5 h-5", archetype.color)} />
            </div>
            <div className="w-8 h-8 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/30 flex items-center justify-center">
              <span className="text-[10px] font-black text-[#d4af37]">VS</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-black/30 border border-[#3d2b1f] flex items-center justify-center">
              <Trophy className="w-5 h-5 text-[#a89f94]" />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 text-sm">
              <span data-testid="host-indicator" className="font-black text-[#e8e0d5] truncate">
                {game.hostName}
              </span>
              <span className="text-[#a89f94] font-bold">vs</span>
              <span className="font-black text-[#e8e0d5] truncate">{game.opponentName}</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-[#a89f94]">
              <span
                className={cn("uppercase tracking-wider font-bold", RANK_COLORS[game.hostRank])}
              >
                {game.hostRank}
              </span>
              <span>vs</span>
              <span
                className={cn(
                  "uppercase tracking-wider font-bold",
                  RANK_COLORS[game.opponentRank || "Bronze"]
                )}
              >
                {game.opponentRank}
              </span>
              {game.spectatorCount !== undefined && game.spectatorCount > 0 && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-[#d4af37]">
                    <Eye className="w-3 h-3" />
                    {game.spectatorCount} watching
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Turn Counter & Watch */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-center">
            <p className="text-lg font-black text-[#d4af37]">{game.turnNumber}</p>
            <p className="text-[9px] text-[#a89f94] uppercase tracking-widest">Turn</p>
          </div>
          <button
            type="button"
            onClick={() => onWatch?.(game.id)}
            className="h-10 px-5 rounded-lg bg-linear-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-bold uppercase tracking-wide text-sm flex items-center gap-2 shadow-lg transition-all group-hover:scale-105"
          >
            <Eye className="w-4 h-4" />
            Watch
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Users;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#3d2b1f]/30 border border-[#3d2b1f] flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-[#a89f94]/50" />
      </div>
      <h4 className="text-lg font-black text-[#e8e0d5] uppercase tracking-wide mb-1">{title}</h4>
      <p className="text-sm text-[#a89f94]">{description}</p>
    </div>
  );
}
