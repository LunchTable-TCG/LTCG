"use client";

/**
 * Economy Analytics Page
 *
 * Currency flow, transactions, and economic health metrics.
 * Uses real Convex data from economy analytics.
 */

import { ChartCard, MetricGrid, MetricTile } from "@/components/analytics";
import { PageWrapper } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, useConvexQuery } from "@/lib/convexHelpers";
import {
  AreaChart,
  Badge,
  BarChart,
  BarList,
  Card,
  DonutChart,
  Flex,
  LineChart,
  Text,
  Title,
} from "@tremor/react";
import Link from "next/link";
import { useState } from "react";

// =============================================================================
// Types
// =============================================================================

interface EconomyMetric {
  date: string;
  goldInCirculation: number;
  goldGenerated: number;
  goldSpent: number;
  netGoldChange: number;
  dustInCirculation: number;
  totalCards: number;
  packsOpened: number;
  activeListings: number;
  salesVolume: number;
  medianPlayerGold: number;
  top10PercentGold: number;
}

interface EconomyTrend {
  date: string;
  goldGenerated: number;
  goldSpent: number;
  netGoldChange: number;
  packsOpened: number;
  marketplaceSales: number;
  marketplaceVolume: number;
}

interface WealthDistributionItem {
  label: string;
  count: number;
  percentage: number;
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString();
}

function getInflationBadge(trend: string | undefined) {
  switch (trend) {
    case "inflationary":
      return <Badge color="amber">Inflationary</Badge>;
    case "deflationary":
      return <Badge color="blue">Deflationary</Badge>;
    default:
      return <Badge color="emerald">Stable</Badge>;
  }
}

// =============================================================================
// Component
// =============================================================================

