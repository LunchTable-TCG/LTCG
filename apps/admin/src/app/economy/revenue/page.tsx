"use client";

/**
 * Revenue Dashboard Page
 *
 * Real-time financial visibility with KPIs, charts, and transaction monitoring.
 * Displays pack sales, gem purchases, currency circulation, and spending patterns.
 */

import { PageWrapper } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { typedApi, useConvexQuery } from "@/lib/convexHelpers";
import {
  AreaChart,
  Badge,
  BarChart,
  DonutChart,
  Metric,
  ProgressBar,
  Text,
  Title,
} from "@tremor/react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CoinsIcon,
  CreditCardIcon,
  GemIcon,
  PackageIcon,
  TrendingUpIcon,
  UsersIcon,
} from "lucide-react";
import { useState } from "react";

// =============================================================================
// Types
// =============================================================================

type Period = "day" | "week" | "month" | "all";

// =============================================================================
// Metric Card Component
// =============================================================================

function MetricCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  color = "blue",
}: {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: "blue" | "emerald" | "amber" | "purple" | "rose";
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    purple: "bg-purple-50 text-purple-600",
    rose: "bg-rose-50 text-rose-600",
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <Text className="text-sm text-muted-foreground">{title}</Text>
            <Metric className="mt-1">{value}</Metric>
            {change !== undefined && (
              <div className="flex items-center gap-1 mt-2">
                {change >= 0 ? (
                  <ArrowUpIcon className="h-3 w-3 text-emerald-500" />
                ) : (
                  <ArrowDownIcon className="h-3 w-3 text-rose-500" />
                )}
                <Text className={change >= 0 ? "text-emerald-500" : "text-rose-500"}>
                  {Math.abs(change).toFixed(1)}% {changeLabel}
                </Text>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Revenue Overview Section
// =============================================================================

function RevenueOverview() {
  const overview = useConvexQuery(typedApi.admin.revenue.getRevenueOverview, {});

  if (!overview) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-20 animate-pulse bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Calculate week-over-week change (simplified - comparing today vs week average)
  const weekAvgDaily = overview.combined.week / 7;
  const todayVsWeek =
    weekAvgDaily > 0 ? ((overview.combined.today - weekAvgDaily) / weekAvgDaily) * 100 : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Revenue Today"
        value={`$${overview.combined.today.toLocaleString()}`}
        change={todayVsWeek}
        changeLabel="vs avg"
        icon={TrendingUpIcon}
        color="emerald"
      />
      <MetricCard
        title="Revenue This Month"
        value={`$${overview.combined.month.toLocaleString()}`}
        icon={CreditCardIcon}
        color="blue"
      />
      <MetricCard
        title="Packs Opened Today"
        value={overview.packCount.today.toLocaleString()}
        icon={PackageIcon}
        color="purple"
      />
      <MetricCard
        title="Active Spenders"
        value={overview.spenders.week.toLocaleString()}
        icon={UsersIcon}
        color="amber"
      />
    </div>
  );
}

// =============================================================================
// Revenue Trend Chart
// =============================================================================

function RevenueTrendChart() {
  const [days, setDays] = useState(30);
  const trend = useConvexQuery(typedApi.admin.revenue.getRevenueTrend, { days });

  if (!trend) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const chartData = trend.map((d: { date: string; packs: number; gems: number }) => ({
    date: d.date,
    "Pack Revenue": d.packs,
    "Gem Revenue": d.gems,
    Total: d.packs + d.gems,
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Revenue Trend</CardTitle>
          <CardDescription>Daily revenue over time</CardDescription>
        </div>
        <Select value={days.toString()} onValueChange={(v) => setDays(Number.parseInt(v))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 days</SelectItem>
            <SelectItem value="14">14 days</SelectItem>
            <SelectItem value="30">30 days</SelectItem>
            <SelectItem value="60">60 days</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <AreaChart
          className="h-72"
          data={chartData}
          index="date"
          categories={["Pack Revenue", "Gem Revenue"]}
          colors={["purple", "emerald"]}
          valueFormatter={(v) => `$${v.toLocaleString()}`}
          showLegend
          showGridLines={false}
        />
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Pack Sales Breakdown
// =============================================================================

function PackSalesBreakdown() {
  const [period, setPeriod] = useState<Period>("month");
  const breakdown = useConvexQuery(typedApi.admin.revenue.getPackSalesBreakdown, { period });

  if (!breakdown) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pack Sales by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const chartData = breakdown.map(
    (p: { packType: string; count: number; goldRevenue: number; gemRevenue: number }) => ({
      name: p.packType,
      Count: p.count,
      "Gold Revenue": p.goldRevenue,
      "Gem Revenue": p.gemRevenue,
    })
  );

  const donutData = breakdown.map((p: { packType: string; count: number }) => ({
    name: p.packType,
    value: p.count,
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Pack Sales by Type</CardTitle>
          <CardDescription>Distribution of pack purchases</CardDescription>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          <DonutChart
            className="h-52"
            data={donutData}
            category="value"
            index="name"
            colors={["blue", "cyan", "indigo", "violet", "purple", "fuchsia"]}
            showLabel
            valueFormatter={(v) => v.toLocaleString()}
          />
          <BarChart
            className="h-52"
            data={chartData}
            index="name"
            categories={["Gold Revenue", "Gem Revenue"]}
            colors={["amber", "emerald"]}
            valueFormatter={(v) => v.toLocaleString()}
            showLegend
          />
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Gem Purchase Metrics
// =============================================================================

function GemPurchaseMetrics() {
  const metrics = useConvexQuery(typedApi.admin.revenue.getGemPurchaseMetrics, {});

  if (!metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gem Purchases (Token → Gems)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GemIcon className="h-5 w-5 text-emerald-500" />
          Gem Purchases (Token → Gems)
        </CardTitle>
        <CardDescription>Token purchase metrics and conversion rates</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Text className="text-sm text-muted-foreground">Total USD Volume</Text>
            <Title className="mt-1">${metrics.totals.usdVolume.toLocaleString()}</Title>
          </div>
          <div>
            <Text className="text-sm text-muted-foreground">Gems Granted</Text>
            <Title className="mt-1">{metrics.totals.gemsGranted.toLocaleString()}</Title>
          </div>
          <div>
            <Text className="text-sm text-muted-foreground">Avg. per Purchase</Text>
            <Title className="mt-1">${metrics.averages.usdPerPurchase.toFixed(2)}</Title>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Text className="text-sm">Conversion Rate</Text>
            <Text className="text-sm font-medium">{metrics.status.conversionRate.toFixed(1)}%</Text>
          </div>
          <ProgressBar value={metrics.status.conversionRate} color="emerald" />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>{metrics.status.confirmed} confirmed</span>
            <span>{metrics.status.pending} pending</span>
            <span>{metrics.status.failed} failed</span>
          </div>
        </div>

        {metrics.byPackage.length > 0 && (
          <div>
            <Text className="text-sm font-medium mb-2">Popular Packages</Text>
            <div className="flex flex-wrap gap-2">
              {metrics.byPackage.slice(0, 5).map((pkg: { packageId: string; count: number }) => (
                <Badge key={pkg.packageId} color="blue">
                  {pkg.packageId}: {pkg.count}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Currency Circulation
// =============================================================================

function CurrencyCirculation() {
  const circulation = useConvexQuery(typedApi.admin.revenue.getCurrencyCirculation, {});

  if (!circulation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Currency Circulation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CoinsIcon className="h-5 w-5 text-amber-500" />
          Currency Circulation
        </CardTitle>
        <CardDescription>
          In-game currency supply across {circulation.totalUsers.toLocaleString()} users
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Gold Stats */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <Text className="font-medium">Gold</Text>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Text className="text-xs text-muted-foreground">Total Supply</Text>
                <Text className="text-lg font-semibold">
                  {circulation.gold.total.toLocaleString()}
                </Text>
              </div>
              <div>
                <Text className="text-xs text-muted-foreground">Holders</Text>
                <Text className="text-lg font-semibold">
                  {circulation.gold.holders.toLocaleString()}
                </Text>
              </div>
              <div>
                <Text className="text-xs text-muted-foreground">Avg. Balance</Text>
                <Text className="text-lg font-semibold">
                  {Math.round(circulation.gold.average).toLocaleString()}
                </Text>
              </div>
              <div>
                <Text className="text-xs text-muted-foreground">Net Flow (24h)</Text>
                <Text
                  className={`text-lg font-semibold ${circulation.gold.netFlowToday >= 0 ? "text-emerald-500" : "text-rose-500"}`}
                >
                  {circulation.gold.netFlowToday >= 0 ? "+" : ""}
                  {circulation.gold.netFlowToday.toLocaleString()}
                </Text>
              </div>
            </div>
          </div>

          {/* Gems Stats */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <Text className="font-medium">Gems</Text>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Text className="text-xs text-muted-foreground">Total Supply</Text>
                <Text className="text-lg font-semibold">
                  {circulation.gems.total.toLocaleString()}
                </Text>
              </div>
              <div>
                <Text className="text-xs text-muted-foreground">Holders</Text>
                <Text className="text-lg font-semibold">
                  {circulation.gems.holders.toLocaleString()}
                </Text>
              </div>
              <div>
                <Text className="text-xs text-muted-foreground">Avg. Balance</Text>
                <Text className="text-lg font-semibold">
                  {Math.round(circulation.gems.average).toLocaleString()}
                </Text>
              </div>
              <div>
                <Text className="text-xs text-muted-foreground">Net Flow (24h)</Text>
                <Text
                  className={`text-lg font-semibold ${circulation.gems.netFlowToday >= 0 ? "text-emerald-500" : "text-rose-500"}`}
                >
                  {circulation.gems.netFlowToday >= 0 ? "+" : ""}
                  {circulation.gems.netFlowToday.toLocaleString()}
                </Text>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Top Spenders Table
// =============================================================================

function TopSpendersTable() {
  const [period, setPeriod] = useState<Period>("month");
  const spenders = useConvexQuery(typedApi.admin.revenue.getTopSpenders, { period, limit: 10 });

  if (!spenders) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Spenders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Top Spenders</CardTitle>
          <CardDescription>Highest spending players</CardDescription>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {spenders.length === 0 ? (
          <Text className="text-muted-foreground">No spending data for this period</Text>
        ) : (
          <div className="space-y-3">
            {spenders.map(
              (
                s: {
                  usedId: string;
                  username: string;
                  packSpend: number;
                  gemSpend: number;
                  packCount: number;
                  gemCount: number;
                },
                i: number
              ) => (
                <div
                  key={s.usedId}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium w-6 text-muted-foreground">#{i + 1}</span>
                    <span className="font-medium">{s.username}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-amber-600">{s.packSpend.toLocaleString()} gold</span>
                    <span className="text-emerald-600">${s.gemSpend.toFixed(2)}</span>
                    <Badge color="gray">{s.packCount + s.gemCount} purchases</Badge>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Recent Large Purchases
// =============================================================================

function RecentLargePurchases() {
  const purchases = useConvexQuery(typedApi.admin.revenue.getRecentLargePurchases, {
    limit: 20,
    minAmount: 500,
  });

  if (!purchases) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Large Purchases</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Large Purchases</CardTitle>
        <CardDescription>Purchases over 500 currency (monitoring)</CardDescription>
      </CardHeader>
      <CardContent>
        {purchases.length === 0 ? (
          <Text className="text-muted-foreground">No large purchases to display</Text>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {purchases.map(
              (p: {
                _id: string;
                username: string;
                packType: string;
                openedAt: number;
                currencyUsed: string;
                amountPaid?: number;
              }) => (
                <div
                  key={p._id}
                  className="flex items-center justify-between p-2 rounded-lg border"
                >
                  <div>
                    <Text className="font-medium">{p.username}</Text>
                    <Text className="text-xs text-muted-foreground">
                      {p.packType} pack • {new Date(p.openedAt).toLocaleString()}
                    </Text>
                  </div>
                  <div className="text-right">
                    <Text
                      className={`font-semibold ${p.currencyUsed === "gold" ? "text-amber-600" : "text-emerald-600"}`}
                    >
                      {p.amountPaid?.toLocaleString()} {p.currencyUsed}
                    </Text>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Main Page
// =============================================================================

export default function RevenueDashboardPage() {
  return (
    <PageWrapper title="Revenue Dashboard" description="Real-time financial metrics and analytics">
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="packs">Pack Sales</TabsTrigger>
          <TabsTrigger value="gems">Gem Purchases</TabsTrigger>
          <TabsTrigger value="circulation">Currency</TabsTrigger>
          <TabsTrigger value="spenders">Spenders</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <RevenueOverview />
          <RevenueTrendChart />
          <div className="grid gap-6 lg:grid-cols-2">
            <GemPurchaseMetrics />
            <CurrencyCirculation />
          </div>
        </TabsContent>

        <TabsContent value="packs" className="space-y-6">
          <PackSalesBreakdown />
          <RecentLargePurchases />
        </TabsContent>

        <TabsContent value="gems" className="space-y-6">
          <GemPurchaseMetrics />
        </TabsContent>

        <TabsContent value="circulation" className="space-y-6">
          <CurrencyCirculation />
        </TabsContent>

        <TabsContent value="spenders" className="space-y-6">
          <TopSpendersTable />
          <RecentLargePurchases />
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
