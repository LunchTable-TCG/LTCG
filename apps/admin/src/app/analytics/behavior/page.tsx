"use client";

/**
 * User Behavior Analytics Page
 *
 * Central hub for session recordings, error heatmaps, and drop-off analysis.
 * Integrates with PostHog for detailed user behavior insights.
 */

import { MetricGrid, MetricTile } from "@/components/analytics";
import { PageWrapper } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { AreaChart, Badge, BarChart, Card, Flex, Text, Title } from "@tremor/react";
import Link from "next/link";
import { useEffect, useState } from "react";

// =============================================================================
// Types
// =============================================================================

interface PostHogConfig {
  configured: boolean;
  host: string;
  hasApiKey: boolean;
  hasProjectId: boolean;
  instructions?: string[];
}

interface SessionData {
  sessions: Array<{
    id: string;
    distinct_id: string;
    recording_duration: number;
    start_time: string;
    console_error_count: number;
    click_count: number;
    person?: { name?: string; properties?: Record<string, unknown> };
    replay_url: string;
  }>;
  count: number;
  configured: boolean;
}

interface ErrorData {
  summary: {
    totalErrors: number;
    uniquePages: number;
    period: string;
  };
  byPage: Array<{ page: string; count: number }>;
  byType: Array<{ type: string; count: number }>;
  byDay: Array<{ date: string; count: number }>;
  configured: boolean;
}

// =============================================================================
// Component
// =============================================================================

