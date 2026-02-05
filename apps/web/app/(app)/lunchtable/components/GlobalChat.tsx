"use client";

import { useFriends, useGlobalChat } from "@/hooks";
import { useGuildChat, useMyGuild } from "@/hooks/guilds";
import { useAIChat } from "@/hooks/social/useAIChat";
import { useDMChat } from "@/hooks/social/useDMChat";
import { useDMConversations } from "@/hooks/social/useDMConversations";
import { sanitizeChatMessage, sanitizeText } from "@/lib/sanitize";
import { cn } from "@/lib/utils";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";
import {
  ArrowLeft,
  Bot,
  Circle,
  Flag,
  Gamepad2,
  Loader2,
  MessageSquare,
  Send,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  User,
  UserPlus,
  Users,
  VolumeX,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ChallengeConfirmDialog } from "./ChallengeConfirmDialog";
import { PlayerProfileDialog } from "./PlayerProfileDialog";
import { ReportUserDialog } from "./ReportUserDialog";

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: number;
  isSystem?: boolean;
}

interface OnlineUser {
  id: string;
  username: string;
  status: "online" | "in_game" | "idle";
}

const STATUS_CONFIG = {
  online: { color: "bg-green-500", label: "Online" },
  in_game: { color: "bg-amber-500", label: "In Game" },
  idle: { color: "bg-gray-500", label: "Idle" },
};

