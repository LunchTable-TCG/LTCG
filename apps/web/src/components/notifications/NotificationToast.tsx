"use client";

import { Award, Bell, Gift, Star, Trophy } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useNotifications } from "@/hooks";

/**
 * NotificationToast Component
 *
 * Automatically displays toast notifications for new achievements, level ups, and quests
 * Uses Convex real-time subscriptions to detect new notifications
 */
export function NotificationToast() {
  const { unreadNotifications, markAsRead } = useNotifications();
  const shownNotificationsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!unreadNotifications) return;

    // Show toasts for new notifications
    unreadNotifications.forEach((notification) => {
      const notificationKey = notification._id;

      // Skip if already shown
      if (shownNotificationsRef.current.has(notificationKey)) {
        return;
      }

      // Mark as shown
      shownNotificationsRef.current.add(notificationKey);

      // Show toast based on notification type
      if (notification.type === "achievement_unlocked") {
        const data = notification.data as any;
        const rarity = data?.rarity || "common";

        toast.success(
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <Trophy className="w-5 h-5 text-[#d4af37]" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm">{notification.title}</p>
              <p className="text-xs text-[#a89f94] mt-0.5">{notification.message}</p>
              {data?.rewards && (
                <div className="flex items-center gap-2 mt-1 text-xs">
                  {data.rewards.gold && (
                    <span className="text-yellow-400">+{data.rewards.gold} Gold</span>
                  )}
                  {data.rewards.xp && (
                    <span className="text-purple-400">+{data.rewards.xp} XP</span>
                  )}
                  {data.rewards.gems && (
                    <span className="text-blue-400">+{data.rewards.gems} Gems</span>
                  )}
                </div>
              )}
            </div>
          </div>,
          {
            duration: 5000,
            className: "bg-[#1a1614] border-[#d4af37]",
          }
        );
      } else if (notification.type === "level_up") {
        const data = notification.data as any;

        toast.success(
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <Star className="w-5 h-5 text-[#d4af37]" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm">{notification.title}</p>
              <p className="text-xs text-[#a89f94] mt-0.5">{notification.message}</p>
              {data?.newLevel && (
                <p className="text-xs text-purple-400 mt-1">You are now level {data.newLevel}!</p>
              )}
            </div>
          </div>,
          {
            duration: 5000,
            className: "bg-[#1a1614] border-purple-500",
          }
        );
      } else if (notification.type === "quest_completed") {
        toast.success(
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <Award className="w-5 h-5 text-green-400" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm">{notification.title}</p>
              <p className="text-xs text-[#a89f94] mt-0.5">{notification.message}</p>
              <p className="text-xs text-green-400 mt-1">Visit the Quests page to claim rewards!</p>
            </div>
          </div>,
          {
            duration: 5000,
            className: "bg-[#1a1614] border-green-500",
          }
        );
      } else if (notification.type === "badge_earned") {
        toast.success(
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <Gift className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm">{notification.title}</p>
              <p className="text-xs text-[#a89f94] mt-0.5">{notification.message}</p>
            </div>
          </div>,
          {
            duration: 5000,
            className: "bg-[#1a1614] border-blue-500",
          }
        );
      }

      // Auto-mark as read after 5 seconds
      setTimeout(() => {
        markAsRead(notification._id);
      }, 5000);
    });
  }, [unreadNotifications, markAsRead]);

  return null; // This component only handles toasts, no UI
}
