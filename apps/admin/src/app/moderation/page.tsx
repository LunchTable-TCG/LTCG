"use client";

/**
 * Moderation Center Page
 *
 * Central hub for player moderation including banned players,
 * active suspensions, and warning management.
 */

import { DataTable, StatCard, StatGrid } from "@/components/data";
import { PageWrapper } from "@/components/layout";
import { ModerationActions, ModerationStatusBadge } from "@/components/players";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { typedApi, useConvexQuery } from "@/lib/convexHelpers";
import type { BannedPlayer, ColumnDef, SuspendedPlayer } from "@/types";
import type { Id } from "@convex/_generated/dataModel";
import { Card, Text, Title } from "@tremor/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

// =============================================================================
// Helper Functions
// =============================================================================

function formatTimeRemaining(suspendedUntil: number) {
  const now = Date.now();
  const remaining = suspendedUntil - now;
  if (remaining <= 0) return "Expired";

  const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
  const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h remaining`;
  return "< 1h remaining";
}

// =============================================================================
// Types
// =============================================================================

interface BannedPlayerRow extends BannedPlayer {
  _id: Id<"users">;
}

interface SuspendedPlayerRow extends SuspendedPlayer {
  _id: Id<"users">;
}

interface SuspiciousSummaryItem {
  category: string;
  count: number;
  severity: string;
}

// =============================================================================
// Column Definitions
// =============================================================================

const bannedColumns: ColumnDef<BannedPlayerRow>[] = [
  {
    id: "playerName",
    header: "Player",
    accessorKey: "playerName",
    sortable: true,
    cell: (row) => <span className="font-medium">{row.playerName}</span>,
  },
  {
    id: "banReason",
    header: "Reason",
    accessorKey: "banReason",
    cell: (row) => (
      <span className="text-muted-foreground text-sm line-clamp-1">
        {row.banReason || "No reason provided"}
      </span>
    ),
  },
  {
    id: "bannedAt",
    header: "Banned On",
    accessorKey: "bannedAt",
    sortable: true,
    cell: (row) =>
      row.bannedAt ? (
        <span className="text-sm">{new Date(row.bannedAt).toLocaleDateString()}</span>
      ) : (
        <span className="text-muted-foreground">Unknown</span>
      ),
  },
  {
    id: "status",
    header: "Status",
    cell: () => <ModerationStatusBadge isBanned={true} />,
  },
];

const suspendedColumns: ColumnDef<SuspendedPlayerRow>[] = [
  {
    id: "playerName",
    header: "Player",
    accessorKey: "playerName",
    sortable: true,
    cell: (row) => <span className="font-medium">{row.playerName}</span>,
  },
  {
    id: "suspensionReason",
    header: "Reason",
    accessorKey: "suspensionReason",
    cell: (row) => (
      <span className="text-muted-foreground text-sm line-clamp-1">
        {row.suspensionReason || "No reason provided"}
      </span>
    ),
  },
  {
    id: "suspendedUntil",
    header: "Expires",
    accessorKey: "suspendedUntil",
    sortable: true,
    cell: (row) =>
      row.suspendedUntil ? (
        <span className="text-sm">{formatTimeRemaining(row.suspendedUntil)}</span>
      ) : (
        <span className="text-muted-foreground">Unknown</span>
      ),
  },
  {
    id: "status",
    header: "Status",
    cell: () => <ModerationStatusBadge isSuspended={true} />,
  },
];

// =============================================================================
// Component
// =============================================================================

export default function ModerationPage() {
  const router = useRouter();

  // Fetch moderation data
  const bannedPlayers = useConvexQuery(typedApi.admin.moderation.listBannedPlayers, {});
  const suspendedPlayers = useConvexQuery(typedApi.admin.moderation.listSuspendedPlayers, {});
  const suspiciousReport = useConvexQuery(typedApi.admin.admin.getSuspiciousActivityReport, {
    lookbackDays: 7,
  });

  const isLoading = bannedPlayers === undefined;
  const isSuspendedLoading = suspendedPlayers === undefined;

  // Transform banned players for table
  const bannedTableData: BannedPlayerRow[] | undefined = bannedPlayers?.map((p: BannedPlayer) => ({
    ...p,
    _id: p.playerId,
  }));

  // Transform suspended players for table
  const suspendedTableData: SuspendedPlayerRow[] | undefined = suspendedPlayers?.map(
    (p: SuspendedPlayer) => ({
      ...p,
      _id: p.playerId,
    })
  );

  /* eslint-disable react-hooks/purity */
  const stats = useMemo(() => {
    if (!bannedPlayers) return { total: 0, recent: 0 };
    const nowTime = Date.now();
    return {
      total: bannedPlayers.length,
      recent: bannedPlayers.filter(
        (p: BannedPlayer) => p.bannedAt && nowTime - p.bannedAt < 7 * 24 * 60 * 60 * 1000
      ).length,
    };
  }, [bannedPlayers]);
  /* eslint-enable react-hooks/purity */

  const totalBanned = stats.total;
  const totalSuspended = suspendedPlayers?.length ?? 0;
  const suspiciousCount = suspiciousReport?.suspiciousMatchups ?? 0;
  const warningsThisWeek = suspiciousReport?.recentWarnings ?? 0;

  return (
    <PageWrapper
      title="Moderation Center"
      description="Manage player bans, suspensions, and review suspicious activity"
      actions={
        <Button asChild>
          <Link href="/moderation/suspicious">
            <span className="mr-2">⚠️</span>
            Review Suspicious Activity
          </Link>
        </Button>
      }
    >
      {/* Overview Stats */}
      <StatGrid columns={4}>
        <StatCard
          title="Banned Players"
          value={totalBanned}
          icon={<span className="text-lg">🚫</span>}
          isLoading={isLoading}
        />
        <StatCard
          title="Suspended Players"
          value={totalSuspended}
          icon={<span className="text-lg">⏸️</span>}
          subtitle="Currently active"
          isLoading={isSuspendedLoading}
        />
        <StatCard
          title="Suspicious Matchups"
          value={suspiciousCount}
          icon={<span className="text-lg">🔍</span>}
          subtitle="Last 7 days"
          isLoading={suspiciousReport === undefined}
        />
        <StatCard
          title="Warnings Issued"
          value={warningsThisWeek}
          icon={<span className="text-lg">⚠️</span>}
          subtitle="Last 7 days"
          isLoading={suspiciousReport === undefined}
        />
      </StatGrid>

      {/* Suspicious Activity Alert */}
      {suspiciousReport && suspiciousReport.summary.length > 0 && (
        <Card className="mt-6 border-yellow-500/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              <Title>Suspicious Activity Detected</Title>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/moderation/suspicious">Review Details</Link>
            </Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-4">
            {suspiciousReport.summary.map((item: SuspiciousSummaryItem) => (
              <div key={item.category} className="flex items-center gap-2">
                <Badge
                  variant={
                    item.severity === "high"
                      ? "destructive"
                      : item.severity === "medium"
                        ? "default"
                        : "outline"
                  }
                >
                  {item.count}
                </Badge>
                <Text className="text-sm">{item.category}</Text>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tabbed Content */}
      <Tabs defaultValue="banned" className="mt-6">
        <TabsList>
          <TabsTrigger value="banned">Banned Players ({totalBanned})</TabsTrigger>
          <TabsTrigger value="suspended">Suspended Players ({totalSuspended})</TabsTrigger>
          <TabsTrigger value="quick-actions">Quick Actions</TabsTrigger>
        </TabsList>

        {/* Banned Players Tab */}
        <TabsContent value="banned" className="mt-4">
          <Card>
            <DataTable<BannedPlayerRow>
              data={bannedTableData}
              columns={bannedColumns}
              rowKey="_id"
              isLoading={isLoading}
              searchable
              searchPlaceholder="Search banned players..."
              searchColumns={["playerName"]}
              pageSize={15}
              emptyMessage="No banned players"
              onRowClick={(row) => router.push(`/players/${row.playerId}`)}
              rowActions={(row) => (
                <ModerationActions
                  playerId={row.playerId}
                  playerName={row.playerName}
                  isBanned={true}
                  isSuspended={false}
                />
              )}
            />
          </Card>
        </TabsContent>

        {/* Suspended Players Tab */}
        <TabsContent value="suspended" className="mt-4">
          <Card>
            <DataTable<SuspendedPlayerRow>
              data={suspendedTableData}
              columns={suspendedColumns}
              rowKey="_id"
              isLoading={isSuspendedLoading}
              searchable
              searchPlaceholder="Search suspended players..."
              searchColumns={["playerName"]}
              pageSize={15}
              emptyMessage="No suspended players"
              onRowClick={(row) => router.push(`/players/${row.playerId}`)}
              rowActions={(row) => (
                <ModerationActions
                  playerId={row.playerId}
                  playerName={row.playerName}
                  isBanned={false}
                  isSuspended={true}
                />
              )}
            />
          </Card>
        </TabsContent>

        {/* Quick Actions Tab */}
        <TabsContent value="quick-actions" className="mt-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <Title>Search Player</Title>
              <Text className="text-muted-foreground">Find a player to take moderation action</Text>
              <Button className="mt-4" asChild>
                <Link href="/players">
                  <span className="mr-2">🔍</span>
                  Search All Players
                </Link>
              </Button>
            </Card>

            <Card>
              <Title>Review Fraud</Title>
              <Text className="text-muted-foreground">Review flagged suspicious activity</Text>
              <Button className="mt-4" variant="outline" asChild>
                <Link href="/moderation/suspicious">
                  <span className="mr-2">⚠️</span>
                  Suspicious Activity
                </Link>
              </Button>
            </Card>

            <Card>
              <Title>Batch Operations</Title>
              <Text className="text-muted-foreground">Perform actions on multiple players</Text>
              <Button className="mt-4" variant="outline" asChild>
                <Link href="/batch">
                  <span className="mr-2">📦</span>
                  Batch Operations
                </Link>
              </Button>
            </Card>

            <Card>
              <Title>Audit Log</Title>
              <Text className="text-muted-foreground">Review all admin actions</Text>
              <Button className="mt-4" variant="outline" asChild>
                <Link href="/audit">
                  <span className="mr-2">📜</span>
                  View Audit Log
                </Link>
              </Button>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
