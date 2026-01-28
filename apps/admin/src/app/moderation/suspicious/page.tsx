"use client";

/**
 * Suspicious Activity Review Page
 *
 * Displays detected fraud patterns, suspicious matchups,
 * and abnormal rating changes for admin review.
 */

import { DataTable, StatCard, StatGrid } from "@/components/data";
import { PageWrapper } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AbnormalRatingChange, ColumnDef, SuspiciousMatchup } from "@/types";
import { api } from "@convex/_generated/api";
import { Card, Flex, Text, Title } from "@tremor/react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";

// =============================================================================
// Types
// =============================================================================

interface SuspiciousMatchupRow extends SuspiciousMatchup {
  _id: string;
}

interface AbnormalRatingRow extends AbnormalRatingChange {
  _id: any; // Id type - players table
}

interface SuspiciousSummaryItem {
  category: string;
  count: number;
  severity: string;
}

// =============================================================================
// Column Definitions
// =============================================================================

const matchupColumns: ColumnDef<SuspiciousMatchupRow>[] = [
  {
    id: "players",
    header: "Players",
    cell: (row) => (
      <div className="space-y-1">
        <div className="font-medium">{row.player1Name}</div>
        <div className="text-sm text-muted-foreground">vs {row.player2Name}</div>
      </div>
    ),
  },
  {
    id: "games",
    header: "Games",
    accessorKey: "gamesPlayed",
    sortable: true,
    cell: (row) => <span className="font-mono">{row.gamesPlayed}</span>,
  },
  {
    id: "record",
    header: "Record",
    cell: (row) => (
      <span className="font-mono">
        {row.player1Wins}-{row.player2Wins}
      </span>
    ),
  },
  {
    id: "winRate",
    header: "Win Rate",
    accessorKey: "winRate",
    sortable: true,
    cell: (row) => (
      <Badge variant={row.winRate > 0.85 ? "destructive" : "default"}>
        {(row.winRate * 100).toFixed(0)}%
      </Badge>
    ),
  },
  {
    id: "suspicionScore",
    header: "Score",
    accessorKey: "suspicionScore",
    sortable: true,
    cell: (row) => (
      <Badge
        variant={
          row.suspicionScore > 80 ? "destructive" : row.suspicionScore > 50 ? "default" : "outline"
        }
      >
        {row.suspicionScore}
      </Badge>
    ),
  },
  {
    id: "flags",
    header: "Flags",
    cell: (row) => (
      <div className="flex flex-wrap gap-1">
        {row.flags.slice(0, 3).map((flag, i) => (
          <Badge key={i} variant="outline" className="text-xs">
            {flag}
          </Badge>
        ))}
        {row.flags.length > 3 && (
          <Badge variant="outline" className="text-xs">
            +{row.flags.length - 3}
          </Badge>
        )}
      </div>
    ),
  },
];

const ratingColumns: ColumnDef<AbnormalRatingRow>[] = [
  {
    id: "playerName",
    header: "Player",
    accessorKey: "playerName",
    sortable: true,
    cell: (row) => <span className="font-medium">{row.playerName}</span>,
  },
  {
    id: "currentRating",
    header: "Current",
    accessorKey: "currentRating",
    sortable: true,
    cell: (row) => <span className="font-mono">{row.currentRating}</span>,
  },
  {
    id: "ratingChange",
    header: "Change",
    accessorKey: "ratingChange",
    sortable: true,
    cell: (row) => (
      <span className={`font-mono ${row.ratingChange > 0 ? "text-green-500" : "text-red-500"}`}>
        {row.ratingChange > 0 ? "+" : ""}
        {row.ratingChange}
      </span>
    ),
  },
  {
    id: "record",
    header: "Record",
    cell: (row) => (
      <span className="font-mono">
        {row.wins}W-{row.losses}L ({row.gamesPlayed} games)
      </span>
    ),
  },
  {
    id: "streak",
    header: "Streak",
    cell: (row) => (
      <span className="font-mono">
        {row.winStreak > 0 && <span className="text-green-500">{row.winStreak}W</span>}
        {row.lossStreak > 0 && <span className="text-red-500">{row.lossStreak}L</span>}
        {row.winStreak === 0 && row.lossStreak === 0 && "-"}
      </span>
    ),
  },
  {
    id: "flags",
    header: "Flags",
    cell: (row) => (
      <div className="flex flex-wrap gap-1">
        {row.flags.map((flag, i) => (
          <Badge key={i} variant="outline" className="text-xs">
            {flag}
          </Badge>
        ))}
      </div>
    ),
  },
];

// =============================================================================
// Component
// =============================================================================

