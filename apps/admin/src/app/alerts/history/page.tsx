"use client";

/**
 * Alert History Page
 *
 * View and manage historical alerts with filtering
 * and acknowledgement capabilities.
 */

import { PageWrapper } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiAny, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import { Badge } from "@tremor/react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

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

function formatDateTime(timestamp: number) {
  return new Date(timestamp).toLocaleString();
}

// =============================================================================
// Component
// =============================================================================

export default function AlertHistoryPage() {
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [ruleFilter, setRuleFilter] = useState<string>("all");
  const [acknowledgedFilter, setAcknowledgedFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const limit = 20;

  // Fetch alerts and rules
  const { alerts, total } = useConvexQuery(
    apiAny.alerts.history.getRecent,
    {
      severity: severityFilter !== "all" ? severityFilter : undefined,
      ruleId: ruleFilter !== "all" ? ruleFilter : undefined,
      acknowledged:
        acknowledgedFilter === "all"
          ? undefined
          : acknowledgedFilter === "acknowledged",
      limit,
      offset: page * limit,
    }
  ) ?? { alerts: [], total: 0 };

  const rules = useConvexQuery(apiAny.alerts.rules.getAll);
  const stats = useConvexQuery(apiAny.alerts.history.getStats);

  // Mutations
  const acknowledge = useConvexMutation(apiAny.alerts.history.acknowledge);
  const acknowledgeAll = useConvexMutation(apiAny.alerts.history.acknowledgeAll);

  const isLoading = alerts === undefined;
  const totalPages = Math.ceil(total / limit);

  async function handleAcknowledge(alertId: string) {
    try {
      await acknowledge({ alertId });
      toast.success("Alert acknowledged");
    } catch (error) {
      toast.error(`Failed to acknowledge alert: ${error}`);
    }
  }

  async function handleAcknowledgeAll() {
    if (!confirm("Are you sure you want to acknowledge all unacknowledged alerts?")) return;
    try {
      const result = await acknowledgeAll({
        severity: severityFilter !== "all" ? severityFilter : undefined,
        ruleId: ruleFilter !== "all" ? ruleFilter : undefined,
      });
      toast.success(result.message);
    } catch (error) {
      toast.error(`Failed to acknowledge alerts: ${error}`);
    }
  }

  function clearFilters() {
    setSeverityFilter("all");
    setRuleFilter("all");
    setAcknowledgedFilter("all");
    setPage(0);
  }

  const hasActiveFilters =
    severityFilter !== "all" || ruleFilter !== "all" || acknowledgedFilter !== "all";

  return (
    <PageWrapper
      title="Alert History"
      description="View and manage past alerts"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/alerts">Back to Dashboard</Link>
          </Button>
          {(stats?.unacknowledged ?? 0) > 0 && (
            <Button variant="outline" onClick={handleAcknowledgeAll}>
              Acknowledge All ({stats?.unacknowledged})
            </Button>
          )}
        </div>
      }
    >
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
            <CardDescription>Last 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <CardDescription>Immediate attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-500">
              {stats?.bySeverity?.critical ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
            <CardDescription>Should review</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">
              {stats?.bySeverity?.warning ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unacknowledged</CardTitle>
            <CardDescription>Pending</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {stats?.unacknowledged ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="w-48">
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Select value={ruleFilter} onValueChange={setRuleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Rule" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Rules</SelectItem>
                  {rules?.map((rule: any) => (
                    <SelectItem key={rule._id} value={rule._id}>
                      {rule.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Select value={acknowledgedFilter} onValueChange={setAcknowledgedFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                  <SelectItem value="unacknowledged">Unacknowledged</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Alerts Table */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Alert History</CardTitle>
          <CardDescription>
            Showing {alerts?.length ?? 0} of {total} alerts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : alerts && alerts.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Rule</TableHead>
                    <TableHead>Triggered</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((alert: any) => (
                    <TableRow
                      key={alert._id}
                      className={!alert.acknowledged ? "bg-muted/30" : ""}
                    >
                      <TableCell>
                        <span className="text-lg">{getSeverityIcon(alert.severity)}</span>
                      </TableCell>
                      <TableCell>{getSeverityBadge(alert.severity)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{alert.title}</p>
                          {alert.message && (
                            <p className="text-xs text-muted-foreground truncate max-w-xs">
                              {alert.message}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {alert.ruleName}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateTime(alert.triggeredAt)}
                      </TableCell>
                      <TableCell>
                        {alert.acknowledged ? (
                          <Badge color="emerald">Acknowledged</Badge>
                        ) : (
                          <Badge color="gray">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {!alert.acknowledged && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAcknowledge(alert._id)}
                          >
                            Ack
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Page {page + 1} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.max(0, page - 1))}
                      disabled={page === 0}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                      disabled={page >= totalPages - 1}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <div className="text-4xl mb-4">🎉</div>
              <p>No alerts found</p>
              {hasActiveFilters && (
                <Button variant="outline" className="mt-4" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>About Alert History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This page shows all alerts that have been triggered by your alert rules.
            Acknowledge alerts to mark them as reviewed.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>
              • <strong>Unacknowledged</strong>: Alerts that haven't been reviewed yet
            </li>
            <li>
              • <strong>Acknowledged</strong>: Alerts that have been marked as seen/handled
            </li>
            <li>
              • Use filters to find specific alerts by severity, rule, or status
            </li>
            <li>
              • Acknowledging an alert doesn't resolve the underlying issue
            </li>
          </ul>
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
