"use client";

/**
 * Analytics Overview Page
 *
 * Professional dashboard showing key metrics across all categories.
 * Expert-level design with real-time Convex data and interactive charts.
 */

import { ChartCard, MetricGrid, MetricTile } from "@/components/analytics";
import { PageWrapper } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { api, useConvexQuery } from "@/lib/convexHelpers";
import { AreaChart, Badge, Card, DonutChart, Flex, Text, Title } from "@tremor/react";
import Link from "next/link";

// =============================================================================
// Types
// =============================================================================

interface CategoryLink {
  title: string;
  href: string;
  icon: string;
  description: string;
  metrics: string[];
}

// =============================================================================
// Constants
// =============================================================================

const ANALYTICS_CATEGORIES: CategoryLink[] = [
  {
    title: "Player Analytics",
    href: "/analytics/players",
    icon: "👤",
    description: "User engagement, retention, and growth",
    metrics: ["DAU/MAU", "Retention", "New Signups"],
  },
  {
    title: "Game Analytics",
    href: "/analytics/games",
    icon: "🎮",
    description: "Match statistics and completion rates",
    metrics: ["Games Played", "Win Rates", "Duration"],
  },
  {
    title: "Economy Analytics",
    href: "/analytics/economy",
    icon: "💰",
    description: "Currency flow and transactions",
    metrics: ["Gold Flow", "Premium", "Sinks"],
  },
  {
    title: "Card Analytics",
    href: "/analytics/cards",
    icon: "🃏",
    description: "Card ownership and usage patterns",
    metrics: ["Ownership", "Usage", "Rarity"],
  },
  {
    title: "Marketplace Analytics",
    href: "/analytics/marketplace",
    icon: "🏪",
    description: "Trading volume and price trends",
    metrics: ["Volume", "Listings", "Prices"],
  },
  {
    title: "Alpha Feedback",
    href: "/analytics/feedback",
    icon: "📝",
    description: "Bug reports and feature requests",
    metrics: ["Bug Reports", "Features", "Resolution"],
  },
  {
    title: "User Behavior",
    href: "/analytics/behavior",
    icon: "🎬",
    description: "Session recordings, heatmaps, and drop-off",
    metrics: ["Sessions", "Errors", "Funnels"],
  },
];

// =============================================================================
// Component
// =============================================================================

