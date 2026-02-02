"use client";

import { handleHookError } from "@/lib/errorHandling";
import { apiAny, useConvexQuery } from "@/lib/convexHelpers";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { toast } from "sonner";

interface CreateLobbyResult {
  lobbyId: Id<"gameLobbies">;
  joinCode?: string;
}

interface JoinLobbyResult {
  gameId: string;
  lobbyId: Id<"gameLobbies">;
  opponentUsername: string;
}

interface IncomingChallenge {
  _id: Id<"gameLobbies">;
  hostId: Id<"users">;
  hostUsername: string;
  hostRank: string;
  mode: "casual" | "ranked";
  createdAt: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WaitingLobbiesResult = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LobbyResult = any;

interface UseGameLobbyReturn {
  waitingLobbies: WaitingLobbiesResult | undefined;
  myLobby: LobbyResult | undefined;
  privateLobby: LobbyResult | undefined;
  incomingChallenge: IncomingChallenge | null | undefined;
  isLoading: boolean;
  hasActiveLobby: boolean;
  createLobby: (
    mode: "casual" | "ranked",
    isPrivate?: boolean,
    spectatorOptions?: { allowSpectators?: boolean; maxSpectators?: number }
  ) => Promise<CreateLobbyResult>;
  joinLobby: (lobbyId: Id<"gameLobbies">, joinCode?: string) => Promise<JoinLobbyResult>;
  joinByCode: (joinCode: string) => Promise<JoinLobbyResult>;
  cancelLobby: () => Promise<void>;
  leaveLobby: () => Promise<void>;
  declineChallenge: (lobbyId: Id<"gameLobbies">) => Promise<void>;
}

/**
 * Complete game lobby lifecycle management for multiplayer matchmaking.
 *
 * Handles all lobby operations from creation to joining to cancellation.
 * Provides real-time lobby discovery and supports both public and private
 * games with join codes. All mutations show toast notifications.
 *
 * Features:
 * - Create casual or ranked lobbies
 * - Create private lobbies with join codes
 * - Join public lobbies from waiting list
 * - Join private lobbies via join code
 * - Cancel your own lobby while waiting
 * - Leave a lobby you've joined
 * - Real-time lobby list updates
 * - Active lobby tracking
 *
 * @example
 * ```typescript
 * const {
 *   waitingLobbies,
 *   myLobby,
 *   privateLobby,
 *   hasActiveLobby,
 *   createLobby,
 *   joinLobby,
 *   joinByCode,
 *   cancelLobby
 * } = useGameLobby();
 *
 * // Create a private ranked lobby
 * const { joinCode } = await createLobby("ranked", true);
 * console.log("Share this code:", joinCode);
 *
 * // Join a public lobby
 * await joinLobby(lobbyId);
 *
 * // Join with code
 * await joinByCode("ABC123");
 *
 * // Cancel your lobby
 * if (hasActiveLobby) {
 *   await cancelLobby();
 * }
 * ```
 *
 * @returns {UseGameLobbyReturn} Lobby management interface
 *
 * @throws {Error} Operations throw on failure (caught internally, toast shown)
 */
export function useGameLobby(): UseGameLobbyReturn {
  // No auth check needed - this hook should only be used inside <Authenticated>
  // Using apiAny and useConvexQuery to avoid TS2589 "Type instantiation excessively deep" errors
  const waitingLobbies = useConvexQuery(apiAny.games.listWaitingLobbies, {});
  const myLobby = useConvexQuery(apiAny.games.getActiveLobby, {});
  const privateLobby = useConvexQuery(apiAny.games.getMyPrivateLobby, {});
  const incomingChallenge = useConvexQuery(apiAny.games.getIncomingChallenge, {}) as
    | IncomingChallenge
    | null
    | undefined;

  // Mutations - using apiAny to avoid deep type instantiation
  const createMutation = useMutation(apiAny.games.createLobby);
  const joinMutation = useMutation(apiAny.games.joinLobby);
  const joinByCodeMutation = useMutation(apiAny.games.joinLobbyByCode);
  const cancelMutation = useMutation(apiAny.games.cancelLobby);
  const leaveMutation = useMutation(apiAny.games.leaveLobby);

  // Actions
  const createLobby = async (
    mode: "casual" | "ranked",
    isPrivate = false,
    spectatorOptions?: { allowSpectators?: boolean; maxSpectators?: number }
  ) => {
    try {
      const result = await createMutation({
        mode,
        isPrivate,
        allowSpectators: spectatorOptions?.allowSpectators,
        maxSpectators: spectatorOptions?.maxSpectators,
      });
      const modeText = mode === "casual" ? "Casual" : "Ranked";
      if (isPrivate && result.joinCode) {
        toast.success(`${modeText} lobby created! Share code: ${result.joinCode}`);
      } else {
        toast.success(`${modeText} lobby created! Waiting for opponent...`);
      }
      return result;
    } catch (error) {
      const message = handleHookError(error, "Failed to create lobby");
      toast.error(message);
      throw error;
    }
  };

  const joinLobby = async (lobbyId: Id<"gameLobbies">, joinCode?: string) => {
    try {
      const result = await joinMutation({ lobbyId, joinCode });
      toast.success(`Joined game vs ${result.opponentUsername}`);
      return result;
    } catch (error) {
      const message = handleHookError(error, "Failed to join lobby");
      toast.error(message);
      throw error;
    }
  };

  const joinByCode = async (joinCode: string) => {
    try {
      const result = await joinByCodeMutation({ joinCode });
      toast.success("Joined private game!");
      return result;
    } catch (error) {
      const message = handleHookError(error, "Failed to join with code");
      toast.error(message);
      throw error;
    }
  };

  const cancelLobby = async () => {
    try {
      await cancelMutation({});
      toast.success("Lobby cancelled");
    } catch (error) {
      const message = handleHookError(error, "Failed to cancel lobby");
      toast.error(message);
      throw error;
    }
  };

  const leaveLobby = async () => {
    try {
      await leaveMutation({});
      toast.success("Left lobby");
    } catch (error) {
      const message = handleHookError(error, "Failed to leave lobby");
      toast.error(message);
      throw error;
    }
  };

  const declineChallenge = async (_lobbyId: Id<"gameLobbies">) => {
    try {
      await leaveMutation({});
      toast.success("Challenge declined");
    } catch (error) {
      const message = handleHookError(error, "Failed to decline challenge");
      toast.error(message);
      throw error;
    }
  };

  return {
    // Data
    waitingLobbies,
    myLobby,
    privateLobby,
    incomingChallenge,
    isLoading: waitingLobbies === undefined,
    hasActiveLobby: !!myLobby,

    // Actions
    createLobby,
    joinLobby,
    joinByCode,
    cancelLobby,
    leaveLobby,
    declineChallenge,
  };
}