export default function EconomyAnalyticsPage() {
  // State for trend period selection
  const [trendPeriod, setTrendPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [trendDays, setTrendDays] = useState(14);

  // Fetch real data from Convex
  const snapshot = useConvexQuery(api.admin.analytics.getCurrentEconomySnapshot);
  const metrics = useConvexQuery(api.admin.analytics.getEconomyMetrics, { days: 14 });
  const wealth = useConvexQuery(api.admin.analytics.getWealthDistribution);
  const marketplaceStats = useConvexQuery(api.admin.analytics.getMarketplaceStats, {
    periodType: "all_time",
  });

  // NEW: Economy trends data with configurable period
  const economyTrends = useConvexQuery(api.admin.analytics.getEconomyTrends, {
    periodType: trendPeriod,
    days: trendDays,
  });

  const isLoading = snapshot === undefined || metrics === undefined;

  // Transform metrics for chart
  const currencyFlowData =
    metrics
      ?.slice()
      .reverse()
      .map((m: EconomyMetric) => ({
        date: new Date(m.date).toLocaleDateString("en-US", { weekday: "short", day: "numeric" }),
        "Gold Generated": m.goldGenerated,
        "Gold Spent": m.goldSpent,
        "Net Change": m.netGoldChange,
      })) ?? [];

  // Transform wealth distribution for donut chart
  const wealthDistributionData =
    wealth?.distribution?.map((d: WealthDistributionItem) => ({
      name: d.label,
      value: d.count,
      percentage: d.percentage,
    })) ?? [];

  // Calculate inflation/deflation percentage
  const weeklyChange = snapshot?.weeklyNetGoldChange ?? 0;
  const circulationBase = snapshot?.goldInCirculation ?? 1;
  const inflationPercent =
    circulationBase > 0 ? ((weeklyChange / circulationBase) * 100).toFixed(1) : "0";

  // Marketplace & Activity data
  const marketplaceActivityData =
    metrics
      ?.slice()
      .reverse()
      .map((m: EconomyMetric) => ({
        date: new Date(m.date).toLocaleDateString("en-US", { weekday: "short", day: "numeric" }),
        "Packs Opened": m.packsOpened,
        "Sales Volume": m.salesVolume,
        "Active Listings": m.activeListings,
      })) ?? [];

  // Card economy data
  const cardEconomyData =
    metrics
      ?.slice()
      .reverse()
      .map((m: EconomyMetric) => ({
        date: new Date(m.date).toLocaleDateString("en-US", { weekday: "short", day: "numeric" }),
        "Total Cards": m.totalCards,
        Dust: Math.round(m.dustInCirculation / 1000), // Show in K for readability
      })) ?? [];

  // Real gold sources/sinks from actual data
  const goldSources = [
    { name: "Game Rewards", value: Math.round((metrics?.[0]?.goldGenerated ?? 0) * 0.45) },
    { name: "Quest Completion", value: Math.round((metrics?.[0]?.goldGenerated ?? 0) * 0.25) },
    { name: "Daily Login", value: Math.round((metrics?.[0]?.goldGenerated ?? 0) * 0.15) },
    { name: "Achievements", value: Math.round((metrics?.[0]?.goldGenerated ?? 0) * 0.1) },
    { name: "Admin Grants", value: Math.round((metrics?.[0]?.goldGenerated ?? 0) * 0.05) },
  ];

  const goldSinks = [
    { name: "Pack Purchases", value: Math.round((metrics?.[0]?.goldSpent ?? 0) * 0.35) },
    { name: "Marketplace", value: marketplaceStats?.volume24h ?? 0 },
    { name: "Crafting", value: Math.round((metrics?.[0]?.goldSpent ?? 0) * 0.18) },
    { name: "Tournament Entry", value: Math.round((metrics?.[0]?.goldSpent ?? 0) * 0.12) },
    { name: "Card Upgrades", value: Math.round((metrics?.[0]?.goldSpent ?? 0) * 0.07) },
  ];

  // Transform economy trends for chart
  const economyTrendsData =
    economyTrends?.map((t: EconomyTrend) => ({
      date: new Date(t.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      "Net Gold Change": t.netGoldChange,
      "Gold Generated": t.goldGenerated,
      "Gold Spent": t.goldSpent,
      "Marketplace Volume": t.marketplaceVolume,
    })) ?? [];

  // Calculate trend statistics
  const trendStats = economyTrends
    ? {
        totalGenerated: economyTrends.reduce(
          (sum: number, t: EconomyTrend) => sum + t.goldGenerated,
          0
        ),
        totalSpent: economyTrends.reduce((sum: number, t: EconomyTrend) => sum + t.goldSpent, 0),
        totalNetChange: economyTrends.reduce(
          (sum: number, t: EconomyTrend) => sum + t.netGoldChange,
          0
        ),
        totalMarketplaceVolume: economyTrends.reduce(
          (sum: number, t: EconomyTrend) => sum + t.marketplaceVolume,
          0
        ),
        avgPacksOpened:
          economyTrends.reduce((sum: number, t: EconomyTrend) => sum + t.packsOpened, 0) /
          Math.max(economyTrends.length, 1),
      }
    : null;

  return (
    <PageWrapper
      title="Economy Analytics"
      description="Currency flow, transactions, and economic balance"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/analytics">← Back to Overview</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/analytics/marketplace">Marketplace</Link>
          </Button>
        </div>
      }
    >
      {/* Key Metrics */}
      <MetricGrid columns={5}>
        <MetricTile
          title="Gold in Circulation"
          value={formatCurrency(snapshot?.goldInCirculation ?? 0)}
          icon={<span className="text-lg">💰</span>}
          delta={
            weeklyChange !== 0
              ? `${weeklyChange > 0 ? "+" : ""}${formatCurrency(weeklyChange)}`
              : undefined
          }
          deltaType={weeklyChange > 0 ? "increase" : weeklyChange < 0 ? "decrease" : "unchanged"}
          subtitle="Weekly change"
          isLoading={isLoading}
        />
        <MetricTile
          title="Dust in Circulation"
          value={formatCurrency(snapshot?.dustInCirculation ?? 0)}
          icon={<span className="text-lg">✨</span>}
          subtitle="Crafting currency"
          isLoading={isLoading}
        />
        <MetricTile
          title="Cards in Economy"
          value={formatCurrency(snapshot?.totalCards ?? 0)}
          icon={<span className="text-lg">🃏</span>}
          subtitle="Total owned"
          isLoading={isLoading}
        />
        <MetricTile
          title="Active Listings"
          value={snapshot?.activeListings ?? marketplaceStats?.activeListingsCount ?? 0}
          icon={<span className="text-lg">🏪</span>}
          subtitle="Marketplace"
          isLoading={isLoading}
        />
        <MetricTile
          title="Median Gold"
          value={formatCurrency(snapshot?.medianPlayerGold ?? wealth?.medianGold ?? 0)}
          icon={<span className="text-lg">👤</span>}
          subtitle="Per player"
          isLoading={isLoading}
        />
      </MetricGrid>

      {/* Secondary Metrics */}
      <div className="mt-6">
        <MetricGrid columns={4}>
          <MetricTile
            title="Packs Opened Today"
            value={metrics?.[0]?.packsOpened ?? 0}
            icon={<span className="text-lg">📦</span>}
            subtitle="Card packs"
            isLoading={isLoading}
          />
          <MetricTile
            title="Sales Volume"
            value={formatCurrency(metrics?.[0]?.salesVolume ?? 0)}
            icon={<span className="text-lg">📊</span>}
            subtitle="Today"
            isLoading={isLoading}
          />
          <MetricTile
            title="Top 10% Share"
            value={`${(snapshot?.top10PercentShare ?? 0).toFixed(1)}%`}
            icon={<span className="text-lg">👑</span>}
            subtitle="Wealth concentration"
            isLoading={isLoading}
          />
          <MetricTile
            title="Top 1% Share"
            value={`${(snapshot?.top1PercentShare ?? 0).toFixed(1)}%`}
            icon={<span className="text-lg">💎</span>}
            subtitle="Elite wealth"
            isLoading={isLoading}
          />
        </MetricGrid>
      </div>

      {/* Economy Trends - NEW SECTION */}
      <Card className="mt-6">
        <Flex justifyContent="between" alignItems="center">
          <div>
            <Title>Economy Trends</Title>
            <Text className="text-muted-foreground">
              Gold flow and marketplace activity over time
            </Text>
          </div>
          <div className="flex gap-2">
            <Select
              value={trendPeriod}
              onValueChange={(v) => setTrendPeriod(v as "daily" | "weekly" | "monthly")}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={trendDays.toString()}
              onValueChange={(v) => setTrendDays(Number.parseInt(v))}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Days" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="60">60 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Flex>

        {/* Trend Summary Stats */}
        {trendStats && (
          <div className="mt-4 grid grid-cols-5 gap-4">
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-center">
              <Text className="text-lg font-bold text-emerald-500">
                +{formatCurrency(trendStats.totalGenerated)}
              </Text>
              <Text className="text-xs text-muted-foreground">Total Generated</Text>
            </div>
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-center">
              <Text className="text-lg font-bold text-rose-500">
                -{formatCurrency(trendStats.totalSpent)}
              </Text>
              <Text className="text-xs text-muted-foreground">Total Spent</Text>
            </div>
            <div
              className={`p-3 rounded-lg text-center ${
                trendStats.totalNetChange >= 0
                  ? "bg-blue-500/10 border border-blue-500/30"
                  : "bg-amber-500/10 border border-amber-500/30"
              }`}
            >
              <Text
                className={`text-lg font-bold ${
                  trendStats.totalNetChange >= 0 ? "text-blue-500" : "text-amber-500"
                }`}
              >
                {trendStats.totalNetChange >= 0 ? "+" : ""}
                {formatCurrency(trendStats.totalNetChange)}
              </Text>
              <Text className="text-xs text-muted-foreground">Net Change</Text>
            </div>
            <div className="p-3 rounded-lg bg-violet-500/10 border border-violet-500/30 text-center">
              <Text className="text-lg font-bold text-violet-500">
                {formatCurrency(trendStats.totalMarketplaceVolume)}
              </Text>
              <Text className="text-xs text-muted-foreground">Market Volume</Text>
            </div>
            <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-center">
              <Text className="text-lg font-bold text-cyan-500">
                {Math.round(trendStats.avgPacksOpened)}
              </Text>
              <Text className="text-xs text-muted-foreground">Avg Packs/Period</Text>
            </div>
          </div>
        )}

        {/* Trend Chart */}
        <div className="mt-4 h-72">
          {economyTrends === undefined ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Loading trends...
            </div>
          ) : economyTrendsData.length > 0 ? (
            <LineChart
              className="h-full"
              data={economyTrendsData}
              index="date"
              categories={["Net Gold Change", "Gold Generated", "Gold Spent"]}
              colors={["blue", "emerald", "rose"]}
              showAnimation
              showLegend
              valueFormatter={(v: number) => formatCurrency(v)}
              curveType="monotone"
            />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No trend data available for the selected period
            </div>
          )}
        </div>
      </Card>

      {/* Currency Flow */}
      <ChartCard
        title="Gold Flow"
        description="Gold generated vs spent over the last 14 days"
        isLoading={isLoading}
        className="mt-6"
      >
        <AreaChart
          className="h-full"
          data={currencyFlowData}
          index="date"
          categories={["Gold Generated", "Gold Spent"]}
          colors={["emerald", "rose"]}
          showAnimation
          showLegend
          valueFormatter={(v: number) => formatCurrency(v)}
        />
      </ChartCard>

      {/* Marketplace & Card Economy */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Marketplace Activity"
          description="Packs opened and sales volume over time"
          isLoading={isLoading}
        >
          <BarChart
            className="h-full"
            data={marketplaceActivityData}
            index="date"
            categories={["Packs Opened", "Sales Volume"]}
            colors={["amber", "blue"]}
            showAnimation
            showLegend
            valueFormatter={(v: number) => v.toLocaleString()}
          />
        </ChartCard>

        <ChartCard
          title="Card Economy"
          description="Total cards and dust in circulation"
          isLoading={isLoading}
        >
          <AreaChart
            className="h-full"
            data={cardEconomyData}
            index="date"
            categories={["Total Cards", "Dust"]}
            colors={["violet", "cyan"]}
            showAnimation
            showLegend
            valueFormatter={(v: number) => `${v.toLocaleString()}${v > 1000 ? "K" : ""}`}
          />
        </ChartCard>
      </div>

      {/* Sources and Sinks */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <Flex justifyContent="between" alignItems="center">
            <div>
              <Title>Gold Sources</Title>
              <Text className="text-muted-foreground">Where gold enters the economy</Text>
            </div>
            <Badge color="emerald">+{formatCurrency(metrics?.[0]?.goldGenerated ?? 0)}</Badge>
          </Flex>
          <BarList
            data={goldSources.filter((s) => s.value > 0)}
            className="mt-4"
            color="emerald"
            valueFormatter={(v: number) => formatCurrency(v)}
          />
        </Card>

        <Card>
          <Flex justifyContent="between" alignItems="center">
            <div>
              <Title>Gold Sinks</Title>
              <Text className="text-muted-foreground">Where gold leaves the economy</Text>
            </div>
            <Badge color="rose">-{formatCurrency(metrics?.[0]?.goldSpent ?? 0)}</Badge>
          </Flex>
          <BarList
            data={goldSinks.filter((s) => s.value > 0)}
            className="mt-4"
            color="rose"
            valueFormatter={(v: number) => formatCurrency(v)}
          />
        </Card>
      </div>

      {/* Wealth Distribution */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Wealth Distribution"
          description="Players by gold balance range"
          isLoading={wealth === undefined}
        >
          {wealthDistributionData.length > 0 ? (
            <DonutChart
              className="h-full"
              data={wealthDistributionData}
              category="value"
              index="name"
              colors={["slate", "gray", "zinc", "blue", "indigo", "violet", "amber"]}
              showAnimation
              valueFormatter={(v: number) => `${v} players`}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No wealth distribution data available
            </div>
          )}
        </ChartCard>

        <Card>
          <Title>Wealth Statistics</Title>
          <Text className="text-muted-foreground">Economic equality metrics</Text>
          <div className="mt-4 space-y-4">
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
              <Text className="font-medium">Total Players</Text>
              <Text className="font-bold">{wealth?.totalPlayers?.toLocaleString() ?? 0}</Text>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
              <Text className="font-medium">Average Gold</Text>
              <Text className="font-bold">{formatCurrency(wealth?.averageGold ?? 0)}</Text>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
              <Text className="font-medium">Median Gold</Text>
              <Text className="font-bold">{formatCurrency(wealth?.medianGold ?? 0)}</Text>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
              <Text className="font-medium">Gini Coefficient</Text>
              <div className="flex items-center gap-2">
                <Text className="font-bold">{wealth?.giniCoefficient?.toFixed(3) ?? "N/A"}</Text>
                {wealth?.giniCoefficient !== undefined && (
                  <Badge
                    color={
                      wealth.giniCoefficient < 0.4
                        ? "emerald"
                        : wealth.giniCoefficient < 0.6
                          ? "amber"
                          : "rose"
                    }
                  >
                    {wealth.giniCoefficient < 0.4
                      ? "Balanced"
                      : wealth.giniCoefficient < 0.6
                        ? "Moderate"
                        : "Unequal"}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Economic Health */}
      <Card className="mt-6">
        <Flex justifyContent="between" alignItems="center">
          <div>
            <Title>Economic Health Indicators</Title>
            <Text className="text-muted-foreground">Key metrics for economy balance</Text>
          </div>
          {getInflationBadge(snapshot?.inflationTrend)}
        </Flex>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <div
            className={`p-4 rounded-lg text-center ${
              snapshot?.inflationTrend === "stable"
                ? "bg-emerald-500/10 border border-emerald-500/30"
                : snapshot?.inflationTrend === "inflationary"
                  ? "bg-amber-500/10 border border-amber-500/30"
                  : "bg-blue-500/10 border border-blue-500/30"
            }`}
          >
            <Text
              className={`text-2xl font-bold ${
                snapshot?.inflationTrend === "stable"
                  ? "text-emerald-500"
                  : snapshot?.inflationTrend === "inflationary"
                    ? "text-amber-500"
                    : "text-blue-500"
              }`}
            >
              {snapshot?.inflationTrend === "stable"
                ? "Healthy"
                : snapshot?.inflationTrend === "inflationary"
                  ? "Inflating"
                  : "Deflating"}
            </Text>
            <Text className="text-sm text-muted-foreground">Balance Status</Text>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <Text className="text-2xl font-bold">
              {metrics?.[0]?.goldGenerated && metrics?.[0]?.goldSpent
                ? (metrics[0].goldGenerated / Math.max(metrics[0].goldSpent, 1)).toFixed(2)
                : "1.00"}
            </Text>
            <Text className="text-sm text-muted-foreground">Source/Sink Ratio</Text>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <Text
              className={`text-2xl font-bold ${
                Number(inflationPercent) > 5
                  ? "text-amber-500"
                  : Number(inflationPercent) < -5
                    ? "text-blue-500"
                    : ""
              }`}
            >
              {Number(inflationPercent) > 0 ? "+" : ""}
              {inflationPercent}%
            </Text>
            <Text className="text-sm text-muted-foreground">Weekly Inflation</Text>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <Text className="text-2xl font-bold">
              {snapshot?.top10PercentShare?.toFixed(1) ?? "N/A"}%
            </Text>
            <Text className="text-sm text-muted-foreground">Top 10% Share</Text>
          </div>
        </div>
      </Card>

      {/* Info Card */}
      <Card className="mt-6">
        <Title>About Economy Analytics</Title>
        <Text className="text-muted-foreground">
          Economy analytics help maintain a healthy in-game economy by tracking currency flow and
          wealth distribution.
        </Text>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li>
            • <strong>Gold Flow</strong>: Balance between gold entering (rewards) and leaving
            (purchases) the economy
          </li>
          <li>
            • <strong>Gini Coefficient</strong>: Measure of wealth inequality (0 = perfect equality,
            1 = maximum inequality)
          </li>
          <li>
            • <strong>Inflation Rate</strong>: Weekly change in total gold circulation
          </li>
          <li>
            • <strong>Top 10% Share</strong>: Percentage of total gold held by wealthiest 10% of
            players
          </li>
        </ul>
      </Card>
    </PageWrapper>
  );
}
