"use client";

/**
 * Token Analytics Dashboard
 *
 * Comprehensive dashboard for LTCG token metrics including:
 * - Price chart with period selector
 * - Key metrics (price, market cap, holders, volume, bonding curve)
 * - Top holders table
 * - Recent trades with buy/sell badges
 * - Holder distribution chart
 * - Volume chart (buy vs sell)
 */

import { ChartCard, MetricGrid, MetricTile } from "@/components/analytics";
import { PageWrapper } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { typedApi, useTypedQuery } from "@/lib/convexTypedHelpers";
import { AreaChart, BarChart, DonutChart, Flex, Text, Title } from "@tremor/react";
import Link from "next/link";
import { useState } from "react";

// =============================================================================
// Types
// =============================================================================

type PricePeriod = "1h" | "24h" | "7d" | "30d";
type VolumePeriod = "1h" | "24h" | "7d";

interface PriceChartPoint {
  timestamp: number;
  priceUsd: number;
  volume: number;
}

interface TokenHolder {
  _id: string;
  address: string;
  balance: number;
  percentOwnership?: number;
  firstPurchaseAt?: number;
  lastActivityAt?: number;
  isPlatformWallet?: boolean;
}

interface TokenTrade {
  _id: string;
  signature: string;
  type: "buy" | "sell";
  traderAddress: string;
  tokenAmount: number;
  solAmount: number;
  pricePerToken: number;
  timestamp: number;
  isWhale?: boolean;
}

interface VolumeChartPoint {
  timestamp: number;
  buys: number;
  sells: number;
  buyVolume: number;
  sellVolume: number;
  totalVolume: number;
}

interface HolderDistributionBucket {
  label: string;
  count: number;
  percentage: number;
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatPrice(price: number) {
  if (price === 0) return "$0.00";
  if (price < 0.000001) return `$${price.toExponential(2)}`;
  if (price < 0.01) return `$${price.toFixed(6)}`;
  if (price < 1) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(2)}`;
}

function formatMarketCap(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toFixed(0)}`;
}

function formatSol(sol: number) {
  if (sol >= 1000) return `${(sol / 1000).toFixed(2)}K SOL`;
  if (sol >= 1) return `${sol.toFixed(2)} SOL`;
  return `${(sol * 1000).toFixed(1)} mSOL`;
}

function formatTokenAmount(amount: number) {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(2)}B`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(2)}K`;
  return amount.toFixed(0);
}

