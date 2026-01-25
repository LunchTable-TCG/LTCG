"use client";

import { useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useAuth } from "@/components/ConvexAuthProvider";
import { toast } from "sonner";

/**
 * useGlobalChat Hook
 *
 * Global chat messaging with presence tracking:
 * - View recent messages
 * - Send messages
 * - Presence heartbeat (automatic every 30s)
 * - Online users list
 */
export function useGlobalChat() {
  const { token } = useAuth();

  // Queries
  const messages = useQuery(api.globalChat.getRecentMessages, { limit: 100 });

  const onlineUsers = useQuery(api.globalChat.getOnlineUsers, {});

  // Mutations
  const sendMessageMutation = useMutation(api.globalChat.sendMessage);
  const updatePresenceMutation = useMutation(api.globalChat.updatePresence);

  // Actions
  const sendMessage = async (message: string) => {
    if (!token) throw new Error("Not authenticated");
    if (message.trim().length === 0) return;

    try {
      await sendMessageMutation({ token, content: message.trim() });
    } catch (error: any) {
      toast.error(error.message || "Failed to send message");
      throw error;
    }
  };

  const updatePresence = async () => {
    if (!token) return;
    try {
      await updatePresenceMutation({ token });
    } catch (error) {
      // Silent fail for presence updates
      console.error("Presence update failed:", error);
    }
  };

  // Heartbeat every 30 seconds
  useEffect(() => {
    if (!token) return;

    updatePresence(); // Initial update
    const interval = setInterval(updatePresence, 30000);

    return () => clearInterval(interval);
  }, [token]);

  return {
    messages,
    onlineUsers,
    isLoading: messages === undefined,
    sendMessage,
    updatePresence,
  };
}
