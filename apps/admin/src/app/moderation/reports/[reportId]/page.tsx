"use client";

/**
 * Report Detail Page
 *
 * View report details and take moderation actions.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useAdmin } from "@/contexts/AdminContext";
import { typedApi, useMutation } from "@/lib/convexHelpers";
import type { Id } from "@convex/_generated/dataModel";
import { useTypedQuery } from "@ltcg/core/react";
import type { FunctionReference } from "convex/server";
import { format, formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

type ReportStatus = "pending" | "reviewed" | "resolved" | "dismissed";
type ModerationAction = "dismiss" | "warn" | "mute" | "suspend" | "ban";

const STATUS_BADGES: Record<
  ReportStatus,
  { variant: "default" | "secondary" | "destructive" | "outline"; label: string }
> = {
  pending: { variant: "destructive", label: "Pending" },
  reviewed: { variant: "secondary", label: "Reviewed" },
  resolved: { variant: "default", label: "Resolved" },
  dismissed: { variant: "outline", label: "Dismissed" },
};

const ACTION_DESCRIPTIONS: Record<ModerationAction, string> = {
  dismiss: "Close report without action",
  warn: "Send a warning to the user",
  mute: "Temporarily prevent user from chatting",
  suspend: "Temporarily suspend user account",
  ban: "Permanently ban user account",
};

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAdmin } = useAdmin();
  const reportId = params.reportId as string;

  const [selectedAction, setSelectedAction] = useState<ModerationAction>("dismiss");
  const [notes, setNotes] = useState("");
  const [muteDuration, setMuteDuration] = useState(24);
  const [suspendDuration, setSuspendDuration] = useState(7);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use useTypedQuery from @ltcg/core/react to avoid TS2589 deep type instantiation
  const getReportQuery = typedApi.admin.reports.getReport as FunctionReference<"query">;
  const reportQueryArgs = isAdmin ? { reportId: reportId as Id<"userReports"> } : "skip";
  const report = useTypedQuery(getReportQuery, reportQueryArgs);

  // Cast mutations to any - typedApi has wrong table name (playerReports vs userReports)
  const updateStatusMutation = typedApi.admin.reports.updateReportStatus;
  // biome-ignore lint/suspicious/noExplicitAny: typedApi has incorrect table name type
  const updateStatus = useMutation(updateStatusMutation) as any;
  const resolveWithActionMutation = typedApi.admin.reports.resolveReportWithAction;
  // biome-ignore lint/suspicious/noExplicitAny: typedApi has incorrect table name type
  const resolveWithAction = useMutation(resolveWithActionMutation) as any;

  const handleStatusChange = async (status: ReportStatus) => {
    try {
      await updateStatus({ reportId: reportId as Id<"userReports">, status });
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const handleResolve = async () => {
    setIsSubmitting(true);
    try {
      await resolveWithAction({
        reportId: reportId as Id<"userReports">,
        action: selectedAction,
        notes: notes || undefined,
        muteDurationHours: selectedAction === "mute" ? muteDuration : undefined,
        suspendDurationDays: selectedAction === "suspend" ? suspendDuration : undefined,
      });
      router.push("/moderation/reports");
    } catch (error) {
      console.error("Failed to resolve report:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Access denied</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const isResolved = report.status === "resolved" || report.status === "dismissed";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/moderation/reports"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back to Reports
            </Link>
          </div>
          <h1 className="text-3xl font-bold">Report Details</h1>
          <p className="text-muted-foreground">Report against {report.reportedUsername}</p>
        </div>
        <Badge
          variant={STATUS_BADGES[report.status as ReportStatus].variant}
          className="text-lg px-4 py-1"
        >
          {STATUS_BADGES[report.status as ReportStatus].label}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Report Info */}
          <Card>
            <CardHeader>
              <CardTitle>Report Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground">Reporter</Label>
                  <p className="font-medium">
                    {report.reporter ? (
                      <Link
                        href={`/players/${report.reporter._id}`}
                        className="text-primary hover:underline"
                      >
                        {report.reporter.username}
                      </Link>
                    ) : (
                      report.reporterUsername
                    )}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Reported User</Label>
                  <p className="font-medium">
                    {report.reported ? (
                      <Link
                        href={`/players/${report.reported._id}`}
                        className="text-primary hover:underline"
                      >
                        {report.reported.username}
                      </Link>
                    ) : (
                      report.reportedUsername
                    )}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Reason</Label>
                <p className="mt-1 p-3 bg-muted rounded-md">{report.reason}</p>
              </div>

              {"details" in report && Boolean(report.details) && (
                <div>
                  <Label className="text-muted-foreground">Additional Details</Label>
                  <p className="mt-1 p-3 bg-muted rounded-md whitespace-pre-wrap">
                    {String(report.details)}
                  </p>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground">Submitted</Label>
                  <p className="font-medium">{format(new Date(report.createdAt), "PPpp")}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
                  </p>
                </div>
                {report.reviewedAt && report.reviewer && (
                  <div>
                    <Label className="text-muted-foreground">Reviewed By</Label>
                    <p className="font-medium">{report.reviewer.username}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(report.reviewedAt), { addSuffix: true })}
                    </p>
                  </div>
                )}
              </div>

              {report.notes && (
                <div>
                  <Label className="text-muted-foreground">Moderator Notes</Label>
                  <p className="mt-1 p-3 bg-muted rounded-md whitespace-pre-wrap">{report.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Take Action */}
          {!isResolved && (
            <Card>
              <CardHeader>
                <CardTitle>Take Action</CardTitle>
                <CardDescription>Choose an action to resolve this report</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Action</Label>
                  <Select
                    value={selectedAction}
                    onValueChange={(v) => setSelectedAction(v as ModerationAction)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dismiss">Dismiss Report</SelectItem>
                      <SelectItem value="warn">Warn User</SelectItem>
                      <SelectItem value="mute">Mute User</SelectItem>
                      <SelectItem value="suspend">Suspend User</SelectItem>
                      <SelectItem value="ban">Ban User</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">
                    {ACTION_DESCRIPTIONS[selectedAction]}
                  </p>
                </div>

                {selectedAction === "mute" && (
                  <div>
                    <Label>Mute Duration (hours)</Label>
                    <Input
                      type="number"
                      value={muteDuration}
                      onChange={(e) => setMuteDuration(Number(e.target.value))}
                      min={1}
                      max={720}
                      className="mt-1"
                    />
                  </div>
                )}

                {selectedAction === "suspend" && (
                  <div>
                    <Label>Suspension Duration (days)</Label>
                    <Input
                      type="number"
                      value={suspendDuration}
                      onChange={(e) => setSuspendDuration(Number(e.target.value))}
                      min={1}
                      max={365}
                      className="mt-1"
                    />
                  </div>
                )}

                <div>
                  <Label>Notes (optional)</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes about this action..."
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleResolve}
                    disabled={isSubmitting}
                    variant={selectedAction === "ban" ? "destructive" : "default"}
                  >
                    {isSubmitting
                      ? "Processing..."
                      : `${selectedAction === "dismiss" ? "Dismiss" : "Apply"} ${selectedAction !== "dismiss" ? selectedAction.charAt(0).toUpperCase() + selectedAction.slice(1) : ""}`}
                  </Button>
                  {report.status === "pending" && (
                    <Button variant="outline" onClick={() => handleStatusChange("reviewed")}>
                      Mark as Reviewed
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Reported User Info */}
          {report.reported && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Reported User</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-muted-foreground text-xs">Username</Label>
                  <p className="font-medium">{report.reported.username}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Account Status</Label>
                  <p>
                    <Badge
                      variant={
                        report.reported.accountStatus === "active"
                          ? "default"
                          : report.reported.accountStatus === "suspended"
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {report.reported.accountStatus}
                    </Badge>
                  </p>
                </div>
                <Separator />
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href={`/players/${report.reported._id}`}>View Player Profile</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Other Reports */}
          {report.otherReportsCount > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Other Reports</CardTitle>
                <CardDescription>
                  {report.otherReportsCount} other report(s) against this user
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {report.otherReports.slice(0, 5).map(
                    (r: {
                      _id: string;
                      reason: string;
                      status: ReportStatus;
                      createdAt: number;
                    }) => (
                      <div key={r._id} className="p-2 border rounded-md text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant={STATUS_BADGES[r.status].variant} className="text-xs">
                            {STATUS_BADGES[r.status].label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="truncate">{r.reason}</p>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Moderation History */}
          {report.moderationHistory && report.moderationHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Moderation History</CardTitle>
                <CardDescription>Previous actions against this user</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {report.moderationHistory.map((action: {
                    _id: string;
                    actionType: string;
                    createdAt: number;
                    reason?: string;
                    moderatorName?: string;
                  }) => (
                    <div key={action._id} className="p-2 border rounded-md text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="text-xs capitalize">
                          {action.actionType}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(action.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="truncate text-muted-foreground">{action.reason ?? ""}</p>
                      {"moderatorName" in action && Boolean(action.moderatorName) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          by {String(action.moderatorName)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
