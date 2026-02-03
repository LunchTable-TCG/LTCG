"use client";

/**
 * Session Recordings Page
 *
 * Lists all session recordings with filters and links to PostHog replays.
 */

import { PageWrapper } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge, Card, Flex, Text, Title } from "@tremor/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

// =============================================================================
// Types
// =============================================================================

interface Session {
  id: string;
  distinct_id: string;
  recording_duration: number;
  active_seconds: number;
  start_time: string;
  end_time: string;
  click_count: number;
  keypress_count: number;
  console_error_count: number;
  console_warn_count: number;
  person?: {
    id: string;
    name?: string;
    properties?: Record<string, unknown>;
  };
  start_url?: string;
  replay_url: string;
}

interface SessionsResponse {
  sessions: Session[];
  count: number;
  hasMore: boolean;
  configured: boolean;
}

// =============================================================================
// Component
// =============================================================================

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [filters, setFilters] = useState({
    hasErrors: false,
    search: "",
    dateFrom: "",
  });
  const [configured, setConfigured] = useState(true);

  const fetchSessions = useCallback(async (append = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "20");
      params.set("offset", append ? offset.toString() : "0");

      if (filters.hasErrors) {
        params.set("has_errors", "true");
      }
      if (filters.dateFrom) {
        params.set("date_from", filters.dateFrom);
      }

      const res = await fetch(`/api/posthog/sessions?${params}`);
      const data: SessionsResponse = await res.json();

      if (!data.configured) {
        setConfigured(false);
        return;
      }

      if (append) {
        setSessions((prev) => [...prev, ...data.sessions]);
      } else {
        setSessions(data.sessions);
      }

      setHasMore(data.hasMore);
      setOffset(append ? offset + data.sessions.length : data.sessions.length);
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
    } finally {
      setLoading(false);
    }
  }, [filters, offset]);

  useEffect(() => {
    fetchSessions(false);
  }, [filters.hasErrors, filters.dateFrom]);

  // Format duration
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m ${Math.round(seconds % 60)}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Filter sessions by search
  const filteredSessions = sessions.filter((session) => {
    if (!filters.search) return true;
    const searchLower = filters.search.toLowerCase();
    const username = (session.person?.properties?.["username"] as string)?.toLowerCase() || "";
    const distinctId = session.distinct_id.toLowerCase();
    return username.includes(searchLower) || distinctId.includes(searchLower);
  });

  if (!configured) {
    return (
      <PageWrapper
        title="Session Recordings"
        description="Watch replays of user sessions"
        actions={
          <Button variant="outline" asChild>
            <Link href="/analytics/behavior">← Back to Behavior</Link>
          </Button>
        }
      >
        <Card>
          <Badge color="amber">PostHog Not Configured</Badge>
          <Text className="mt-2">
            Please configure PostHog API access to view session recordings.
          </Text>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/analytics/behavior">View Setup Instructions</Link>
          </Button>
        </Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Session Recordings"
      description={`${sessions.length} sessions loaded • Click to watch replay in PostHog`}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/analytics/behavior">← Back to Behavior</Link>
          </Button>
          <Button variant="outline" asChild>
            <a href="https://app.posthog.com" target="_blank" rel="noopener noreferrer">
              Open PostHog →
            </a>
          </Button>
        </div>
      }
    >
      {/* Filters */}
      <Card className="mb-6">
        <Flex className="flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <Text className="text-sm font-medium mb-1">Search User</Text>
            <Input
              type="text"
              placeholder="Username or ID..."
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            />
          </div>

          <div>
            <Text className="text-sm font-medium mb-1">Date From</Text>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
            />
          </div>

          <div className="flex items-end">
            <Button
              variant={filters.hasErrors ? "default" : "outline"}
              onClick={() => setFilters((f) => ({ ...f, hasErrors: !f.hasErrors }))}
            >
              {filters.hasErrors ? "⚠️ With Errors Only" : "Show All"}
            </Button>
          </div>

          <div className="flex items-end">
            <Button
              variant="ghost"
              onClick={() => setFilters({ hasErrors: false, search: "", dateFrom: "" })}
            >
              Clear Filters
            </Button>
          </div>
        </Flex>
      </Card>

      {/* Sessions List */}
      <div className="space-y-3">
        {filteredSessions.length === 0 && !loading ? (
          <Card>
            <Text className="text-center py-8 text-muted-foreground">
              No sessions found matching your filters.
            </Text>
          </Card>
        ) : (
          filteredSessions.map((session) => (
            <a
              key={session.id}
              href={session.replay_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Card className="hover:border-primary transition-colors cursor-pointer">
                <Flex justifyContent="between" alignItems="start">
                  <div className="flex gap-4">
                    {/* Status Icon */}
                    <div className="text-3xl">
                      {session.console_error_count > 0 ? "⚠️" : "▶️"}
                    </div>

                    {/* Session Info */}
                    <div>
                      <Flex alignItems="center" className="gap-2 mb-1">
                        <Title className="text-base">
                          {(session.person?.properties?.["username"] as string) ||
                            `User ${session.distinct_id.substring(0, 8)}`}
                        </Title>
                        {session.console_error_count > 0 && (
                          <Badge color="rose" size="sm">
                            {session.console_error_count} errors
                          </Badge>
                        )}
                        {session.console_warn_count > 0 && (
                          <Badge color="amber" size="sm">
                            {session.console_warn_count} warnings
                          </Badge>
                        )}
                      </Flex>

                      <Text className="text-sm text-muted-foreground">
                        {formatDate(session.start_time)}
                      </Text>

                      {session.start_url && (
                        <Text className="text-xs text-muted-foreground font-mono mt-1 truncate max-w-md">
                          Started on: {new URL(session.start_url, "http://localhost").pathname}
                        </Text>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="text-right">
                    <Text className="text-lg font-bold">
                      {formatDuration(session.recording_duration)}
                    </Text>
                    <Text className="text-sm text-muted-foreground">
                      {session.click_count} clicks • {session.keypress_count} keypresses
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      Active: {formatDuration(session.active_seconds)}
                    </Text>
                  </div>
                </Flex>
              </Card>
            </a>
          ))
        )}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="mt-6 text-center">
          <Button
            variant="outline"
            onClick={() => fetchSessions(true)}
            disabled={loading}
          >
            {loading ? "Loading..." : "Load More Sessions"}
          </Button>
        </div>
      )}

      {/* Loading State */}
      {loading && sessions.length === 0 && (
        <Card>
          <div className="text-center py-8">
            <Text className="text-muted-foreground">Loading sessions...</Text>
          </div>
        </Card>
      )}

      {/* Info */}
      <Card className="mt-6">
        <Flex alignItems="center" className="gap-2">
          <span className="text-blue-500">💡</span>
          <Text className="text-sm text-muted-foreground">
            Click on any session to open the full replay in PostHog with timeline, events,
            and console logs.
          </Text>
        </Flex>
      </Card>
    </PageWrapper>
  );
}
