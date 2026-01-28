import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useGameState } from "../useGameState";
import * as convexReact from "convex/react";
import { toast } from "sonner";

// Mock imports
vi.mock("convex/react");
vi.mock("sonner");

describe("useGameState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return loading state initially", () => {
    // Mock useQuery to return undefined (loading state)
    vi.mocked(convexReact.useQuery).mockReturnValue(undefined);
    vi.mocked(convexReact.useMutation).mockReturnValue(vi.fn());

    const { result } = renderHook(() => useGameState());

    expect(result.current.hasActiveGame).toBe(false);
    expect(result.current.activeGameInfo).toBeUndefined();
    expect(result.current.gameState).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
  });

  it("should detect active game when present", () => {
    const mockActiveGame = {
      hasActiveGame: true,
      lobbyId: "lobby_123" as any,
    };

    vi.mocked(convexReact.useQuery).mockReturnValue(mockActiveGame);
    vi.mocked(convexReact.useMutation).mockReturnValue(vi.fn());

    const { result } = renderHook(() => useGameState());

    expect(result.current.hasActiveGame).toBe(true);
    expect(result.current.activeGameInfo).toEqual(mockActiveGame);
  });

  it("should return no active game when none exists", () => {
    const mockActiveGame = {
      hasActiveGame: false,
      lobbyId: null,
    };

    vi.mocked(convexReact.useQuery).mockReturnValue(mockActiveGame);
    vi.mocked(convexReact.useMutation).mockReturnValue(vi.fn());

    const { result } = renderHook(() => useGameState());

    expect(result.current.hasActiveGame).toBe(false);
    expect(result.current.activeGameInfo).toEqual(mockActiveGame);
  });

  it("should fetch game state for specific lobby", () => {
    const mockGameState = {
      lobbyId: "lobby_123" as any,
      players: [],
      currentPhase: "MAIN_PHASE",
      turnPlayer: "player1" as any,
    };

    // Return mockGameState for all queries - the hook will use it appropriately
    vi.mocked(convexReact.useQuery).mockReturnValue(mockGameState);
    vi.mocked(convexReact.useMutation).mockReturnValue(vi.fn());

    const { result } = renderHook(() => useGameState("lobby_123" as any));

    expect(result.current.gameState).toEqual(mockGameState);
    expect(result.current.isLoading).toBe(false);
  });

  it("should successfully surrender game", async () => {
    const mockSurrenderMutation = vi.fn().mockResolvedValue(undefined);

    vi.mocked(convexReact.useQuery).mockReturnValue({
      hasActiveGame: true,
      lobbyId: "lobby_123" as any,
    });
    vi.mocked(convexReact.useMutation).mockReturnValue(mockSurrenderMutation);

    const { result } = renderHook(() => useGameState("lobby_123" as any));

    await result.current.surrender();

    await waitFor(() => {
      expect(mockSurrenderMutation).toHaveBeenCalledWith({ lobbyId: "lobby_123" });
      expect(toast.info).toHaveBeenCalledWith("You surrendered the game");
    });
  });

  it("should handle surrender errors gracefully", async () => {
    const mockError = new Error("Failed to surrender");
    const mockSurrenderMutation = vi.fn().mockRejectedValue(mockError);

    vi.mocked(convexReact.useQuery).mockReturnValue({
      hasActiveGame: true,
      lobbyId: "lobby_123" as any,
    });
    vi.mocked(convexReact.useMutation).mockReturnValue(mockSurrenderMutation);

    const { result } = renderHook(() => useGameState("lobby_123" as any));

    await expect(result.current.surrender()).rejects.toThrow("Failed to surrender");

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to surrender");
    });
  });

  it("should return expected interface when authenticated", () => {
    // Test with default authenticated state
    vi.mocked(convexReact.useQuery).mockReturnValue({
      hasActiveGame: false,
      lobbyId: null,
    });
    vi.mocked(convexReact.useMutation).mockReturnValue(vi.fn());

    const { result } = renderHook(() => useGameState());

    // Should return all expected properties
    expect(result.current).toHaveProperty("hasActiveGame");
    expect(result.current).toHaveProperty("activeGameInfo");
    expect(result.current).toHaveProperty("gameState");
    expect(result.current).toHaveProperty("isLoading");
    expect(result.current).toHaveProperty("surrender");
    expect(typeof result.current.surrender).toBe("function");
  });
});
