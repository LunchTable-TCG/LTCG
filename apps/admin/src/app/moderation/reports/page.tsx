"use client";

/**
 * User Reports Queue Page
 *
 * Lists all user reports with filtering and bulk actions.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdmin } from "@/contexts/AdminContext";
import { typedApi, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import type { Id } from "@convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ReportStatus = "pending" | "reviewed" | "resolved" | "dismissed";

const STATUS_BADGES: Record<
  ReportStatus,
  { variant: "default" | "secondary" | "destructive" | "outline"; label: string }
> = {
  pending: { variant: "destructive", label: "Pending" },
  reviewed: { variant: "secondary", label: "Reviewed" },
  resolved: { variant: "default", label: "Resolved" },
  dismissed: { variant: "outline", label: "Dismissed" },
};

export default function ReportsPage() {
  const router = useRouter();
  const { isAdmin } = useAdmin();

  const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("pending");
  const [search, setSearch] = useState("");
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set());

  const reportsData = useConvexQuery(
    typedApi.admin.reports.listReports,
    isAdmin
      ? {
          status: statusFilter === "all" ? undefined : statusFilter,
          search: search || undefined,
          limit: 50,
        }
      : "skip"
  );

  const stats = useConvexQuery(typedApi.admin.reports.getReportStats, isAdmin ? {} : "skip");

  const bulkUpdateStatus = useConvexMutation(typedApi.admin.reports.bulkUpdateReportStatus);

  const handleSelectAll = (checked: boolean) => {
    if (checked && reportsData?.reports) {
      setSelectedReports(new Set(reportsData.reports.map((r: { _id: string }) => r._id)));
    } else {
      setSelectedReports(new Set());
    }
  };

  const handleSelectReport = (reportId: string, checked: boolean) => {
    const newSelected = new Set(selectedReports);
    if (checked) {
      newSelected.add(reportId);
    } else {
      newSelected.delete(reportId);
    }
    setSelectedReports(newSelected);
  };

  const handleBulkAction = async (status: ReportStatus) => {
    if (selectedReports.size === 0) return;

    try {
      await bulkUpdateStatus({
        reportIds: Array.from(selectedReports) as Id<"userReports">[],
        status,
      });
      setSelectedReports(new Set());
    } catch (error) {
      console.error("Failed to update reports:", error);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Access denied</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">User Reports</h1>
        <p className="text-muted-foreground">Review and resolve player reports</p>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Reports</CardDescription>
              <CardTitle className="text-2xl">{stats.totalReports}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending</CardDescription>
              <CardTitle className="text-2xl text-red-500">{stats.byStatus.pending}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Reviewed</CardDescription>
              <CardTitle className="text-2xl text-yellow-500">{stats.byStatus.reviewed}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Today</CardDescription>
              <CardTitle className="text-2xl">{stats.reportsToday}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Avg Resolution</CardDescription>
              <CardTitle className="text-2xl">{stats.avgResolutionTimeHours}h</CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 gap-4">
              <Input
                placeholder="Search by username or reason..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-sm"
              />
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as ReportStatus | "all")}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedReports.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedReports.size} selected
                </span>
                <Button size="sm" variant="outline" onClick={() => handleBulkAction("reviewed")}>
                  Mark Reviewed
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkAction("dismissed")}>
                  Dismiss
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!reportsData ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : reportsData.reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <p className="text-muted-foreground">No reports found</p>
              {statusFilter === "pending" && (
                <p className="text-sm text-muted-foreground">🎉 No pending reports to review</p>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          reportsData.reports.length > 0 &&
                          selectedReports.size === reportsData.reports.length
                        }
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Reporter</TableHead>
                    <TableHead>Reported User</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(reportsData.reports as unknown as Array<{
                      _id: string;
                      reporterUsername: string;
                      reportedUsername: string;
                      reason: string;
                      status: ReportStatus;
                      createdAt: number;
                    }>).map((report) => (
                      <TableRow key={report._id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedReports.has(report._id)}
                            onCheckedChange={(checked) =>
                              handleSelectReport(report._id, checked as boolean)
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium">{report.reporterUsername}</TableCell>
                        <TableCell className="font-medium">{report.reportedUsername}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{report.reason}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_BADGES[report.status].variant}>
                            {STATUS_BADGES[report.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDistanceToNow(new Date(report.createdAt), {
                            addSuffix: true,
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => router.push(`/moderation/reports/${report._id}`)}
                          >
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>

              {reportsData.hasMore && (
                <div className="flex justify-center mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {reportsData.reports.length} of {reportsData.totalCount} reports
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
