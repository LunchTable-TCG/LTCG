import { renderHook } from "@testing-library/react";
import * as convexReact from "convex/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGlobalChat } from "@/hooks/social/useGlobalChat";

// Mock imports
vi.mock("convex/react");
vi.mock("sonner");

describe("useGlobalChat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should load messages on mount", () => {
    const mockMessages = [
      {
        _id: "msg_1" as any,
        userId: "user_1" as any,
        username: "Alice",
        message: "Hello!",
        createdAt: Date.now(),
      },
      {
        _id: "msg_2" as any,
        userId: "user_2" as any,
        username: "Bob",
        message: "Hi there!",
        createdAt: Date.now() - 1000,
      },
    ];

    vi.mocked(convexReact.usePaginatedQuery).mockReturnValue({
      results: mockMessages,
      status: "CanLoadMore",
      loadMore: vi.fn(),
    });
    vi.mocked(convexReact.useQuery).mockReturnValue([]);
    vi.mocked(convexReact.useMutation).mockReturnValue(vi.fn());

    const { result } = renderHook(() => useGlobalChat());

    expect(result.current.messages).toEqual(mockMessages);
    expect(result.current.isLoading).toBe(false);
  });

  it("should load online users", () => {
    const mockOnlineUsers = [
      {
        userId: "user_1" as any,
        username: "Alice",
        status: "online" as const,
        rank: "Gold",
      },
      {
        userId: "user_2" as any,
        username: "Bob",
        status: "in_game" as const,
        rank: "Silver",
      },
    ];

    vi.mocked(convexReact.usePaginatedQuery).mockReturnValue({
      results: [],
      status: "Exhausted",
      loadMore: vi.fn(),
    });
    vi.mocked(convexReact.useQuery).mockReturnValue(mockOnlineUsers);
    vi.mocked(convexReact.useMutation).mockReturnValue(vi.fn());

    const { result } = renderHook(() => useGlobalChat());

    expect(result.current.onlineUsers).toEqual(mockOnlineUsers);
  });

  it("should send message successfully", async () => {
    const mockSendMessageMutation = vi.fn().mockResolvedValue(undefined);
    const mockUpdatePresenceMutation = vi.fn().mockResolvedValue(undefined);

    vi.mocked(convexReact.usePaginatedQuery).mockReturnValue({
      results: [],
      status: "Exhausted",
      loadMore: vi.fn(),
    });
    vi.mocked(convexReact.useQuery).mockReturnValue([]);
    // useGlobalChat calls useMutation twice: sendMessage and updatePresence
    vi.mocked(convexReact.useMutation)
      .mockReturnValueOnce(mockSendMessageMutation)
      .mockReturnValueOnce(mockUpdatePresenceMutation);

    const { result } = renderHook(() => useGlobalChat());

    // Wait for initial presence update to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Now test sendMessage
    await result.current.sendMessage("Hello world!");

    expect(mockSendMessageMutation).toHaveBeenCalledWith({
      content: "Hello world!",
    });
  });

  it("should handle send message errors", async () => {
    const mockError = new Error("Rate limit exceeded");
    const mockSendMessageMutation = vi.fn().mockRejectedValue(mockError);
    const mockUpdatePresenceMutation = vi.fn().mockResolvedValue(undefined);

    vi.mocked(convexReact.usePaginatedQuery).mockReturnValue({
      results: [],
      status: "Exhausted",
      loadMore: vi.fn(),
    });
    vi.mocked(convexReact.useQuery).mockReturnValue([]);
    // useGlobalChat calls useMutation twice: sendMessage and updatePresence
    vi.mocked(convexReact.useMutation)
      .mockReturnValueOnce(mockSendMessageMutation)
      .mockReturnValueOnce(mockUpdatePresenceMutation);

    const { result } = renderHook(() => useGlobalChat());

    // Wait for initial presence update to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Now test error handling
    await expect(result.current.sendMessage("Hello!")).rejects.toThrow("Rate limit exceeded");

    expect(toast.error).toHaveBeenCalledWith("Rate limit exceeded");
  });

  it("should update presence on mount", async () => {
    const mockSendMessageMutation = vi.fn().mockResolvedValue(undefined);
    const mockUpdatePresenceMutation = vi.fn().mockResolvedValue(undefined);

    vi.mocked(convexReact.usePaginatedQuery).mockReturnValue({
      results: [],
      status: "Exhausted",
      loadMore: vi.fn(),
    });
    vi.mocked(convexReact.useQuery).mockReturnValue([]);
    // useGlobalChat calls useMutation twice: sendMessage and updatePresence
    vi.mocked(convexReact.useMutation)
      .mockReturnValueOnce(mockSendMessageMutation)
      .mockReturnValueOnce(mockUpdatePresenceMutation);

    renderHook(() => useGlobalChat());

    // Give async effect time to run
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Initial presence update should happen immediately
    expect(mockUpdatePresenceMutation).toHaveBeenCalledWith({});
  });

  it("should maintain presence heartbeat (30s interval)", async () => {
    vi.useFakeTimers();

    const mockSendMessageMutation = vi.fn().mockResolvedValue(undefined);
    const mockUpdatePresenceMutation = vi.fn().mockResolvedValue(undefined);

    vi.mocked(convexReact.usePaginatedQuery).mockReturnValue({
      results: [],
      status: "Exhausted",
      loadMore: vi.fn(),
    });
    vi.mocked(convexReact.useQuery).mockReturnValue([]);
    // useGlobalChat calls useMutation twice: sendMessage and updatePresence
    vi.mocked(convexReact.useMutation)
      .mockReturnValueOnce(mockSendMessageMutation)
      .mockReturnValueOnce(mockUpdatePresenceMutation);

    renderHook(() => useGlobalChat());

    // Wait for initial call
    await vi.waitFor(() => {
      expect(mockUpdatePresenceMutation).toHaveBeenCalledTimes(1);
    });

    // Clear initial call
    mockUpdatePresenceMutation.mockClear();

    // Advance time by 30 seconds
    await vi.advanceTimersByTimeAsync(30000);

    // Should have called updatePresence again
    expect(mockUpdatePresenceMutation).toHaveBeenCalledTimes(1);

    // Advance another 30 seconds
    await vi.advanceTimersByTimeAsync(30000);

    expect(mockUpdatePresenceMutation).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it("should load more messages when available", () => {
    const mockLoadMore = vi.fn();

    vi.mocked(convexReact.usePaginatedQuery).mockReturnValue({
      results: [],
      status: "CanLoadMore",
      loadMore: mockLoadMore,
    });
    vi.mocked(convexReact.useQuery).mockReturnValue([]);
    vi.mocked(convexReact.useMutation).mockReturnValue(vi.fn());

    const { result } = renderHook(() => useGlobalChat());

    expect(result.current.canLoadMore).toBe(true);

    result.current.loadMore();

    expect(mockLoadMore).toHaveBeenCalledWith(25);
  });

  it("should disable load more when no more messages", () => {
    vi.mocked(convexReact.usePaginatedQuery).mockReturnValue({
      results: [],
      status: "Exhausted",
      loadMore: vi.fn(),
    });
    vi.mocked(convexReact.useQuery).mockReturnValue([]);
    vi.mocked(convexReact.useMutation).mockReturnValue(vi.fn());

    const { result } = renderHook(() => useGlobalChat());

    expect(result.current.canLoadMore).toBe(false);
  });

  it("should handle empty chat state", () => {
    vi.mocked(convexReact.usePaginatedQuery).mockReturnValue({
      results: [],
      status: "Exhausted",
      loadMore: vi.fn(),
    });
    vi.mocked(convexReact.useQuery).mockReturnValue([]);
    vi.mocked(convexReact.useMutation).mockReturnValue(vi.fn());

    const { result } = renderHook(() => useGlobalChat());

    expect(result.current.messages).toEqual([]);
    expect(result.current.onlineUsers).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it("should return expected interface when authenticated", () => {
    // Test with default authenticated state
    vi.mocked(convexReact.usePaginatedQuery).mockReturnValue({
      results: [],
      status: "Exhausted",
      loadMore: vi.fn(),
    });
    vi.mocked(convexReact.useQuery).mockReturnValue([]);
    vi.mocked(convexReact.useMutation).mockReturnValue(vi.fn());

    const { result } = renderHook(() => useGlobalChat());

    // Should return all expected properties
    expect(result.current).toHaveProperty("messages");
    expect(result.current).toHaveProperty("onlineUsers");
    expect(result.current).toHaveProperty("isLoading");
    expect(result.current).toHaveProperty("sendMessage");
    expect(result.current).toHaveProperty("updatePresence");
    expect(result.current).toHaveProperty("canLoadMore");
    expect(result.current).toHaveProperty("loadMore");
    expect(typeof result.current.sendMessage).toBe("function");
  });

  it("should cleanup presence interval on unmount", async () => {
    vi.useFakeTimers(); // Enable fake timers for this test

    const mockSendMessageMutation = vi.fn().mockResolvedValue(undefined);
    const mockUpdatePresenceMutation = vi.fn().mockResolvedValue(undefined);

    vi.mocked(convexReact.usePaginatedQuery).mockReturnValue({
      results: [],
      status: "Exhausted",
      loadMore: vi.fn(),
    });
    vi.mocked(convexReact.useQuery).mockReturnValue([]);
    // useGlobalChat calls useMutation twice: sendMessage and updatePresence
    vi.mocked(convexReact.useMutation)
      .mockReturnValueOnce(mockSendMessageMutation)
      .mockReturnValueOnce(mockUpdatePresenceMutation);

    const { unmount } = renderHook(() => useGlobalChat());

    // Clear initial call
    mockUpdatePresenceMutation.mockClear();

    // Unmount the hook
    unmount();

    // Advance time by 30 seconds after unmount
    await vi.advanceTimersByTimeAsync(30000);

    // Should NOT have called updatePresence after unmount
    expect(mockUpdatePresenceMutation).not.toHaveBeenCalled();

    vi.useRealTimers(); // Clean up
  });
});
