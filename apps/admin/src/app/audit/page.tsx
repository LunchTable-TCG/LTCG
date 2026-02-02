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
import type { ColumnDef } from "@/types";
import { apiAny, useConvexQuery } from "@/lib/convexHelpers";
import { Badge, Card, Text, Title } from "@tremor/react";
import { useState } from "react";

// =============================================================================
// Types
// =============================================================================

type TargetType = "player" | "card" | "listing" | "season" | "config" | "system";

interface AuditLogEntry {
  _id: string;
  _creationTime: number;
  adminUserId: string;
  action: string;
  targetType: TargetType;
  targetId?: string;
  previousValue?: unknown;
  newValue?: unknown;
  reason?: string;
  ipAddress?: string;
  createdAt: number;
}

// =============================================================================
// Constants
// =============================================================================

const TARGET_TYPES: { value: TargetType | "all"; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "player", label: "Player" },
  { value: "card", label: "Card" },
  { value: "listing", label: "Listing" },
  { value: "season", label: "Season" },
  { value: "config", label: "Config" },
  { value: "system", label: "System" },
];

const TARGET_TYPE_COLORS: Record<TargetType, string> = {
  player: "blue",
  card: "purple",
  listing: "emerald",
  season: "amber",
  config: "gray",
  system: "red",
};

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

function TargetTypeBadge({ type }: { type: TargetType }) {
  return (
    <Badge color={TARGET_TYPE_COLORS[type]} size="sm">
      {type}
    </Badge>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function AuditLogPage() {
  const [targetType, setTargetType] = useState<TargetType | "all">("all");
  const [limit, setLimit] = useState(100);

  const logs = useConvexQuery(apiAny.admin.admin.getAuditLog, {
    limit,
  }) as AuditLogEntry[] | undefined;

  const columns: ColumnDef<AuditLogEntry>[] = [
    {
      id: "createdAt",
      header: "Time",
      cell: (log: AuditLogEntry) => (
        <div className="text-sm">
          <div>{new Date(log.createdAt).toLocaleDateString()}</div>
          <div className="text-xs text-muted-foreground">
            {new Date(log.createdAt).toLocaleTimeString()}
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
      id: "targetType",
      header: "Target",
      cell: (log: AuditLogEntry) => (
        <div className="space-y-1">
          <TargetTypeBadge type={log.targetType} />
          {log.targetId && (
            <div className="text-xs text-muted-foreground font-mono">
              {log.targetId.slice(0, 12)}...
            </div>
          )}
        </div>
      ),
    },
    {
      id: "reason",
      header: "Reason",
      cell: (log: AuditLogEntry) => (
        <div className="max-w-xs truncate text-sm text-muted-foreground">{log.reason || "-"}</div>
      ),
    },
    {
      id: "adminUserId",
      header: "Admin",
      cell: (log: AuditLogEntry) => (
        <div className="text-xs font-mono text-muted-foreground">
          {log.adminUserId.slice(0, 12)}...
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
            <Text className="text-sm mb-2">Target Type</Text>
            <Select
              value={targetType}
              onValueChange={(v) => setTargetType(v as TargetType | "all")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TARGET_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
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
            <Text className="text-sm text-muted-foreground">Player Actions</Text>
            <Text className="text-2xl font-bold">
              {logs.filter((l) => l.targetType === "player").length}
            </Text>
          </Card>
          <Card>
            <Text className="text-sm text-muted-foreground">System Actions</Text>
            <Text className="text-2xl font-bold">
              {logs.filter((l) => l.targetType === "system").length}
            </Text>
          </Card>
          <Card>
            <Text className="text-sm text-muted-foreground">Today</Text>
            <Text className="text-2xl font-bold">
              {
                logs.filter(
                  (l) => new Date(l.createdAt).toDateString() === new Date().toDateString()
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
