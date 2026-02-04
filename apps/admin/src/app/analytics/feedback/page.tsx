"use client";

/**
 * Alpha Feedback Analytics Page
 *
 * Comprehensive analytics for bug reports and feature requests during alpha testing.
 * Shows submission trends, resolution metrics, and top reporters.
 */

import { ChartCard, MetricGrid, MetricTile } from "@/components/analytics";
import { PageWrapper } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { typedApi, useConvexQuery } from "@/lib/convexHelpers";
import { AreaChart, Badge, BarChart, Card, DonutChart, Flex, Text, Title } from "@tremor/react";
import Link from "next/link";

// =============================================================================
// Component
// =============================================================================

export default function FeedbackAnalyticsPage() {
  // Fetch analytics data
  const analytics = useConvexQuery(typedApi.feedback.feedback.getAnalytics, { days: 30 });
  const stats = useConvexQuery(typedApi.feedback.feedback.getStats);

  const isLoading = analytics === undefined || stats === undefined;

  // Transform trend data for charts
  const trendData =
    analytics?.trend?.map(
      (day: { date: string; bugs: number; features: number; total: number }) => ({
        date: new Date(day.date).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
        "Bug Reports": day.bugs,
        "Feature Requests": day.features,
        Total: day.total,
      })
    ) ?? [];

  // Type distribution for donut chart
  const typeDistribution = [
    { name: "Bug Reports", value: analytics?.summary?.bugs ?? 0 },
    { name: "Feature Requests", value: analytics?.summary?.features ?? 0 },
  ];

  // Status distribution for bar chart
  const statusData = stats
    ? [
        { status: "New", count: stats.byStatus.new },
        { status: "Triaged", count: stats.byStatus.triaged },
        { status: "In Progress", count: stats.byStatus.in_progress },
        { status: "Resolved", count: stats.byStatus.resolved },
        { status: "Closed", count: stats.byStatus.closed },
      ]
    : [];

  // Priority distribution
  const priorityData = stats
    ? [
        { priority: "Critical", count: stats.byPriority.critical },
        { priority: "High", count: stats.byPriority.high },
        { priority: "Medium", count: stats.byPriority.medium },
        { priority: "Low", count: stats.byPriority.low },
        { priority: "Unset", count: stats.byPriority.unset },
      ]
    : [];

  // Format resolution time
  const formatTime = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)} min`;
    if (hours < 24) return `${hours.toFixed(1)} hr`;
    return `${Math.round(hours / 24)} days`;
  };

  return (
    <PageWrapper
      title={
        <Flex alignItems="center" className="gap-2">
          <span>Alpha Feedback Analytics</span>
          <Badge color="amber">Alpha Testing</Badge>
        </Flex>
      }
      description="Bug reports and feature requests from alpha testers"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/analytics">← Back to Overview</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/feedback">Manage Feedback</Link>
          </Button>
        </div>
      }
    >
      {/* Key Metrics */}
      <MetricGrid columns={5}>
        <MetricTile
          title="Total Feedback"
          value={analytics?.summary?.total ?? 0}
          icon={<span className="text-lg">📝</span>}
          isLoading={isLoading}
        />
        <MetricTile
          title="Bug Reports"
          value={analytics?.summary?.bugs ?? 0}
          icon={<span className="text-lg">🐛</span>}
          delta={
            analytics?.summary?.total
              ? `${Math.round((analytics.summary.bugs / analytics.summary.total) * 100)}%`
              : undefined
          }
          deltaType="unchanged"
          isLoading={isLoading}
        />
        <MetricTile
          title="Feature Requests"
          value={analytics?.summary?.features ?? 0}
          icon={<span className="text-lg">💡</span>}
          isLoading={isLoading}
        />
        <MetricTile
          title="Open Items"
          value={analytics?.summary?.open ?? 0}
          icon={<span className="text-lg">📋</span>}
          subtitle="Needs attention"
          isLoading={isLoading}
        />
        <MetricTile
          title="Last 24h"
          value={analytics?.summary?.last24h ?? 0}
          icon={<span className="text-lg">⏰</span>}
          subtitle={`${analytics?.summary?.last7d ?? 0} in last 7 days`}
          isLoading={isLoading}
        />
      </MetricGrid>

      {/* Charts Row */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Submission Trend */}
        <ChartCard
          title="Submission Trend"
          description="Daily feedback submissions over the last 14 days"
          isLoading={isLoading}
        >
          <AreaChart
            className="h-full"
            data={trendData}
            index="date"
            categories={["Bug Reports", "Feature Requests"]}
            colors={["rose", "blue"]}
            showAnimation
            showLegend
            valueFormatter={(v: number) => v.toString()}
          />
        </ChartCard>

        {/* Type Distribution */}
        <ChartCard
          title="Feedback Type Distribution"
          description="Bug reports vs feature requests"
          isLoading={isLoading}
        >
          <DonutChart
            className="h-full"
            data={typeDistribution}
            category="value"
            index="name"
            colors={["rose", "blue"]}
            showAnimation
            valueFormatter={(v: number) => v.toString()}
          />
          <Flex justifyContent="center" className="mt-4 gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500" />
              <Text className="text-sm">Bugs: {analytics?.summary?.bugs ?? 0}</Text>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <Text className="text-sm">Features: {analytics?.summary?.features ?? 0}</Text>
            </div>
          </Flex>
        </ChartCard>
      </div>

      {/* Resolution & Status Row */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Resolution Metrics */}
        <Card>
          <Title>Resolution Metrics</Title>
          <Text className="text-muted-foreground">How quickly feedback is being addressed</Text>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-center">
              <Text className="text-3xl font-bold text-emerald-500">
                {analytics?.resolution?.resolutionRate ?? 0}%
              </Text>
              <Text className="text-sm text-muted-foreground">Resolution Rate</Text>
            </div>
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 text-center">
              <Text className="text-3xl font-bold text-blue-500">
                {formatTime(analytics?.resolution?.avgTimeHours ?? 0)}
              </Text>
              <Text className="text-sm text-muted-foreground">Avg Resolution Time</Text>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-muted/30">
            <Flex justifyContent="between" className="text-sm">
              <Text className="text-muted-foreground">Total Resolved</Text>
              <Text className="font-medium">{analytics?.summary?.resolved ?? 0}</Text>
            </Flex>
            <Flex justifyContent="between" className="text-sm mt-2">
              <Text className="text-muted-foreground">Open Items</Text>
              <Text className="font-medium">{analytics?.summary?.open ?? 0}</Text>
            </Flex>
          </div>
        </Card>

        {/* Status Breakdown */}
        <Card>
          <Title>Status Breakdown</Title>
          <Text className="text-muted-foreground">Current state of all feedback</Text>

          <BarChart
            className="mt-4 h-48"
            data={statusData}
            index="status"
            categories={["count"]}
            colors={["violet"]}
            showAnimation
            valueFormatter={(v: number) => v.toString()}
          />
        </Card>
      </div>

      {/* Priority & Top Reporters */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Priority Breakdown */}
        <Card>
          <Title>Priority Distribution</Title>
          <Text className="text-muted-foreground">Feedback severity levels</Text>

          <BarChart
            className="mt-4 h-48"
            data={priorityData}
            index="priority"
            categories={["count"]}
            colors={["amber"]}
            showAnimation
            valueFormatter={(v: number) => v.toString()}
          />

          <div className="mt-4 flex flex-wrap gap-2">
            <Badge color="rose">Critical: {stats?.byPriority.critical ?? 0}</Badge>
            <Badge color="amber">High: {stats?.byPriority.high ?? 0}</Badge>
            <Badge color="yellow">Medium: {stats?.byPriority.medium ?? 0}</Badge>
            <Badge color="emerald">Low: {stats?.byPriority.low ?? 0}</Badge>
            <Badge color="gray">Unset: {stats?.byPriority.unset ?? 0}</Badge>
          </div>
        </Card>

        {/* Top Reporters */}
        <Card>
          <Flex justifyContent="between" alignItems="center">
            <div>
              <Title>Top Reporters</Title>
              <Text className="text-muted-foreground">Most active alpha testers</Text>
            </div>
            <Badge color="amber">Alpha Heroes</Badge>
          </Flex>

          <div className="mt-4 space-y-2">
            {analytics?.topReporters && analytics.topReporters.length > 0 ? (
              analytics.topReporters
                .slice(0, 5)
                .map(
                  (
                    reporter: { username: string; count: number; bugs: number; features: number },
                    idx: number
                  ) => (
                    <div
                      key={reporter.username}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 flex items-center justify-center rounded-full bg-amber-500/20 text-amber-500 text-xs font-bold">
                          {idx + 1}
                        </span>
                        <div>
                          <Text className="font-medium">{reporter.username}</Text>
                          <Text className="text-xs text-muted-foreground">
                            {reporter.bugs} bugs • {reporter.features} features
                          </Text>
                        </div>
                      </div>
                      <Badge color="blue">{reporter.count} total</Badge>
                    </div>
                  )
                )
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Text>No feedback submitted yet.</Text>
                <Text className="text-sm">Alpha testers will appear here.</Text>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Attachment Stats */}
      <Card className="mt-6">
        <Title>Attachment Statistics</Title>
        <Text className="text-muted-foreground">
          Screenshots and recordings included with feedback
        </Text>

        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-violet-500/10 border border-violet-500/30 text-center">
            <Text className="text-3xl font-bold text-violet-500">
              {analytics?.attachments?.screenshotRate ?? 0}%
            </Text>
            <Text className="text-sm text-muted-foreground">Include Screenshots</Text>
            <Text className="text-xs text-muted-foreground mt-1">
              {analytics?.attachments?.withScreenshot ?? 0} total
            </Text>
          </div>
          <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-center">
            <Text className="text-3xl font-bold text-cyan-500">
              {analytics?.attachments?.withRecording ?? 0}
            </Text>
            <Text className="text-sm text-muted-foreground">With Recordings</Text>
          </div>
          <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-center">
            <Text className="text-3xl font-bold text-emerald-500">
              {(analytics?.attachments?.withScreenshot ?? 0) +
                (analytics?.attachments?.withRecording ?? 0)}
            </Text>
            <Text className="text-sm text-muted-foreground">Total Attachments</Text>
          </div>
        </div>
      </Card>

      {/* Info Card */}
      <Card className="mt-6">
        <Flex alignItems="center" className="gap-2">
          <Badge color="amber">Alpha Testing</Badge>
          <Title className="ml-2">About Alpha Feedback</Title>
        </Flex>
        <Text className="text-muted-foreground mt-2">
          This dashboard tracks bug reports and feature requests from alpha testers. Key metrics
          include:
        </Text>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li>
            • <strong>Bug Reports</strong>: Issues reported by testers that need to be fixed
          </li>
          <li>
            • <strong>Feature Requests</strong>: Suggestions for new functionality
          </li>
          <li>
            • <strong>Resolution Rate</strong>: Percentage of feedback that has been addressed
          </li>
          <li>
            • <strong>Resolution Time</strong>: Average time from submission to resolution
          </li>
          <li>
            • <strong>Top Reporters</strong>: Most active testers helping improve the game
          </li>
        </ul>
        <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <Flex alignItems="center" className="gap-2">
            <span className="text-amber-500">💡</span>
            <Text className="text-sm text-amber-500">
              Tip: Use the Feedback Management page to triage and respond to feedback in a
              kanban-style board.
            </Text>
          </Flex>
        </div>
      </Card>
    </PageWrapper>
  );
}
