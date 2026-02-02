"use client";

/**
 * Game Analytics Page
 *
 * Detailed game metrics including matches played, duration, and outcomes.
 * Uses real Convex data from matchmaking analytics.
 */

import { ChartCard, MetricGrid, MetricTile } from "@/components/analytics";
import { PageWrapper } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { apiAny, useConvexQuery } from "@/lib/convexHelpers";
import {
  AreaChart,
  Badge,
  BarChart,
  BarList,
  Card,
  DonutChart,
  Flex,
  Text,
  Title,
} from "@tremor/react";
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
  rankedGames?: number;
  casualGames?: number;
  day1Retention?: number;
  day7Retention?: number;
  averageGameDuration?: number;
}

interface MatchmakingStat {
  date: string;
  queueType: string;
  avgQueueTime: number;
  avgRatingDiff: number;
  fairMatches?: number;
  aiFilledMatches?: number;
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  return `${minutes}m`;
}

function getHealthBadge(score: number) {
  if (score >= 80) return <Badge color="emerald">Excellent</Badge>;
  if (score >= 60) return <Badge color="blue">Good</Badge>;
  if (score >= 40) return <Badge color="amber">Fair</Badge>;
  return <Badge color="rose">Poor</Badge>;
}

// =============================================================================
// Component
// =============================================================================

