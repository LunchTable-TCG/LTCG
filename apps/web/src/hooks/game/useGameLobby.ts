"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useAuth } from "@/components/ConvexAuthProvider";
import { toast } from "sonner";
import type { Id } from "@convex/_generated/dataModel";

/**
 * useGameLobby Hook
 *
 * Complete lobby lifecycle management including:
 * - Creating lobbies (casual/ranked/private)
 * - Joining lobbies (public list or join code)
 * - Cancelling and leaving lobbies
 * - Real-time lobby discovery
 */
export function useGameLobby() {
  const { token } = useAuth();

  // Queries
  const waitingLobbies = useQuery(
    api.games.listWaitingLobbies,
    {}
  );

  const myLobby = useQuery(
    api.games.getActiveLobby,
    token ? { token } : "skip"
  );

  const privateLobby = useQuery(
    api.games.getMyPrivateLobby,
    token ? { token } : "skip"
  );

  // Mutations
  const createMutation = useMutation(api.games.createLobby);
  const joinMutation = useMutation(api.games.joinLobby);
  const joinByCodeMutation = useMutation(api.games.joinLobbyByCode);
  const cancelMutation = useMutation(api.games.cancelLobby);
  const leaveMutation = useMutation(api.games.leaveLobby);

  // Actions
  const createLobby = async (
    mode: "casual" | "ranked",
    isPrivate = false
  ) => {
    if (!token) throw new Error("Not authenticated");
    try {
      const result = await createMutation({ token, mode, isPrivate });
      const modeText = mode === "casual" ? "Casual" : "Ranked";
      if (isPrivate && result.joinCode) {
        toast.success(
          `${modeText} lobby created! Share code: ${result.joinCode}`
        );
      } else {
        toast.success(`${modeText} lobby created! Waiting for opponent...`);
      }
      return result;
    } catch (error: any) {
      toast.error(error.message || "Failed to create lobby");
      throw error;
    }
  };

  const joinLobby = async (
    lobbyId: Id<"gameLobbies">,
    joinCode?: string
  ) => {
    if (!token) throw new Error("Not authenticated");
    try {
      const result = await joinMutation({ token, lobbyId, joinCode });
      toast.success(`Joined game vs ${result.opponentUsername}`);
      return result;
    } catch (error: any) {
      toast.error(error.message || "Failed to join lobby");
      throw error;
    }
  };

  const joinByCode = async (joinCode: string) => {
    if (!token) throw new Error("Not authenticated");
    try {
      const result = await joinByCodeMutation({ token, joinCode });
      toast.success("Joined private game!");
      return result;
    } catch (error: any) {
      toast.error(error.message || "Failed to join with code");
      throw error;
    }
  };

  const cancelLobby = async () => {
    if (!token) throw new Error("Not authenticated");
    try {
      await cancelMutation({ token });
      toast.success("Lobby cancelled");
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel lobby");
      throw error;
    }
  };

  const leaveLobby = async () => {
    if (!token) throw new Error("Not authenticated");
    try {
      await leaveMutation({ token });
      toast.success("Left lobby");
    } catch (error: any) {
      toast.error(error.message || "Failed to leave lobby");
      throw error;
    }
  };

  return {
    // Data
    waitingLobbies,
    myLobby,
    privateLobby,
    isLoading: waitingLobbies === undefined,
    hasActiveLobby: !!myLobby,

    // Actions
    createLobby,
    joinLobby,
    joinByCode,
    cancelLobby,
    leaveLobby,
  };
}
