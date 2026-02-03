"use client";

import { handleHookError, logError } from "@/lib/errorHandling";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "../auth/useConvexAuthHook";

interface UseGlobalChatReturn {
  messages: ReturnType<
    typeof usePaginatedQuery<typeof api.globalChat.getPaginatedMessages>
  >["results"];
  onlineUsers: ReturnType<typeof useQuery<typeof api.globalChat.getOnlineUsers>> | undefined;
  isLoading: boolean;
  sendMessage: (message: string) => Promise<void>;
  updatePresence: () => Promise<void>;
  canLoadMore: boolean;
  loadMore: () => void;
}

/**
 * Global chat messaging system with automatic presence tracking.
 *
 * Provides a real-time global chat room with message pagination and online
 * user tracking. Automatically maintains user presence with a 30-second heartbeat.
 * Uses infinite scroll pagination for message history.
 *
 * Features:
 * - Send messages to global chat
 * - View paginated message history (initially 50 messages)
 * - Load more messages on scroll (25 at a time)
 * - Track online users with automatic presence updates
 * - Automatic presence heartbeat every 30 seconds
 * - Silent presence update failures (non-disruptive)
 *
 * @example
 * ```typescript
 * const {
 *   messages,
 *   onlineUsers,
 *   isLoading,
 *   canLoadMore,
 *   sendMessage,
 *   loadMore
 * } = useGlobalChat();
 *
 * // Send a message
 * await sendMessage("Hello everyone!");
 *
 * // Load more messages
 * if (canLoadMore) {
 *   loadMore(); // Loads 25 more messages
 * }
 *
 * // Display online users
 * console.log(`${onlineUsers?.length} users online`);
 * ```
 *
 * @returns {UseGlobalChatReturn} Chat interface
 *
 * @throws {Error} When user is not authenticated
 */
export function useGlobalChat(): UseGlobalChatReturn {
  const { isAuthenticated } = useAuth();

  // Paginated messages query (initially load 50 messages)
  const {
    results: messages,
    status: paginationStatus,
    loadMore,
  } = usePaginatedQuery(api.globalChat.getPaginatedMessages, {}, { initialNumItems: 50 });

  const onlineUsers = useQuery(api.globalChat.getOnlineUsers, {});

  // Mutations
  const sendMessageMutation = useMutation(api.globalChat.sendMessage);
  const updatePresenceMutation = useMutation(api.globalChat.updatePresence);

  // Cache presence ID to avoid OCC conflicts on repeated heartbeats
  const presenceIdRef = useRef<Id<"userPresence"> | null>(null);

  // Actions
  const sendMessage = async (message: string) => {
    if (!isAuthenticated) throw new Error("Not authenticated");
    if (message.trim().length === 0) return;

    try {
      await sendMessageMutation({ content: message.trim() });
    } catch (error) {
      const message = handleHookError(error, "Failed to send message");
      toast.error(message);
      throw error;
    }
  };

  const updatePresence = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      // Pass cached presenceId to skip query and avoid write conflicts
      const newPresenceId = await updatePresenceMutation({
        presenceId: presenceIdRef.current ?? undefined,
      });
      // Cache the ID for next heartbeat
      presenceIdRef.current = newPresenceId;
    } catch (error) {
      // Silent fail for presence updates
      // Clear cached ID on error so next attempt does full lookup
      presenceIdRef.current = null;
      logError("Presence update", error);
    }
  }, [isAuthenticated, updatePresenceMutation]);

  // Heartbeat every 30 seconds
  useEffect(() => {
    if (!isAuthenticated) return;

    updatePresence(); // Initial update
    const interval = setInterval(updatePresence, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, updatePresence]);

  return {
    messages,
    onlineUsers,
    isLoading: messages === undefined,
    sendMessage,
    updatePresence,
    // Pagination controls
    canLoadMore: paginationStatus === "CanLoadMore",
    loadMore: () => loadMore(25), // Load 25 more messages at a time
  };
}
