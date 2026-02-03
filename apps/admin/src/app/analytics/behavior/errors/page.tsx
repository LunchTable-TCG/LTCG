"use client";

/**
 * Error Heatmap Page
 *
 * Shows error distribution across pages with detailed breakdown.
 */

import { ChartCard, MetricGrid, MetricTile } from "@/components/analytics";
import { PageWrapper } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { AreaChart, Badge, BarChart, Card, Flex, Text, Title } from "@tremor/react";
import Link from "next/link";
import { useEffect, useState } from "react";

// =============================================================================
// Types
// =============================================================================

interface ErrorData {
  summary: {
    totalErrors: number;
    uniquePages: number;
    period: string;
  };
  byPage: Array<{
    page: string;
    count: number;
    errors: Array<{
      message: string;
      code?: string;
      timestamp: string;
      errorType: string;
    }>;
  }>;
  byType: Array<{ type: string; count: number }>;
  byDay: Array<{ date: string; count: number }>;
  configured: boolean;
}

// =============================================================================
// Component
// =============================================================================

export default function ErrorHeatmapPage() {
  const [data, setData] = useState<ErrorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPage, setSelectedPage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchErrors() {
      try {
        const res = await fetch("/api/posthog/errors");
        if (res.ok) {
          setData(await res.json());
        }
      } catch (error) {
        console.error("Failed to fetch error data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchErrors();
  }, []);

  // Calculate heatmap intensity (0-100)
  const getHeatIntensity = (count: number, maxCount: number) => {
    if (maxCount === 0) return 0;
    return Math.round((count / maxCount) * 100);
  };

  // Get color based on intensity
  const getHeatColor = (intensity: number) => {
    if (intensity >= 80) return "bg-rose-500/80";
    if (intensity >= 60) return "bg-rose-500/60";
    if (intensity >= 40) return "bg-amber-500/60";
    if (intensity >= 20) return "bg-amber-500/40";
    return "bg-emerald-500/30";
  };

  const maxErrors = data?.byPage[0]?.count || 1;
  const selectedPageData = data?.byPage.find((p) => p.page === selectedPage);

  // Calculate daily average and trend
  const dailyAvg = data?.byDay
    ? Math.round(data.byDay.reduce((sum, d) => sum + d.count, 0) / data.byDay.length)
    : 0;

  const recentDays = data?.byDay.slice(-3) || [];
  const olderDays = data?.byDay.slice(0, -3) || [];
  const recentAvg = recentDays.length
    ? Math.round(recentDays.reduce((sum, d) => sum + d.count, 0) / recentDays.length)
    : 0;
  const olderAvg = olderDays.length
    ? Math.round(olderDays.reduce((sum, d) => sum + d.count, 0) / olderDays.length)
    : 0;
  const trend = olderAvg > 0 ? Math.round(((recentAvg - olderAvg) / olderAvg) * 100) : 0;

  if (!data?.configured && !loading) {
    return (
      <PageWrapper
        title="Error Heatmap"
        description="Error distribution by page"
        actions={
          <Button variant="outline" asChild>
            <Link href="/analytics/behavior">← Back to Behavior</Link>
          </Button>
        }
      >
        <Card>
          <Badge color="amber">PostHog Not Configured</Badge>
          <Text className="mt-2">Please configure PostHog API access to view error tracking.</Text>
        </Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Error Heatmap"
      description="Visualize where errors occur most frequently across your app"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/analytics/behavior">← Back to Behavior</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/analytics/behavior/sessions?has_errors=true">View Error Sessions →</Link>
          </Button>
        </div>
      }
    >
      {/* Key Metrics */}
      <MetricGrid columns={4}>
        <MetricTile
          title="Total Errors"
          value={data?.summary.totalErrors ?? 0}
          icon={<span className="text-lg">🐛</span>}
          delta={trend !== 0 ? `${trend > 0 ? "+" : ""}${trend}%` : undefined}
          deltaType={trend > 0 ? "increase" : trend < 0 ? "decrease" : "unchanged"}
          isLoading={loading}
        />
        <MetricTile
          title="Pages Affected"
          value={data?.summary.uniquePages ?? 0}
          icon={<span className="text-lg">📄</span>}
          isLoading={loading}
        />
        <MetricTile
          title="Daily Average"
          value={dailyAvg}
          icon={<span className="text-lg">📊</span>}
          subtitle="errors per day"
          isLoading={loading}
        />
        <MetricTile
          title="Error Types"
          value={data?.byType.length ?? 0}
          icon={<span className="text-lg">🏷️</span>}
          subtitle="unique categories"
          isLoading={loading}
        />
      </MetricGrid>

      {/* Error Trend */}
      {data?.byDay && data.byDay.length > 0 && (
        <ChartCard
          title="Error Trend"
          description={`Errors over the ${data.summary.period.toLowerCase()}`}
          className="mt-6"
          isLoading={loading}
        >
          <AreaChart
            className="h-48"
            data={data.byDay.map((d) => ({
              date: new Date(d.date).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              }),
              Errors: d.count,
            }))}
            index="date"
            categories={["Errors"]}
            colors={["rose"]}
            showAnimation
            valueFormatter={(v: number) => v.toString()}
          />
        </ChartCard>
      )}

      {/* Heatmap Grid */}
      <Card className="mt-6">
        <Flex justifyContent="between" alignItems="center">
          <div>
            <Title>Error Heatmap by Page</Title>
            <Text className="text-muted-foreground">
              Click on a page to see detailed error messages
            </Text>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Low</span>
            <div className="flex gap-1">
              <div className="w-4 h-4 rounded bg-emerald-500/30" />
              <div className="w-4 h-4 rounded bg-amber-500/40" />
              <div className="w-4 h-4 rounded bg-amber-500/60" />
              <div className="w-4 h-4 rounded bg-rose-500/60" />
              <div className="w-4 h-4 rounded bg-rose-500/80" />
            </div>
            <span className="text-muted-foreground">High</span>
          </div>
        </Flex>

        <div className="mt-4 grid gap-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {data?.byPage.map((page) => {
            const intensity = getHeatIntensity(page.count, maxErrors);
            const isSelected = selectedPage === page.page;

            return (
              <button
                key={page.page}
                onClick={() => setSelectedPage(isSelected ? null : page.page)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  isSelected
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border hover:border-primary/50"
                } ${getHeatColor(intensity)}`}
              >
                <Text className="font-mono text-sm truncate font-medium">{page.page}</Text>
                <Flex justifyContent="between" alignItems="center" className="mt-2">
                  <Badge color={intensity >= 60 ? "rose" : intensity >= 30 ? "amber" : "emerald"}>
                    {page.count} errors
                  </Badge>
                  <Text className="text-xs text-muted-foreground">{intensity}%</Text>
                </Flex>
              </button>
            );
          })}
        </div>

        {data?.byPage.length === 0 && (
          <div className="text-center py-8">
            <Text className="text-muted-foreground">No errors recorded in the last 7 days! 🎉</Text>
          </div>
        )}
      </Card>

      {/* Selected Page Details */}
      {selectedPageData && (
        <Card className="mt-6">
          <Flex justifyContent="between" alignItems="center">
            <div>
              <Title className="font-mono">{selectedPageData.page}</Title>
              <Text className="text-muted-foreground">
                {selectedPageData.count} total errors • Recent error details below
              </Text>
            </div>
            <Button variant="ghost" onClick={() => setSelectedPage(null)}>
              Close
            </Button>
          </Flex>

          <div className="mt-4 space-y-3">
            {selectedPageData.errors.map((error, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-muted/30 border border-border">
                <Flex justifyContent="between" alignItems="start">
                  <div className="flex-1">
                    <Flex alignItems="center" className="gap-2 mb-1">
                      <Badge
                        color={
                          error.errorType === "client"
                            ? "blue"
                            : error.errorType === "api"
                              ? "violet"
                              : "amber"
                        }
                        size="sm"
                      >
                        {error.errorType}
                      </Badge>
                      {error.code && (
                        <Badge color="gray" size="sm">
                          {error.code}
                        </Badge>
                      )}
                    </Flex>
                    <Text className="font-mono text-sm break-all">{error.message}</Text>
                  </div>
                  <Text className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                    {new Date(error.timestamp).toLocaleString()}
                  </Text>
                </Flex>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Error Types Distribution */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <Title>Error Types Distribution</Title>
          <Text className="text-muted-foreground">Breakdown by error category</Text>

          <BarChart
            className="mt-4 h-48"
            data={
              data?.byType.map((t) => ({
                type: t.type.charAt(0).toUpperCase() + t.type.slice(1),
                Count: t.count,
              })) || []
            }
            index="type"
            categories={["Count"]}
            colors={["amber"]}
            showAnimation
            valueFormatter={(v: number) => v.toString()}
          />
        </Card>

        <Card>
          <Title>Top Problematic Pages</Title>
          <Text className="text-muted-foreground">Pages requiring immediate attention</Text>

          <div className="mt-4 space-y-3">
            {data?.byPage.slice(0, 5).map((page, idx) => (
              <div
                key={page.page}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${
                      idx === 0
                        ? "bg-rose-500/20 text-rose-500"
                        : idx === 1
                          ? "bg-amber-500/20 text-amber-500"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <Text className="font-mono text-sm truncate max-w-[200px]">{page.page}</Text>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 bg-rose-500/50 rounded"
                    style={{
                      width: `${getHeatIntensity(page.count, maxErrors)}px`,
                      maxWidth: "100px",
                      minWidth: "10px",
                    }}
                  />
                  <Badge color="rose">{page.count}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Action Items */}
      <Card className="mt-6">
        <Title>Recommended Actions</Title>
        <Text className="text-muted-foreground">
          Based on the error analysis, consider these next steps:
        </Text>

        <div className="mt-4 space-y-3">
          {data?.byPage[0] && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30">
              <Flex alignItems="center" className="gap-2">
                <span className="text-rose-500">🔴</span>
                <Text className="text-sm">
                  <strong>High Priority:</strong> Investigate errors on{" "}
                  <code className="text-rose-500">{data.byPage[0].page}</code> -{" "}
                  {data.byPage[0].count} errors detected
                </Text>
              </Flex>
            </div>
          )}

          {data?.byType.find((t) => t.type === "api") && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <Flex alignItems="center" className="gap-2">
                <span className="text-amber-500">🟡</span>
                <Text className="text-sm">
                  <strong>API Errors:</strong> Check backend logs for{" "}
                  {data.byType.find((t) => t.type === "api")?.count} API-related errors
                </Text>
              </Flex>
            </div>
          )}

          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <Flex alignItems="center" className="gap-2">
              <span className="text-blue-500">💡</span>
              <Text className="text-sm">
                <strong>Tip:</strong> Watch session recordings with errors to see exactly what users
                experienced before the error occurred.
              </Text>
            </Flex>
          </div>
        </div>
      </Card>
    </PageWrapper>
  );
}