function formatAddress(address: string) {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatTimeAgo(timestamp: number) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function formatPercentChange(change: number) {
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(2)}%`;
}

// =============================================================================
// Component
// =============================================================================

export default function TokenAnalyticsPage() {
  // State for period selectors
  const [pricePeriod, setPricePeriod] = useState<PricePeriod>("24h");
  const [volumePeriod, setVolumePeriod] = useState<VolumePeriod>("24h");

  // Fetch data from Convex
  const latestMetrics = useTypedQuery(typedApi.tokenAnalytics.metrics.getLatest, {});
  const priceChart = useTypedQuery(typedApi.tokenAnalytics.metrics.getPriceChart, {
    period: pricePeriod,
  });
  const bondingProgress = useTypedQuery(
    typedApi.tokenAnalytics.metrics.getBondingCurveProgress,
    {}
  );

  const topHolders = useTypedQuery(typedApi.tokenAnalytics.holders.getTop, { limit: 10 });
  const holderDistribution = useTypedQuery(typedApi.tokenAnalytics.holders.getDistribution, {});

  const recentTrades = useTypedQuery(typedApi.tokenAnalytics.trades.getRecent, { limit: 20 });
  const tradeStats = useTypedQuery(typedApi.tokenAnalytics.trades.getStats, { period: "24h" });
  const volumeChart = useTypedQuery(typedApi.tokenAnalytics.trades.getVolumeChart, {
    period: volumePeriod,
  });

  const summary = useTypedQuery(typedApi.tokenAnalytics.rollup.getSummary, {});

  // Loading states
  const isMetricsLoading = latestMetrics === undefined || summary === undefined;
  const isPriceChartLoading = priceChart === undefined;
  const isHoldersLoading = topHolders === undefined || holderDistribution === undefined;
  const isTradesLoading = recentTrades === undefined || tradeStats === undefined;
  const isVolumeChartLoading = volumeChart === undefined;

  // Transform price chart data
  const priceChartData =
    priceChart?.map((p: PriceChartPoint) => ({
      time: new Date(p.timestamp).toLocaleString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        ...(pricePeriod === "7d" || pricePeriod === "30d"
          ? { month: "short", day: "numeric" }
          : {}),
      }),
      Price: p.priceUsd,
      Volume: p.volume,
    })) ?? [];

  // Transform volume chart data
  const volumeChartData =
    volumeChart?.map((v: VolumeChartPoint) => ({
      time: new Date(v.timestamp).toLocaleString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        ...(volumePeriod === "7d" ? { month: "short", day: "numeric" } : {}),
      }),
      Buys: v.buyVolume,
      Sells: v.sellVolume,
    })) ?? [];

  // Transform holder distribution data
  const distributionChartData =
    holderDistribution?.distribution?.map((d: HolderDistributionBucket) => ({
      name: d.label,
      value: d.count,
      percentage: d.percentage,
    })) ?? [];

  return (
    <PageWrapper
      title="Token Analytics"
      description="LTCG token metrics, holders, and trading activity"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/analytics">Back to Overview</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/token">Token Launch</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/treasury">Treasury</Link>
          </Button>
        </div>
      }
    >
      {/* Key Metrics */}
      <MetricGrid columns={5}>
        <MetricTile
          title="Current Price"
          value={formatPrice(summary?.currentPrice ?? latestMetrics?.priceUsd ?? 0)}
          icon={<span className="text-lg">💵</span>}
          delta={
            summary?.priceChange24h !== undefined
              ? formatPercentChange(summary.priceChange24h)
              : undefined
          }
          deltaType={
            (summary?.priceChange24h ?? 0) > 0
              ? "increase"
              : (summary?.priceChange24h ?? 0) < 0
                ? "decrease"
                : "unchanged"
          }
          subtitle="24h change"
          isLoading={isMetricsLoading}
        />
        <MetricTile
          title="Market Cap"
          value={formatMarketCap(summary?.currentMarketCap ?? latestMetrics?.marketCap ?? 0)}
          icon={<span className="text-lg">📊</span>}
          delta={
            summary?.mcChange24h !== undefined
              ? formatPercentChange(summary.mcChange24h)
              : undefined
          }
          deltaType={
            (summary?.mcChange24h ?? 0) > 0
              ? "increase"
              : (summary?.mcChange24h ?? 0) < 0
                ? "decrease"
                : "unchanged"
          }
          subtitle="24h change"
          isLoading={isMetricsLoading}
        />
        <MetricTile
          title="Holders"
          value={summary?.currentHolders ?? latestMetrics?.holderCount ?? 0}
          icon={<span className="text-lg">👥</span>}
          delta={summary?.newHolders24h ? `+${summary.newHolders24h} today` : undefined}
          deltaType={(summary?.newHolders24h ?? 0) > 0 ? "increase" : "unchanged"}
          subtitle="Token holders"
          isLoading={isMetricsLoading}
        />
        <MetricTile
          title="24h Volume"
          value={formatSol(summary?.volume24h ?? latestMetrics?.volume24h ?? 0)}
          icon={<span className="text-lg">📈</span>}
          subtitle={`${summary?.trades24h ?? latestMetrics?.txCount24h ?? 0} trades`}
          isLoading={isMetricsLoading}
        />
        <MetricTile
          title="Bonding Progress"
          value={`${(bondingProgress?.progress ?? latestMetrics?.bondingCurveProgress ?? 0).toFixed(1)}%`}
          icon={<span className="text-lg">🎯</span>}
          subtitle={formatMarketCap(bondingProgress?.currentMarketCap ?? 0)}
          isLoading={bondingProgress === undefined}
        />
      </MetricGrid>

      {/* Bonding Curve Progress Bar */}
      {bondingProgress && (
        <Card className="mt-6">
          <CardHeader className="pb-2">
            <Flex justifyContent="between" alignItems="center">
              <div>
                <CardTitle className="text-base">Bonding Curve Progress</CardTitle>
                <CardDescription>
                  Target: {formatMarketCap(bondingProgress.targetMarketCap)} market cap for
                  graduation
                </CardDescription>
              </div>
              <Badge
                variant={bondingProgress.progress >= 100 ? "default" : "secondary"}
                className={bondingProgress.progress >= 100 ? "bg-emerald-500" : ""}
              >
                {bondingProgress.progress >= 100 ? "Ready to Graduate" : "In Progress"}
              </Badge>
            </Flex>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Progress value={Math.min(bondingProgress.progress, 100)} className="h-3" />
              <Flex justifyContent="between">
                <Text className="text-sm text-muted-foreground">
                  Current: {formatMarketCap(bondingProgress.currentMarketCap)}
                </Text>
                <Text className="text-sm text-muted-foreground">
                  Liquidity: {formatSol(bondingProgress.liquidity)}
                </Text>
                <Text className="text-sm text-muted-foreground">
                  Target: {formatMarketCap(bondingProgress.targetMarketCap)}
                </Text>
              </Flex>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Price Chart */}
      <Card className="mt-6">
        <CardHeader>
          <Flex justifyContent="between" alignItems="center">
            <div>
              <CardTitle>Price Chart</CardTitle>
              <CardDescription>LTCG token price over time</CardDescription>
            </div>
            <Select value={pricePeriod} onValueChange={(v) => setPricePeriod(v as PricePeriod)}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1 Hour</SelectItem>
                <SelectItem value="24h">24 Hours</SelectItem>
                <SelectItem value="7d">7 Days</SelectItem>
                <SelectItem value="30d">30 Days</SelectItem>
              </SelectContent>
            </Select>
          </Flex>
        </CardHeader>
        <CardContent>
          {isPriceChartLoading ? (
            <Skeleton className="h-72 w-full" />
          ) : priceChartData.length > 0 ? (
            <AreaChart
              className="h-72"
              data={priceChartData}
              index="time"
              categories={["Price"]}
              colors={["emerald"]}
              showAnimation
              showLegend={false}
              valueFormatter={(v: number) => formatPrice(v)}
              curveType="monotone"
            />
          ) : (
            <div className="h-72 flex items-center justify-center text-muted-foreground">
              No price data available for this period
            </div>
          )}
        </CardContent>
      </Card>

      {/* Volume Chart and Trade Stats */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Volume Chart */}
        <Card>
          <CardHeader>
            <Flex justifyContent="between" alignItems="center">
              <div>
                <CardTitle>Buy vs Sell Volume</CardTitle>
                <CardDescription>Trading volume by type</CardDescription>
              </div>
              <Select
                value={volumePeriod}
                onValueChange={(v) => setVolumePeriod(v as VolumePeriod)}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">1 Hour</SelectItem>
                  <SelectItem value="24h">24 Hours</SelectItem>
                  <SelectItem value="7d">7 Days</SelectItem>
                </SelectContent>
              </Select>
            </Flex>
          </CardHeader>
          <CardContent>
            {isVolumeChartLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : volumeChartData.length > 0 ? (
              <BarChart
                className="h-64"
                data={volumeChartData}
                index="time"
                categories={["Buys", "Sells"]}
                colors={["emerald", "rose"]}
                showAnimation
                showLegend
                stack
                valueFormatter={(v: number) => formatSol(v)}
              />
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No volume data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trade Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Trade Statistics (24h)</CardTitle>
            <CardDescription>Trading activity summary</CardDescription>
          </CardHeader>
          <CardContent>
            {isTradesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                  <Text className="font-medium">Total Trades</Text>
                  <Text className="text-xl font-bold">{tradeStats?.totalTrades ?? 0}</Text>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  <Text className="font-medium text-emerald-600 dark:text-emerald-400">Buys</Text>
                  <div className="text-right">
                    <Text className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {tradeStats?.buyCount ?? 0}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {formatSol(tradeStats?.buyVolumeSol ?? 0)}
                    </Text>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-rose-500/10 border border-rose-500/30">
                  <Text className="font-medium text-rose-600 dark:text-rose-400">Sells</Text>
                  <div className="text-right">
                    <Text className="text-lg font-bold text-rose-600 dark:text-rose-400">
                      {tradeStats?.sellCount ?? 0}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {formatSol(tradeStats?.sellVolumeSol ?? 0)}
                    </Text>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                  <Text className="font-medium">Unique Traders</Text>
                  <Text className="text-xl font-bold">{tradeStats?.uniqueTraders ?? 0}</Text>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                  <Text className="font-medium">Avg Trade Size</Text>
                  <Text className="text-xl font-bold">
                    {formatSol(tradeStats?.avgTradeSize ?? 0)}
                  </Text>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Holders and Distribution */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Top Holders Table */}
        <Card>
          <CardHeader>
            <Flex justifyContent="between" alignItems="center">
              <div>
                <CardTitle>Top Holders</CardTitle>
                <CardDescription>Largest token holders by balance</CardDescription>
              </div>
              <Badge variant="secondary">
                Top 10 hold {holderDistribution?.topHoldersPercentage?.toFixed(1) ?? 0}%
              </Badge>
            </Flex>
          </CardHeader>
          <CardContent>
            {isHoldersLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : topHolders && topHolders.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topHolders.map((holder: TokenHolder, index: number) => (
                    <TableRow key={holder._id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-xs">{formatAddress(holder.address)}</code>
                          {holder.isPlatformWallet && (
                            <Badge variant="outline" className="text-xs">
                              Platform
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatTokenAmount(holder.balance)}
                      </TableCell>
                      <TableCell className="text-right">
                        {(holder.percentOwnership ?? 0).toFixed(2)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-8 text-center text-muted-foreground">No holders yet</div>
            )}
          </CardContent>
        </Card>

        {/* Holder Distribution */}
        <ChartCard
          title="Holder Distribution"
          description="Token holders by balance size"
          isLoading={isHoldersLoading}
        >
          {distributionChartData.length > 0 ? (
            <DonutChart
              className="h-full"
              data={distributionChartData}
              category="value"
              index="name"
              colors={["violet", "indigo", "blue", "cyan"]}
              showAnimation
              valueFormatter={(v: number) => `${v} holders`}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No distribution data available
            </div>
          )}
        </ChartCard>
      </div>

      {/* Recent Trades */}
      <Card className="mt-6">
        <CardHeader>
          <Flex justifyContent="between" alignItems="center">
            <div>
              <CardTitle>Recent Trades</CardTitle>
              <CardDescription>Latest buy and sell transactions</CardDescription>
            </div>
            {tradeStats?.whaleTradeCount > 0 && (
              <Badge variant="secondary">{tradeStats.whaleTradeCount} whale trades today</Badge>
            )}
          </Flex>
        </CardHeader>
        <CardContent>
          {isTradesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-32" />
                  <div className="flex-1" />
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : recentTrades && recentTrades.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Type</TableHead>
                  <TableHead>Trader</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">SOL</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTrades.map((trade: TokenTrade) => (
                  <TableRow key={trade._id}>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Badge
                          variant={trade.type === "buy" ? "default" : "destructive"}
                          className={
                            trade.type === "buy"
                              ? "bg-emerald-500 hover:bg-emerald-600"
                              : "bg-rose-500 hover:bg-rose-600"
                          }
                        >
                          {trade.type === "buy" ? "BUY" : "SELL"}
                        </Badge>
                        {trade.isWhale && <span title="Whale trade">🐋</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs">{formatAddress(trade.traderAddress)}</code>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatTokenAmount(trade.tokenAmount)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatSol(trade.solAmount)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatPrice(trade.pricePerToken)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatTimeAgo(trade.timestamp)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">No trades yet</div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="mt-6">
        <CardHeader>
          <Title>About Token Analytics</Title>
        </CardHeader>
        <CardContent>
          <Text className="text-muted-foreground">
            This dashboard provides real-time analytics for the LTCG token on the pump.fun bonding
            curve.
          </Text>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>
              <strong>Price & Market Cap</strong>: Real-time token valuation from the bonding curve
            </li>
            <li>
              <strong>Bonding Progress</strong>: Progress toward the $90K market cap graduation
              threshold
            </li>
            <li>
              <strong>Holders</strong>: Unique wallet addresses holding LTCG tokens
            </li>
            <li>
              <strong>Volume</strong>: Trading volume in SOL across buy and sell transactions
            </li>
            <li>
              <strong>Whale Trades</strong>: Large transactions that may impact price significantly
            </li>
          </ul>
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