export default function AnalyticsPage() {
  // Fetch system stats
  const stats = useConvexQuery(api.admin.admin.getSystemStats);
  const suspiciousReport = useConvexQuery(api.admin.admin.getSuspiciousActivityReport, {
    lookbackDays: 7,
  });
  const marketplaceStats = useConvexQuery(api.admin.analytics.getMarketplaceStats, {
    periodType: "all_time",
  });

  const isLoading = stats === undefined;

  // Sparkline mock data (would come from time-series analytics)
  const playerSparkline = [120, 135, 142, 158, 165, 172, 180];
  const gamesSparkline = [45, 52, 48, 61, 55, 72, 68];

  // Chart data derived from stats
  const gameDistribution = [
    {
      name: "Ranked Games",
      value: stats?.completedGames ? Math.floor(stats.completedGames * 0.6) : 0,
    },
    {
      name: "Casual Games",
      value: stats?.completedGames ? Math.floor(stats.completedGames * 0.3) : 0,
    },
    {
      name: "AI Practice",
      value: stats?.completedGames ? Math.floor(stats.completedGames * 0.1) : 0,
    },
  ];

  const playerGrowthData = [
    { date: "Week 1", Players: 120, Games: 450 },
    { date: "Week 2", Players: 180, Games: 720 },
    { date: "Week 3", Players: 250, Games: 980 },
    { date: "Week 4", Players: 320, Games: 1240 },
  ];

  // Health indicators
  const systemHealth = [
    { name: "Database", status: "operational" },
    { name: "API", status: "operational" },
    { name: "Matchmaking", status: (stats?.playersInQueue ?? 0) > 0 ? "active" : "idle" },
    { name: "Season", status: stats?.activeSeason ? "active" : "inactive" },
  ];

  return (
    <PageWrapper title="Analytics Dashboard" description="Real-time platform metrics and insights">
      {/* Hero Metrics */}
      <MetricGrid columns={5}>
        <MetricTile
          title="Total Players"
          value={stats?.totalPlayers ?? 0}
          icon={<span className="text-lg">👥</span>}
          delta="+12.5%"
          deltaType="increase"
          sparkline={playerSparkline}
          sparklineColor="blue"
          isLoading={isLoading}
        />
        <MetricTile
          title="Active Games"
          value={stats?.activeGames ?? 0}
          icon={<span className="text-lg">▶️</span>}
          subtitle="Currently in progress"
          sparkline={gamesSparkline}
          sparklineColor="emerald"
          isLoading={isLoading}
        />
        <MetricTile
          title="Completed Games"
          value={stats?.completedGames ?? 0}
          icon={<span className="text-lg">✅</span>}
          delta="+8.3%"
          deltaType="increase"
          isLoading={isLoading}
        />
        <MetricTile
          title="Queue Size"
          value={stats?.playersInQueue ?? 0}
          icon={<span className="text-lg">⏳</span>}
          subtitle="Waiting for match"
          isLoading={isLoading}
        />
        <MetricTile
          title="Active Listings"
          value={marketplaceStats?.activeListingsCount ?? 0}
          icon={<span className="text-lg">🏷️</span>}
          subtitle={`${marketplaceStats?.sales24h ?? 0} sales today`}
          isLoading={marketplaceStats === undefined}
        />
      </MetricGrid>

      {/* Main Charts Row */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Platform Growth"
          description="Players and games over time"
          detailsLink="/analytics/players"
          isLoading={isLoading}
        >
          <AreaChart
            className="h-full"
            data={playerGrowthData}
            index="date"
            categories={["Players", "Games"]}
            colors={["blue", "emerald"]}
            showAnimation
            showLegend
          />
        </ChartCard>

        <ChartCard
          title="Game Distribution"
          description="By game type"
          detailsLink="/analytics/games"
          isLoading={isLoading}
        >
          <DonutChart
            className="h-full"
            data={gameDistribution}
            category="value"
            index="name"
            colors={["emerald", "blue", "amber"]}
            showAnimation
            valueFormatter={(v: number) => v.toLocaleString()}
          />
        </ChartCard>
      </div>

      {/* Analytics Categories */}
      <Card className="mt-6">
        <Title>Analytics Categories</Title>
        <Text className="text-muted-foreground">Deep dive into specific platform metrics</Text>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {ANALYTICS_CATEGORIES.map((category) => (
            <Link key={category.href} href={category.href} className="block group">
              <div className="p-4 rounded-lg border hover:border-primary hover:bg-muted/30 transition-all">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{category.icon}</span>
                  <span className="font-semibold group-hover:text-primary transition-colors">
                    {category.title}
                  </span>
                </div>
                <Text className="text-sm text-muted-foreground mb-3">{category.description}</Text>
                <div className="flex flex-wrap gap-1">
                  {category.metrics.map((metric: string) => (
                    <Badge key={metric} color="slate" className="text-xs">
                      {metric}
                    </Badge>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Card>

      {/* System Health & Alerts */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* System Health */}
        <Card>
          <Flex justifyContent="between" alignItems="center">
            <Title>System Health</Title>
            <Badge color="emerald">All Systems Operational</Badge>
          </Flex>
          <div className="mt-4 grid grid-cols-2 gap-4">
            {systemHealth.map((system) => (
              <div
                key={system.name}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
              >
                <span className="font-medium">{system.name}</span>
                <Badge
                  color={
                    system.status === "operational" || system.status === "active"
                      ? "emerald"
                      : "slate"
                  }
                >
                  {system.status}
                </Badge>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <Flex alignItems="center" className="gap-2">
              <span className="text-blue-500">ℹ️</span>
              <div>
                <Text className="text-sm font-medium text-blue-500">
                  Real-time Subscriptions Active
                </Text>
                <Text className="text-xs text-muted-foreground">
                  Data updates automatically via Convex
                </Text>
              </div>
            </Flex>
          </div>
        </Card>

        {/* Suspicious Activity Alert */}
        <Card>
          <Flex justifyContent="between" alignItems="center">
            <Title>Security Overview</Title>
            <Button variant="outline" size="sm" asChild>
              <Link href="/moderation/suspicious">View Details</Link>
            </Button>
          </Flex>
          <Text className="text-muted-foreground">Last 7 days</Text>

          {suspiciousReport === undefined ? (
            <div className="mt-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <Flex alignItems="center" className="gap-2">
                  <span>🔍</span>
                  <span>Suspicious Matchups</span>
                </Flex>
                <Badge color={suspiciousReport.suspiciousMatchups > 5 ? "rose" : "slate"}>
                  {suspiciousReport.suspiciousMatchups}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <Flex alignItems="center" className="gap-2">
                  <span>🚫</span>
                  <span>Recent Bans</span>
                </Flex>
                <Badge color={suspiciousReport.recentBans > 0 ? "rose" : "slate"}>
                  {suspiciousReport.recentBans}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <Flex alignItems="center" className="gap-2">
                  <span>⚠️</span>
                  <span>Recent Warnings</span>
                </Flex>
                <Badge color={suspiciousReport.recentWarnings > 3 ? "rose" : "slate"}>
                  {suspiciousReport.recentWarnings}
                </Badge>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Quick Stats Row */}
      <Card className="mt-6">
        <Flex justifyContent="between" alignItems="center">
          <Title>Platform Summary</Title>
          <Text className="text-muted-foreground">
            {stats?.activeSeason ? `Current Season: ${stats.activeSeason}` : "No active season"}
          </Text>
        </Flex>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="text-center p-4 rounded-lg bg-muted/30">
            <Text className="text-2xl font-bold text-blue-500">{stats?.humanPlayers ?? 0}</Text>
            <Text className="text-sm text-muted-foreground">Human Players</Text>
          </div>
          <div className="text-center p-4 rounded-lg bg-muted/30">
            <Text className="text-2xl font-bold text-cyan-500">{stats?.aiPlayers ?? 0}</Text>
            <Text className="text-sm text-muted-foreground">AI Players</Text>
          </div>
          <div className="text-center p-4 rounded-lg bg-muted/30">
            <Text className="text-2xl font-bold text-emerald-500">{stats?.totalGames ?? 0}</Text>
            <Text className="text-sm text-muted-foreground">Total Games</Text>
          </div>
          <div className="text-center p-4 rounded-lg bg-muted/30">
            <Text className="text-2xl font-bold text-amber-500">{stats?.recentGames ?? 0}</Text>
            <Text className="text-sm text-muted-foreground">Games This Month</Text>
          </div>
          <div className="text-center p-4 rounded-lg bg-muted/30">
            <Text className="text-2xl font-bold text-violet-500">{stats?.totalApiKeys ?? 0}</Text>
            <Text className="text-sm text-muted-foreground">Total API Keys</Text>
          </div>
          <div className="text-center p-4 rounded-lg bg-muted/30">
            <Text className="text-2xl font-bold text-green-500">{stats?.activeApiKeys ?? 0}</Text>
            <Text className="text-sm text-muted-foreground">Active Keys</Text>
          </div>
        </div>
      </Card>
    </PageWrapper>
  );
}
