"use client";

import { type InboxMessage, type InboxMessageType, useInbox } from "@/hooks/social/useInbox";
import { cn } from "@/lib/utils";
import type { Id } from "@convex/_generated/dataModel";
import { AuthLoading, Authenticated } from "convex/react";
import {
  Bell,
  Check,
  CheckCheck,
  Coins,
  Filter,
  Gift,
  Loader2,
  Megaphone,
  Sparkles,
  Swords,
  Trash2,
  Users,
  Wrench,
} from "lucide-react";
import { useState } from "react";

// Icon and color mappings
const messageIcons: Record<InboxMessageType, typeof Bell> = {
  reward: Gift,
  announcement: Megaphone,
  challenge: Swords,
  friend_request: Users,
  system: Wrench,
  achievement: Sparkles,
};

const messageColors: Record<InboxMessageType, string> = {
  reward: "text-yellow-400 bg-yellow-400/10",
  announcement: "text-blue-400 bg-blue-400/10",
  challenge: "text-red-400 bg-red-400/10",
  friend_request: "text-green-400 bg-green-400/10",
  system: "text-gray-400 bg-gray-400/10",
  achievement: "text-purple-400 bg-purple-400/10",
};

const filterLabels: Record<InboxMessageType | "all", string> = {
  all: "All",
  reward: "Rewards",
  announcement: "Announcements",
  challenge: "Challenges",
  friend_request: "Friend Requests",
  system: "System",
  achievement: "Achievements",
};

export default function InboxPage() {
  return (
    <>
      <AuthLoading>
        <div className="min-h-screen flex items-center justify-center bg-[#0d0a09]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-[#d4af37] animate-spin" />
            <p className="text-[#a89f94] text-sm uppercase tracking-widest font-bold">
              Loading Inbox...
            </p>
          </div>
        </div>
      </AuthLoading>
      <Authenticated>
        <InboxContent />
      </Authenticated>
    </>
  );
}

function InboxContent() {
  const [activeFilter, setActiveFilter] = useState<InboxMessageType | "all">("all");
  const {
    messages,
    unreadCount,
    isLoading,
    hasUnclaimedRewards,
    unclaimedRewardCount,
    markAsRead,
    markAllAsRead,
    claimReward,
    deleteMessage,
    getMessagesByType,
  } = useInbox();

  // Filter messages based on active filter
  const filteredMessages = activeFilter === "all" ? messages : getMessagesByType(activeFilter);

  // Filter options with counts
  const allFilterOptions: Array<{ key: InboxMessageType | "all"; count: number }> = [
    { key: "all", count: messages?.length ?? 0 },
    { key: "reward", count: getMessagesByType("reward").length },
    { key: "announcement", count: getMessagesByType("announcement").length },
    { key: "challenge", count: getMessagesByType("challenge").length },
    { key: "friend_request", count: getMessagesByType("friend_request").length },
    { key: "system", count: getMessagesByType("system").length },
    { key: "achievement", count: getMessagesByType("achievement").length },
  ];
  const filterOptions = allFilterOptions.filter((opt) => opt.key === "all" || opt.count > 0);

  return (
    <div className="min-h-screen bg-[#0d0a09] pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Bell className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Inbox</h1>
                <p className="text-sm text-muted-foreground">
                  {unreadCount > 0
                    ? `${unreadCount} unread message${unreadCount !== 1 ? "s" : ""}`
                    : "All caught up!"}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {hasUnclaimedRewards && (
                <div className="px-3 py-1.5 rounded-lg bg-yellow-400/20 text-yellow-400 text-sm font-medium flex items-center gap-2">
                  <Gift className="w-4 h-4" />
                  {unclaimedRewardCount} unclaimed
                </div>
              )}
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-sm font-medium flex items-center gap-2 transition-colors"
                >
                  <CheckCheck className="w-4 h-4" />
                  Mark all read
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-2 tcg-scrollbar-thin">
          <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          {filterOptions.map((option) => (
            <button
              key={option.key}
              onClick={() => setActiveFilter(option.key)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                activeFilter === option.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary hover:bg-secondary/80 text-muted-foreground"
              )}
            >
              {filterLabels[option.key]}
              {option.count > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full bg-background/20 text-xs">
                  {option.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Message List */}
        <div className="tcg-panel rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : !filteredMessages || filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Bell className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg font-medium">No messages</p>
              <p className="text-sm">
                {activeFilter === "all"
                  ? "Your inbox is empty"
                  : `No ${filterLabels[activeFilter].toLowerCase()} to show`}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredMessages.map((message) => (
                <InboxMessageRow
                  key={message._id}
                  message={message}
                  onMarkAsRead={markAsRead}
                  onClaimReward={claimReward}
                  onDelete={deleteMessage}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Individual message row component
interface InboxMessageRowProps {
  message: InboxMessage;
  onMarkAsRead: (id: Id<"userInbox">) => Promise<void>;
  onClaimReward: (id: Id<"userInbox">) => Promise<unknown>;
  onDelete: (id: Id<"userInbox">) => Promise<void>;
}

function InboxMessageRow({ message, onMarkAsRead, onClaimReward, onDelete }: InboxMessageRowProps) {
  const [isClaiming, setIsClaiming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const Icon = messageIcons[message.type];
  const colorClass = messageColors[message.type];

  const isUnread = !message.isRead;
  const isReward = message.type === "reward";
  const isUnclaimed = isReward && !message.claimedAt;
  const canDelete = !isUnclaimed; // Can't delete unclaimed rewards

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

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDeleting || !canDelete) return;

    setIsDeleting(true);
    try {
      await onDelete(message._id);
    } finally {
      setIsDeleting(false);
    }
  };

  // Format date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    if (diffDays === 1) {
      return "Yesterday";
    }
    if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: "long" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "relative px-6 py-4 hover:bg-secondary/30 cursor-pointer transition-colors",
        isUnread && "bg-primary/5"
      )}
    >
      <div className="flex gap-4">
        {/* Icon */}
        <div
          className={cn(
            "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center",
            colorClass
          )}
        >
          <Icon className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-1">
            <div className="flex items-center gap-2">
              <h3
                className={cn(
                  "font-semibold",
                  isUnread ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {message.title}
              </h3>
              {isUnread && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
            </div>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {formatDate(message.createdAt)}
            </span>
          </div>

          <p className="text-sm text-muted-foreground mb-3">{message.message}</p>

          {/* Sender info */}
          {message.senderUsername && (
            <p className="text-xs text-muted-foreground/70 mb-2">From: {message.senderUsername}</p>
          )}

          {/* Actions row */}
          <div className="flex items-center gap-2">
            {/* Claim button for unclaimed rewards */}
            {isUnclaimed && (
              <button
                onClick={handleClaim}
                disabled={isClaiming}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-400 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {isClaiming ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Claiming...
                  </>
                ) : (
                  <>
                    <Coins className="w-4 h-4" />
                    Claim Reward
                  </>
                )}
              </button>
            )}

            {/* Claimed indicator */}
            {isReward && message.claimedAt && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-400/10 text-green-400 text-sm">
                <Check className="w-4 h-4" />
                Claimed
              </div>
            )}

            {/* Delete button */}
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="ml-auto p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-50"
                title="Delete message"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
