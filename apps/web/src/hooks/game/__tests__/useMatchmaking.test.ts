/**
 * useMatchmaking Hook Tests
 *
 * Tests for matchmaking queue functionality.
 */

import { act, renderHook } from "@testing-library/react";
import * as convexReact from "convex/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMatchmaking } from "../useMatchmaking";

vi.mock("convex/react");
vi.mock("sonner");

describe("useMatchmaking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Queue Status States", () => {
    it("should return idle state when not in queue", () => {
      const mockStatus = {
        status: "idle" as const,
        elapsedSeconds: 0,
        currentRatingWindow: undefined,
      };

      vi.mocked(convexReact.useQuery).mockReturnValue(mockStatus);
      vi.mocked(convexReact.useMutation).mockReturnValue(vi.fn());

      const { result } = renderHook(() => useMatchmaking());

      expect(result.current.isInQueue).toBe(false);
      expect(result.current.queueStatus).toEqual(mockStatus);
      expect(result.current.elapsedSeconds).toBe(0);
      expect(result.current.currentRatingWindow).toBeUndefined();
    });

    it("should return searching state when in queue", () => {
      const mockStatus = {
        status: "searching" as const,
        elapsedSeconds: 45,
        currentRatingWindow: 100,
      };

      vi.mocked(convexReact.useQuery).mockReturnValue(mockStatus);
      vi.mocked(convexReact.useMutation).mockReturnValue(vi.fn());

      const { result } = renderHook(() => useMatchmaking());

      expect(result.current.isInQueue).toBe(true);
      expect(result.current.queueStatus).toEqual(mockStatus);
      expect(result.current.elapsedSeconds).toBe(45);
      expect(result.current.currentRatingWindow).toBe(100);
    });

    it("should return matched state when opponent found", () => {
      const mockStatus = {
        status: "matched" as const,
        elapsedSeconds: 30,
        currentRatingWindow: 150,
        matchedGameId: "game_123" as any,
      };

      vi.mocked(convexReact.useQuery).mockReturnValue(mockStatus);
      vi.mocked(convexReact.useMutation).mockReturnValue(vi.fn());

      const { result } = renderHook(() => useMatchmaking());

      expect(result.current.isInQueue).toBe(false);
      expect(result.current.queueStatus).toEqual(mockStatus);
    });

    it("should handle loading state when query returns undefined", () => {
      vi.mocked(convexReact.useQuery).mockReturnValue(undefined);
      vi.mocked(convexReact.useMutation).mockReturnValue(vi.fn());

      const { result } = renderHook(() => useMatchmaking());

      expect(result.current.isInQueue).toBe(false);
      expect(result.current.queueStatus).toBeUndefined();
      expect(result.current.elapsedSeconds).toBe(0);
      expect(result.current.currentRatingWindow).toBeUndefined();
    });
  });

  describe("Join Queue", () => {
    it("should successfully join ranked queue", async () => {
      const mockJoinQueueMutation = vi.fn().mockResolvedValue(undefined);

      vi.mocked(convexReact.useQuery).mockReturnValue({
        status: "idle" as const,
        elapsedSeconds: 0,
      });
      vi.mocked(convexReact.useMutation)
        .mockReturnValueOnce(mockJoinQueueMutation)
        .mockReturnValueOnce(vi.fn());

      const { result } = renderHook(() => useMatchmaking());

      const response = await act(async () => {
        return result.current.joinQueue("ranked");
      });

      expect(response).toEqual({ success: true });
      expect(mockJoinQueueMutation).toHaveBeenCalledWith({ mode: "ranked" });
      expect(toast.success).toHaveBeenCalledWith("Joined ranked queue");
    });

    it("should successfully join casual queue", async () => {
      const mockJoinQueueMutation = vi.fn().mockResolvedValue(undefined);

      vi.mocked(convexReact.useQuery).mockReturnValue({
        status: "idle" as const,
        elapsedSeconds: 0,
      });
      vi.mocked(convexReact.useMutation)
        .mockReturnValueOnce(mockJoinQueueMutation)
        .mockReturnValueOnce(vi.fn());

      const { result } = renderHook(() => useMatchmaking());

      const response = await act(async () => {
        return result.current.joinQueue("casual");
      });

      expect(response).toEqual({ success: true });
      expect(mockJoinQueueMutation).toHaveBeenCalledWith({ mode: "casual" });
      expect(toast.success).toHaveBeenCalledWith("Joined casual queue");
    });

    it("should handle join queue error", async () => {
      const mockError = new Error("Already in queue");
      const mockJoinQueueMutation = vi.fn().mockRejectedValue(mockError);

      vi.mocked(convexReact.useQuery).mockReturnValue({
        status: "idle" as const,
        elapsedSeconds: 0,
      });
      vi.mocked(convexReact.useMutation)
        .mockReturnValueOnce(mockJoinQueueMutation)
        .mockReturnValueOnce(vi.fn());

      const { result } = renderHook(() => useMatchmaking());

      const response = await act(async () => {
        return result.current.joinQueue("ranked");
      });

      expect(response).toEqual({ success: false, error: "Already in queue" });
      expect(toast.error).toHaveBeenCalledWith("Already in queue");
    });

    it("should handle join queue with unknown error type", async () => {
      const mockJoinQueueMutation = vi.fn().mockRejectedValue("String error");

      vi.mocked(convexReact.useQuery).mockReturnValue({
        status: "idle" as const,
        elapsedSeconds: 0,
      });
      vi.mocked(convexReact.useMutation)
        .mockReturnValueOnce(mockJoinQueueMutation)
        .mockReturnValueOnce(vi.fn());

      const { result } = renderHook(() => useMatchmaking());

      const response = await act(async () => {
        return result.current.joinQueue("casual");
      });

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(toast.error).toHaveBeenCalled();
    });
  });

  describe("Leave Queue", () => {
    it("should successfully leave queue", async () => {
      const mockLeaveQueueMutation = vi.fn().mockResolvedValue(undefined);

      vi.mocked(convexReact.useQuery).mockReturnValue({
        status: "searching" as const,
        elapsedSeconds: 30,
      });
      vi.mocked(convexReact.useMutation)
        .mockReturnValueOnce(vi.fn())
        .mockReturnValueOnce(mockLeaveQueueMutation);

      const { result } = renderHook(() => useMatchmaking());

      const response = await act(async () => {
        return result.current.leaveQueue();
      });

      expect(response).toEqual({ success: true });
      expect(mockLeaveQueueMutation).toHaveBeenCalledWith({});
      expect(toast.info).toHaveBeenCalledWith("Left matchmaking queue");
    });

    it("should handle leave queue error", async () => {
      const mockError = new Error("Not in queue");
      const mockLeaveQueueMutation = vi.fn().mockRejectedValue(mockError);

      vi.mocked(convexReact.useQuery).mockReturnValue({
        status: "searching" as const,
        elapsedSeconds: 30,
      });
      vi.mocked(convexReact.useMutation)
        .mockReturnValueOnce(vi.fn())
        .mockReturnValueOnce(mockLeaveQueueMutation);

      const { result } = renderHook(() => useMatchmaking());

      const response = await act(async () => {
        return result.current.leaveQueue();
      });

      expect(response).toEqual({ success: false, error: "Not in queue" });
      expect(toast.error).toHaveBeenCalledWith("Not in queue");
    });
  });

  describe("Rating Window", () => {
    it("should show rating window for ranked queue", () => {
      const mockStatus = {
        status: "searching" as const,
        elapsedSeconds: 60,
        currentRatingWindow: 200,
      };

      vi.mocked(convexReact.useQuery).mockReturnValue(mockStatus);
      vi.mocked(convexReact.useMutation).mockReturnValue(vi.fn());

      const { result } = renderHook(() => useMatchmaking());

      expect(result.current.currentRatingWindow).toBe(200);
    });

    it("should not have rating window for casual queue", () => {
      const mockStatus = {
        status: "searching" as const,
        elapsedSeconds: 60,
        currentRatingWindow: undefined,
      };

      vi.mocked(convexReact.useQuery).mockReturnValue(mockStatus);
      vi.mocked(convexReact.useMutation).mockReturnValue(vi.fn());

      const { result } = renderHook(() => useMatchmaking());

      expect(result.current.currentRatingWindow).toBeUndefined();
    });
  });

  describe("Elapsed Time", () => {
    it("should track elapsed time while in queue", () => {
      const mockStatus = {
        status: "searching" as const,
        elapsedSeconds: 120,
        currentRatingWindow: 150,
      };

      vi.mocked(convexReact.useQuery).mockReturnValue(mockStatus);
      vi.mocked(convexReact.useMutation).mockReturnValue(vi.fn());

      const { result } = renderHook(() => useMatchmaking());

      expect(result.current.elapsedSeconds).toBe(120);
    });

    it("should default elapsed time to 0 when not in queue", () => {
      vi.mocked(convexReact.useQuery).mockReturnValue(null);
      vi.mocked(convexReact.useMutation).mockReturnValue(vi.fn());

      const { result } = renderHook(() => useMatchmaking());

      expect(result.current.elapsedSeconds).toBe(0);
    });
  });

  describe("Interface Verification", () => {
    it("should return all expected properties", () => {
      vi.mocked(convexReact.useQuery).mockReturnValue({
        status: "idle" as const,
        elapsedSeconds: 0,
      });
      vi.mocked(convexReact.useMutation).mockReturnValue(vi.fn());

      const { result } = renderHook(() => useMatchmaking());

      expect(result.current).toHaveProperty("isInQueue");
      expect(result.current).toHaveProperty("queueStatus");
      expect(result.current).toHaveProperty("elapsedSeconds");
      expect(result.current).toHaveProperty("currentRatingWindow");
      expect(result.current).toHaveProperty("joinQueue");
      expect(result.current).toHaveProperty("leaveQueue");
      expect(typeof result.current.joinQueue).toBe("function");
      expect(typeof result.current.leaveQueue).toBe("function");
    });
  });

  describe("Real-time Updates", () => {
    it("should reflect queue status changes", () => {
      const mockStatusIdle = {
        status: "idle" as const,
        elapsedSeconds: 0,
      };

      vi.mocked(convexReact.useQuery).mockReturnValue(mockStatusIdle);
      vi.mocked(convexReact.useMutation).mockReturnValue(vi.fn());

      const { result, rerender } = renderHook(() => useMatchmaking());

      expect(result.current.isInQueue).toBe(false);

      const mockStatusSearching = {
        status: "searching" as const,
        elapsedSeconds: 5,
        currentRatingWindow: 100,
      };

      vi.mocked(convexReact.useQuery).mockReturnValue(mockStatusSearching);
      rerender();

      expect(result.current.isInQueue).toBe(true);
      expect(result.current.elapsedSeconds).toBe(5);
      expect(result.current.currentRatingWindow).toBe(100);
    });
  });
});
