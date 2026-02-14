"use client";

import { useChatLogic } from "@/hooks/social/useChatLogic";
import { sanitizeText } from "@/lib/sanitize";
import { cn } from "@/lib/utils";
import type { Id } from "@convex/_generated/dataModel";
import { Loader2, MessageSquare, Send } from "lucide-react";

interface GuildChatProps {
  guildId: Id<any>;
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
    <div className="h-[65vh] md:h-[600px] w-full flex flex-col paper-panel border-4 border-primary bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] md:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b-4 border-primary bg-secondary/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary bg-white flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <MessageSquare className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-black uppercase italic tracking-tighter text-lg ink-bleed leading-none">Comms Channel</h3>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">
              Secure Line
            </span>
          </div>
        </div>
        {messages && (
          <div className="px-2 py-1 border-2 border-primary bg-white text-[10px] font-black">
            {messages.length} MSGS
          </div>
        )}
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4 tcg-scrollbar bg-[url('/assets/overlays/paper-texture.png')] bg-repeat"
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : messages && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground/60">
            <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
            <p className="font-black uppercase tracking-widest text-xs">Silence on layout</p>
            <p className="text-[10px] uppercase font-bold mt-1">Initiate transmission</p>
          </div>
        ) : (
          <>
            {/* Load more indicator */}
            {isLoadingMore && (
              <div className="flex justify-center py-3">
                <div className="flex items-center gap-2 px-4 py-2 border-2 border-primary bg-secondary/20">
                  <Loader2 className="w-3 h-3 text-primary animate-spin" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                    Retrieving Archives...
                  </span>
                </div>
              </div>
            )}

            {canLoadMore && !isLoadingMore && (
              <div className="flex justify-center pb-3">
                <div className="px-3 py-1 text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em] border-b border-primary/20">
                  Scroll for history
                </div>
              </div>
            )}

            {/* Message list */}
            {messages?.map((msg) =>
              msg.isSystem ? (
                <div key={msg._id} className="py-2 text-center">
                  <span className="inline-block px-3 py-1 border border-primary/20 bg-primary/5 text-[10px] font-bold uppercase tracking-wider text-primary">
                    {msg.message}
                  </span>
                </div>
              ) : (
                <div key={msg._id} className="group flex gap-3">
                  {/* Avatar */}
                  <div className="shrink-0 w-8 h-8 border-2 border-primary bg-white flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <span className="text-xs font-black text-primary uppercase">
                      {sanitizeText(msg.username)[0]}
                    </span>
                  </div>

                  {/* Message bubble */}
                  <div className="flex-1 min-w-0">
                    <div className="bg-white p-3 border-2 border-primary shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] group-hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black uppercase tracking-wide text-primary border-b-2 border-primary/10 pb-0.5">
                          {sanitizeText(msg.username)}
                        </span>
                        <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest opacity-50 group-hover:opacity-100 transition-opacity">
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm font-medium leading-relaxed break-words text-foreground whitespace-pre-wrap">
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
      <div className="p-4 border-t-4 border-primary bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="TRANSMIT MESSAGE..."
            disabled={isSending}
            className="flex-1 px-4 py-3 bg-secondary/10 text-foreground placeholder:text-muted-foreground border-2 border-primary font-bold text-sm focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all uppercase placeholder:text-xs placeholder:tracking-widest disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!message.trim() || isSending}
            className={cn(
              "px-4 py-3 border-2 border-primary transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none",
              message.trim() && !isSending
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed shadow-none border-primary/20"
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
