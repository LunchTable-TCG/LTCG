"use client";

import { type InboxMessage, type InboxMessageType, useInbox } from "@/hooks/social/useInbox";
import { cn } from "@/lib/utils";
import type { Id } from "@convex/_generated/dataModel";
import { Link } from "@tanstack/react-router";
import {
  Bell,
  Check,
  CheckCheck,
  ChevronRight,
  Coins,
  Gift,
  Loader2,
  Megaphone,
  Shield,
  Sparkles,
  Swords,
  UserPlus,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Icon mapping for message types
const messageIcons: Record<InboxMessageType, typeof Bell> = {
  reward: Gift,
  announcement: Megaphone,
  challenge: Swords,
  friend_request: Users,
  guild_invite: Shield,
  guild_request: UserPlus,
  system: Wrench,
  achievement: Sparkles,
};

// Color mapping for message types
const messageColors: Record<InboxMessageType, string> = {
  reward: "text-yellow-400",
  announcement: "text-blue-400",
  challenge: "text-red-400",
  friend_request: "text-green-400",
  guild_invite: "text-amber-400",
  guild_request: "text-amber-400",
  system: "text-gray-400",
  achievement: "text-purple-400",
};

interface InboxDropdownProps {
  className?: string;
}

export function InboxDropdown({ className }: InboxDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const {
    messages,
    unreadCount,
    isLoading,
    hasUnclaimedRewards,
    markAsRead,
    markAllAsRead,
    claimReward,
  } = useInbox();

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    if (!isOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  const recentMessages = messages?.slice(0, 5) ?? [];

  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative tcg-button w-10 h-10 rounded-lg flex items-center justify-center transition-all",
          isOpen && "ring-2 ring-primary/50"
        )}
        aria-label={`Inbox${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="w-5 h-5 text-primary" />

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}

        {/* Unclaimed reward indicator */}
        {hasUnclaimedRewards && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-yellow-400 border-2 border-background" />
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 tcg-panel rounded-xl shadow-2xl border border-border overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/30">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <span className="font-semibold text-foreground">Inbox</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllAsRead()}
                  className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-4 h-4 text-muted-foreground hover:text-primary" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-md hover:bg-secondary transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Message List */}
          <div className="max-h-[400px] overflow-y-auto tcg-scrollbar-thin">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : recentMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Bell className="w-10 h-10 mb-2 opacity-50" />
                <p className="text-sm">No messages yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentMessages.map((message) => (
                  <InboxMessageItem
                    key={message._id}
                    message={message}
                    onMarkAsRead={markAsRead}
                    onClaimReward={claimReward}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-border bg-secondary/30">
            <Link
              href="/inbox"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center gap-2 w-full py-2 rounded-lg hover:bg-secondary transition-colors text-sm font-medium text-primary"
            >
              View All Messages
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// Individual message item component
interface InboxMessageItemProps {
  message: InboxMessage;
  onMarkAsRead: (id: Id<"userInbox">) => Promise<void>;
  onClaimReward: (id: Id<"userInbox">) => Promise<unknown>;
}

function InboxMessageItem({ message, onMarkAsRead, onClaimReward }: InboxMessageItemProps) {
  const [isClaiming, setIsClaiming] = useState(false);
  const Icon = messageIcons[message.type];
  const colorClass = messageColors[message.type];

  const isUnread = !message.isRead;
  const isReward = message.type === "reward";
  const isUnclaimed = isReward && !message.claimedAt;

  const handleClick = async () => {
    if (!message.isRead) {
      await onMarkAsRead(message._id);
    }
  };

  const handleClaim = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isClaiming) return;

    setIsClaiming(true);
    try {
      await onClaimReward(message._id);
    } finally {
      setIsClaiming(false);
    }
  };

  // Format time ago
  const timeAgo = formatTimeAgo(message.createdAt);

  return (
    <div
      onClick={handleClick}
      className={cn(
        "relative px-4 py-3 hover:bg-secondary/50 cursor-pointer transition-colors",
        isUnread && "bg-primary/5"
      )}
    >
      {/* Unread indicator */}
      {isUnread && (
        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
      )}

      <div className="flex gap-3">
        {/* Icon */}
        <div
          className={cn(
            "flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center",
            isUnclaimed ? "bg-yellow-400/20" : "bg-secondary"
          )}
        >
          <Icon className={cn("w-4 h-4", isUnclaimed ? "text-yellow-400" : colorClass)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn(
                "text-sm font-medium truncate",
                isUnread ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {message.title}
            </p>
            <span className="text-xs text-muted-foreground flex-shrink-0">{timeAgo}</span>
          </div>

          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{message.message}</p>

          {/* Claim button for unclaimed rewards */}
          {isUnclaimed && (
            <button
              type="button"
              onClick={handleClaim}
              disabled={isClaiming}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-400 text-xs font-medium transition-colors disabled:opacity-50"
            >
              {isClaiming ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Claiming...
                </>
              ) : (
                <>
                  <Coins className="w-3 h-3" />
                  Claim Reward
                </>
              )}
            </button>
          )}

          {/* Claimed indicator */}
          {isReward && message.claimedAt && (
            <div className="mt-1 inline-flex items-center gap-1 text-xs text-green-400">
              <Check className="w-3 h-3" />
              Claimed
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper to format relative time
function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return new Date(timestamp).toLocaleDateString();
}
