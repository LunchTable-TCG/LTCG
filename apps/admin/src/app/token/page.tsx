"use client";

/**
 * Token Launch Control Dashboard
 *
 * Main dashboard showing launch countdown, status overview,
 * checklist progress, and approval status.
 */

import { MetricGrid, MetricTile } from "@/components/analytics";
import { PageWrapper } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { apiAny, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import { Badge } from "@tremor/react";
import Link from "next/link";
import { useEffect, useState } from "react";

// =============================================================================
// Types
// =============================================================================

type ScheduleStatus = "not_scheduled" | "scheduled" | "countdown" | "go" | "launched" | "aborted";

// =============================================================================
// Helper Functions
// =============================================================================

function getStatusColor(status: ScheduleStatus) {
  switch (status) {
    case "not_scheduled":
      return "gray";
    case "scheduled":
      return "blue";
    case "countdown":
      return "amber";
    case "go":
      return "emerald";
    case "launched":
      return "green";
    case "aborted":
      return "rose";
    default:
      return "gray";
  }
}

function getStatusLabel(status: ScheduleStatus) {
  switch (status) {
    case "not_scheduled":
      return "Not Scheduled";
    case "scheduled":
      return "Scheduled";
    case "countdown":
      return "Countdown Active";
    case "go":
      return "GO FOR LAUNCH";
    case "launched":
      return "Launched";
    case "aborted":
      return "Aborted";
    default:
      return status;
  }
}

function getCategoryIcon(category: string) {
  switch (category) {
    case "treasury":
      return "🏦";
    case "token":
      return "🪙";
    case "marketing":
      return "📢";
    case "technical":
      return "⚙️";
    case "team":
      return "👥";
    default:
      return "📋";
  }
}

// =============================================================================
// Countdown Component
// =============================================================================

function CountdownDisplay({ targetTime }: { targetTime: number }) {
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    function updateCountdown() {
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setCountdown({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [targetTime]);

  return (
    <div className="grid grid-cols-4 gap-4 text-center">
      <div className="rounded-lg bg-muted p-4">
        <div className="text-4xl font-bold tabular-nums">{countdown.days}</div>
        <div className="text-sm text-muted-foreground">Days</div>
      </div>
      <div className="rounded-lg bg-muted p-4">
        <div className="text-4xl font-bold tabular-nums">{countdown.hours.toString().padStart(2, "0")}</div>
        <div className="text-sm text-muted-foreground">Hours</div>
      </div>
      <div className="rounded-lg bg-muted p-4">
        <div className="text-4xl font-bold tabular-nums">{countdown.minutes.toString().padStart(2, "0")}</div>
        <div className="text-sm text-muted-foreground">Minutes</div>
      </div>
      <div className="rounded-lg bg-muted p-4">
        <div className="text-4xl font-bold tabular-nums">{countdown.seconds.toString().padStart(2, "0")}</div>
        <div className="text-sm text-muted-foreground">Seconds</div>
      </div>
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

export default function TokenLaunchPage() {
  // Fetch launch status data
  const launchStatus = useConvexQuery(apiAny.tokenLaunch.schedule.getStatus);
  const schedule = useConvexQuery(apiAny.tokenLaunch.schedule.getSchedule);
  const checklistSummary = useConvexQuery(apiAny.tokenLaunch.checklist.getSummary);
  const approvalSummary = useConvexQuery(apiAny.tokenLaunch.approvals.getSummary);

  // Mutations
  const markGo = useConvexMutation(apiAny.tokenLaunch.schedule.markGo);
  const abortLaunch = useConvexMutation(apiAny.tokenLaunch.schedule.abort);

  const isLoading = launchStatus === undefined;
  const scheduleStatus = (schedule?.status ?? "not_scheduled") as ScheduleStatus;

  // Calculate overall readiness
  const checklistProgress = checklistSummary?.overall
    ? Math.round(
        (checklistSummary.overall.requiredCompleted / checklistSummary.overall.required) * 100
      )
    : 0;
  const approvalsProgress = approvalSummary
    ? Math.round((approvalSummary.approvedCount / approvalSummary.requiredApprovals) * 100)
    : 0;

  const canMarkGo =
    launchStatus?.isReady &&
    (scheduleStatus === "countdown" || scheduleStatus === "scheduled");

  async function handleMarkGo() {
    if (!confirm("Are you sure you want to mark this launch as GO? This is the final approval.")) {
      return;
    }
    await markGo({});
  }

  async function handleAbort() {
    const reason = prompt("Enter abort reason:");
    if (!reason) return;
    await abortLaunch({ reason });
  }

  return (
    <PageWrapper
      title="Token Launch Control"
      description="Manage LunchTable Token (LTCG) launch on pump.fun"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/token/config">Configuration</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/token/launch">Checklist & Approvals</Link>
          </Button>
          {canMarkGo && (
            <Button onClick={handleMarkGo} className="bg-emerald-600 hover:bg-emerald-700">
              Mark GO
            </Button>
          )}
          {(scheduleStatus === "scheduled" ||
            scheduleStatus === "countdown" ||
            scheduleStatus === "go") && (
            <Button variant="destructive" onClick={handleAbort}>
              Abort Launch
            </Button>
          )}
        </div>
      }
    >
      {/* Status Banner */}
      <Card className="mb-6 border-2" style={{ borderColor: `var(--${getStatusColor(scheduleStatus)})` }}>
        <CardContent className="flex items-center justify-between p-6">
          <div className="flex items-center gap-4">
            <div className="text-4xl">
              {scheduleStatus === "launched" ? "🎉" : scheduleStatus === "go" ? "🚀" : "📋"}
            </div>
            <div>
              <h2 className="text-2xl font-bold">Launch Status</h2>
              <Badge color={getStatusColor(scheduleStatus)} size="lg">
                {getStatusLabel(scheduleStatus)}
              </Badge>
            </div>
          </div>
          {schedule?.scheduledAt && scheduleStatus !== "launched" && scheduleStatus !== "aborted" && (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Scheduled for</p>
              <p className="text-lg font-semibold">
                {new Date(schedule.scheduledAt).toLocaleString()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Countdown */}
      {schedule?.scheduledAt &&
        (scheduleStatus === "scheduled" || scheduleStatus === "countdown" || scheduleStatus === "go") && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-center">Time Until Launch</CardTitle>
            </CardHeader>
            <CardContent>
              <CountdownDisplay targetTime={schedule.scheduledAt} />
            </CardContent>
          </Card>
        )}

      {/* Key Metrics */}
      <MetricGrid columns={4}>
        <MetricTile
          title="Token Status"
          value={launchStatus?.tokenStatus ?? "draft"}
          icon={<span className="text-lg">🪙</span>}
          subtitle={launchStatus?.config?.name ?? "Not configured"}
          isLoading={isLoading}
        />
        <MetricTile
          title="Checklist Progress"
          value={`${checklistSummary?.overall?.requiredCompleted ?? 0}/${checklistSummary?.overall?.required ?? 0}`}
          icon={<span className="text-lg">✅</span>}
          subtitle="Required items"
          isLoading={isLoading}
        />
        <MetricTile
          title="Approvals"
          value={`${approvalSummary?.approvedCount ?? 0}/${approvalSummary?.requiredApprovals ?? 2}`}
          icon={<span className="text-lg">👍</span>}
          subtitle="Admin approvals"
          isLoading={isLoading}
        />
        <MetricTile
          title="Launch Ready"
          value={launchStatus?.isReady ? "Yes" : "No"}
          icon={<span className="text-lg">{launchStatus?.isReady ? "🟢" : "🔴"}</span>}
          subtitle={launchStatus?.canLaunch ? "Ready to launch" : "Prerequisites incomplete"}
          isLoading={isLoading}
        />
      </MetricGrid>

      {/* Progress Cards */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Checklist Progress */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Launch Checklist</CardTitle>
                <CardDescription>Required items must be completed</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/token/launch">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Overall Progress</span>
                    <span>{checklistProgress}%</span>
                  </div>
                  <Progress value={checklistProgress} className="h-2" />
                </div>

                {/* By Category */}
                {checklistSummary?.byCategory &&
                  Object.entries(checklistSummary.byCategory).map(([category, data]: [string, any]) => (
                    <div key={category} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        <span>{getCategoryIcon(category)}</span>
                        <span className="capitalize">{category}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {data.requiredCompleted}/{data.required} required
                        </span>
                        {data.requiredCompleted === data.required ? (
                          <Badge color="emerald">Done</Badge>
                        ) : (
                          <Badge color="amber">Pending</Badge>
                        )}
                      </div>
                    </div>
                  ))}
              </>
            )}
          </CardContent>
        </Card>

        {/* Approvals Progress */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Admin Approvals</CardTitle>
                <CardDescription>
                  {approvalSummary?.requiredApprovals ?? 2} approvals required for launch
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/token/launch">Manage</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Approval Progress</span>
                    <span>{Math.min(approvalsProgress, 100)}%</span>
                  </div>
                  <Progress value={Math.min(approvalsProgress, 100)} className="h-2" />
                </div>

                <div className="rounded-lg border p-4 text-center">
                  <div className="text-4xl font-bold">
                    {approvalSummary?.approvedCount ?? 0}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    of {approvalSummary?.requiredApprovals ?? 2} required approvals
                  </div>
                </div>

                {!approvalSummary?.hasCurrentUserApproved && (
                  <Button className="w-full" asChild>
                    <Link href="/token/launch">Submit Your Approval</Link>
                  </Button>
                )}
                {approvalSummary?.hasCurrentUserApproved && (
                  <div className="rounded-lg bg-emerald-50 p-3 text-center text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    You have approved this launch
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Token Configuration Summary */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Token Configuration</CardTitle>
              <CardDescription>LunchTable Token (LTCG) settings</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/token/config">Edit</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : launchStatus?.config ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="text-lg font-semibold">{launchStatus.config.name}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Symbol</p>
                <p className="text-lg font-semibold">{launchStatus.config.symbol}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge color={launchStatus.tokenStatus === "ready" ? "emerald" : "amber"}>
                  {launchStatus.tokenStatus}
                </Badge>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Configuration</p>
                <Badge color={launchStatus.config.ready ? "emerald" : "amber"}>
                  {launchStatus.config.ready ? "Complete" : "Incomplete"}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <p>No token configuration found</p>
              <Button variant="outline" className="mt-4" asChild>
                <Link href="/token/config">Create Configuration</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Launch preparation tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-auto flex-col gap-2 p-4" asChild>
              <Link href="/token/config">
                <span className="text-2xl">⚙️</span>
                <span>Edit Token Config</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 p-4" asChild>
              <Link href="/token/launch">
                <span className="text-2xl">✅</span>
                <span>View Checklist</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 p-4" asChild>
              <Link href="/treasury">
                <span className="text-2xl">🏦</span>
                <span>Treasury Setup</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 p-4" asChild>
              <Link href="/analytics/token">
                <span className="text-2xl">📈</span>
                <span>Token Analytics</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
