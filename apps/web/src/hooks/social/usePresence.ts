"use client";

import { api } from "@convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { logError } from "@/lib/errorHandling";
import { useAuth } from "../auth/useConvexAuthHook";

interface UsePresenceReturn {
  onlineUsers: ReturnType<typeof useQuery<typeof api.globalChat.getOnlineUsers>> | undefined;
  onlineCount: number;
  updatePresence: () => Promise<void>;
}

/**
 * Online user presence tracking.
 *
 * Simple hook for tracking online users and updating presence status.
 * Provides real-time count of online players. Silent failure on presence
 * updates to avoid disrupting user experience.
 *
 * Features:
 * - Get list of online users
 * - Get online user count
 * - Manual presence update
 * - Silent error handling
 *
 * @example
 * ```typescript
 * const {
 *   onlineUsers,
 *   onlineCount,
 *   updatePresence
 * } = usePresence();
 *
 * // Display online count
 * console.log(`${onlineCount} players online`);
 *
 * // Show online users
 * onlineUsers?.forEach(user => {
 *   console.log(`${user.username} is online`);
 * });
 *
 * // Manually update presence
 * await updatePresence();
 * ```
 *
 * @returns {UsePresenceReturn} Presence interface
 */
export function usePresence(): UsePresenceReturn {
  const { isAuthenticated } = useAuth();

  const onlineUsers = useQuery(api.globalChat.getOnlineUsers, {});

  const updateMutation = useMutation(api.globalChat.updatePresence);

  return {
    onlineUsers,
    onlineCount: onlineUsers?.length || 0,
    updatePresence: async () => {
      if (!isAuthenticated) return;
      try {
        await updateMutation({});
      } catch (error) {
        logError("Presence update", error);
      }
    },
  };
}
