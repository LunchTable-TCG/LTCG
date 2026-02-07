"use client";

/**
 * Alerts Dashboard Page
 *
 * Overview of system alerts, unread counts, recent alerts,
 * and quick navigation to rules, channels, and history.
 */

import { MetricGrid, MetricTile } from "@/components/analytics";
import { PageWrapper } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { typedApi, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import type { Id } from "@convex/_generated/dataModel";
import type { Doc } from "@convex/_generated/dataModel";
import { Badge } from "@tremor/react";
import Link from "next/link";
import { toast } from "sonner";

// =============================================================================
// Types
// =============================================================================

/** Enriched alert with rule information from the query */
interface EnrichedAlert extends Doc<"alertHistory"> {
  ruleName: string;
  ruleType?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

function getSeverityBadge(severity: string) {
  switch (severity) {
    case "critical":
      return <Badge color="rose">Critical</Badge>;
    case "warning":
      return <Badge color="amber">Warning</Badge>;
    case "info":
      return <Badge color="blue">Info</Badge>;
    default:
      return <Badge>{severity}</Badge>;
  }
}

function getSeverityIcon(severity: string) {
  switch (severity) {
    case "critical":
      return "🚨";
    case "warning":
      return "⚠️";
    case "info":
      return "ℹ️";
    default:
      return "🔔";
  }
}

function formatTimeAgo(timestamp: number) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// =============================================================================
// Component
// =============================================================================

export default function AlertsDashboardPage() {
  // Fetch alerts data - extract queries to avoid TS2589 deep type instantiation
  const getStatsQuery = typedApi.alerts.history.getStats;
  const stats = useConvexQuery(getStatsQuery, {});
  const getRecentQuery = typedApi.alerts.history.getRecent;
  const recentAlerts = useConvexQuery(getRecentQuery, { limit: 10 }) as EnrichedAlert[] | undefined;
  const getUnreadCountQuery = typedApi.alerts.notifications.getUnreadCount;
  const unreadCount = useConvexQuery(getUnreadCountQuery, {});

  // Mutations
  const acknowledge = useConvexMutation(typedApi.alerts.history.acknowledge);
  const acknowledgeAll = useConvexMutation(typedApi.alerts.history.acknowledgeAll);
  const markAllAsRead = useConvexMutation(typedApi.alerts.notifications.markAllAsRead);

  const isLoading = stats === undefined;

  async function handleAcknowledge(alertId: Id<"alertHistory">) {
    try {
      await acknowledge({ alertId });
      toast.success("Alert acknowledged");
    } catch (error) {
      toast.error(`Failed to acknowledge alert: ${error}`);
    }
  }

  async function handleAcknowledgeAll() {
    try {
      await acknowledgeAll({});
      toast.success("All alerts acknowledged");
    } catch (error) {
      toast.error(`Failed to acknowledge alerts: ${error}`);
    }
  }

  async function handleMarkAllAsRead() {
    try {
      await markAllAsRead({});
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error(`Failed to mark notifications as read: ${error}`);
    }
  }

  return (
    <PageWrapper
      title="Alerts Dashboard"
      description="Monitor system alerts and notifications"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/alerts/rules">Manage Rules</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/alerts/channels">Channels</Link>
          </Button>
          <Button asChild>
            <Link href="/alerts/history">View History</Link>
          </Button>
        </div>
      }
    >
      {/* Key Metrics */}
      <MetricGrid columns={4}>
        <MetricTile
          title="Unread Notifications"
          value={unreadCount ?? 0}
          icon={<span className="text-lg">🔔</span>}
          subtitle="Awaiting attention"
          isLoading={isLoading}
          delta={(unreadCount ?? 0) > 0 ? `${unreadCount} unread` : undefined}
          deltaType={(unreadCount ?? 0) > 0 ? "increase" : "unchanged"}
        />
        <MetricTile
          title="Critical Alerts"
          value={stats?.bySeverity?.critical ?? 0}
          icon={<span className="text-lg">🚨</span>}
          subtitle="Require immediate action"
          isLoading={isLoading}
        />
        <MetricTile
          title="Warnings"
          value={stats?.bySeverity?.warning ?? 0}
          icon={<span className="text-lg">⚠️</span>}
          subtitle="Should be reviewed"
          isLoading={isLoading}
        />
        <MetricTile
          title="Unacknowledged"
          value={stats?.unacknowledged ?? 0}
          icon={<span className="text-lg">📋</span>}
          subtitle="Pending acknowledgement"
          isLoading={isLoading}
        />
      </MetricGrid>

      {/* Quick Actions */}
      <div className="mt-6 grid gap-6 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
            <CardDescription>Last 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalAlerts ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Acknowledged</CardTitle>
            <CardDescription>Handled alerts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">{stats?.acknowledged ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Info Alerts</CardTitle>
            <CardDescription>Informational</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{stats?.bySeverity?.info ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Per Day</CardTitle>
            <CardDescription>Alert frequency</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.avgPerDay?.toFixed(1) ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Alerts and Quick Actions */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Recent Alerts */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Alerts</CardTitle>
              <CardDescription>Latest system alerts</CardDescription>
            </div>
            <div className="flex gap-2">
              {(stats?.unacknowledged ?? 0) > 0 && (
                <Button variant="outline" size="sm" onClick={handleAcknowledgeAll}>
                  Acknowledge All
                </Button>
              )}
              <Button variant="outline" size="sm" asChild>
                <Link href="/alerts/history">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))}
              </div>
            ) : (recentAlerts?.length ?? 0) > 0 ? (
              <div className="space-y-3">
                {recentAlerts?.map((alert) => (
                  <div
                    key={alert._id}
                    className={`flex items-center justify-between rounded-lg border p-3 ${
                      !alert.acknowledgedBy ? "bg-muted/50" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        {getSeverityIcon(alert.severity)}
                      </div>
                      <div>
                        <p className="font-medium">{alert.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatTimeAgo(alert.createdAt)} • {alert.ruleName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getSeverityBadge(alert.severity)}
                      {!alert.acknowledgedBy && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAcknowledge(alert._id)}
                        >
                          Ack
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <div className="text-4xl mb-2">🎉</div>
                <p>No recent alerts</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common operations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/alerts/rules">
                <span className="mr-2">📋</span>
                Manage Alert Rules
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/alerts/channels">
                <span className="mr-2">📡</span>
                Configure Channels
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/alerts/history">
                <span className="mr-2">📜</span>
                View Alert History
              </Link>
            </Button>
            {(unreadCount ?? 0) > 0 && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleMarkAllAsRead}
              >
                <span className="mr-2">✓</span>
                Mark All as Read
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alert Statistics by Rule */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>About Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The alerts system monitors your platform for important events and conditions. Configure
            rules to trigger alerts based on specific criteria, and set up notification channels to
            receive alerts via in-app notifications, Slack, or Discord.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>
              • <strong>Rules</strong>: Define conditions that trigger alerts (e.g., high error
              rates, suspicious activity)
            </li>
            <li>
              • <strong>Channels</strong>: Configure where alerts are sent (in-app, Slack, Discord)
            </li>
            <li>
              • <strong>History</strong>: Review all past alerts and their acknowledgement status
            </li>
            <li>
              • <strong>Severity Levels</strong>: Critical (immediate action), Warning (review
              needed), Info (awareness)
            </li>
          </ul>
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