export default function SuspiciousActivityPage() {
  const router = useRouter();

  // Fetch suspicious activity data
  const report = useQuery(api.admin.admin.getSuspiciousActivityReport, {
    lookbackDays: 7,
  });

  // Extract data from report (currently stubs until backend implements full analysis)
  const suspiciousMatchups: any[] = [];
  const abnormalRatings: any[] = [];

  const isLoading = report === undefined;

  // Transform data for tables
  const matchupTableData: SuspiciousMatchupRow[] | undefined = suspiciousMatchups?.map(
    (m: SuspiciousMatchup, index: number) => ({
      ...m,
      _id: `${m.player1Id}-${m.player2Id}-${index}`,
    })
  );

  const ratingTableData: AbnormalRatingRow[] | undefined = abnormalRatings?.map(
    (r: AbnormalRatingChange) => ({
      ...r,
      _id: r.playerId,
    })
  );

  // Stats
  const totalSuspicious = suspiciousMatchups?.length ?? 0;
  const highSeverity =
    suspiciousMatchups?.filter((m: SuspiciousMatchup) => m.suspicionScore > 80).length ?? 0;
  const totalAbnormal = abnormalRatings?.length ?? 0;
  const recentBans = report?.recentBans ?? 0;

  return (
    <PageWrapper
      title="Suspicious Activity"
      description="Review detected fraud patterns and abnormal behavior"
      actions={
        <Button variant="outline" onClick={() => router.back()}>
          ← Back to Moderation
        </Button>
      }
    >
      {/* Report Summary */}
      {report && (
        <Card className="mb-6">
          <Flex justifyContent="between" alignItems="center">
            <div>
              <Title>Activity Report</Title>
              <Text className="text-muted-foreground">
                Last {report.lookbackDays} days • Generated{" "}
                {new Date(report.reportGeneratedAt).toLocaleString()}
              </Text>
            </div>
            <Button type="button" variant="outline" size="sm">
              Export Report
            </Button>
          </Flex>
          <div className="mt-4 flex flex-wrap gap-4">
            {report.summary.map((item: SuspiciousSummaryItem) => (
              <div
                key={item.category}
                className="flex items-center gap-2 p-3 rounded-lg bg-muted/50"
              >
                <Badge
                  variant={
                    item.severity === "high"
                      ? "destructive"
                      : item.severity === "medium"
                        ? "default"
                        : "outline"
                  }
                  className="text-lg px-3 py-1"
                >
                  {item.count}
                </Badge>
                <div>
                  <Text className="font-medium">{item.category}</Text>
                  <Text className="text-xs text-muted-foreground capitalize">
                    {item.severity} severity
                  </Text>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Overview Stats */}
      <StatGrid columns={4}>
        <StatCard
          title="Suspicious Matchups"
          value={totalSuspicious}
          icon={<span className="text-lg">🔍</span>}
          subtitle="Detected patterns"
          isLoading={isLoading}
        />
        <StatCard
          title="High Severity"
          value={highSeverity}
          icon={<span className="text-lg">🚨</span>}
          subtitle="Score > 80"
          isLoading={isLoading}
        />
        <StatCard
          title="Abnormal Ratings"
          value={totalAbnormal}
          icon={<span className="text-lg">📊</span>}
          subtitle="Large changes"
          isLoading={abnormalRatings === undefined}
        />
        <StatCard
          title="Recent Bans"
          value={recentBans}
          icon={<span className="text-lg">🚫</span>}
          subtitle="Last 7 days"
          isLoading={report === undefined}
        />
      </StatGrid>

      {/* Tabbed Content */}
      <Tabs defaultValue="matchups" className="mt-6">
        <TabsList>
          <TabsTrigger value="matchups">Suspicious Matchups ({totalSuspicious})</TabsTrigger>
          <TabsTrigger value="ratings">Abnormal Ratings ({totalAbnormal})</TabsTrigger>
        </TabsList>

        {/* Suspicious Matchups Tab */}
        <TabsContent value="matchups" className="mt-4">
          <Card>
            <Title>Suspicious Player Matchups</Title>
            <Text className="text-muted-foreground mb-4">
              Players who frequently play against each other with unusual win patterns. Higher
              suspicion scores indicate more concerning patterns.
            </Text>
            <DataTable<SuspiciousMatchupRow>
              data={matchupTableData}
              columns={matchupColumns}
              rowKey="_id"
              isLoading={isLoading}
              searchable
              searchPlaceholder="Search by player name..."
              searchColumns={["player1Name", "player2Name"]}
              pageSize={10}
              emptyMessage="No suspicious matchups detected"
              rowActions={(row) => (
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/players/${row.player1Id}`)}
                  >
                    P1
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/players/${row.player2Id}`)}
                  >
                    P2
                  </Button>
                </div>
              )}
            />
          </Card>
        </TabsContent>

        {/* Abnormal Ratings Tab */}
        <TabsContent value="ratings" className="mt-4">
          <Card>
            <Title>Abnormal Rating Changes</Title>
            <Text className="text-muted-foreground mb-4">
              Players with unusually large rating changes that may indicate boosting, win trading,
              or other manipulation.
            </Text>
            <DataTable<AbnormalRatingRow>
              data={ratingTableData}
              columns={ratingColumns}
              rowKey="_id"
              isLoading={abnormalRatings === undefined}
              searchable
              searchPlaceholder="Search by player name..."
              searchColumns={["playerName"]}
              pageSize={10}
              emptyMessage="No abnormal rating changes detected"
              onRowClick={(row) => router.push(`/players/${row.playerId}`)}
              rowActions={(row) => (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/players/${row.playerId}`);
                  }}
                >
                  View
                </Button>
              )}
            />
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detection Parameters Info */}
      <Card className="mt-6">
        <Title>Detection Parameters</Title>
        <Text className="text-muted-foreground">Current fraud detection thresholds:</Text>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="p-3 rounded-lg bg-muted/50">
            <Text className="font-medium">Suspicious Matchups</Text>
            <ul className="mt-2 text-sm text-muted-foreground space-y-1">
              <li>• Minimum 5 games together</li>
              <li>• Win rate threshold: 80%</li>
              <li>• Lookback period: 30 days</li>
            </ul>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <Text className="font-medium">Abnormal Ratings</Text>
            <ul className="mt-2 text-sm text-muted-foreground space-y-1">
              <li>• Minimum rating change: 150</li>
              <li>• Lookback period: 7 days</li>
              <li>• Flags extended win/loss streaks</li>
            </ul>
          </div>
        </div>
      </Card>
    </PageWrapper>
  );
}