type ChatMode = "global" | "agent" | "friends" | "dm" | "guild";

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function GlobalChat() {
  // Global chat hook
  const {
    messages: convexMessages,
    onlineUsers: convexOnlineUsers,
    sendMessage: sendMessageAction,
    canLoadMore,
    loadMore,
  } = useGlobalChat();

  // AI Chat hook
  const { messages: aiChatMessages, isAgentTyping, sendMessage: sendAIMessage } = useAIChat();

  // Guild hooks
  const { guild } = useMyGuild();
  const {
    messages: guildMessages,
    sendMessage: sendGuildMessage,
    isLoading: isGuildChatLoading,
  } = useGuildChat(guild?._id);

  // DM hooks
  const { conversations, unreadCount: dmUnreadCount, startConversation } = useDMConversations();

  // Friends hook
  const { friends, onlineFriends } = useFriends();

  // Active DM state
  const [activeDMConversationId, setActiveDMConversationId] =
    useState<Id<"dmConversations"> | null>(null);
  const [activeDMFriend, setActiveDMFriend] = useState<{ userId: string; username: string } | null>(
    null
  );

  // DM Chat hook (only when DM is active)
  const { messages: dmMessages, sendMessage: sendDMMessage } = useDMChat(
    activeDMConversationId ?? undefined
  );

  // Challenge mutation
  const sendChallengeMutation = useMutation(api.social.challenges.sendChallenge);

  // Report mutation
  const reportUserMutation = useMutation(api.social.reports.reportUser);

  const [chatMode, setChatMode] = useState<ChatMode>("global");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isOnlinePanelOpen, setIsOnlinePanelOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [userMenu, setUserMenu] = useState<{ username: string; x: number; y: number } | null>(null);
  const [mutedUsers, setMutedUsers] = useState<Set<string>>(new Set());
  const [challengeTarget, setChallengeTarget] = useState<{ username: string } | null>(null);
  const [reportTarget, setReportTarget] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const agentMessagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Transform Convex messages to ChatMessage format
  const messages: ChatMessage[] = (convexMessages || []).map(
    (msg: NonNullable<typeof convexMessages>[number]) => ({
      id: msg._id,
      username: msg.username,
      message: msg.message,
      timestamp: msg.createdAt,
      isSystem: msg.isSystem,
    })
  );

  // Transform Convex online users to OnlineUser format
  const onlineUsers: OnlineUser[] = (convexOnlineUsers || []).map(
    (user: NonNullable<typeof convexOnlineUsers>[number]) => ({
      id: user.userId,
      username: user.username,
      status: user.status,
    })
  );

  const onlineCount = onlineUsers.length;

  const isInitialMount = useRef(true);
  const isAgentInitialMount = useRef(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const prevScrollHeightRef = useRef<number>(0);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
      return;
    }
    scrollToBottom();
  }, [scrollToBottom]);

  // Auto-scroll for agent chat
  const scrollAgentToBottom = useCallback(() => {
    agentMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (isAgentInitialMount.current) {
      isAgentInitialMount.current = false;
      return;
    }
    scrollAgentToBottom();
  }, [scrollAgentToBottom]);

  // Infinite scroll
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container || !canLoadMore || isLoadingMore) return;

    if (container.scrollTop < 100) {
      setIsLoadingMore(true);
      prevScrollHeightRef.current = container.scrollHeight;

      loadMore();

      requestAnimationFrame(() => {
        if (container) {
          const newScrollHeight = container.scrollHeight;
          const scrollDiff = newScrollHeight - prevScrollHeightRef.current;
          container.scrollTop = scrollDiff;
        }
        setIsLoadingMore(false);
      });
    }
  }, [canLoadMore, isLoadingMore, loadMore]);

  // Close user menu on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setUserMenu(null);
      }
    };
    if (userMenu) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
    return undefined;
  }, [userMenu]);

  const handleSend = async () => {
    if (!message.trim() || isSending) return;

    setIsSending(true);

    try {
      if (chatMode === "global") {
        await sendMessageAction(message.trim());
      } else if (chatMode === "guild" && guild) {
        await sendGuildMessage(message.trim());
      } else if (chatMode === "dm" && activeDMConversationId) {
        await sendDMMessage(message.trim());
      }
      setMessage("");
    } catch (error: unknown) {
      console.error("Failed to send message:", error instanceof Error ? error.message : error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (chatMode === "agent") {
        handleAgentSend();
      } else {
        handleSend();
      }
    }
  };

  const handleUserClick = (e: React.MouseEvent, username: string) => {
    if (username === "You" || username === "System") return;
    e.preventDefault();
    e.stopPropagation();

    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setUserMenu({
      username,
      x: rect.left,
      y: rect.bottom + 4,
    });
  };

  const handleMuteUser = (username: string) => {
    setMutedUsers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(username)) {
        newSet.delete(username);
      } else {
        newSet.add(username);
      }
      return newSet;
    });
    setUserMenu(null);
  };

  const handleOpenChallenge = (username: string) => {
    setChallengeTarget({ username });
    setUserMenu(null);
  };

  const handleChallengeConfirm = async (mode: "casual" | "ranked") => {
    if (!challengeTarget) return;

    try {
      await sendChallengeMutation({
        opponentUsername: challengeTarget.username,
        mode,
      });

      toast.success(`Challenge sent to ${challengeTarget.username}!`, {
        description: "Lobby created. They will be notified to join.",
      });
      setChallengeTarget(null);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send challenge";
      toast.error(errorMessage);
    }
  };

  const handleReportUser = async (reason: string) => {
    if (!reportTarget) return;

    try {
      await reportUserMutation({
        reportedUsername: reportTarget,
        reason,
      });

      toast.success("Report submitted", {
        description: "Thank you. Moderators will review your report.",
      });
      setReportTarget(null);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to submit report";
      toast.error(errorMessage);
      throw error;
    }
  };

  const handleAgentSend = async () => {
    if (!message.trim() || isAgentTyping) return;

    const messageToSend = message.trim();
    setMessage("");

    try {
      await sendAIMessage(messageToSend);
    } catch (error) {
      console.error("Failed to send AI message:", error);
    }
  };

  const handleStartDM = async (friendUserId: Id<"users">, friendUsername: string) => {
    try {
      const conversationId = await startConversation(friendUserId);
      setActiveDMConversationId(conversationId);
      setActiveDMFriend({ userId: friendUserId, username: friendUsername });
      setChatMode("dm");
    } catch {
      toast.error("Failed to start conversation");
    }
  };

  const handleBackFromDM = () => {
    setActiveDMConversationId(null);
    setActiveDMFriend(null);
    setChatMode("friends");
  };

  // Get header config based on mode
  const getHeaderConfig = () => {
    switch (chatMode) {
      case "global":
        return {
          icon: MessageSquare,
          iconClass: "bg-[#d4af37]/20 border-[#d4af37]/30",
          iconColor: "text-[#d4af37]",
          title: "Global Chat",
          subtitle: "Tavern Hall",
        };
      case "agent":
        return {
          icon: Bot,
          iconClass: "bg-purple-500/20 border-purple-500/30",
          iconColor: "text-purple-400",
          title: "AI Agent",
          subtitle: "Ask anything",
        };
      case "friends":
        return {
          icon: Users,
          iconClass: "bg-blue-500/20 border-blue-500/30",
          iconColor: "text-blue-400",
          title: "Friends",
          subtitle: `${onlineFriends?.length || 0} online`,
        };
      case "dm":
        return {
          icon: MessageSquare,
          iconClass: "bg-blue-500/20 border-blue-500/30",
          iconColor: "text-blue-400",
          title: activeDMFriend?.username || "Direct Message",
          subtitle: "Private chat",
        };
      case "guild":
        return {
          icon: Shield,
          iconClass: "bg-amber-500/20 border-amber-500/30",
          iconColor: "text-amber-400",
          title: guild?.name || "Guild Chat",
          subtitle: `${guild?.memberCount || 0} members`,
        };
      default:
        return {
          icon: MessageSquare,
          iconClass: "bg-[#d4af37]/20 border-[#d4af37]/30",
          iconColor: "text-[#d4af37]",
          title: "Chat",
          subtitle: "",
        };
    }
  };

  const headerConfig = getHeaderConfig();
  const HeaderIcon = headerConfig.icon;

  return (
    <div
      data-testid="global-chat"
      className="h-full flex flex-col rounded-2xl tcg-chat-leather overflow-hidden shadow-2xl border border-[#3d2b1f]"
    >
      {/* Header */}
      <div className="p-4 border-b border-[#3d2b1f] bg-linear-to-r from-[#1a1614] to-[#261f1c]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {chatMode === "dm" && (
              <button
                type="button"
                onClick={handleBackFromDM}
                className="p-2 rounded-lg border border-[#3d2b1f] bg-black/30 text-[#a89f94] hover:text-[#e8e0d5] hover:border-[#d4af37]/50 transition-all mr-1"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div
              className={cn(
                "w-10 h-10 rounded-lg border flex items-center justify-center",
                headerConfig.iconClass
              )}
            >
              <HeaderIcon className={cn("w-5 h-5", headerConfig.iconColor)} />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#e8e0d5] uppercase tracking-wider">
                {headerConfig.title}
              </h3>
              <p className="text-[10px] text-[#a89f94] uppercase tracking-widest">
                {headerConfig.subtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Chat Mode Tabs */}
            <button
              type="button"
              onClick={() => setChatMode("global")}
              className={cn(
                "p-2 rounded-lg border transition-all",
                chatMode === "global"
                  ? "bg-[#d4af37]/20 border-[#d4af37]/50 text-[#d4af37]"
                  : "bg-black/30 border-[#3d2b1f] text-[#a89f94] hover:border-[#d4af37]/30 hover:text-[#d4af37]"
              )}
              title="Global Chat"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setChatMode("friends")}
              className={cn(
                "p-2 rounded-lg border transition-all relative",
                chatMode === "friends" || chatMode === "dm"
                  ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
                  : "bg-black/30 border-[#3d2b1f] text-[#a89f94] hover:border-blue-500/30 hover:text-blue-400"
              )}
              title="Friends & DMs"
            >
              <Users className="w-4 h-4" />
              {dmUnreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {dmUnreadCount > 9 ? "9+" : dmUnreadCount}
                </span>
              )}
            </button>
            {guild && (
              <button
                type="button"
                onClick={() => setChatMode("guild")}
                className={cn(
                  "p-2 rounded-lg border transition-all",
                  chatMode === "guild"
                    ? "bg-amber-500/20 border-amber-500/50 text-amber-400"
                    : "bg-black/30 border-[#3d2b1f] text-[#a89f94] hover:border-amber-500/30 hover:text-amber-400"
                )}
                title="Guild Chat"
              >
                <Shield className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setChatMode("agent")}
              className={cn(
                "p-2 rounded-lg border transition-all",
                chatMode === "agent"
                  ? "bg-purple-500/20 border-purple-500/50 text-purple-400"
                  : "bg-black/30 border-[#3d2b1f] text-[#a89f94] hover:border-purple-500/30 hover:text-purple-400"
              )}
              title="AI Agent"
            >
              <Sparkles className="w-4 h-4" />
            </button>
            {/* Online Users Button (global mode only) */}
            {chatMode === "global" && (
              <button
                type="button"
                onClick={() => setIsOnlinePanelOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/30 border border-[#3d2b1f] hover:border-[#d4af37]/50 hover:bg-black/50 transition-all cursor-pointer ml-1"
              >
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-bold text-[#e8e0d5]">{onlineCount}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages - Global Chat */}
      {chatMode === "global" && (
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 space-y-3 tcg-scrollbar"
        >
          {isLoadingMore && (
            <div className="flex justify-center py-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/30">
                <Loader2 className="w-4 h-4 text-[#d4af37] animate-spin" />
                <span className="text-xs font-medium text-[#d4af37]">
                  Loading older messages...
                </span>
              </div>
            </div>
          )}

          {canLoadMore && !isLoadingMore && (
            <div className="flex justify-center pb-3">
              <div className="px-4 py-2 text-[10px] font-medium text-[#a89f94]/60 uppercase tracking-widest">
                Scroll up for older messages
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "group animate-in fade-in slide-in-from-bottom-2 duration-300",
                msg.isSystem && "text-center"
              )}
            >
              {msg.isSystem ? (
                <div className="py-1">
                  <span className="inline-block px-3 py-1 rounded-full bg-[#d4af37]/10 text-[10px] text-[#d4af37] font-medium">
                    {sanitizeText(msg.message)}
                  </span>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={(e) => handleUserClick(e, msg.username)}
                    className={cn(
                      "shrink-0 w-8 h-8 rounded-lg bg-linear-to-br from-[#8b4513] to-[#3d2b1f] flex items-center justify-center border border-[#d4af37]/20 hover:border-[#d4af37]/50 transition-colors",
                      msg.username !== "You" && "cursor-pointer"
                    )}
                    disabled={msg.username === "You"}
                  >
                    <span className="text-xs font-black text-[#d4af37]">
                      {sanitizeText(msg.username)[0]?.toUpperCase()}
                    </span>
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="bg-black/20 rounded-lg p-3 border border-[#3d2b1f]/50 hover:border-[#d4af37]/30 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <button
                          type="button"
                          onClick={(e) => handleUserClick(e, msg.username)}
                          className={cn(
                            "text-xs font-black uppercase tracking-wide hover:underline",
                            msg.username === "You"
                              ? "text-green-400 cursor-default"
                              : "text-[#d4af37] cursor-pointer"
                          )}
                          disabled={msg.username === "You"}
                        >
                          {sanitizeText(msg.username)}
                          {mutedUsers.has(msg.username) && (
                            <VolumeX className="w-3 h-3 inline ml-1 text-red-400" />
                          )}
                        </button>
                        <span className="text-[10px] text-[#a89f94]/60 opacity-0 group-hover:opacity-100 transition-opacity">
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                      <p
                        className={cn(
                          "text-sm leading-relaxed wrap-break-word",
                          mutedUsers.has(msg.username)
                            ? "text-[#a89f94]/40 italic"
                            : "text-[#e8e0d5]"
                        )}
                        dangerouslySetInnerHTML={{
                          __html: mutedUsers.has(msg.username)
                            ? "[Message hidden]"
                            : sanitizeChatMessage(msg.message),
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Messages - Agent Chat */}
      {chatMode === "agent" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3 tcg-scrollbar">
          {aiChatMessages.length === 0 && !isAgentTyping && (
            <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="shrink-0 w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                <Bot className="w-4 h-4 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="rounded-lg p-3 border bg-purple-500/10 border-purple-500/30 max-w-[85%]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black uppercase tracking-wide text-purple-400">
                      Lunchtable Guide
                    </span>
                  </div>
                  <p className="text-sm text-[#e8e0d5] leading-relaxed">
                    Welcome to Lunchtable TCG! I'm your AI companion. Ask me anything about the
                    game, strategies, or how to improve your deck!
                  </p>
                </div>
              </div>
            </div>
          )}
          {aiChatMessages.map((msg) => (
            <div
              key={msg._id}
              className={cn(
                "flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
                msg.role === "user" ? "flex-row-reverse" : ""
              )}
            >
              <div
                className={cn(
                  "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border",
                  msg.role === "agent"
                    ? "bg-purple-500/20 border-purple-500/30"
                    : "bg-linear-to-br from-[#8b4513] to-[#3d2b1f] border-[#d4af37]/20"
                )}
              >
                {msg.role === "agent" ? (
                  <Bot className="w-4 h-4 text-purple-400" />
                ) : (
                  <span className="text-xs font-black text-[#d4af37]">Y</span>
                )}
              </div>

              <div className={cn("flex-1 min-w-0", msg.role === "user" && "flex justify-end")}>
                <div
                  className={cn(
                    "rounded-lg p-3 border max-w-[85%]",
                    msg.role === "agent"
                      ? "bg-purple-500/10 border-purple-500/30"
                      : "bg-[#d4af37]/10 border-[#d4af37]/30"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={cn(
                        "text-xs font-black uppercase tracking-wide",
                        msg.role === "agent" ? "text-purple-400" : "text-[#d4af37]"
                      )}
                    >
                      {msg.role === "agent" ? "AI Agent" : "You"}
                    </span>
                    <span className="text-[10px] text-[#a89f94]/60 ml-2">
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>
                  <p
                    className="text-sm text-[#e8e0d5] leading-relaxed wrap-break-word"
                    dangerouslySetInnerHTML={{ __html: sanitizeChatMessage(msg.message) }}
                  />
                </div>
              </div>
            </div>
          ))}

          {isAgentTyping && (
            <div className="flex gap-3 animate-in fade-in duration-300">
              <div className="shrink-0 w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                <Bot className="w-4 h-4 text-purple-400" />
              </div>
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                <div className="flex items-center gap-1">
                  <div
                    className="w-2 h-2 rounded-full bg-purple-400 animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <div
                    className="w-2 h-2 rounded-full bg-purple-400 animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <div
                    className="w-2 h-2 rounded-full bg-purple-400 animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            </div>
          )}
          <div ref={agentMessagesEndRef} />
        </div>
      )}

      {/* Friends List */}
      {chatMode === "friends" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-2 tcg-scrollbar">
          {/* Online Friends */}
          {onlineFriends && onlineFriends.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Circle className="w-2 h-2 fill-green-500 text-green-500" />
                <span className="text-xs font-bold text-[#a89f94] uppercase tracking-wider">
                  Online — {onlineFriends.length}
                </span>
              </div>
              {onlineFriends.map((friend: NonNullable<typeof onlineFriends>[number]) => (
                <button
                  key={friend.userId}
                  type="button"
                  onClick={() =>
                    handleStartDM(friend.userId as Id<"users">, friend.username || "Unknown")
                  }
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-black/20 border border-[#3d2b1f]/50 hover:border-blue-500/30 hover:bg-black/30 transition-all text-left"
                >
                  <div className="relative">
                    <div className="w-10 h-10 rounded-lg bg-linear-to-br from-[#8b4513] to-[#3d2b1f] flex items-center justify-center border border-[#d4af37]/20">
                      <span className="text-sm font-black text-[#d4af37]">
                        {(friend.username || "?")[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-[#1a1614]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-[#e8e0d5] truncate block">
                      {friend.username}
                    </span>
                    <span className="text-xs text-green-400">Online</span>
                  </div>
                  <MessageSquare className="w-4 h-4 text-[#a89f94]" />
                </button>
              ))}
            </div>
          )}

          {/* Recent Conversations */}
          {conversations && conversations.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-3 h-3 text-[#a89f94]" />
                <span className="text-xs font-bold text-[#a89f94] uppercase tracking-wider">
                  Recent Conversations
                </span>
              </div>
              {conversations.map((conv) => (
                <button
                  key={conv._id}
                  type="button"
                  onClick={() => {
                    setActiveDMConversationId(conv._id);
                    setActiveDMFriend({
                      userId: conv.otherUserId,
                      username: conv.otherUsername || "Unknown",
                    });
                    setChatMode("dm");
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-black/20 border border-[#3d2b1f]/50 hover:border-blue-500/30 hover:bg-black/30 transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-linear-to-br from-[#8b4513] to-[#3d2b1f] flex items-center justify-center border border-[#d4af37]/20">
                    <span className="text-sm font-black text-[#d4af37]">
                      {(conv.otherUsername || "?")[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-[#e8e0d5] truncate block">
                      {conv.otherUsername}
                    </span>
                    {conv.lastMessage && (
                      <span className="text-xs text-[#a89f94] truncate block">
                        {conv.lastMessage}
                      </span>
                    )}
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {conv.unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Empty state */}
          {(!friends || friends.length === 0) && (!conversations || conversations.length === 0) && (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <UserPlus className="w-12 h-12 text-[#a89f94]/50 mb-3" />
              <p className="text-[#a89f94] text-sm">No friends yet</p>
              <p className="text-[#a89f94]/60 text-xs mt-1">Add friends to start chatting!</p>
            </div>
          )}
        </div>
      )}

      {/* DM Conversation */}
      {chatMode === "dm" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3 tcg-scrollbar">
          {dmMessages.map((msg) => (
            <div
              key={msg._id}
              className={cn(
                "flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
                msg.isOwnMessage ? "flex-row-reverse" : ""
              )}
            >
              <div
                className={cn(
                  "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border",
                  msg.isOwnMessage
                    ? "bg-linear-to-br from-[#8b4513] to-[#3d2b1f] border-[#d4af37]/20"
                    : "bg-blue-500/20 border-blue-500/30"
                )}
              >
                <span
                  className={cn(
                    "text-xs font-black",
                    msg.isOwnMessage ? "text-[#d4af37]" : "text-blue-400"
                  )}
                >
                  {msg.senderUsername[0]?.toUpperCase()}
                </span>
              </div>

              <div className={cn("flex-1 min-w-0", msg.isOwnMessage && "flex justify-end")}>
                <div
                  className={cn(
                    "rounded-lg p-3 border max-w-[85%]",
                    msg.isOwnMessage
                      ? "bg-[#d4af37]/10 border-[#d4af37]/30"
                      : "bg-blue-500/10 border-blue-500/30"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={cn(
                        "text-xs font-black uppercase tracking-wide",
                        msg.isOwnMessage ? "text-[#d4af37]" : "text-blue-400"
                      )}
                    >
                      {msg.isOwnMessage ? "You" : msg.senderUsername}
                    </span>
                    <span className="text-[10px] text-[#a89f94]/60 ml-2">
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-[#e8e0d5] leading-relaxed wrap-break-word">
                    {msg.message}
                  </p>
                </div>
              </div>
            </div>
          ))}
          {dmMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <MessageSquare className="w-12 h-12 text-blue-400/50 mb-3" />
              <p className="text-[#a89f94] text-sm">No messages yet</p>
              <p className="text-[#a89f94]/60 text-xs mt-1">Say hello!</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Guild Chat */}
      {chatMode === "guild" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3 tcg-scrollbar">
          {isGuildChatLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
            </div>
          ) : guildMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <Shield className="w-12 h-12 text-amber-400/50 mb-3" />
              <p className="text-[#a89f94] text-sm">No messages yet</p>
              <p className="text-[#a89f94]/60 text-xs mt-1">Start the conversation!</p>
            </div>
          ) : (
            guildMessages.map((msg) => (
              <div
                key={msg._id}
                className={cn(
                  "group animate-in fade-in slide-in-from-bottom-2 duration-300",
                  msg.isSystem && "text-center"
                )}
              >
                {msg.isSystem ? (
                  <div className="py-1">
                    <span className="inline-block px-3 py-1 rounded-full bg-amber-500/10 text-[10px] text-amber-400 font-medium">
                      {msg.message}
                    </span>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <div className="shrink-0 w-8 h-8 rounded-lg bg-linear-to-br from-[#8b4513] to-[#3d2b1f] flex items-center justify-center border border-amber-500/20">
                      <span className="text-xs font-black text-amber-400">
                        {msg.username[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="bg-black/20 rounded-lg p-3 border border-[#3d2b1f]/50 hover:border-amber-500/30 transition-colors">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-black uppercase tracking-wide text-amber-400">
                            {msg.username}
                          </span>
                          <span className="text-[10px] text-[#a89f94]/60 opacity-0 group-hover:opacity-100 transition-opacity">
                            {formatTime(msg.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-[#e8e0d5] leading-relaxed wrap-break-word">
                          {msg.message}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input */}
      {(chatMode === "global" ||
        chatMode === "agent" ||
        chatMode === "dm" ||
        chatMode === "guild") && (
        <div className="p-4 border-t border-[#3d2b1f] bg-linear-to-r from-[#1a1614] to-[#261f1c]">
          <div className="flex gap-2">
            <input
              data-testid="chat-input"
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                chatMode === "agent"
                  ? "Ask the AI anything..."
                  : chatMode === "dm"
                    ? `Message ${activeDMFriend?.username || ""}...`
                    : chatMode === "guild"
                      ? "Message your guild..."
                      : "Type a message..."
              }
              disabled={isSending || isAgentTyping}
              className={cn(
                "flex-1 px-4 py-3 rounded-xl bg-parchment text-[#2a1f14] placeholder:text-[#2a1f14]/40 border focus:outline-none focus:ring-2 text-sm transition-all disabled:opacity-50",
                chatMode === "global"
                  ? "border-[#3d2b1f]/20 focus:border-[#d4af37]/50 focus:ring-[#d4af37]/10"
                  : chatMode === "agent"
                    ? "border-purple-500/20 focus:border-purple-500/50 focus:ring-purple-500/10"
                    : chatMode === "guild"
                      ? "border-amber-500/20 focus:border-amber-500/50 focus:ring-amber-500/10"
                      : "border-blue-500/20 focus:border-blue-500/50 focus:ring-blue-500/10"
              )}
            />
            <button
              type="button"
              onClick={chatMode === "agent" ? handleAgentSend : handleSend}
              disabled={!message.trim() || isSending || isAgentTyping}
              className={cn(
                "px-4 py-3 rounded-xl font-bold uppercase tracking-wide transition-all",
                message.trim() && !isSending && !isAgentTyping
                  ? chatMode === "global"
                    ? "tcg-button-primary text-white"
                    : chatMode === "agent"
                      ? "bg-purple-600 hover:bg-purple-500 text-white"
                      : chatMode === "guild"
                        ? "bg-amber-600 hover:bg-amber-500 text-white"
                        : "bg-blue-600 hover:bg-blue-500 text-white"
                  : "bg-[#3d2b1f]/50 text-[#a89f94]/50 cursor-not-allowed"
              )}
            >
              {isSending || isAgentTyping ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : chatMode === "agent" ? (
                <Sparkles className="w-5 h-5" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Online Users Off-Canvas Panel */}
      {isOnlinePanelOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm cursor-default"
            onClick={() => setIsOnlinePanelOpen(false)}
            aria-label="Close online users panel"
          />

          <div className="fixed top-20 right-0 z-70 h-[calc(100vh-5rem)] w-80 tcg-chat-leather border-l border-t border-[#3d2b1f] rounded-tl-2xl shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between p-4 border-b border-[#3d2b1f] bg-linear-to-r from-[#1a1614] to-[#261f1c] rounded-tl-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#e8e0d5] uppercase tracking-wider">
                    Online Users
                  </h3>
                  <p className="text-[10px] text-[#a89f94] uppercase tracking-widest">
                    {onlineCount} in tavern
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOnlinePanelOpen(false)}
                className="p-2 rounded-lg border border-[#3d2b1f] bg-black/30 text-[#a89f94] hover:text-[#e8e0d5] hover:border-[#d4af37]/50 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-4 px-4 py-3 border-b border-[#3d2b1f]/50 bg-black/20">
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div className={cn("w-2 h-2 rounded-full", config.color)} />
                  <span className="text-[10px] text-[#a89f94] uppercase tracking-wide">
                    {config.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[calc(100vh-220px)] tcg-scrollbar-thin">
              {onlineUsers.map((user) => (
                <div
                  key={user.id}
                  onClick={() => {
                    setSelectedProfile(user.username);
                    setIsOnlinePanelOpen(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-black/20 border border-[#3d2b1f]/50 hover:border-[#d4af37]/30 hover:bg-black/30 transition-all group text-left cursor-pointer"
                >
                  <div className="relative">
                    <div className="w-10 h-10 rounded-lg bg-linear-to-br from-[#8b4513] to-[#3d2b1f] flex items-center justify-center border border-[#d4af37]/20 group-hover:border-[#d4af37]/50 transition-colors">
                      <span className="text-sm font-black text-[#d4af37]">
                        {sanitizeText(user.username)[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#1a1614]",
                        STATUS_CONFIG[user.status].color
                      )}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#e8e0d5] text-sm truncate group-hover:text-[#d4af37] transition-colors">
                        {sanitizeText(user.username)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {user.status === "in_game" && (
                        <span className="flex items-center gap-1 text-[9px] text-amber-400">
                          <Gamepad2 className="w-3 h-3" />
                          Playing
                        </span>
                      )}
                    </div>
                  </div>

                  {user.status === "online" && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenChallenge(user.username);
                      }}
                      className="shrink-0 p-2 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#d4af37] hover:bg-[#d4af37]/20 hover:border-[#d4af37]/50 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                    >
                      <Trophy className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* User Context Menu */}
      {userMenu && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-90 cursor-default"
            onClick={() => setUserMenu(null)}
            aria-label="Close menu"
          />

          <div
            className="fixed z-95 w-44 rounded-xl tcg-chat-leather border border-[#3d2b1f] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            style={{
              left: Math.min(userMenu.x, window.innerWidth - 190),
              top: Math.min(userMenu.y, window.innerHeight - 200),
            }}
          >
            <div className="p-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedProfile(userMenu.username);
                  setUserMenu(null);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm text-[#e8e0d5] hover:bg-[#d4af37]/10 hover:text-[#d4af37] transition-all"
              >
                <User className="w-4 h-4" />
                View Profile
              </button>

              <button
                type="button"
                onClick={() => handleOpenChallenge(userMenu.username)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm text-[#e8e0d5] hover:bg-[#d4af37]/10 hover:text-[#d4af37] transition-all"
              >
                <Swords className="w-4 h-4" />
                Challenge
              </button>

              <div className="my-1 border-t border-[#3d2b1f]" />

              <button
                type="button"
                onClick={() => handleMuteUser(userMenu.username)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-all",
                  mutedUsers.has(userMenu.username)
                    ? "text-green-400 hover:bg-green-500/10"
                    : "text-[#e8e0d5] hover:bg-orange-500/10 hover:text-orange-400"
                )}
              >
                <VolumeX className="w-4 h-4" />
                {mutedUsers.has(userMenu.username) ? "Unmute" : "Mute"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setReportTarget(userMenu.username);
                  setUserMenu(null);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm text-[#e8e0d5] hover:bg-red-500/10 hover:text-red-400 transition-all"
              >
                <Flag className="w-4 h-4" />
                Report
              </button>
            </div>
          </div>
        </>
      )}

      <PlayerProfileDialog
        isOpen={!!selectedProfile}
        onClose={() => setSelectedProfile(null)}
        username={selectedProfile || ""}
      />

      <ChallengeConfirmDialog
        isOpen={!!challengeTarget}
        onClose={() => setChallengeTarget(null)}
        onConfirm={handleChallengeConfirm}
        opponentUsername={challengeTarget?.username || ""}
      />

      <ReportUserDialog
        username={reportTarget || ""}
        isOpen={!!reportTarget}
        onClose={() => setReportTarget(null)}
        onSubmit={handleReportUser}
      />
    </div>
  );
}
