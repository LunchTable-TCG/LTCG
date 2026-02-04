"use client";

/**
 * Audit Log Page
 *
 * View all admin actions with filtering by target type and action.
 */

import { DataTable } from "@/components/data";
import { PageWrapper } from "@/components/layout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, useConvexQuery } from "@/lib/convexHelpers";
import type { ColumnDef } from "@/types";
import { Badge, Card, Text, Title } from "@tremor/react";
import { useState } from "react";

// =============================================================================
// Types
// =============================================================================

interface AuditLogEntry {
  _id: string;
  _creationTime: number;
  adminId: string;
  adminUsername?: string;
  action: string;
  targetUserId?: string;
  targetUsername?: string;
  targetEmail?: string;
  metadata?: unknown;
  timestamp: number;
  ipAddress?: string;
  success: boolean;
  errorMessage?: string;
}

// =============================================================================
// Components
// =============================================================================

function ActionBadge({ action }: { action: string }) {
  const getColor = () => {
    if (action.includes("ban") || action.includes("delete") || action.includes("revoke"))
      return "red";
    if (action.includes("suspend") || action.includes("warn")) return "amber";
    if (action.includes("create") || action.includes("grant")) return "emerald";
    if (action.includes("update") || action.includes("edit")) return "blue";
    return "gray";
  };

  return (
    <Badge color={getColor()} size="sm">
      {action}
    </Badge>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function AuditLogPage() {
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "failed">("all");
  const [limit, setLimit] = useState(100);

  const logsResponse = useConvexQuery(api.admin.admin.getAuditLog, {
    limit,
  });

  // Extract logs from response object { logs, nextCursor, hasMore }
  const logs: AuditLogEntry[] | undefined =
    logsResponse && typeof logsResponse === "object" && "logs" in logsResponse
      ? (logsResponse.logs as AuditLogEntry[])
      : undefined;

  const columns: ColumnDef<AuditLogEntry>[] = [
    {
      id: "timestamp",
      header: "Time",
      cell: (log: AuditLogEntry) => (
        <div className="text-sm">
          <div>{new Date(log.timestamp).toLocaleDateString()}</div>
          <div className="text-xs text-muted-foreground">
            {new Date(log.timestamp).toLocaleTimeString()}
          </div>
        </div>
      ),
    },
    {
      id: "action",
      header: "Action",
      cell: (log: AuditLogEntry) => <ActionBadge action={log.action} />,
    },
    {
      id: "target",
      header: "Target",
      cell: (log: AuditLogEntry) => (
        <div className="space-y-1">
          {log.targetUsername ? (
            <div className="text-sm">{log.targetUsername}</div>
          ) : log.targetEmail ? (
            <div className="text-sm">{log.targetEmail}</div>
          ) : log.targetUserId ? (
            <div className="text-xs text-muted-foreground font-mono">
              {String(log.targetUserId).slice(0, 12)}...
            </div>
          ) : (
            <div className="text-muted-foreground">-</div>
          )}
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (log: AuditLogEntry) => (
        <Badge color={log.success ? "emerald" : "red"} size="sm">
          {log.success ? "Success" : "Failed"}
        </Badge>
      ),
    },
    {
      id: "admin",
      header: "Admin",
      cell: (log: AuditLogEntry) => (
        <div className="text-sm">
          {log.adminUsername || `${String(log.adminId).slice(0, 12)}...`}
        </div>
      ),
    },
  ];

  return (
    <PageWrapper title="Audit Log" description="Track all administrative actions and changes">
      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="w-48">
            <Text className="text-sm mb-2">Status</Text>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as "all" | "success" | "failed")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-32">
            <Text className="text-sm mb-2">Limit</Text>
            <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="250">250</SelectItem>
                <SelectItem value="500">500</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Stats */}
      {logs && (
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <Text className="text-sm text-muted-foreground">Total Entries</Text>
            <Text className="text-2xl font-bold">{logs.length}</Text>
          </Card>
          <Card>
            <Text className="text-sm text-muted-foreground">Successful</Text>
            <Text className="text-2xl font-bold">{logs.filter((l) => l.success).length}</Text>
          </Card>
          <Card>
            <Text className="text-sm text-muted-foreground">Failed</Text>
            <Text className="text-2xl font-bold">{logs.filter((l) => !l.success).length}</Text>
          </Card>
          <Card>
            <Text className="text-sm text-muted-foreground">Today</Text>
            <Text className="text-2xl font-bold">
              {
                logs.filter(
                  (l) => new Date(l.timestamp).toDateString() === new Date().toDateString()
                ).length
              }
            </Text>
          </Card>
        </div>
      )}

      {/* Log Table */}
      <Card>
        <Title>Recent Actions</Title>
        <div className="mt-4">
          <DataTable
            data={logs ?? []}
            columns={columns}
            searchable
            searchColumns={["action"]}
            searchPlaceholder="Search actions..."
            emptyMessage="No audit log entries found"
            isLoading={logs === undefined}
            rowKey="_id"
          />
        </div>
      </Card>
    </PageWrapper>
  );
}
