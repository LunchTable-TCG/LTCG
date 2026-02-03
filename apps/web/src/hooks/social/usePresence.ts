"use client";

import { logError } from "@/lib/errorHandling";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useRef } from "react";
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

  // Cache presence ID to avoid OCC conflicts on repeated heartbeats
  const presenceIdRef = useRef<Id<"userPresence"> | null>(null);

  return {
    onlineUsers,
    onlineCount: onlineUsers?.length || 0,
    updatePresence: async () => {
      if (!isAuthenticated) return;
      try {
        // Pass cached presenceId to skip query and avoid write conflicts
        const newPresenceId = await updateMutation({
          presenceId: presenceIdRef.current ?? undefined,
        });
        presenceIdRef.current = newPresenceId;
      } catch (error) {
        // Clear cached ID on error so next attempt does full lookup
        presenceIdRef.current = null;
        logError("Presence update", error);
      }
    },
  };
}
