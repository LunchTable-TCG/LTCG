"use client";

/**
 * Integrity Monitoring Dashboard
 *
 * Displays results of 9 automated data integrity checks that run every 5 minutes.
 * Shows anomalies, affected records, and recent alert history.
 */

import { MetricGrid, MetricTile } from "@/components/analytics";
import { PageWrapper } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { typedApi, useConvexQuery } from "@/lib/convexHelpers";
import { Badge, Card, Flex, Text, Title } from "@tremor/react";
import Link from "next/link";

// =============================================================================
// Types
// =============================================================================

interface CheckResult {
  name: string;
  severity: "critical" | "warning" | "info";
  status: "ok" | "anomaly";
  count: number;
  details: string;
  items: Array<{ id: string; info: string }>;
}

interface RecentAlert {
  severity: string;
  title: string;
  message: string;
  createdAt: number;
}

// =============================================================================
// Helpers
// =============================================================================

function severityColor(severity: string) {
  switch (severity) {
    case "critical":
      return "rose";
    case "warning":
      return "amber";
    case "info":
      return "blue";
    default:
      return "gray";
  }
}

function statusColor(status: string) {
  return status === "ok" ? "emerald" : "rose";
}

function formatTimestamp(ts: number) {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// =============================================================================
// Component
// =============================================================================

export default function IntegrityPage() {
  const report = useConvexQuery(typedApi.monitoring.integrity.getIntegrityReport, {});

  const isLoading = report === undefined;

  return (
    <PageWrapper
      title="Data Integrity"
      description="Automated checks for data anomalies, race conditions, and corrupted state"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/analytics">Back to Analytics</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/alerts/history">Alert History</Link>
          </Button>
        </div>
      }
    >
      {/* Summary Metrics */}
      <MetricGrid columns={4}>
        <MetricTile
          title="Overall Status"
          value={report?.overallStatus?.toUpperCase() ?? "..."}
          icon={
            <span className="text-lg">
              {report?.overallStatus === "healthy"
                ? "✅"
                : report?.overallStatus === "warning"
                  ? "⚠️"
                  : report?.overallStatus === "critical"
                    ? "🚨"
                    : "⏳"}
            </span>
          }
          subtitle="System health"
          isLoading={isLoading}
        />
        <MetricTile
          title="Checks Run"
          value={report?.checksRun ?? 0}
          icon={<span className="text-lg">🔍</span>}
          subtitle="Total integrity checks"
          isLoading={isLoading}
        />
        <MetricTile
          title="Anomalies"
          value={report?.anomalyCount ?? 0}
          icon={<span className="text-lg">⚡</span>}
          subtitle="Issues detected"
          isLoading={isLoading}
        />
        <MetricTile
          title="Critical"
          value={report?.criticalCount ?? 0}
          icon={<span className="text-lg">🔴</span>}
          subtitle="Require attention"
          isLoading={isLoading}
        />
      </MetricGrid>

      {/* Check Results Grid */}
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 9  }, (_, i) => i).map((i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-4 w-32 rounded bg-muted" />
                <div className="mt-2 h-3 w-48 rounded bg-muted" />
              </Card>
            ))
          : (report?.checks as CheckResult[] | undefined)?.map((check) => (
              <Card key={check.name}>
                <Flex justifyContent="between" alignItems="start">
                  <div className="flex-1">
                    <Title className="text-sm">{check.name}</Title>
                    <Text className="mt-1 text-muted-foreground text-xs">{check.details}</Text>
                  </div>
                  <div className="flex gap-1.5 ml-2 shrink-0">
                    <Badge size="xs" color={severityColor(check.severity)}>
                      {check.severity}
                    </Badge>
                    <Badge size="xs" color={statusColor(check.status)}>
                      {check.status}
                    </Badge>
                  </div>
                </Flex>

                {check.status === "anomaly" && check.items.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {check.items.slice(0, 5).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-2 rounded bg-muted/50 px-2.5 py-1.5 text-xs"
                      >
                        <code className="shrink-0 text-muted-foreground font-mono">
                          {item.id.length > 20 ? `${item.id.slice(0, 20)}...` : item.id}
                        </code>
                        <span className="text-muted-foreground">{item.info}</span>
                      </div>
                    ))}
                    {check.items.length > 5 && (
                      <Text className="text-xs text-muted-foreground pl-2">
                        +{check.items.length - 5} more
                      </Text>
                    )}
                  </div>
                )}
              </Card>
            ))}
      </div>

      {/* Recent Alerts */}
      <Card className="mt-6">
        <Title>Recent Integrity Alerts</Title>
        <Text className="text-muted-foreground">
          Alert history from automated integrity checks (last 10)
        </Text>

        {isLoading ? (
          <div className="mt-4 space-y-3">
            {Array.from({ length: 3  }, (_, i) => i).map((i) => (
              <div key={i} className="animate-pulse h-10 rounded bg-muted" />
            ))}
          </div>
        ) : (report?.recentAlerts as RecentAlert[] | undefined)?.length === 0 ? (
          <div className="mt-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-4 text-center">
            <Text className="text-emerald-500 font-medium">No alerts recorded</Text>
            <Text className="text-xs text-muted-foreground mt-1">
              All integrity checks have been passing
            </Text>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {(report?.recentAlerts as RecentAlert[] | undefined)?.map((alert, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5"
              >
                <Badge size="xs" color={severityColor(alert.severity)}>
                  {alert.severity}
                </Badge>
                <div className="flex-1 min-w-0">
                  <Text className="text-sm font-medium truncate">{alert.title}</Text>
                  <Text className="text-xs text-muted-foreground truncate">{alert.message}</Text>
                </div>
                <Text className="text-xs text-muted-foreground shrink-0">
                  {formatTimestamp(alert.createdAt)}
                </Text>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Last Checked */}
      {report?.lastCheckedAt && (
        <div className="mt-4 text-center">
          <Text className="text-xs text-muted-foreground">
            Last checked: {formatTimestamp(report.lastCheckedAt)} (live query - refreshes
            automatically)
          </Text>
        </div>
      )}

      {/* Info Card */}
      <Card className="mt-6">
        <Title>About Integrity Monitoring</Title>
        <Text className="text-muted-foreground">
          Automated checks run every 5 minutes via cron to detect data anomalies.
        </Text>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li>
            <strong>Negative Balances</strong> (critical): Players with gold or gems below zero
          </li>
          <li>
            <strong>Currency Conservation</strong> (critical): Gold balance + spent must equal
            lifetime earned
          </li>
          <li>
            <strong>Duplicate Rewards</strong> (warning): Same referenceId on multiple reward
            transactions
          </li>
          <li>
            <strong>Orphaned Friendships</strong> (warning): Accepted friendships missing reciprocal
            record
          </li>
          <li>
            <strong>Duplicate Sessions</strong> (warning): Users with multiple active streaming
            sessions
          </li>
          <li>
            <strong>Stuck Sessions</strong> (info): Sessions active for over 24 hours
          </li>
          <li>
            <strong>Achievement Over-grants</strong> (warning): Achievements unlocked without
            sufficient progress
          </li>
          <li>
            <strong>Stale Requests</strong> (info): Friend requests pending over 90 days
          </li>
          <li>
            <strong>Story Mismatch</strong> (warning): Completion count inconsistent with won
            attempts
          </li>
        </ul>
      </Card>
    </PageWrapper>
  );
}
