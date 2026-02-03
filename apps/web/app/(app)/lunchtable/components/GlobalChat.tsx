"use client";

import { useGlobalChat } from "@/hooks";
import { useAIChat } from "@/hooks/social/useAIChat";
import { sanitizeChatMessage, sanitizeText } from "@/lib/sanitize";
import { cn } from "@/lib/utils";
import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import {
  Bot,
  Flag,
  Gamepad2,
  Loader2,
  MessageSquare,
  Send,
  Sparkles,
  Swords,
  Trophy,
  User,
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
  rank: string;
  status: "online" | "in_game" | "idle";
}

// Removed MOCK_ONLINE_USERS - now using real data from Convex

const RANK_COLORS: Record<string, string> = {
  Bronze: "text-orange-400",
  Silver: "text-gray-300",
  Gold: "text-yellow-500",
  Platinum: "text-blue-400",
  Diamond: "text-cyan-400",
  Master: "text-purple-400",
  Legend: "text-yellow-400",
};

const STATUS_CONFIG = {
  online: { color: "bg-green-500", label: "Online" },
  in_game: { color: "bg-amber-500", label: "In Game" },
  idle: { color: "bg-gray-500", label: "Idle" },
};

type ChatMode = "global" | "agent";


// Removed MOCK_MESSAGES and OLDER_MESSAGES - now using real data from Convex

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function GlobalChat() {
  // Use custom hook
  const {
    messages: convexMessages,
    onlineUsers: convexOnlineUsers,
    sendMessage: sendMessageAction,
    canLoadMore,
    loadMore,
  } = useGlobalChat();

  // AI Chat hook for agent mode
  const {
    messages: aiChatMessages,
    isAgentTyping,
    sendMessage: sendAIMessage,
  } = useAIChat();

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
  const [challengeTarget, setChallengeTarget] = useState<{ username: string; rank: string } | null>(
    null
  );
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
      rank: user.rank, // Real rank calculated from ELO
      status: user.status,
    })
  );

  const onlineCount = onlineUsers.length;

  const isInitialMount = useRef(true);
  const isAgentInitialMount = useRef(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const prevScrollHeightRef = useRef<number>(0);

  // Auto-scroll to bottom when NEW messages arrive (not on initial load)
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      // Scroll to bottom on initial mount
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
      return;
    }
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

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
  }, [aiChatMessages.length, scrollAgentToBottom]);

  // Infinite scroll - load more when scrolling near the top
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container || !canLoadMore || isLoadingMore) return;

    // Load more when scrolled within 100px of the top
    if (container.scrollTop < 100) {
      setIsLoadingMore(true);
      prevScrollHeightRef.current = container.scrollHeight;

      loadMore();

      // After loading, maintain scroll position
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

  // Presence heartbeat is handled by useGlobalChat hook

  const handleSend = async () => {
    if (!message.trim() || isSending) return;

    setIsSending(true);

    try {
      await sendMessageAction(message.trim());
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
      if (chatMode === "global") {
        handleSend();
      } else {
        handleAgentSend();
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

  const handleOpenChallenge = (username: string, rank?: string) => {
    // Find user's rank if not provided
    const user = onlineUsers.find((u) => u.username === username);
    setChallengeTarget({
      username,
      rank: rank || user?.rank || "Gold",
    });
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
      console.error("Challenge failed:", error);
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
      console.error("Report failed:", error);
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

  return (
    <div
      data-testid="global-chat"
      className="panel-ornate h-full flex flex-col rounded-2xl overflow-hidden shadow-2xl"
    >
      {/* Header */}
      <div className="p-4 border-b border-[#3d2b1f] bg-linear-to-r from-[#1a1614] to-[#261f1c]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-10 h-10 rounded-lg border flex items-center justify-center",
                chatMode === "global"
                  ? "bg-[#d4af37]/20 border-[#d4af37]/30"
                  : "bg-purple-500/20 border-purple-500/30"
              )}
            >
              {chatMode === "global" ? (
                <MessageSquare className="w-5 h-5 text-[#d4af37]" />
              ) : (
                <Bot className="w-5 h-5 text-purple-400" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-black text-[#e8e0d5] uppercase tracking-wider">
                {chatMode === "global" ? "Global Chat" : "AI Agent"}
              </h3>
              <p className="text-[10px] text-[#a89f94] uppercase tracking-widest">
                {chatMode === "global" ? "Tavern Hall" : "Ask anything"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Agent Chat Toggle */}
            <button
              type="button"
              onClick={() => setChatMode(chatMode === "global" ? "agent" : "global")}
              className={cn(
                "p-2 rounded-lg border transition-all",
                chatMode === "agent"
                  ? "bg-purple-500/20 border-purple-500/50 text-purple-400"
                  : "bg-black/30 border-[#3d2b1f] text-[#a89f94] hover:border-purple-500/50 hover:text-purple-400"
              )}
              title={chatMode === "global" ? "Chat with AI Agent" : "Back to Global Chat"}
            >
              <Sparkles className="w-4 h-4" />
            </button>
            {/* Online Users (only show in global mode) */}
            {chatMode === "global" && (
              <button
                type="button"
                onClick={() => setIsOnlinePanelOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/30 border border-[#3d2b1f] hover:border-[#d4af37]/50 hover:bg-black/50 transition-all cursor-pointer"
              >
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <Users className="w-3.5 h-3.5 text-[#a89f94]" />
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
          {/* Loading indicator at top when fetching more */}
          {isLoadingMore && (
            <div className="flex justify-center py-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/30">
                <Loader2 className="w-4 h-4 text-[#d4af37] animate-spin" />
                <span className="text-xs font-medium text-[#d4af37]">Loading older messages...</span>
              </div>
            </div>
          )}

          {/* Scroll to top indicator */}
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
                  {/* Avatar */}
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

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Messages - Agent Chat */}
      {chatMode === "agent" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3 tcg-scrollbar">
          {/* Welcome message if no messages yet */}
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
                    Welcome to Lunchtable TCG! I'm your AI companion. Ask me anything about the game, strategies, or how to improve your deck!
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
              {/* Avatar */}
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

          {/* Typing indicator */}
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

          {/* Scroll anchor */}
          <div ref={agentMessagesEndRef} />
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-[#3d2b1f] bg-linear-to-r from-[#1a1614] to-[#261f1c]">
        <div className="flex gap-2">
          <input
            data-testid="chat-input"
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={chatMode === "global" ? "Type a message..." : "Ask the AI anything..."}
            disabled={isSending || isAgentTyping}
            className={cn(
              "flex-1 px-4 py-3 rounded-xl bg-parchment text-[#2a1f14] placeholder:text-[#2a1f14]/40 border focus:outline-none focus:ring-2 text-sm transition-all disabled:opacity-50",
              chatMode === "global"
                ? "border-[#3d2b1f]/20 focus:border-[#d4af37]/50 focus:ring-[#d4af37]/10"
                : "border-purple-500/20 focus:border-purple-500/50 focus:ring-purple-500/10"
            )}
          />
          <button
            type="button"
            onClick={chatMode === "global" ? handleSend : handleAgentSend}
            disabled={!message.trim() || isSending || isAgentTyping}
            className={cn(
              "px-4 py-3 rounded-xl font-bold uppercase tracking-wide transition-all",
              message.trim() && !isSending && !isAgentTyping
                ? chatMode === "global"
                  ? "tcg-button-primary text-white"
                  : "bg-purple-600 hover:bg-purple-500 text-white"
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

      {/* Online Users Off-Canvas Panel */}
      {isOnlinePanelOpen && (
        <>
          {/* Backdrop */}
          <button
            type="button"
            className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm cursor-default"
            onClick={() => setIsOnlinePanelOpen(false)}
            aria-label="Close online users panel"
          />

          {/* Panel */}
          <div className="fixed top-20 right-0 z-70 h-[calc(100vh-5rem)] w-80 tcg-chat-leather border-l border-t border-[#3d2b1f] rounded-tl-2xl shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Panel Header */}
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

            {/* Status Legend */}
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

            {/* Users List */}
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
                  {/* Avatar with Status */}
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

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#e8e0d5] text-sm truncate group-hover:text-[#d4af37] transition-colors">
                        {sanitizeText(user.username)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-wider",
                          RANK_COLORS[user.rank] || "text-[#a89f94]"
                        )}
                      >
                        {user.rank}
                      </span>
                      {user.status === "in_game" && (
                        <span className="flex items-center gap-1 text-[9px] text-amber-400">
                          <Gamepad2 className="w-3 h-3" />
                          Playing
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Challenge Button (only for online users) */}
                  {user.status === "online" && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenChallenge(user.username, user.rank);
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
          {/* Backdrop to close menu */}
          <button
            type="button"
            className="fixed inset-0 z-90 cursor-default"
            onClick={() => setUserMenu(null)}
            aria-label="Close menu"
          />

          {/* Menu */}
          <div
            className="fixed z-95 w-44 rounded-xl tcg-chat-leather border border-[#3d2b1f] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            style={{
              left: Math.min(userMenu.x, window.innerWidth - 190),
              top: Math.min(userMenu.y, window.innerHeight - 200),
            }}
          >
            <div className="p-1">
              {/* View Profile */}
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

              {/* Challenge */}
              <button
                type="button"
                onClick={() => handleOpenChallenge(userMenu.username)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm text-[#e8e0d5] hover:bg-[#d4af37]/10 hover:text-[#d4af37] transition-all"
              >
                <Swords className="w-4 h-4" />
                Challenge
              </button>

              <div className="my-1 border-t border-[#3d2b1f]" />

              {/* Mute */}
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

              {/* Report */}
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

      {/* Player Profile Dialog */}
      <PlayerProfileDialog
        isOpen={!!selectedProfile}
        onClose={() => setSelectedProfile(null)}
        username={selectedProfile || ""}
      />

      {/* Challenge Confirm Dialog */}
      <ChallengeConfirmDialog
        isOpen={!!challengeTarget}
        onClose={() => setChallengeTarget(null)}
        onConfirm={handleChallengeConfirm}
        opponentUsername={challengeTarget?.username || ""}
        opponentRank={challengeTarget?.rank}
      />

      {/* Report User Dialog */}
      <ReportUserDialog
        username={reportTarget || ""}
        isOpen={!!reportTarget}
        onClose={() => setReportTarget(null)}
        onSubmit={handleReportUser}
      />
    </div>
  );
}
