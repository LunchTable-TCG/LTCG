"use client";

/**
 * AI Assistant Full Page
 *
 * Dedicated page for the Admin Assistant with more workspace.
 * Features thread history sidebar and rich tool result displays.
 */

import { AdminAssistantChat } from "@/components/ai";
import { PageWrapper } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdmin } from "@/contexts/AdminContext";
import { apiAny } from "@/lib/convexHelpers";
import { cn } from "@/lib/utils";
import { Text } from "@tremor/react";
import { useAction } from "convex/react";
import {
  BotIcon,
  HistoryIcon,
  Loader2Icon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

// =============================================================================
// Types
// =============================================================================

interface Thread {
  threadId: string;
  title: string;
  summary?: string;
  createdAt: number;
  status?: string;
}

// =============================================================================
// Component
// =============================================================================

export default function AIAssistantPage() {
  useAdmin(); // Auth check

  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [isCreatingThread, setIsCreatingThread] = useState(false);
  const [isDeletingThread, setIsDeletingThread] = useState<string | null>(null);

  // Actions
  const listThreads = useAction(apiAny.ai.adminAgentApi.listThreads);
  const getOrCreateThread = useAction(apiAny.ai.adminAgentApi.getOrCreateThread);
  const deleteThread = useAction(apiAny.ai.adminAgentApi.deleteThread);

  // Load threads
  const loadThreads = useCallback(async () => {
    try {
      const result = await listThreads({ limit: 20 });
      setThreads(result.threads);

      // Auto-select first thread if none selected
      if (!selectedThreadId && result.threads.length > 0) {
        setSelectedThreadId(result.threads[0].threadId);
      }
    } catch (error) {
      console.error("Failed to load threads:", error);
    } finally {
      setIsLoadingThreads(false);
    }
  }, [listThreads, selectedThreadId]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  // Create new thread
  const handleNewThread = async () => {
    setIsCreatingThread(true);
    try {
      const result = await getOrCreateThread({});
      setSelectedThreadId(result.threadId);
      await loadThreads();
      toast.success("New conversation started");
    } catch (error) {
      toast.error("Failed to create new thread");
    } finally {
      setIsCreatingThread(false);
    }
  };

  // Delete thread
  const handleDeleteThread = async (threadId: string) => {
    setIsDeletingThread(threadId);
    try {
      await deleteThread({ threadId });
      setThreads((prev) => prev.filter((t) => t.threadId !== threadId));

      // Select another thread if we deleted the selected one
      if (selectedThreadId === threadId) {
        const remaining = threads.filter((t) => t.threadId !== threadId);
        setSelectedThreadId(remaining[0]?.threadId ?? null);
      }
      toast.success("Conversation deleted");
    } catch (error) {
      toast.error("Failed to delete conversation");
    } finally {
      setIsDeletingThread(null);
    }
  };

  // Handle thread created from chat component
  const handleThreadCreated = (threadId: string) => {
    setSelectedThreadId(threadId);
    loadThreads();
  };

  return (
    <PageWrapper
      title="AI Assistant"
      description="AI-powered admin assistance for player lookups, moderation, and analytics"
      actions={
        <Button onClick={handleNewThread} disabled={isCreatingThread}>
          {isCreatingThread ? (
            <>
              <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <PlusIcon className="mr-2 h-4 w-4" />
              New Conversation
            </>
          )}
        </Button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
        {/* Thread History Sidebar */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <HistoryIcon className="h-4 w-4" />
                Conversations
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-320px)]">
                {isLoadingThreads ? (
                  <div className="space-y-2 px-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3 py-2">
                        <Skeleton className="h-8 w-8 rounded" />
                        <div className="flex-1 space-y-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : threads.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <BotIcon className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <Text className="text-sm text-muted-foreground">
                      No conversations yet
                    </Text>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={handleNewThread}
                      disabled={isCreatingThread}
                    >
                      Start a conversation
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1 px-2">
                    {threads.map((thread) => (
                      <div
                        key={thread.threadId}
                        className={cn(
                          "group flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-colors",
                          selectedThreadId === thread.threadId
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-muted"
                        )}
                        onClick={() => setSelectedThreadId(thread.threadId)}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-muted">
                          <BotIcon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {thread.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(thread.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteThread(thread.threadId);
                          }}
                          disabled={isDeletingThread === thread.threadId}
                        >
                          {isDeletingThread === thread.threadId ? (
                            <Loader2Icon className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2Icon className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-3 h-full">
          {selectedThreadId ? (
            <AdminAssistantChat
              isFullPage
              threadId={selectedThreadId}
              onThreadCreated={handleThreadCreated}
            />
          ) : (
            <Card className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="mb-4 rounded-full bg-primary/10 p-6 inline-block">
                  <BotIcon className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Welcome to Admin Assistant</h3>
                <p className="text-muted-foreground mt-2 max-w-sm">
                  Start a new conversation to get AI-powered help with player lookups,
                  moderation support, system analytics, and content ideas.
                </p>
                <Button className="mt-6" onClick={handleNewThread} disabled={isCreatingThread}>
                  {isCreatingThread ? (
                    <>
                      <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <PlusIcon className="mr-2 h-4 w-4" />
                      Start Conversation
                    </>
                  )}
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
