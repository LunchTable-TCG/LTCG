"use client";

import { useChatLogic } from "@/hooks/social/useChatLogic";
import { sanitizeText } from "@/lib/sanitize";
import { cn } from "@/lib/utils";
import type { Id } from "@convex/_generated/dataModel";
import { Loader2, MessageSquare, Send } from "lucide-react";

interface GuildChatProps {
  guildId: Id<"guilds">;
}

export function GuildChat({ guildId }: GuildChatProps) {
  const {
    messages,
    isLoading,
    message,
    setMessage,
    isSending,
    isLoadingMore,
    messagesEndRef,
    messagesContainerRef,
    handleScroll,
    handleSend,
    handleKeyDown,
    canLoadMore,
  } = useChatLogic(guildId);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    if (diffDays === 1) {
      return `Yesterday ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }
    if (diffDays < 7) {
      return `${date.toLocaleDateString([], { weekday: "short" })} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="h-[600px] flex flex-col rounded-2xl tcg-chat-leather overflow-hidden shadow-2xl border border-[#3d2b1f]">
      {/* Header */}
      <div className="p-4 border-b border-[#3d2b1f] bg-linear-to-r from-[#1a1614] to-[#261f1c]">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-amber-400" />
          <h3 className="font-bold text-[#e8e0d5] uppercase tracking-wide text-sm">Guild Chat</h3>
          {messages && (
            <span className="text-[10px] text-[#a89f94]/60 uppercase tracking-widest">
              {messages.length} messages
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-3 tcg-scrollbar"
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
          </div>
        ) : messages && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[#a89f94]/60">
            <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">No messages yet</p>
            <p className="text-xs mt-1">Be the first to say something!</p>
          </div>
        ) : (
          <>
            {/* Load more indicator */}
            {isLoadingMore && (
              <div className="flex justify-center py-3">
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                  <span className="text-xs font-medium text-amber-400">
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

            {/* Message list */}
            {messages?.map((msg) =>
              msg.isSystem ? (
                <div key={msg._id} className="py-1 text-center">
                  <span className="inline-block px-3 py-1 rounded-full bg-amber-500/10 text-[10px] text-amber-400 font-medium">
                    {msg.message}
                  </span>
                </div>
              ) : (
                <div key={msg._id} className="group flex gap-3">
                  {/* Avatar */}
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-linear-to-br from-[#8b4513] to-[#3d2b1f] flex items-center justify-center border border-amber-500/20">
                    <span className="text-xs font-black text-amber-400">
                      {sanitizeText(msg.username)[0]?.toUpperCase()}
                    </span>
                  </div>

                  {/* Message bubble */}
                  <div className="flex-1 min-w-0">
                    <div className="bg-black/20 rounded-lg p-3 border border-[#3d2b1f]/50 hover:border-amber-500/30 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black uppercase tracking-wide text-amber-400">
                          {sanitizeText(msg.username)}
                        </span>
                        <span className="text-[10px] text-[#a89f94]/60 opacity-0 group-hover:opacity-100 transition-opacity">
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed break-words text-[#e8e0d5] whitespace-pre-wrap">
                        {msg.message}
                      </p>
                    </div>
                  </div>
                </div>
              )
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[#3d2b1f] bg-linear-to-r from-[#1a1614] to-[#261f1c]">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message your guild..."
            disabled={isSending}
            className="flex-1 px-4 py-3 rounded-xl bg-parchment text-[#2a1f14] placeholder:text-[#2a1f14]/40 border border-amber-500/20 focus:border-amber-500/50 focus:ring-amber-500/10 focus:outline-none focus:ring-2 text-sm transition-all disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!message.trim() || isSending}
            className={cn(
              "px-4 py-3 rounded-xl font-bold uppercase tracking-wide transition-all",
              message.trim() && !isSending
                ? "bg-amber-600 hover:bg-amber-500 text-white"
                : "bg-[#3d2b1f]/50 text-[#a89f94]/50 cursor-not-allowed"
            )}
          >
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
