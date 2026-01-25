"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useAuth } from "@/components/ConvexAuthProvider";
import { toast } from "sonner";
import type { Id } from "@convex/_generated/dataModel";

/**
 * useSpectator Hook
 *
 * Provides spectator features for watching active games.
 * Features:
 * - Browse spectatable games
 * - Join/leave as spectator
 * - Get sanitized spectator view (no private data)
 */
export function useSpectator(lobbyId?: Id<"gameLobbies">) {
  const { token } = useAuth();

  // List spectatable games
  const activeGames = useQuery(api.games.listActiveGames, {
    mode: "all",
    limit: 50,
  });

  // Get spectator view
  const spectatorView = useQuery(
    api.games.getGameSpectatorView,
    lobbyId ? { lobbyId } : "skip"
  );

  // Join/leave as spectator
  const joinMutation = useMutation(api.games.joinAsSpectator);
  const leaveMutation = useMutation(api.games.leaveAsSpectator);

  const joinAsSpectator = async (lobbyId: Id<"gameLobbies">) => {
    try {
      await joinMutation({ lobbyId, token: token ?? undefined });
      toast.success("Now spectating game");
    } catch (error: any) {
      toast.error(error.message || "Failed to join as spectator");
      throw error;
    }
  };

  const leaveAsSpectator = async (lobbyId: Id<"gameLobbies">) => {
    try {
      await leaveMutation({ lobbyId, token: token ?? undefined });
      toast.info("Stopped spectating");
    } catch (error: any) {
      toast.error(error.message || "Failed to leave spectator mode");
      throw error;
    }
  };

  return {
    activeGames,
    spectatorView,
    isLoading: activeGames === undefined,
    joinAsSpectator,
    leaveAsSpectator,
  };
}
