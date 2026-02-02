"use client";

/**
 * Player Analytics Page
 *
 * Detailed player metrics including DAU, MAU, retention, and signups.
 * Uses real Convex data from engagement analytics.
 */

import { ChartCard, LeaderboardGrid, MetricGrid, MetricTile } from "@/components/analytics";
import { PageWrapper } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { apiAny, useConvexQuery } from "@/lib/convexHelpers";
import { AreaChart, Badge, BarChart, Card, DonutChart, Flex, Text, Title } from "@tremor/react";
import Link from "next/link";

// =============================================================================
// Types
// =============================================================================

interface DailyStat {
  date: string;
  dau: number;
  dauHumans: number;
  dauAi: number;
  newUsers: number;
  returningUsers: number;
  totalGames: number;
  day1Retention?: number;
  day7Retention?: number;
}

// EngagedPlayer type - now inferred from API response

// =============================================================================
// Component
// =============================================================================

export default function PlayerAnalyticsPage() {
  // Fetch real data from Convex
  const stats = useConvexQuery(apiAny.admin.admin.getSystemStats);
  const dailyStats = useConvexQuery(apiAny.admin.analytics.getDailyActiveStats, { days: 14 });
  const retention = useConvexQuery(apiAny.admin.analytics.getRetentionOverview);
  const topEngaged = useConvexQuery(apiAny.admin.analytics.getTopEngagedPlayers, {
    days: 7,
    limit: 10,
  });

  const isLoading = stats === undefined || dailyStats === undefined;

  // Transform daily stats for charts
  const playerActivityData =
    dailyStats
      ?.slice()
      .reverse()
      .map((day: DailyStat) => ({
        date: new Date(day.date).toLocaleDateString("en-US", { weekday: "short" }),
        DAU: day.dau,
        "New Users": day.newUsers,
        Returning: day.returningUsers,
      })) ?? [];

  // Human vs AI DAU breakdown
  const humanAiBreakdownData =
    dailyStats
      ?.slice()
      .reverse()
      .map((day: DailyStat) => ({
        date: new Date(day.date).toLocaleDateString("en-US", { weekday: "short" }),
        "Human DAU": day.dauHumans,
        "AI DAU": day.dauAi,
        "Games Played": day.totalGames,
      })) ?? [];

  // Daily retention trends
  const dailyRetentionData =
    dailyStats
      ?.slice()
      .reverse()
      .map((day: DailyStat) => ({
        date: new Date(day.date).toLocaleDateString("en-US", { weekday: "short" }),
        "Day 1": day.day1Retention ?? 0,
        "Day 7": day.day7Retention ?? 0,
      })) ?? [];

  // Calculate week-over-week DAU change
  const currentWeekDAU =
    dailyStats?.slice(0, 7).reduce((sum: number, d: DailyStat) => sum + d.dau, 0) ?? 0;
  const prevWeekDAU =
    dailyStats?.slice(7, 14).reduce((sum: number, d: DailyStat) => sum + d.dau, 0) ?? 0;
  const dauChange =
    prevWeekDAU > 0 ? Math.round(((currentWeekDAU - prevWeekDAU) / prevWeekDAU) * 100) : 0;

  // Player type distribution
  const playerTypeData = [
    { name: "Human", value: stats?.humanPlayers ?? 0 },
    { name: "AI", value: stats?.aiPlayers ?? 0 },
  ];

  // Retention funnel data
  const retentionData = [
    { period: "Day 1", retention: retention?.day1Avg ?? 0 },
    { period: "Day 7", retention: retention?.day7Avg ?? 0 },
    { period: "Day 30", retention: retention?.day30Avg ?? 0 },
  ];

  // Transform top engaged players for leaderboard
  const engagementLeaderboard =
    (topEngaged as any[] | undefined)?.map((player, idx) => ({
      rank: idx + 1,
      name: player.username || player.playerName,
      value: player.engagementScore ?? Math.round((player.totalSessionTime ?? 0) / 60000),
      subtitle: `${player.gamesPlayed ?? player.totalGamesPlayed} games • ${player.daysActive} days active`,
    })) ?? [];

  // Get trend indicator for retention
  const getTrendBadge = (trend: string | undefined) => {
    switch (trend) {
      case "improving":
        return <Badge color="emerald">Improving</Badge>;
      case "declining":
        return <Badge color="rose">Declining</Badge>;
      default:
        return <Badge color="gray">Stable</Badge>;
    }
  };

  return (
    <PageWrapper
      title="Player Analytics"
      description="Player engagement, retention, and growth metrics"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/analytics">← Back to Overview</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/players">Manage Players</Link>
          </Button>
        </div>
      }
    >
      {/* Key Metrics */}
      <MetricGrid columns={5}>
        <MetricTile
          title="Total Players"
          value={stats?.totalPlayers ?? 0}
          icon={<span className="text-lg">👥</span>}
          isLoading={isLoading}
        />
        <MetricTile
          title="Human Players"
          value={stats?.humanPlayers ?? 0}
          icon={<span className="text-lg">👤</span>}
          delta={`${Math.round(((stats?.humanPlayers ?? 0) / (stats?.totalPlayers || 1)) * 100)}%`}
          deltaType="unchanged"
          isLoading={isLoading}
        />
        <MetricTile
          title="AI Players"
          value={stats?.aiPlayers ?? 0}
          icon={<span className="text-lg">🤖</span>}
          isLoading={isLoading}
        />
        <MetricTile
          title="Weekly DAU"
          value={Math.round(currentWeekDAU / 7)}
          icon={<span className="text-lg">📈</span>}
          delta={dauChange !== 0 ? `${dauChange > 0 ? "+" : ""}${dauChange}%` : undefined}
          deltaType={dauChange > 0 ? "increase" : dauChange < 0 ? "decrease" : "unchanged"}
          subtitle="Avg per day"
          isLoading={isLoading}
        />
        <MetricTile
          title="In Queue"
          value={stats?.playersInQueue ?? 0}
          icon={<span className="text-lg">⏳</span>}
          subtitle="Active matchmaking"
          isLoading={isLoading}
        />
      </MetricGrid>

      {/* Charts Row */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Daily Activity */}
        <ChartCard
          title="Daily Active Users"
          description="Player activity over the last 14 days"
          isLoading={isLoading}
        >
          <AreaChart
            className="h-full"
            data={playerActivityData}
            index="date"
            categories={["DAU", "New Users", "Returning"]}
            colors={["blue", "emerald", "violet"]}
            showAnimation
            showLegend
            valueFormatter={(v: number) => v.toLocaleString()}
          />
        </ChartCard>

        {/* Player Types */}
        <ChartCard
          title="Player Distribution"
          description="Human vs AI player breakdown"
          isLoading={isLoading}
        >
          <DonutChart
            className="h-full"
            data={playerTypeData}
            category="value"
            index="name"
            colors={["blue", "cyan"]}
            showAnimation
            valueFormatter={(v: number) => v.toLocaleString()}
          />
          <Flex justifyContent="center" className="mt-4 gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <Text className="text-sm">Human: {(stats?.humanPlayers ?? 0).toLocaleString()}</Text>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cyan-500" />
              <Text className="text-sm">AI: {(stats?.aiPlayers ?? 0).toLocaleString()}</Text>
            </div>
          </Flex>
        </ChartCard>
      </div>

      {/* Retention & Engagement Row */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Retention Funnel */}
        <Card>
          <Flex justifyContent="between" alignItems="center">
            <div>
              <Title>Player Retention</Title>
              <Text className="text-muted-foreground">Return rates after first session</Text>
            </div>
            {getTrendBadge(retention?.trend)}
          </Flex>
          <BarChart
            className="mt-4 h-48"
            data={retentionData}
            index="period"
            categories={["retention"]}
            colors={["emerald"]}
            valueFormatter={(v: number) => `${v.toFixed(1)}%`}
            showAnimation
          />
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Text className="text-2xl font-bold text-emerald-500">
                {retention?.day1Avg?.toFixed(1) ?? "0"}%
              </Text>
              <Text className="text-xs text-muted-foreground">Day 1</Text>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Text className="text-2xl font-bold text-blue-500">
                {retention?.day7Avg?.toFixed(1) ?? "0"}%
              </Text>
              <Text className="text-xs text-muted-foreground">Day 7</Text>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Text className="text-2xl font-bold text-violet-500">
                {retention?.day30Avg?.toFixed(1) ?? "0"}%
              </Text>
              <Text className="text-xs text-muted-foreground">Day 30</Text>
            </div>
          </div>
        </Card>

        {/* Top Engaged Players */}
        <Card>
          <Flex justifyContent="between" alignItems="center">
            <div>
              <Title>Most Engaged Players</Title>
              <Text className="text-muted-foreground">By session time (last 7 days)</Text>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/players">View All</Link>
            </Button>
          </Flex>
          <div className="mt-4">
            {engagementLeaderboard.length > 0 ? (
              <LeaderboardGrid items={engagementLeaderboard} valueLabel="min" />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Text>No engagement data available yet.</Text>
                <Text className="text-sm">Analytics data is aggregated daily.</Text>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Human vs AI & Retention Trends */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Human vs AI DAU */}
        <ChartCard
          title="Human vs AI Activity"
          description="Daily breakdown of human and AI player activity"
          isLoading={isLoading}
        >
          <AreaChart
            className="h-full"
            data={humanAiBreakdownData}
            index="date"
            categories={["Human DAU", "AI DAU", "Games Played"]}
            colors={["blue", "cyan", "amber"]}
            showAnimation
            showLegend
            valueFormatter={(v: number) => v.toLocaleString()}
          />
        </ChartCard>

        {/* Daily Retention Trends */}
        <ChartCard
          title="Daily Retention Trends"
          description="Day 1 and Day 7 retention over time"
          isLoading={isLoading}
        >
          <AreaChart
            className="h-full"
            data={dailyRetentionData}
            index="date"
            categories={["Day 1", "Day 7"]}
            colors={["emerald", "violet"]}
            showAnimation
            showLegend
            valueFormatter={(v: number) => `${v.toFixed(1)}%`}
          />
        </ChartCard>
      </div>

      {/* Player Type Breakdown */}
      <Card className="mt-6">
        <Title>Player Segments</Title>
        <Text className="text-muted-foreground">Breakdown by player type and activity status</Text>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 text-center">
            <Text className="text-3xl font-bold text-blue-500">{stats?.humanPlayers ?? 0}</Text>
            <Text className="text-sm text-muted-foreground">Human Players</Text>
            <Text className="text-xs text-muted-foreground mt-1">
              {stats?.totalPlayers
                ? `${Math.round((stats.humanPlayers / stats.totalPlayers) * 100)}% of total`
                : "0%"}
            </Text>
          </div>
          <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-center">
            <Text className="text-3xl font-bold text-cyan-500">{stats?.aiPlayers ?? 0}</Text>
            <Text className="text-sm text-muted-foreground">AI Players</Text>
            <Text className="text-xs text-muted-foreground mt-1">Practice opponents</Text>
          </div>
          <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-center">
            <Text className="text-3xl font-bold text-emerald-500">{dailyStats?.[0]?.dau ?? 0}</Text>
            <Text className="text-sm text-muted-foreground">Active Today</Text>
            <Text className="text-xs text-muted-foreground mt-1">Daily active users</Text>
          </div>
          <div className="p-4 rounded-lg bg-violet-500/10 border border-violet-500/30 text-center">
            <Text className="text-3xl font-bold text-violet-500">
              {dailyStats?.[0]?.newUsers ?? 0}
            </Text>
            <Text className="text-sm text-muted-foreground">New Today</Text>
            <Text className="text-xs text-muted-foreground mt-1">Recent signups</Text>
          </div>
        </div>
      </Card>

      {/* Info Card */}
      <Card className="mt-6">
        <Title>About Player Analytics</Title>
        <Text className="text-muted-foreground">
          Player analytics help you understand user engagement and identify opportunities for
          improving retention. Key metrics include:
        </Text>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li>
            • <strong>DAU (Daily Active Users)</strong>: Unique players who played at least one game
            that day
          </li>
          <li>
            • <strong>Retention (D1/D7/D30)</strong>: Percentage of players returning after first
            session
          </li>
          <li>
            • <strong>New Users</strong>: Players who registered and created their account
          </li>
          <li>
            • <strong>Session Time</strong>: Total time players spend engaged with the game
          </li>
          <li>
            • <strong>Engagement Score</strong>: Composite metric based on games played, session
            time, and activity frequency
          </li>
        </ul>
      </Card>
    </PageWrapper>
  );
}