export default function BehaviorAnalyticsPage() {
  const [config, setConfig] = useState<PostHogConfig | null>(null);
  const [sessions, setSessions] = useState<SessionData | null>(null);
  const [errors, setErrors] = useState<ErrorData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch config status
        const configRes = await fetch("/api/posthog/config");
        const configData = await configRes.json();
        setConfig(configData);

        if (configData.configured) {
          // Fetch sessions and errors in parallel
          const [sessionsRes, errorsRes] = await Promise.all([
            fetch("/api/posthog/sessions?limit=10"),
            fetch("/api/posthog/errors"),
          ]);

          if (sessionsRes.ok) {
            setSessions(await sessionsRes.json());
          }
          if (errorsRes.ok) {
            setErrors(await errorsRes.json());
          }
        }
      } catch (error) {
        console.error("Failed to fetch PostHog data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Format duration from seconds to human readable
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
  };

  // If PostHog is not configured, show setup instructions
  if (!loading && config && !config.configured) {
    return (
      <PageWrapper
        title="User Behavior Analytics"
        description="Session recordings, error tracking, and user journey analysis"
        actions={
          <Button variant="outline" asChild>
            <Link href="/analytics">← Back to Analytics</Link>
          </Button>
        }
      >
        <Card className="max-w-2xl">
          <Flex alignItems="center" className="gap-2 mb-4">
            <Badge color="amber">Setup Required</Badge>
            <Title>PostHog Configuration Needed</Title>
          </Flex>

          <Text className="text-muted-foreground mb-4">
            To enable session recordings, heatmaps, and error tracking, you need to configure
            PostHog API access for the admin panel.
          </Text>

          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            {config.instructions?.map((instruction) => (
              <Text key={instruction} className="text-sm">
                {instruction}
              </Text>
            ))}
          </div>

          <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <Flex alignItems="center" className="gap-2">
              <span className="text-blue-500">ℹ️</span>
              <Text className="text-sm text-blue-500">
                Note: The web app is already tracking data to PostHog. This setup is only needed to
                view the data in the admin panel.
              </Text>
            </Flex>
          </div>

          <div className="mt-6 flex gap-4">
            <Button variant="outline" asChild>
              <a href="https://app.posthog.com" target="_blank" rel="noopener noreferrer">
                Open PostHog Dashboard →
              </a>
            </Button>
          </div>
        </Card>
      </PageWrapper>
    );
  }

  const sessionsWithErrors =
    sessions?.sessions.filter((s) => s.console_error_count > 0).length || 0;
  const totalClicks = sessions?.sessions.reduce((sum, s) => sum + s.click_count, 0) || 0;
  const avgSessionDuration =
    sessions?.sessions.reduce((sum, s) => sum + s.recording_duration, 0) || 0;
  const avgDuration = sessions?.sessions.length ? avgSessionDuration / sessions.sessions.length : 0;

  return (
    <PageWrapper
      title={
        <Flex alignItems="center" className="gap-2">
          <span>User Behavior Analytics</span>
          <Badge color="emerald">PostHog Connected</Badge>
        </Flex>
      }
      description="Session recordings, error tracking, and user journey analysis"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/analytics">← Back to Analytics</Link>
          </Button>
          <Button variant="outline" asChild>
            <a href="https://app.posthog.com" target="_blank" rel="noopener noreferrer">
              Open PostHog →
            </a>
          </Button>
        </div>
      }
    >
      {/* Key Metrics */}
      <MetricGrid columns={4}>
        <MetricTile
          title="Recent Sessions"
          value={sessions?.count ?? 0}
          icon={<span className="text-lg">🎬</span>}
          isLoading={loading}
        />
        <MetricTile
          title="Sessions with Errors"
          value={sessionsWithErrors}
          icon={<span className="text-lg">⚠️</span>}
          delta={
            sessions?.count
              ? `${Math.round((sessionsWithErrors / sessions.count) * 100)}%`
              : undefined
          }
          deltaType={sessionsWithErrors > 0 ? "moderateIncrease" : "unchanged"}
          isLoading={loading}
        />
        <MetricTile
          title="Total Errors (7d)"
          value={errors?.summary.totalErrors ?? 0}
          icon={<span className="text-lg">🐛</span>}
          subtitle={`${errors?.summary.uniquePages ?? 0} pages affected`}
          isLoading={loading}
        />
        <MetricTile
          title="Avg Session Duration"
          value={formatDuration(avgDuration)}
          icon={<span className="text-lg">⏱️</span>}
          subtitle={`${totalClicks} total clicks`}
          isLoading={loading}
        />
      </MetricGrid>

      {/* Quick Access Cards */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Link href="/analytics/behavior/sessions" className="block group">
          <Card className="h-full hover:border-primary transition-colors">
            <Flex alignItems="center" className="gap-3 mb-2">
              <span className="text-3xl">🎬</span>
              <Title>Session Recordings</Title>
            </Flex>
            <Text className="text-muted-foreground mb-4">
              Watch real user sessions to understand behavior, find bugs, and improve UX.
            </Text>
            <Badge color="blue">{sessions?.count ?? 0} recordings available</Badge>
          </Card>
        </Link>

        <Link href="/analytics/behavior/errors" className="block group">
          <Card className="h-full hover:border-primary transition-colors">
            <Flex alignItems="center" className="gap-3 mb-2">
              <span className="text-3xl">🔥</span>
              <Title>Error Heatmap</Title>
            </Flex>
            <Text className="text-muted-foreground mb-4">
              See which pages have the most errors and identify problem areas.
            </Text>
            <Badge color={errors?.summary.totalErrors ? "rose" : "emerald"}>
              {errors?.summary.totalErrors ?? 0} errors tracked
            </Badge>
          </Card>
        </Link>

        <Link href="/analytics/behavior/funnels" className="block group">
          <Card className="h-full hover:border-primary transition-colors">
            <Flex alignItems="center" className="gap-3 mb-2">
              <span className="text-3xl">📊</span>
              <Title>Drop-off Analysis</Title>
            </Flex>
            <Text className="text-muted-foreground mb-4">
              Track user journeys and identify where users abandon key flows.
            </Text>
            <Badge color="violet">Funnel tracking</Badge>
          </Card>
        </Link>
      </div>

      {/* Error Trend Chart */}
      {errors?.byDay && errors.byDay.length > 0 && (
        <Card className="mt-6">
          <Title>Error Trend (Last 7 Days)</Title>
          <Text className="text-muted-foreground">Daily error counts across all pages</Text>

          <AreaChart
            className="mt-4 h-48"
            data={errors.byDay.map((d) => ({
              date: new Date(d.date).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              }),
              Errors: d.count,
            }))}
            index="date"
            categories={["Errors"]}
            colors={["rose"]}
            showAnimation
            valueFormatter={(v: number) => v.toString()}
          />
        </Card>
      )}

      {/* Top Error Pages & Recent Sessions */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Top Error Pages */}
        <Card>
          <Flex justifyContent="between" alignItems="center">
            <div>
              <Title>Top Error Pages</Title>
              <Text className="text-muted-foreground">Pages with most errors</Text>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/analytics/behavior/errors">View All</Link>
            </Button>
          </Flex>

          <div className="mt-4 space-y-2">
            {errors?.byPage.slice(0, 5).map((page, idx) => (
              <div
                key={page.page}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 flex items-center justify-center rounded-full bg-rose-500/20 text-rose-500 text-xs font-bold">
                    {idx + 1}
                  </span>
                  <Text className="font-mono text-sm truncate max-w-[200px]">{page.page}</Text>
                </div>
                <Badge color="rose">{page.count} errors</Badge>
              </div>
            )) || (
              <Text className="text-center py-4 text-muted-foreground">No errors recorded</Text>
            )}
          </div>
        </Card>

        {/* Recent Sessions */}
        <Card>
          <Flex justifyContent="between" alignItems="center">
            <div>
              <Title>Recent Sessions</Title>
              <Text className="text-muted-foreground">Latest user recordings</Text>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/analytics/behavior/sessions">View All</Link>
            </Button>
          </Flex>

          <div className="mt-4 space-y-2">
            {sessions?.sessions.slice(0, 5).map((session) => (
              <a
                key={session.id}
                href={session.replay_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{session.console_error_count > 0 ? "⚠️" : "▶️"}</span>
                  <div>
                    <Text className="font-medium text-sm">
                      {(session.person?.properties?.["username"] as string) ||
                        session.distinct_id.substring(0, 8)}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {formatDuration(session.recording_duration)} •{" "}
                      {new Date(session.start_time).toLocaleDateString()}
                    </Text>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {session.console_error_count > 0 && (
                    <Badge color="rose" size="sm">
                      {session.console_error_count} errors
                    </Badge>
                  )}
                  <Badge color="blue" size="sm">
                    {session.click_count} clicks
                  </Badge>
                </div>
              </a>
            )) || (
              <Text className="text-center py-4 text-muted-foreground">No sessions recorded</Text>
            )}
          </div>
        </Card>
      </div>

      {/* Error Types Distribution */}
      {errors?.byType && errors.byType.length > 0 && (
        <Card className="mt-6">
          <Title>Error Types</Title>
          <Text className="text-muted-foreground">Distribution of error categories</Text>

          <BarChart
            className="mt-4 h-48"
            data={errors.byType.map((t) => ({
              type: t.type.charAt(0).toUpperCase() + t.type.slice(1),
              Errors: t.count,
            }))}
            index="type"
            categories={["Errors"]}
            colors={["amber"]}
            showAnimation
            valueFormatter={(v: number) => v.toString()}
          />
        </Card>
      )}

      {/* Info Card */}
      <Card className="mt-6">
        <Title>About User Behavior Analytics</Title>
        <Text className="text-muted-foreground">
          This dashboard provides insights into how users interact with your application:
        </Text>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li>
            • <strong>Session Recordings</strong>: Watch replays of user sessions to understand
            behavior
          </li>
          <li>
            • <strong>Error Heatmap</strong>: Identify which pages have the most errors
          </li>
          <li>
            • <strong>Drop-off Analysis</strong>: Track conversion funnels and identify abandonment
            points
          </li>
          <li>
            • <strong>Click Tracking</strong>: See where users click most frequently
          </li>
        </ul>
        <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <Flex alignItems="center" className="gap-2">
            <span className="text-blue-500">💡</span>
            <Text className="text-sm text-blue-500">
              Tip: Click on a session to open the full replay in PostHog with timeline and events.
            </Text>
          </Flex>
        </div>
      </Card>
    </PageWrapper>
  );
}
