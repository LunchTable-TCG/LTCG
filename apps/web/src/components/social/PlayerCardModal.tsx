"use client";

import { SimpleTooltip } from "@/components/help/Tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePlayerCard } from "@/hooks/social/usePlayerCard";
import { cn } from "@/lib/utils";
import type { Id } from "@convex/_generated/dataModel";
import {
  Bot,
  Calendar,
  Check,
  Clock,
  Loader2,
  Medal,
  Swords,
  Trophy,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";

interface PlayerCardModalProps {
  userId: Id<"users"> | null;
  isOpen: boolean;
  onClose: () => void;
  /** Pass leaderboard data to show immediately while loading full data */
  initialData?: {
    username: string;
    rating: number;
    rank: number;
    wins: number;
    losses: number;
    winRate: number;
    level: number;
    isAiAgent?: boolean;
  };
}

type ChallengeMode = "casual" | "ranked";

/**
 * Modal that displays player details and social action buttons.
 *
 * Opens when clicking a username on the leaderboard.
 * Shows player stats, and provides buttons to add friend, challenge, or invite to guild.
 */
export function PlayerCardModal({ userId, isOpen, onClose, initialData }: PlayerCardModalProps) {
  const [challengeMode, setChallengeMode] = useState<ChallengeMode | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    playerData,
    isLoading,
    isAuthenticated,
    sendFriendRequest,
    acceptFriendRequest,
    cancelFriendRequest,
    removeFriend,
    sendChallenge,
  } = usePlayerCard(isOpen ? userId : null);

  // Use initial data while loading, then switch to full data
  const displayData =
    playerData ||
    (initialData
      ? {
          username: initialData.username,
          level: initialData.level,
          rankedElo: initialData.rating,
          totalWins: initialData.wins,
          totalLosses: initialData.losses,
          isAiAgent: initialData.isAiAgent ?? false,
          friendshipStatus: null as "pending" | "accepted" | "blocked" | null,
          isSentRequest: false,
          isCurrentUser: false,
          bio: undefined as string | undefined,
          createdAt: undefined as number | undefined,
        }
      : null);

  // Don't render if viewing self
  if (playerData?.isCurrentUser) {
    return null;
  }

  const handleFriendAction = async () => {
    // Guard: Don't execute actions until playerData is fully loaded
    // This prevents incorrect actions when using initialData fallback
    if (!playerData || !userId) return;
    setIsSubmitting(true);
    try {
      if (playerData.friendshipStatus === "accepted") {
        await removeFriend(userId);
      } else if (playerData.friendshipStatus === "pending" && playerData.isSentRequest) {
        await cancelFriendRequest(userId);
      } else if (playerData.friendshipStatus === "pending" && !playerData.isSentRequest) {
        await acceptFriendRequest(userId);
      } else {
        await sendFriendRequest(playerData.username);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChallenge = async (mode: ChallengeMode) => {
    if (!displayData?.username) return;
    setIsSubmitting(true);
    try {
      await sendChallenge(displayData.username, mode);
      onClose();
    } catch {
      // Error handled in hook
    } finally {
      setIsSubmitting(false);
      setChallengeMode(null);
    }
  };

  const getFriendButtonState = () => {
    if (!isAuthenticated) {
      return { label: "Add Friend", icon: UserPlus, disabled: true, variant: "default" as const };
    }
    if (!playerData) {
      return { label: "Add Friend", icon: UserPlus, disabled: true, variant: "default" as const };
    }

    switch (playerData.friendshipStatus) {
      case "accepted":
        return { label: "Friends", icon: UserCheck, disabled: false, variant: "outline" as const };
      case "pending":
        return playerData.isSentRequest
          ? { label: "Request Sent", icon: Clock, disabled: false, variant: "outline" as const }
          : { label: "Accept Request", icon: Check, disabled: false, variant: "default" as const };
      case "blocked":
        return { label: "Blocked", icon: X, disabled: true, variant: "outline" as const };
      default:
        return {
          label: "Add Friend",
          icon: UserPlus,
          disabled: false,
          variant: "default" as const,
        };
    }
  };

  const friendButton = getFriendButtonState();
  const winRate = displayData
    ? Math.round(
        (displayData.totalWins / (displayData.totalWins + displayData.totalLosses || 1)) * 100
      )
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">Player Profile</DialogTitle>
          <DialogDescription className="sr-only">
            View player stats and social actions
          </DialogDescription>
        </DialogHeader>

        {isLoading && !displayData ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-[#d4af37] animate-spin" />
          </div>
        ) : displayData ? (
          <div className="space-y-6">
            {/* Player Header */}
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16 border-2 border-[#3d2b1f]">
                <AvatarFallback className="bg-[#1a1614] text-[#d4af37] text-xl font-bold">
                  {(displayData.username || "?")[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-[#e8e0d5]">
                    {displayData.username || "Unknown"}
                  </h2>
                  {displayData.isAiAgent && (
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                      <Bot className="w-3 h-3 mr-1" />
                      AI
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-[#a89f94]">
                  <Badge className="bg-[#d4af37]/20 text-[#d4af37] border-[#d4af37]/30">
                    LV {displayData.level}
                  </Badge>
                  <span>{displayData.rankedElo} ELO</span>
                </div>
              </div>
            </div>

            {/* Bio */}
            {playerData?.bio && <p className="text-sm text-[#a89f94] italic">"{playerData.bio}"</p>}

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <StatBox
                icon={Trophy}
                label="Wins"
                value={displayData.totalWins}
                color="text-green-400"
              />
              <StatBox
                icon={Swords}
                label="Losses"
                value={displayData.totalLosses}
                color="text-red-400"
              />
              <StatBox icon={Medal} label="Win Rate" value={`${winRate}%`} color="text-[#d4af37]" />
            </div>

            {/* Member Since */}
            {playerData?.createdAt && (
              <div className="flex items-center gap-2 text-xs text-[#a89f94]">
                <Calendar className="w-3 h-3" />
                Member since{" "}
                {new Date(playerData.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                })}
              </div>
            )}

            {/* Challenge Mode Selection */}
            {challengeMode !== null ? (
              <div className="space-y-3">
                <p className="text-sm text-[#a89f94] text-center">Select game mode:</p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleChallenge("casual")}
                    disabled={isSubmitting}
                    className="flex-1 bg-blue-600 hover:bg-blue-500"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Casual"}
                  </Button>
                  <Button
                    onClick={() => handleChallenge("ranked")}
                    disabled={isSubmitting}
                    className="flex-1 bg-purple-600 hover:bg-purple-500"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ranked"}
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setChallengeMode(null)}
                  className="w-full text-[#a89f94]"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              /* Action Buttons */
              <div className="flex flex-col gap-2">
                {/* Friend Button */}
                <Button
                  onClick={handleFriendAction}
                  disabled={isSubmitting || friendButton.disabled || isLoading}
                  variant={friendButton.variant}
                  className={cn(
                    "w-full",
                    friendButton.variant !== "outline" &&
                      "bg-[#d4af37] hover:bg-[#f9e29f] text-[#1a1614]"
                  )}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <friendButton.icon className="w-4 h-4 mr-2" />
                  )}
                  {friendButton.label}
                </Button>

                {/* Challenge Button */}
                <Button
                  onClick={() => setChallengeMode("casual")}
                  disabled={isSubmitting || isLoading || !isAuthenticated}
                  className="w-full bg-orange-600 hover:bg-orange-500"
                >
                  <Swords className="w-4 h-4 mr-2" />
                  Challenge
                </Button>

                {/* Guild Button (Disabled) */}
                <SimpleTooltip content="Guilds coming soon!">
                  <Button
                    disabled
                    variant="outline"
                    className="w-full border-[#3d2b1f] text-[#a89f94] opacity-50 cursor-not-allowed"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Invite to Guild
                  </Button>
                </SimpleTooltip>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-[#a89f94]">Player not found</div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatBox({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Trophy;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="p-3 rounded-lg bg-black/40 border border-[#3d2b1f] text-center">
      <Icon className={cn("w-4 h-4 mx-auto mb-1", color)} />
      <p className="text-lg font-bold text-[#e8e0d5]">{value}</p>
      <p className="text-xs text-[#a89f94]">{label}</p>
    </div>
  );
}
