"use client";

import { handleHookError } from "@/lib/errorHandling";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Hook for discovering and joining guilds
 *
 * @returns Featured guilds, search functionality, and join actions
 */
export function useGuildDiscovery() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"members" | "recent" | "name">("members");

  // Featured guilds for the discovery page
  const featuredGuilds = useQuery(api.social.guilds.getFeaturedGuilds, { limit: 6 });

  // Search results (only when there's a query)
  const searchResults = useQuery(
    api.social.guilds.searchGuilds,
    searchQuery.length >= 2 ? { query: searchQuery, limit: 20 } : "skip"
  );

  // Browse all public guilds
  const publicGuilds = useQuery(api.social.guilds.getPublicGuilds, {
    limit: 20,
    sortBy,
  });

  // Mutations
  const joinPublicGuildMutation = useMutation(api.social.guilds.joinPublicGuild);
  const requestToJoinMutation = useMutation(api.social.guilds.requestToJoin);

  // Actions
  const joinPublicGuild = async (guildId: Id<"guilds">) => {
    try {
      await joinPublicGuildMutation({ guildId });
      toast.success("Joined guild!");
    } catch (error) {
      const message = handleHookError(error, "Failed to join guild");
      toast.error(message);
      throw error;
    }
  };

  const requestToJoin = async (guildId: Id<"guilds">, message?: string) => {
    try {
      await requestToJoinMutation({ guildId, message });
      toast.success("Join request sent!");
    } catch (error) {
      const errorMsg = handleHookError(error, "Failed to send join request");
      toast.error(errorMsg);
      throw error;
    }
  };

  const search = (query: string) => {
    setSearchQuery(query);
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  return {
    // Data
    featuredGuilds: featuredGuilds ?? [],
    searchResults: searchResults ?? [],
    publicGuilds: publicGuilds?.guilds ?? [],
    totalGuilds: publicGuilds?.total ?? 0,
    hasMoreGuilds: publicGuilds?.hasMore ?? false,
    // State
    searchQuery,
    sortBy,
    isLoading: featuredGuilds === undefined,
    isSearching: searchQuery.length >= 2 && searchResults === undefined,
    // Actions
    search,
    clearSearch,
    setSortBy,
    joinPublicGuild,
    requestToJoin,
  };
}
