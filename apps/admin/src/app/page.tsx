"use client";

/**
 * Admin Dashboard Overview Page
 *
 * Main dashboard showing system stats, recent activity, and alerts.
 */

import { StatCard, StatGrid } from "@/components/data";
import { PageWrapper } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { typedApi, useConvexQuery } from "@/lib/convexHelpers";
import { BarList, Card, DonutChart, Flex, Text, Title } from "@tremor/react";
import Link from "next/link";

// =============================================================================
// Component
// =============================================================================

export default function DashboardPage() {
  // Fetch system stats using helper to avoid TS2589
  const stats = useConvexQuery(typedApi.admin.admin.getSystemStats, {});
  const suspiciousReport = useConvexQuery(typedApi.admin.admin.getSuspiciousActivityReport, {
    lookbackDays: 7,
  });

  const isLoading = stats === undefined;

  // Player distribution data for donut chart
  const playerDistribution = stats
    ? [
        { name: "Human Players", value: stats.humanPlayers },
        { name: "AI Players", value: stats.aiPlayers },
      ]
    : [];

  // Game status data for bar list
  const gameStatusData = stats
    ? [
        { name: "Completed", value: stats.completedGames },
        { name: "Active", value: stats.activeGames },
        { name: "In Queue", value: stats.playersInQueue },
      ]
    : [];

  return (
    <PageWrapper
      title="Dashboard"
      description="Overview of system health and activity"
      actions={
        <Button asChild>
          <Link href="/players">View All Players</Link>
        </Button>
      }
    >
      {/* Key Metrics */}
      <StatGrid columns={4}>
        <StatCard
          title="Total Players"
          value={stats?.totalPlayers ?? 0}
          icon={<span className="text-lg">👥</span>}
          isLoading={isLoading}
        />
        <StatCard
          title="Total Games"
          value={stats?.totalGames ?? 0}
          icon={<span className="text-lg">🎮</span>}
          subtitle={`${stats?.recentGames ?? 0} in last 30 days`}
          isLoading={isLoading}
        />
        <StatCard
          title="Active Games"
          value={stats?.activeGames ?? 0}
          icon={<span className="text-lg">▶️</span>}
          isLoading={isLoading}
        />
        <StatCard
          title="Players in Queue"
          value={stats?.playersInQueue ?? 0}
          icon={<span className="text-lg">⏳</span>}
          isLoading={isLoading}
        />
      </StatGrid>

      {/* Second Row: Charts and API Keys */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Player Distribution */}
        <Card>
          <Title>Player Distribution</Title>
          <DonutChart
            className="mt-4 h-52"
            data={playerDistribution}
            category="value"
            index="name"
            colors={["blue", "cyan"]}
            showAnimation
          />
          <Flex className="mt-4" justifyContent="center">
            <Text className="text-sm text-muted-foreground">
              {stats?.humanPlayers ?? 0} human • {stats?.aiPlayers ?? 0} AI
            </Text>
          </Flex>
        </Card>

        {/* Game Activity */}
        <Card>
          <Title>Game Activity</Title>
          <BarList data={gameStatusData} className="mt-4" color="blue" />
          <div className="mt-4 flex items-center justify-between text-sm">
            <Text className="text-muted-foreground">
              {stats?.completedGames ?? 0} total completed
            </Text>
            <Button variant="outline" size="sm" asChild>
              <Link href="/analytics/games">View Details</Link>
            </Button>
          </div>
        </Card>
      </div>

      {/* Third Row: Active Season & API Keys */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Active Season */}
        <Card>
          <Flex justifyContent="between" alignItems="center">
            <Title>Active Season</Title>
            <Button variant="outline" size="sm" asChild>
              <Link href="/seasons">Manage</Link>
            </Button>
          </Flex>
          <div className="mt-4">
            {stats?.activeSeason ? (
              <div className="flex items-center gap-3">
                <Badge variant="default" className="text-lg px-3 py-1">
                  {(stats.activeSeason as { name?: string })?.name ?? "Active Season"}
                </Badge>
                <Text className="text-muted-foreground">Currently active</Text>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Badge variant="outline">No Active Season</Badge>
                <Text className="text-muted-foreground">
                  Create a new season to begin ranked play
                </Text>
              </div>
            )}
          </div>
        </Card>

        {/* API Keys */}
        <Card>
          <Flex justifyContent="between" alignItems="center">
            <Title>API Keys</Title>
            <Button variant="outline" size="sm" asChild>
              <Link href="/api-keys">Manage</Link>
            </Button>
          </Flex>
          <div className="mt-4 flex gap-6">
            <div>
              <Text className="text-2xl font-bold">{stats?.activeApiKeys ?? 0}</Text>
              <Text className="text-sm text-muted-foreground">Active</Text>
            </div>
            <div>
              <Text className="text-2xl font-bold">{stats?.totalApiKeys ?? 0}</Text>
              <Text className="text-sm text-muted-foreground">Total</Text>
            </div>
          </div>
        </Card>
      </div>

      {/* Suspicious Activity Alert */}
      {suspiciousReport && suspiciousReport.summary.length > 0 && (
        <Card className="mt-6 border-yellow-500/50">
          <Flex justifyContent="between" alignItems="center">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              <Title>Suspicious Activity Detected</Title>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/moderation/suspicious">Review</Link>
            </Button>
          </Flex>
          <div className="mt-4 flex flex-wrap gap-4">
            {suspiciousReport.summary.map(
              (item: { category: string; count: number; severity: "high" | "medium" | "low" }) => (
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
              )
            )}
          </div>
          <Text className="mt-3 text-xs text-muted-foreground">
            Report generated {new Date(suspiciousReport.reportGeneratedAt).toLocaleString()}
            {" • "}Last {suspiciousReport.lookbackDays} days
          </Text>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="mt-6">
        <Title>Quick Actions</Title>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <Link href="/players">
              <span className="mr-2">👥</span>
              Search Players
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/moderation">
              <span className="mr-2">🛡️</span>
              Moderation Center
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/batch">
              <span className="mr-2">📦</span>
              Batch Operations
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/analytics">
              <span className="mr-2">📈</span>
              Analytics
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/docs">
              <span className="mr-2">📚</span>
              API Documentation
            </Link>
          </Button>
        </div>
      </Card>
    </PageWrapper>
  );
}