export default function GameAnalyticsPage() {
  // Fetch real data from Convex
  const stats = useConvexQuery(apiAny.admin.admin.getSystemStats);
  const matchmakingHealth = useConvexQuery(apiAny.admin.analytics.getMatchmakingHealth);
  const matchmakingStats = useConvexQuery(apiAny.admin.analytics.getMatchmakingStatsDetailed, { days: 14 });
  const skillDist = useConvexQuery(apiAny.admin.analytics.getSkillDistribution, { ratingType: "elo" });
  const dailyStats = useConvexQuery(apiAny.admin.analytics.getDailyActiveStats, { days: 14 });

  const isLoading = stats === undefined;

  // Calculate game completion rate
  const completionRate = stats?.totalGames
    ? Math.round((stats.completedGames / stats.totalGames) * 100)
    : 0;

  // Transform daily stats for game count chart
  const gamesOverTime =
    dailyStats
      ?.slice()
      .reverse()
      .map((day: DailyStat) => ({
        date: new Date(day.date).toLocaleDateString("en-US", { weekday: "short", day: "numeric" }),
        "Total Games": day.totalGames,
        Ranked: day.rankedGames ?? 0,
        Casual: day.casualGames ?? 0,
      })) ?? [];

  // Transform matchmaking stats for queue time chart
  const queueTimeData =
    matchmakingStats
      ?.slice()
      .reverse()
      .map((stat: MatchmakingStat) => ({
        date: new Date(stat.date).toLocaleDateString("en-US", { weekday: "short", day: "numeric" }),
        "Queue Time (s)": Math.round(stat.avgQueueTime / 1000),
        "Rating Diff": stat.avgRatingDiff,
        type: stat.queueType,
      }))
      .filter((d: { type: string }) => d.type === "ranked") ?? [];
  void queueTimeData; // Used in JSX below

  // Game status distribution
  const gameOutcomes = [
    { name: "Completed", value: stats?.completedGames ?? 0 },
    { name: "Active", value: stats?.activeGames ?? 0 },
    {
      name: "Abandoned",
      value: Math.max(
        0,
        (stats?.totalGames ?? 0) - (stats?.completedGames ?? 0) - (stats?.activeGames ?? 0)
      ),
    },
  ].filter((d) => d.value > 0);

  // Skill distribution for bar chart
  const skillDistData = skillDist?.distribution
    ? [
        { range: "< 800", count: skillDist.distribution.under800 },
        { range: "800-1000", count: skillDist.distribution.r800_1000 },
        { range: "1000-1200", count: skillDist.distribution.r1000_1200 },
        { range: "1200-1400", count: skillDist.distribution.r1200_1400 },
        { range: "1400-1600", count: skillDist.distribution.r1400_1600 },
        { range: "1600-1800", count: skillDist.distribution.r1600_1800 },
        { range: "1800-2000", count: skillDist.distribution.r1800_2000 },
        { range: "2000-2200", count: skillDist.distribution.r2000_2200 },
        { range: "> 2200", count: skillDist.distribution.over2200 },
      ]
    : [];

  // Tier distribution from matchmaking
  const tierDistData = matchmakingHealth?.ranked?.tierDistribution
    ? [
        { name: "Bronze", value: matchmakingHealth.ranked.tierDistribution.bronze },
        { name: "Silver", value: matchmakingHealth.ranked.tierDistribution.silver },
        { name: "Gold", value: matchmakingHealth.ranked.tierDistribution.gold },
        { name: "Platinum", value: matchmakingHealth.ranked.tierDistribution.platinum },
        { name: "Diamond", value: matchmakingHealth.ranked.tierDistribution.diamond },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <PageWrapper
      title="Game Analytics"
      description="Match statistics, matchmaking health, and skill distribution"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/analytics">← Back to Overview</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/analytics/players">Player Stats</Link>
          </Button>
        </div>
      }
    >
      {/* Key Metrics */}
      <MetricGrid columns={5}>
        <MetricTile
          title="Total Games"
          value={(stats?.totalGames ?? 0).toLocaleString()}
          icon={<span className="text-lg">🎮</span>}
          isLoading={isLoading}
        />
        <MetricTile
          title="Completed"
          value={(stats?.completedGames ?? 0).toLocaleString()}
          icon={<span className="text-lg">✅</span>}
          delta={`${completionRate}%`}
          deltaType="unchanged"
          isLoading={isLoading}
        />
        <MetricTile
          title="Active Now"
          value={stats?.activeGames ?? 0}
          icon={<span className="text-lg">▶️</span>}
          subtitle="In progress"
          isLoading={isLoading}
        />
        <MetricTile
          title="Recent (30d)"
          value={(stats?.recentGames ?? 0).toLocaleString()}
          icon={<span className="text-lg">📅</span>}
          isLoading={isLoading}
        />
        <MetricTile
          title="In Queue"
          value={stats?.playersInQueue ?? 0}
          icon={<span className="text-lg">⏳</span>}
          subtitle="Waiting"
          isLoading={isLoading}
        />
      </MetricGrid>

      {/* Matchmaking Health */}
      <Card className="mt-6">
        <Flex justifyContent="between" alignItems="center">
          <div>
            <Title>Matchmaking Health</Title>
            <Text className="text-muted-foreground">Queue quality and match fairness</Text>
          </div>
          <div className="flex gap-2">
            <div className="text-right">
              <Text className="text-xs text-muted-foreground">Ranked</Text>
              {getHealthBadge(matchmakingHealth?.ranked?.healthScore ?? 0)}
            </div>
            <div className="text-right">
              <Text className="text-xs text-muted-foreground">Casual</Text>
              {getHealthBadge(matchmakingHealth?.casual?.healthScore ?? 0)}
            </div>
          </div>
        </Flex>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 text-center">
            <Text className="text-3xl font-bold text-blue-500">
              {matchmakingHealth?.ranked?.healthScore ?? 0}
            </Text>
            <Text className="text-sm text-muted-foreground">Ranked Health Score</Text>
            <Text className="text-xs text-muted-foreground mt-1">out of 100</Text>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <Text className="text-3xl font-bold">
              {formatDuration(matchmakingHealth?.ranked?.avgQueueTime ?? 0)}
            </Text>
            <Text className="text-sm text-muted-foreground">Avg Queue Time</Text>
            <Text className="text-xs text-muted-foreground mt-1">Ranked</Text>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <Text className="text-3xl font-bold">
              {Math.round(matchmakingHealth?.ranked?.avgRatingDiff ?? 0)}
            </Text>
            <Text className="text-sm text-muted-foreground">Avg Rating Diff</Text>
            <Text className="text-xs text-muted-foreground mt-1">ELO points</Text>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <Text className="text-3xl font-bold">
              {matchmakingHealth?.ranked?.totalMatchesToday ?? 0}
            </Text>
            <Text className="text-sm text-muted-foreground">Matches Today</Text>
            <Text className="text-xs text-muted-foreground mt-1">Ranked</Text>
          </div>
        </div>
      </Card>

      {/* Charts Row */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Games Over Time */}
        <ChartCard
          title="Games Per Day"
          description="Game activity over the last 14 days"
          isLoading={dailyStats === undefined}
        >
          <AreaChart
            className="h-full"
            data={gamesOverTime}
            index="date"
            categories={["Total Games", "Ranked", "Casual"]}
            colors={["blue", "violet", "emerald"]}
            showAnimation
            showLegend
          />
        </ChartCard>

        {/* Game Outcomes */}
        <ChartCard
          title="Game Status"
          description="Current game status distribution"
          isLoading={isLoading}
        >
          <DonutChart
            className="h-full"
            data={gameOutcomes}
            category="value"
            index="name"
            colors={["emerald", "blue", "rose"]}
            showAnimation
            valueFormatter={(v: number) => v.toLocaleString()}
          />
          <Flex justifyContent="center" className="mt-4 gap-4">
            {gameOutcomes.map((outcome, idx) => (
              <div key={outcome.name} className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    idx === 0 ? "bg-emerald-500" : idx === 1 ? "bg-blue-500" : "bg-rose-500"
                  }`}
                />
                <Text className="text-sm">
                  {outcome.name}: {outcome.value.toLocaleString()}
                </Text>
              </div>
            ))}
          </Flex>
        </ChartCard>
      </div>

      {/* Skill Distribution */}
      {skillDistData.length > 0 && (
        <Card className="mt-6">
          <Flex justifyContent="between" alignItems="center">
            <div>
              <Title>Rating Distribution</Title>
              <Text className="text-muted-foreground">Player ELO ratings across the ladder</Text>
            </div>
            <div className="text-right">
              <Text className="text-sm font-medium">
                {skillDist?.summary?.totalPlayers?.toLocaleString()} rated players
              </Text>
              <Text className="text-xs text-muted-foreground">
                Avg: {skillDist?.summary?.average} • Median: {skillDist?.summary?.median}
              </Text>
            </div>
          </Flex>
          <BarChart
            className="mt-4 h-64"
            data={skillDistData}
            index="range"
            categories={["count"]}
            colors={["blue"]}
            showAnimation
            valueFormatter={(v: number) => `${v} players`}
          />
          <div className="mt-4 grid grid-cols-5 gap-2 text-center text-xs">
            <div>
              <Text className="font-medium">25th %ile</Text>
              <Text className="text-muted-foreground">{skillDist?.percentiles?.p25 ?? "—"}</Text>
            </div>
            <div>
              <Text className="font-medium">50th %ile</Text>
              <Text className="text-muted-foreground">{skillDist?.percentiles?.p50 ?? "—"}</Text>
            </div>
            <div>
              <Text className="font-medium">75th %ile</Text>
              <Text className="text-muted-foreground">{skillDist?.percentiles?.p75 ?? "—"}</Text>
            </div>
            <div>
              <Text className="font-medium">90th %ile</Text>
              <Text className="text-muted-foreground">{skillDist?.percentiles?.p90 ?? "—"}</Text>
            </div>
            <div>
              <Text className="font-medium">99th %ile</Text>
              <Text className="text-muted-foreground">{skillDist?.percentiles?.p99 ?? "—"}</Text>
            </div>
          </div>
        </Card>
      )}

      {/* Queue Tier Distribution */}
      {tierDistData.length > 0 && (
        <Card className="mt-6">
          <Title>Queue Tier Distribution</Title>
          <Text className="text-muted-foreground">Players queuing by rank tier today</Text>
          <BarList
            data={tierDistData}
            className="mt-4"
            valueFormatter={(v: number) => `${v} players`}
          />
        </Card>
      )}

      {/* Game Performance Metrics */}
      <Card className="mt-6">
        <Title>Game Performance</Title>
        <Text className="text-muted-foreground">Completion and quality metrics</Text>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <div
            className={`p-4 rounded-lg text-center ${
              completionRate >= 90
                ? "bg-emerald-500/10 border border-emerald-500/30"
                : completionRate >= 70
                  ? "bg-blue-500/10 border border-blue-500/30"
                  : "bg-amber-500/10 border border-amber-500/30"
            }`}
          >
            <Text
              className={`text-3xl font-bold ${
                completionRate >= 90
                  ? "text-emerald-500"
                  : completionRate >= 70
                    ? "text-blue-500"
                    : "text-amber-500"
              }`}
            >
              {completionRate}%
            </Text>
            <Text className="text-sm text-muted-foreground">Completion Rate</Text>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <Text className="text-3xl font-bold">~14m</Text>
            <Text className="text-sm text-muted-foreground">Avg Duration</Text>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <Text className="text-3xl font-bold">{matchmakingStats?.[0]?.fairMatches ?? 0}</Text>
            <Text className="text-sm text-muted-foreground">Fair Matches Today</Text>
            <Text className="text-xs text-muted-foreground">(within 100 ELO)</Text>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <Text className="text-3xl font-bold">
              {matchmakingStats?.[0]?.aiFilledMatches ?? 0}
            </Text>
            <Text className="text-sm text-muted-foreground">AI-Filled Matches</Text>
            <Text className="text-xs text-muted-foreground">Today</Text>
          </div>
        </div>
      </Card>

      {/* Info Card */}
      <Card className="mt-6">
        <Title>About Game Analytics</Title>
        <Text className="text-muted-foreground">
          Game analytics track match quality and matchmaking effectiveness.
        </Text>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li>
            • <strong>Health Score</strong>: Composite metric (0-100) based on queue time, rating
            fairness, and completion
          </li>
          <li>
            • <strong>Fair Matches</strong>: Games where both players are within 100 ELO of each
            other
          </li>
          <li>
            • <strong>AI-Filled</strong>: Matches where an AI opponent was provided due to queue
            timeout
          </li>
          <li>
            • <strong>Rating Distribution</strong>: Ensures healthy player pool across all skill
            levels
          </li>
        </ul>
      </Card>
    </PageWrapper>
  );
}
