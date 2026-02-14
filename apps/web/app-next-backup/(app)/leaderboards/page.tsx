"use client";

import { PlayerCardModal } from "@/components/social/PlayerCardModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useLeaderboardInteraction } from "@/hooks/social/useLeaderboardInteraction";
import { cn } from "@/lib/utils";
import type { LeaderboardEntry } from "@/types";
import { motion } from "framer-motion";
import { Bot, Crown, Loader2, Medal, Swords, Trophy, User, Users } from "lucide-react";

export default function LeaderboardsPage() {
  const {
    currentUser,
    profileLoading,
    activeType,
    setActiveType,
    activeSegment,
    setActiveSegment,
    rankings,
    userRank,
    handlePlayerClick,
    selectedPlayer,
    closePlayerModal,
  } = useLeaderboardInteraction();

  if (profileLoading || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  // Split rankings into Top 3 (Podium) and the rest (List)
  const top3 = rankings.slice(0, 3);
  const restOfRankings = rankings.slice(3);

  return (
    <div className="container mx-auto px-4 py-8 pb-24 space-y-8 max-w-5xl">
      {/* Header Section */}
      <div className="space-y-6 text-center sm:text-left">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-heading font-bold bg-gradient-to-r from-primary via-amber-200 to-primary bg-clip-text text-transparent drop-shadow-sm animate-pulse">
              Hall of Champions
            </h1>
            <p className="text-muted-foreground mt-2 max-w-md">
              Prove your worth in the arena. Rise through the ranks and claim your place in history.
            </p>
          </div>

          {/* Main Type Selector (Ranked vs Casual) */}
          <div className="p-1 rounded-xl bg-secondary/50 border border-border/50 backdrop-blur-sm">
            <div className="flex items-center gap-1">
              {(["ranked", "casual", "story"] as const).map((type) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => setActiveType(type)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 uppercase tracking-widest flex items-center gap-2",
                    activeType === type
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  )}
                >
                  {type === "ranked" && <Trophy className="w-4 h-4" />}
                  {type === "casual" && <Swords className="w-4 h-4" />}
                  {type === "story" && <Medal className="w-4 h-4" />}
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Secondary Filters (Humans vs AI) */}
        <div className="flex items-center justify-center sm:justify-start gap-2">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest mr-2">
            Filter:
          </span>
          {(["all", "humans", "ai"] as const).map((segment) => (
            <Badge
              key={segment}
              variant={activeSegment === segment ? "default" : "outline"}
              className={cn(
                "cursor-pointer px-3 py-1 hover:border-primary/50 transition-colors",
                activeSegment === segment
                  ? "bg-primary/20 text-primary border-primary/50"
                  : "text-muted-foreground"
              )}
              onClick={() => setActiveSegment(segment)}
            >
              {segment === "all" && <Users className="w-3 h-3 mr-1" />}
              {segment === "humans" && <User className="w-3 h-3 mr-1" />}
              {segment === "ai" && <Bot className="w-3 h-3 mr-1" />}
              {segment.charAt(0).toUpperCase() + segment.slice(1)}
            </Badge>
          ))}
        </div>
      </div>

      {/* Podium Section */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-end justify-center py-8 min-h-[300px]">
          {/* 2nd Place */}
          {top3[1] && (
            <PodiumCard player={top3[1]} rank={2} onClick={() => handlePlayerClick(top3[1])} />
          )}

          {/* 1st Place - Center & Larger */}
          {top3[0] && (
            <PodiumCard
              player={top3[0]}
              rank={1}
              isWinner
              onClick={() => handlePlayerClick(top3[0])}
            />
          )}

          {/* 3rd Place */}
          {top3[2] && (
            <PodiumCard player={top3[2]} rank={3} onClick={() => handlePlayerClick(top3[2])} />
          )}
        </div>
      )}

      {rankings.length === 0 && (
        <div className="text-center py-20 bg-card/30 rounded-xl border border-border/50 border-dashed">
          <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-muted-foreground">No Champions Yet</h3>
          <p className="text-sm text-muted-foreground/60">Be the first to claim glory!</p>
        </div>
      )}

      {/* List Section */}
      <div className="space-y-4">
        {restOfRankings.map((player) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={player.userId}
            onClick={() => handlePlayerClick(player)}
            className="group relative overflow-hidden rounded-xl bg-card border border-border/50 p-4 flex items-center gap-4 hover:border-primary/50 hover:bg-card/80 transition-all cursor-pointer shadow-sm"
          >
            {/* Rank Number */}
            <div className="w-12 text-center">
              <span className="text-xl font-bold font-mono text-muted-foreground group-hover:text-primary transition-colors">
                #{player.rank}
              </span>
            </div>

            {/* Avatar */}
            <div className="relative">
              <Avatar className="w-12 h-12 border-2 border-border group-hover:border-primary transition-colors">
                <AvatarFallback className="bg-secondary font-bold text-muted-foreground">
                  {player.username?.[0]}
                </AvatarFallback>
              </Avatar>
              {player.isAiAgent && (
                <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-0.5 border border-background">
                  <Bot className="w-3 h-3 text-white" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-foreground truncate group-hover:text-primary transition-colors">
                  {player.username}
                </h3>
                {player.userId === currentUser._id && (
                  <Badge
                    variant="outline"
                    className="text-[10px] py-0 h-5 border-primary/30 text-primary bg-primary/5"
                  >
                    YOU
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Swords className="w-3 h-3" /> {player.wins}W
                </span>
                <span className="w-px h-3 bg-border" />
                <span>Win Rate: {player.winRate}%</span>
              </div>
            </div>

            {/* Rating */}
            <div className="text-right">
              <div className="font-bold text-xl text-primary font-mono">{player.rating}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">ELO</div>
            </div>

            <div className="absolute inset-0 border border-primary/0 group-hover:border-primary/20 rounded-xl transition-all pointer-events-none" />
          </motion.div>
        ))}
      </div>

      {/* Sticky Player Rank (if user is ranked but not in top view?) */}
      {/* Usually good to show user's rank sticky at bottom if they are far down */}
      {userRank && !rankings.slice(0, 10).find((p) => p.userId === currentUser._id) && (
        <div className="fixed bottom-6 left-0 right-0 px-4 md:pl-72 z-40 pointer-events-none">
          <div className="container mx-auto max-w-5xl pointer-events-auto">
            <div className="bg-primary/10 backdrop-blur-md border border-primary/30 rounded-xl p-4 flex items-center gap-4 shadow-2xl tcg-frame-gold">
              <div className="w-12 text-center text-primary font-bold font-mono text-xl">
                #{userRank.rank}
              </div>
              <Avatar className="w-10 h-10 border border-primary/50">
                <AvatarImage src={currentUser.image} />
                <AvatarFallback>{currentUser.username?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-bold text-primary">Your Rank</p>
                <p className="text-xs text-primary/70">
                  {userRank.rating} ELO • {userRank.winRate}% WR
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Player Details Modal */}
      {selectedPlayer && (
        <PlayerCardModal
          userId={selectedPlayer.userId}
          isOpen={!!selectedPlayer}
          onClose={closePlayerModal}
          initialData={selectedPlayer}
        />
      )}
    </div>
  );
}

function PodiumCard({
  player,
  rank,
  isWinner = false,
  onClick,
}: { player: LeaderboardEntry; rank: number; isWinner?: boolean; onClick: () => void }) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center p-6 rounded-2xl border cursor-pointer transition-all duration-300 group overflow-hidden",
        isWinner
          ? "bg-gradient-to-b from-primary/20 via-primary/5 to-transparent border-primary/50 shadow-[0_0_30px_rgba(212,175,55,0.2)] z-10 scale-110 sm:-mt-8"
          : "bg-card/50 border-border shadow-lg hover:border-primary/30"
      )}
    >
      {/* Rank Badge */}
      <div
        className={cn(
          "absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border",
          isWinner
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-secondary text-muted-foreground border-border"
        )}
      >
        #{rank}
      </div>

      {/* Crown for Winner */}
      {isWinner && (
        <motion.div
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ repeat: Number.POSITIVE_INFINITY, duration: 4, ease: "easeInOut" }}
          className="absolute -top-6 text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]"
        >
          <Crown className="w-12 h-12 fill-yellow-500/20" />
        </motion.div>
      )}

      {/* Avatar */}
      <div className="relative mb-4">
        <div
          className={cn(
            "rounded-full p-1",
            isWinner ? "bg-gradient-to-b from-yellow-300 to-yellow-600" : "bg-secondary"
          )}
        >
          <Avatar
            className={cn("border-4 border-background", isWinner ? "w-24 h-24" : "w-16 h-16")}
          >
            <AvatarFallback className="text-2xl font-bold">{player.username?.[0]}</AvatarFallback>
          </Avatar>
        </div>
        {/* Decor */}
        {isWinner && (
          <div className="absolute -inset-4 bg-primary/20 rounded-full blur-xl -z-10 animate-pulse" />
        )}
        {rank === 2 && (
          <div className="absolute -bottom-2 -right-2 bg-slate-400 text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-300">
            SILVER
          </div>
        )}
        {rank === 3 && (
          <div className="absolute -bottom-2 -right-2 bg-amber-700 text-amber-100 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-600">
            BRONZE
          </div>
        )}
      </div>

      {/* Name */}
      <h3
        className={cn(
          "font-bold text-center truncate w-full max-w-[150px] font-heading",
          isWinner ? "text-xl text-primary" : "text-lg text-foreground"
        )}
      >
        {player.username}
      </h3>

      {/* Stats */}
      <div className="mt-2 flex items-center gap-3 text-sm">
        <div className="flex flex-col items-center">
          <span
            className={cn(
              "font-bold text-lg font-mono",
              isWinner ? "text-primary" : "text-foreground"
            )}
          >
            {player.rating}
          </span>
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground">ELO</span>
        </div>
      </div>

      {/* Win Rate Chip */}
      <div className="mt-3 px-2 py-1 rounded bg-black/20 border border-white/5 text-xs text-muted-foreground">
        {player.winRate}% WR
      </div>

      {/* Hover Glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </motion.div>
  );
}
