"use client";

import { handleHookError } from "@/lib/errorHandling";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { toast } from "sonner";
import { useAuth } from "../auth/useConvexAuthHook";

/**
 * Hook for guild chat functionality
 *
 * @param guildId - The ID of the guild to chat in
 * @returns Chat messages and send functionality
 */
export function useGuildChat(guildId: Id<"guilds"> | null) {
  const { isAuthenticated } = useAuth();

  // Paginated messages
  const {
    results: messages,
    status: paginationStatus,
    loadMore,
  } = usePaginatedQuery(
    api.social.guilds.getPaginatedGuildMessages,
    guildId ? { guildId } : "skip",
    { initialNumItems: 50 }
  );

  // Send message mutation
  const sendMessageMutation = useMutation(api.social.guilds.sendMessage);

  // Actions
  const sendMessage = async (message: string) => {
    if (!guildId || !isAuthenticated) return;
    if (message.trim().length === 0) return;

    try {
      await sendMessageMutation({ guildId, message: message.trim() });
    } catch (error) {
      const errorMsg = handleHookError(error, "Failed to send message");
      toast.error(errorMsg);
      throw error;
    }
  };

  // Reverse messages to show oldest first (they come in desc order for pagination)
  const sortedMessages = messages ? [...messages].reverse() : [];

  return {
    messages: sortedMessages,
    isLoading: messages === undefined,
    sendMessage,
    canLoadMore: paginationStatus === "CanLoadMore",
    loadMore: () => loadMore(25),
  };
}
