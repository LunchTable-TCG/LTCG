"use client";

import { useAuth } from "../auth/useConvexAuthHook";
import { type PresenceStatus, useConvexPresence } from "./useConvexPresence";

interface UsePresenceOptions {
  /**
   * Room ID for presence tracking (default: "global_chat")
   */
  roomId?: string;

  /**
   * User status (default: "online")
   */
  status?: PresenceStatus;
}

interface UsePresenceReturn {
  onlineUsers: ReturnType<typeof useConvexPresence>["users"];
  onlineCount: number;
  isActive: boolean;
  updateStatus: (status: PresenceStatus) => Promise<void>;
}

/**
 * Online user presence tracking using @convex-dev/presence.
 *
 * Simple hook for tracking online users with automatic presence updates.
 * Provides real-time list of online users and presence management.
 * This is a convenience wrapper around useConvexPresence for common use cases.
 *
 * Features:
 * - Automatic presence heartbeat (every 30 seconds)
 * - Browser tab visibility handling
 * - Graceful disconnect on unmount
 * - Real-time online user list
 * - Manual status updates
 *
 * @example
 * ```typescript
 * const {
 *   onlineUsers,
 *   onlineCount,
 *   updateStatus
 * } = usePresence();
 *
 * // Display online count
 * console.log(`${onlineCount} players online`);
 *
 * // Show online users
 * onlineUsers.forEach(user => {
 *   console.log(`${user.username} is ${user.status}`);
 * });
 *
 * // Update status
 * await updateStatus("in_game");
 * ```
 *
 * @param options - Configuration options
 * @returns {UsePresenceReturn} Presence interface
 */
export function usePresence(options: UsePresenceOptions = {}): UsePresenceReturn {
  const { roomId = "global_chat", status = "online" } = options;
  const { isAuthenticated } = useAuth();

  const { users, userCount, isActive, updateStatus } = useConvexPresence({
    roomId,
    status,
    enabled: isAuthenticated,
  });

  return {
    onlineUsers: users,
    onlineCount: userCount,
    isActive,
    updateStatus,
  };
}
