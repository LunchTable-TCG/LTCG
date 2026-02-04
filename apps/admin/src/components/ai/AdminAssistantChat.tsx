"use client";

/**
 * Admin Assistant Chat Component
 *
 * A floating chat panel that can be minimized/expanded.
 * Used both as a floating widget and embedded in the dedicated page.
 */

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { typedApi } from "@/lib/convexHelpers";
import { cn } from "@/lib/utils";
import { useTypedAction } from "@ltcg/core/react";
import type { FunctionReference } from "convex/server";
import {
  BotIcon,
  ExternalLinkIcon,
  Loader2Icon,
  MaximizeIcon,
  MinimizeIcon,
  SendIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

// =============================================================================
// Types
// =============================================================================

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  toolCalls?: Array<{
    name: string;
    args: unknown;
    result?: unknown;
  }>;
}

interface AdminAssistantChatProps {
  /** Whether this is embedded in the full page view */
  isFullPage?: boolean;
  /** Initial message history (for full page) */
  initialMessages?: Message[];
  /** Thread ID to use */
  threadId?: string;
  /** Callback when thread is created */
  onThreadCreated?: (threadId: string) => void;
}

// =============================================================================
// Component
// =============================================================================

export function AdminAssistantChat({
  isFullPage = false,
  initialMessages = [],
  threadId: initialThreadId,
  onThreadCreated,
}: AdminAssistantChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(initialThreadId ?? null);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Actions - use useTypedAction from @ltcg/core/react to avoid TS2589 deep type instantiation
  const getOrCreateThreadAction = typedApi.ai.adminAgentApi
    .getOrCreateThread as FunctionReference<"action">;
  const getOrCreateThread = useTypedAction(getOrCreateThreadAction);
  const sendMessageAction = typedApi.ai.adminAgentApi.sendMessage as FunctionReference<"action">;
  const sendMessage = useTypedAction(sendMessageAction);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Initialize thread when opening chat
  const initializeThread = useCallback(async () => {
    if (threadId) return;

    try {
      const result = await getOrCreateThread({});
      setThreadId(result.threadId);
      onThreadCreated?.(result.threadId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initialize chat");
    }
  }, [threadId, getOrCreateThread, onThreadCreated]);

  // Initialize on mount for full page, or when opening floating panel
  useEffect(() => {
    if (isFullPage) {
      initializeThread();
    }
  }, [isFullPage, initializeThread]);

  // Handle opening the chat
  const handleOpen = async () => {
    setIsOpen(true);
    setIsMinimized(false);
    await initializeThread();
  };

  // Handle sending a message
  const handleSend = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || !threadId || isLoading) return;

    // Add user message to local state
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmedInput,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const result = await sendMessage({
        threadId,
        message: trimmedInput,
      });

      // Add assistant response
      const assistantMessage: Message = {
        id: result.messageId ?? `msg-${Date.now()}`,
        role: "assistant",
        content: result.text,
        createdAt: Date.now(),
        // biome-ignore lint/suspicious/noExplicitAny: toolCall type varies by AI provider
        toolCalls: result.toolCalls?.map((tc: any) => ({
          name: "toolName" in tc ? String(tc.toolName) : "unknown",
          args: "args" in tc ? tc.args : {},
          result: "result" in tc ? tc.result : undefined,
        })),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
      // Remove user message on error
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Floating panel (closed state)
  if (!isFullPage && !isOpen) {
    return (
      <Button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        size="icon"
      >
        <SparklesIcon className="h-6 w-6" />
      </Button>
    );
  }

  // Chat content (shared between floating and full page)
  const chatContent = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <BotIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Admin Assistant</h3>
            <p className="text-xs text-muted-foreground">AI-powered admin help</p>
          </div>
        </div>
        {!isFullPage && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              {isMinimized ? (
                <MaximizeIcon className="h-4 w-4" />
              ) : (
                <MinimizeIcon className="h-4 w-4" />
              )}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <Link href="/ai-assistant">
                <ExternalLinkIcon className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsOpen(false)}
            >
              <XIcon className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Messages */}
      {!isMinimized && (
        <>
          <ScrollArea
            className={cn("flex-1 p-4", isFullPage ? "h-[calc(100vh-280px)]" : "h-[350px]")}
            ref={scrollRef}
          >
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-4 rounded-full bg-primary/10 p-4">
                  <SparklesIcon className="h-8 w-8 text-primary" />
                </div>
                <h4 className="font-medium">How can I help you?</h4>
                <p className="mt-1 text-sm text-muted-foreground max-w-xs">
                  I can help with player lookups, moderation support, system stats, and content
                  ideas.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  {[
                    "Show system stats",
                    "Search for player 'test'",
                    "Any suspicious activity?",
                    "List recent audit logs",
                  ].map((suggestion) => (
                    <Badge
                      key={suggestion}
                      variant="outline"
                      className="cursor-pointer hover:bg-muted"
                      onClick={() => {
                        setInput(suggestion);
                        inputRef.current?.focus();
                      }}
                    >
                      {suggestion}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.role === "assistant" && (
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-primary/10">
                          <BotIcon className="h-4 w-4 text-primary" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={cn(
                        "rounded-lg px-4 py-2 max-w-[85%]",
                        message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}
                    >
                      <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                      {message.toolCalls && message.toolCalls.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border/50">
                          <p className="text-xs text-muted-foreground mb-1">Tools used:</p>
                          <div className="flex flex-wrap gap-1">
                            {message.toolCalls.map((tool, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {tool.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {message.role === "user" && (
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback>You</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-primary/10">
                        <BotIcon className="h-4 w-4 text-primary" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="rounded-lg bg-muted px-4 py-2">
                      <div className="flex items-center gap-2">
                        <Loader2Icon className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Error display */}
          {error && (
            <div className="mx-4 mb-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Input */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything..."
                className="min-h-[44px] max-h-32 resize-none"
                disabled={isLoading || !threadId}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading || !threadId}
                size="icon"
                className="h-11 w-11 shrink-0"
              >
                {isLoading ? (
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                ) : (
                  <SendIcon className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );

  // Full page layout
  if (isFullPage) {
    return <Card className="flex h-full flex-col">{chatContent}</Card>;
  }

  // Floating panel layout
  return (
    <Card
      className={cn(
        "fixed bottom-6 right-6 z-50 w-[380px] shadow-xl flex flex-col transition-all duration-200",
        isMinimized ? "h-auto" : "h-[500px]"
      )}
    >
      {chatContent}
    </Card>
  );
}

export default AdminAssistantChat;
