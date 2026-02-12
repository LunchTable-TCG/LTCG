"use client";

import { useCurrency } from "@/hooks/economy/useCurrency";
import { useTournament, useTournamentHistory, useTournaments } from "@/hooks/social/useTournament";
import type { TournamentSummary } from "@/hooks/social/useTournament";
import {
  useJoinUserTournament,
  useMyHostedTournament,
  usePublicUserTournaments,
} from "@/hooks/social/useUserTournaments";
import type { TournamentTab } from "@/types/tournaments";
import type { Id } from "@convex/_generated/dataModel";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export function useTournamentInteraction() {
  const [activeTab, setActiveTab] = useState<TournamentTab>("active");
  const [registeringForTournament, setRegisteringForTournament] =
    useState<Id<"tournaments"> | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinCodeModal, setShowJoinCodeModal] = useState(false);

  // Hooks
  const { tournaments, isLoading: tournamentsLoading } = useTournaments();
  const { history, stats, isLoading: historyLoading } = useTournamentHistory();
  const { tournaments: communityTournaments, isLoading: communityLoading } =
    usePublicUserTournaments();
  const { tournament: myHostedTournament, isLoading: hostedLoading } = useMyHostedTournament();
  const { joinById } = useJoinUserTournament();
  const { gold } = useCurrency();

  // For registration modal - get the selected tournament details
  const { tournament: selectedTournament, register } = useTournament(
    registeringForTournament ?? undefined
  );

  const activeTournaments = useMemo(
    () =>
      tournaments.filter(
        (t) => t.status === "registration" || t.status === "checkin" || t.status === "active"
      ) as TournamentSummary[],
    [tournaments]
  );

  const canCreateTournament = !myHostedTournament;

  const handleRegister = async () => {
    if (!selectedTournament) return;

    try {
      const result = await register();
      toast.success(result.message);
      setRegisteringForTournament(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Registration failed");
      throw error;
    }
  };

  const handleJoinCommunityTournament = async (tournamentId: Id<"tournaments">) => {
    try {
      await joinById(tournamentId);
    } catch {
      // Error handled by hook
    }
  };

  return {
    // State
    activeTab,
    setActiveTab,
    registeringForTournament,
    setRegisteringForTournament,
    showCreateModal,
    setShowCreateModal,
    showJoinCodeModal,
    setShowJoinCodeModal,

    // Data
    gold,
    tournaments,
    activeTournaments,
    communityTournaments,
    myHostedTournament,
    history,
    stats,
    selectedTournament,

    // Loading states
    tournamentsLoading,
    historyLoading,
    communityLoading,
    hostedLoading,

    // Actions
    handleRegister,
    handleJoinCommunityTournament,
    canCreateTournament,
  };
}
