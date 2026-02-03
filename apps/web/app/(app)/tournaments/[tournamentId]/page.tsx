"use client";

import { useProfile } from "@/hooks";
import { useTournament } from "@/hooks/social/useTournament";
import { cn } from "@/lib/utils";
import type { Id } from "@convex/_generated/dataModel";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  Crown,
  Loader2,
  Medal,
  Swords,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { CheckInModal, RegisterModal, TournamentBracket } from "../components";

type TabType = "bracket" | "participants";

const STATUS_CONFIG = {
  registration: {
    label: "Registration Open",
    color: "bg-green-500/20 text-green-400 border-green-500/30",
    icon: Users,
  },
  checkin: {
    label: "Check-in Open",
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    icon: Clock,
  },
  active: {
    label: "In Progress",
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    icon: Swords,
  },
  completed: {
    label: "Completed",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    icon: Trophy,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    icon: AlertTriangle,
  },
};

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatCountdown(timestamp: number) {
  const now = Date.now();
  const diff = timestamp - now;

  if (diff <= 0) return "Started";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  const suffix = s[(v - 20) % 10] ?? s[v] ?? s[0] ?? "th";
  return `${n}${suffix}`;
}

export default function TournamentDetailPage() {
  const params = useParams();
  const tournamentId = params["tournamentId"] as Id<"tournaments">;

  const [activeTab, setActiveTab] = useState<TabType>("bracket");
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);

  // Hooks
  const { profile: currentUser } = useProfile();
  const { tournament, bracket, isLoading, register, checkIn } = useTournament(tournamentId);

  const handleRegister = async () => {
    try {
      const result = await register();
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Registration failed");
      throw error;
    }
  };

  const handleCheckIn = async () => {
    try {
      const result = await checkIn();
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Check-in failed");
      throw error;
    }
  };

  if (isLoading || !tournament) {
    return (
      <div className="min-h-screen bg-[#0d0a09] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-[#d4af37] animate-spin" />
          <p className="text-[#a89f94] text-sm uppercase tracking-widest font-bold">
            Loading Tournament...
          </p>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[tournament.status];
  const StatusIcon = statusConfig.icon;

  const totalPrize =
    tournament.prizePool.first +
    tournament.prizePool.second +
    tournament.prizePool.thirdFourth * 2;

  const canRegister = tournament.status === "registration" && !tournament.isRegistered;
  const canCheckIn =
    tournament.status === "checkin" &&
    tournament.isRegistered &&
    !tournament.isCheckedIn;

  // Find user's current match if they're in the tournament
  const userCurrentMatch = bracket?.rounds
    .flatMap((r) => r.matches)
    .find(
      (m) =>
        (m.player1Id === currentUser?._id || m.player2Id === currentUser?._id) &&
        (m.status === "ready" || m.status === "active")
    );

  return (
    <div className="min-h-screen bg-[#0d0a09] relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-amber-900/10 via-[#0d0a09] to-[#0d0a09]" />

      <div className="container mx-auto px-4 pt-28 pb-16 relative z-10">
        {/* Back Link */}
        <Link
          href="/tournaments"
          className="inline-flex items-center gap-2 text-[#a89f94] hover:text-[#e8e0d5] mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Tournaments</span>
        </Link>

        {/* Tournament Header */}
        <div className="mb-8 p-6 rounded-2xl tcg-chat-leather border border-[#3d2b1f] relative overflow-hidden">
          <div className="ornament-corner ornament-corner-tl opacity-30" />
          <div className="ornament-corner ornament-corner-tr opacity-30" />

          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            {/* Title & Status */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Trophy className="w-8 h-8 text-[#d4af37]" />
                <h1 className="text-3xl font-black text-[#e8e0d5]">{tournament.name}</h1>
              </div>
              {tournament.description && (
                <p className="text-[#a89f94] mb-4">{tournament.description}</p>
              )}

              {/* Status Badge */}
              <div
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-bold uppercase tracking-wider",
                  statusConfig.color
                )}
              >
                <StatusIcon className="w-4 h-4" />
                {statusConfig.label}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              {canRegister && (
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(true)}
                  className="px-6 py-3 rounded-lg bg-linear-to-r from-[#d4af37] to-amber-500 hover:from-amber-500 hover:to-[#d4af37] text-[#1a1614] font-bold uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Trophy className="w-5 h-5" />
                  Register Now
                </button>
              )}

              {canCheckIn && (
                <button
                  type="button"
                  onClick={() => setShowCheckInModal(true)}
                  className="px-6 py-3 rounded-lg bg-linear-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-bold uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Check In
                </button>
              )}

              {userCurrentMatch && (
                <Link
                  href={`/game/${userCurrentMatch.lobbyId}`}
                  className="px-6 py-3 rounded-lg bg-linear-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-bold uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Swords className="w-5 h-5" />
                  {userCurrentMatch.status === "active" ? "View Match" : "Start Match"}
                </Link>
              )}
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-6 pt-6 border-t border-[#3d2b1f]">
            <InfoCard
              icon={Users}
              label="Players"
              value={`${tournament.registeredCount}/${tournament.maxPlayers}`}
              iconColor="text-[#d4af37]"
            />
            <InfoCard
              icon={Coins}
              label="Prize Pool"
              value={`${totalPrize} Gold`}
              iconColor="text-amber-400"
            />
            <InfoCard
              icon={Coins}
              label="Entry Fee"
              value={tournament.entryFee > 0 ? `${tournament.entryFee} Gold` : "Free"}
              iconColor="text-green-400"
            />
            <InfoCard
              icon={Trophy}
              label="Mode"
              value={tournament.mode.charAt(0).toUpperCase() + tournament.mode.slice(1)}
              iconColor={tournament.mode === "ranked" ? "text-amber-400" : "text-green-400"}
            />
            <InfoCard
              icon={Calendar}
              label={tournament.status === "registration" ? "Starts In" : "Started"}
              value={
                tournament.status === "registration"
                  ? formatCountdown(tournament.scheduledStartAt)
                  : formatDate(tournament.scheduledStartAt)
              }
              iconColor="text-blue-400"
            />
            <InfoCard
              icon={Swords}
              label="Round"
              value={
                tournament.currentRound > 0
                  ? `${tournament.currentRound}/${tournament.totalRounds || "?"}`
                  : "Not Started"
              }
              iconColor="text-purple-400"
            />
          </div>

          {/* User Status */}
          {tournament.isRegistered && (
            <div
              className={cn(
                "mt-6 p-4 rounded-lg border",
                tournament.isCheckedIn
                  ? "bg-green-500/10 border-green-500/30"
                  : "bg-amber-500/10 border-amber-500/30"
              )}
            >
              <div className="flex items-center gap-3">
                {tournament.isCheckedIn ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <div>
                      <p className="font-bold text-green-400">You're Checked In!</p>
                      <p className="text-xs text-green-400/80">
                        {tournament.status === "active"
                          ? "Tournament is in progress. Check the bracket for your matches."
                          : "Tournament will start shortly."}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Clock className="w-5 h-5 text-amber-400" />
                    <div>
                      <p className="font-bold text-amber-400">Registered - Check-in Required</p>
                      <p className="text-xs text-amber-400/80">
                        {tournament.status === "registration"
                          ? `Check-in opens at ${formatDate(tournament.checkInStartsAt)}`
                          : tournament.status === "checkin"
                            ? `Check-in closes in ${formatCountdown(tournament.checkInEndsAt)}`
                            : "Check-in has ended"}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Prize Breakdown */}
        <div className="mb-8 p-5 rounded-xl bg-black/40 border border-[#3d2b1f]">
          <h3 className="text-sm font-bold text-[#a89f94] uppercase tracking-wider mb-4">
            Prize Distribution
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/20">
              <Crown className="w-8 h-8 text-[#d4af37] mx-auto mb-2" />
              <p className="text-xs text-[#a89f94] uppercase tracking-wider mb-1">1st Place</p>
              <p className="text-2xl font-black text-[#d4af37]">{tournament.prizePool.first}</p>
              <p className="text-xs text-[#d4af37]/60">Gold</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-gray-400/10 border border-gray-400/20">
              <Medal className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-[#a89f94] uppercase tracking-wider mb-1">2nd Place</p>
              <p className="text-2xl font-black text-gray-300">{tournament.prizePool.second}</p>
              <p className="text-xs text-gray-400/60">Gold</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-amber-600/10 border border-amber-600/20">
              <Medal className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="text-xs text-[#a89f94] uppercase tracking-wider mb-1">3rd-4th Place</p>
              <p className="text-2xl font-black text-amber-500">{tournament.prizePool.thirdFourth}</p>
              <p className="text-xs text-amber-500/60">Gold each</p>
            </div>
          </div>
        </div>

        {/* Winner Banner (if completed) */}
        {tournament.status === "completed" && tournament.winnerUsername && (
          <div className="mb-8 p-6 rounded-xl bg-linear-to-r from-[#d4af37]/20 via-amber-500/10 to-[#d4af37]/20 border-2 border-[#d4af37]/50">
            <div className="flex items-center justify-center gap-4">
              <Crown className="w-10 h-10 text-[#d4af37]" />
              <div className="text-center">
                <p className="text-sm text-[#a89f94] uppercase tracking-widest mb-1">
                  Tournament Champion
                </p>
                <p className="text-3xl font-black text-[#d4af37]">{tournament.winnerUsername}</p>
              </div>
              <Crown className="w-10 h-10 text-[#d4af37]" />
            </div>
            {tournament.secondPlaceUsername && (
              <p className="text-center text-sm text-[#a89f94] mt-3">
                Runner-up: <span className="text-gray-300 font-bold">{tournament.secondPlaceUsername}</span>
              </p>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 p-1 bg-black/40 rounded-xl border border-[#3d2b1f] w-fit">
          <button
            type="button"
            onClick={() => setActiveTab("bracket")}
            className={cn(
              "flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-all",
              activeTab === "bracket"
                ? "bg-[#d4af37] text-[#1a1614]"
                : "text-[#a89f94] hover:text-[#e8e0d5] hover:bg-white/5"
            )}
          >
            <Swords className="w-4 h-4" />
            <span>Bracket</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("participants")}
            className={cn(
              "flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-all",
              activeTab === "participants"
                ? "bg-[#d4af37] text-[#1a1614]"
                : "text-[#a89f94] hover:text-[#e8e0d5] hover:bg-white/5"
            )}
          >
            <Users className="w-4 h-4" />
            <span>Participants</span>
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-xs font-bold",
                activeTab === "participants"
                  ? "bg-[#1a1614]/20 text-[#1a1614]"
                  : "bg-[#d4af37]/20 text-[#d4af37]"
              )}
            >
              {bracket?.participants.length || 0}
            </span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="rounded-xl bg-black/40 border border-[#3d2b1f] p-6">
          {activeTab === "bracket" ? (
            bracket && bracket.rounds.length > 0 ? (
              <TournamentBracket bracket={bracket} currentUserId={currentUser?._id} />
            ) : (
              <div className="text-center py-12">
                <Swords className="w-12 h-12 text-[#a89f94]/30 mx-auto mb-4" />
                <p className="text-[#a89f94]">
                  {tournament.status === "registration"
                    ? "Bracket will be generated after check-in closes"
                    : tournament.status === "checkin"
                      ? "Bracket will be generated when tournament starts"
                      : "No bracket data available"}
                </p>
              </div>
            )
          ) : (
            <div className="space-y-2">
              {bracket?.participants && bracket.participants.length > 0 ? (
                bracket.participants
                  .sort((a, b) => (a.seedRating || 0) - (b.seedRating || 0))
                  .reverse()
                  .map((participant, index) => (
                    <div
                      key={participant._id}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-lg border transition-colors",
                        participant.userId === currentUser?._id
                          ? "bg-[#d4af37]/10 border-[#d4af37]/30"
                          : "bg-black/30 border-[#3d2b1f] hover:border-[#d4af37]/20"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 text-center text-sm font-bold text-[#a89f94]">
                          #{index + 1}
                        </span>
                        <div
                          className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center font-bold",
                            participant.status === "winner"
                              ? "bg-[#d4af37]/20 text-[#d4af37]"
                              : participant.status === "eliminated"
                                ? "bg-red-500/10 text-red-400/50"
                                : "bg-[#3d2b1f] text-[#e8e0d5]"
                          )}
                        >
                          {participant.username[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p
                            className={cn(
                              "font-bold",
                              participant.userId === currentUser?._id
                                ? "text-[#d4af37]"
                                : participant.status === "eliminated"
                                  ? "text-[#a89f94]/50"
                                  : "text-[#e8e0d5]"
                            )}
                          >
                            {participant.username}
                            {participant.userId === currentUser?._id && (
                              <span className="text-xs ml-2">(You)</span>
                            )}
                          </p>
                          <p className="text-xs text-[#a89f94]">
                            Rating: {participant.seedRating}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {participant.finalPlacement && (
                          <span
                            className={cn(
                              "px-2 py-1 rounded text-xs font-bold",
                              participant.finalPlacement === 1
                                ? "bg-[#d4af37]/20 text-[#d4af37]"
                                : participant.finalPlacement === 2
                                  ? "bg-gray-400/20 text-gray-300"
                                  : participant.finalPlacement <= 4
                                    ? "bg-amber-600/20 text-amber-500"
                                    : "bg-[#3d2b1f] text-[#a89f94]"
                            )}
                          >
                            {getOrdinalSuffix(participant.finalPlacement)}
                          </span>
                        )}

                        <span
                          className={cn(
                            "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider",
                            participant.status === "winner"
                              ? "bg-[#d4af37]/20 text-[#d4af37]"
                              : participant.status === "checked_in" || participant.status === "active"
                                ? "bg-green-500/20 text-green-400"
                                : participant.status === "eliminated"
                                  ? "bg-red-500/20 text-red-400"
                                  : "bg-amber-500/20 text-amber-400"
                          )}
                        >
                          {participant.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-[#a89f94]/30 mx-auto mb-4" />
                  <p className="text-[#a89f94]">No participants yet</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <RegisterModal
        tournament={tournament}
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onConfirm={handleRegister}
      />

      <CheckInModal
        tournament={tournament}
        isOpen={showCheckInModal}
        onClose={() => setShowCheckInModal(false)}
        onConfirm={handleCheckIn}
      />
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
  iconColor,
}: {
  icon: typeof Trophy;
  label: string;
  value: string;
  iconColor: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "w-8 h-8 rounded-lg bg-black/30 border border-[#3d2b1f] flex items-center justify-center",
          iconColor
        )}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-[#a89f94] uppercase tracking-wider truncate">{label}</p>
        <p className="font-bold text-[#e8e0d5] text-sm truncate">{value}</p>
      </div>
    </div>
  );
}
