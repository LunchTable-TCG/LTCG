"use client";

/**
 * Card Analytics Page
 *
 * Card meta statistics, win rates, play rates, and archetype analysis.
 * Uses real Convex data from cardMeta analytics.
 */

import { ChartCard, LeaderboardGrid, MetricGrid, MetricTile } from "@/components/analytics";
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
import type { CardPlayRateStat, CardWinRateStat } from "@/lib/convexTypes";
import { Badge, BarChart, Card, Flex, Text, Title } from "@tremor/react";
import Link from "next/link";
import { useState } from "react";

// =============================================================================
// Types
// =============================================================================

type PeriodType = "daily" | "weekly" | "monthly" | "all_time";

// =============================================================================
// Helper Functions
// =============================================================================

function getRarityBadgeClass(rarity: string): string {
  switch (rarity.toLowerCase()) {
    case "common":
      return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    case "uncommon":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "rare":
      return "bg-violet-500/20 text-violet-400 border-violet-500/30";
    case "epic":
      return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    case "legendary":
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    default:
      return "bg-gray-500/20 text-gray-400 border-gray-500/30";
  }
}

// =============================================================================
// Component
// =============================================================================

export default function CardAnalyticsPage() {
  const [period, setPeriod] = useState<PeriodType>("weekly");
  const [selectedArchetype, setSelectedArchetype] = useState<string | null>(null);

  // Fetch real data from Convex
  const topByWinRate = useConvexQuery(api.admin.analytics.getTopCardsByWinRate, {
    periodType: period,
    limit: 10,
    minGames: 5,
  }) as CardWinRateStat[] | undefined;

  const topByPlayRate = useConvexQuery(api.admin.analytics.getTopCardsByPlayRate, {
    periodType: period,
    limit: 10,
  }) as CardPlayRateStat[] | undefined;

  const economySnapshot = useConvexQuery(api.admin.analytics.getCurrentEconomySnapshot, {});

  // Fetch archetype-specific stats when an archetype is selected
  const archetypeStats = useConvexQuery(
    api.admin.analytics.getCardStatsByArchetype,
    selectedArchetype ? { archetype: selectedArchetype, periodType: period } : "skip"
  ) as CardWinRateStat[] | undefined;

  const isLoading = topByWinRate === undefined || topByPlayRate === undefined;

  // Transform data for charts
  const winRateData =
    topByWinRate?.map((card) => ({
      name: card.cardName,
      "Win Rate": card.winRate,
      Games: card.gamesPlayed,
      rarity: card.rarity,
    })) ?? [];

  // Win rate leaderboard
  const winRateLeaderboard =
    topByWinRate?.map((card, idx) => ({
      rank: idx + 1,
      name: card.cardName,
      value: card.winRate,
      subtitle: `${card.gamesPlayed} games • ${card.rarity}`,
    })) ?? [];

  // Play rate leaderboard
  const playRateLeaderboard =
    topByPlayRate?.map((card, idx) => ({
      rank: idx + 1,
      name: card.cardName,
      value: card.timesPlayed || card.totalGames || 0,
      subtitle: `${card.playRate?.toFixed(1) ?? 0}% play rate • ${card.rarity}`,
    })) ?? [];

  // Calculate average stats
  const avgWinRate = topByWinRate?.length
    ? topByWinRate.reduce((sum, c) => sum + c.winRate, 0) / topByWinRate.length
    : 0;
  const avgPlayRate = topByPlayRate?.length
    ? topByPlayRate.reduce((sum, c) => sum + (c.playRate ?? 0), 0) / topByPlayRate.length
    : 0;

  // Extract unique archetypes
  const uniqueArchetypes = Array.from(
    new Set(topByPlayRate?.filter((c) => c.archetype).map((c) => c.archetype) ?? [])
  );

  // Transform archetype stats for display
  const archetypeLeaderboard =
    archetypeStats?.map((card, idx) => ({
      rank: idx + 1,
      name: card.cardName,
      value: card.winRate,
      subtitle: `${card.gamesPlayed} games`,
    })) ?? [];

  return (
    <PageWrapper
      title="Card Analytics"
      description="Card meta statistics, win rates, and usage patterns"
      actions={
        <div className="flex gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="all_time">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" asChild>
            <Link href="/analytics">← Back to Overview</Link>
          </Button>
        </div>
      }
    >
      {/* Key Metrics */}
      <MetricGrid columns={4}>
        <MetricTile
          title="Cards in Economy"
          value={(economySnapshot?.totalCards ?? 0).toLocaleString()}
          icon={<span className="text-lg">🃏</span>}
          subtitle="Total owned"
          isLoading={economySnapshot === undefined}
        />
        <MetricTile
          title="Avg Win Rate"
          value={`${avgWinRate.toFixed(1)}%`}
          icon={<span className="text-lg">🏆</span>}
          subtitle="Top 10 cards"
          isLoading={isLoading}
        />
        <MetricTile
          title="Avg Play Rate"
          value={`${avgPlayRate.toFixed(1)}%`}
          icon={<span className="text-lg">▶️</span>}
          subtitle="When drawn"
          isLoading={isLoading}
        />
        <MetricTile
          title="Cards Tracked"
          value={topByPlayRate?.length ?? 0}
          icon={<span className="text-lg">📊</span>}
          subtitle={`${period === "all_time" ? "All time" : `This ${period.replace("_", " ")}`}`}
          isLoading={isLoading}
        />
      </MetricGrid>

      {/* Top Cards by Win Rate & Play Rate */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <Flex justifyContent="between" alignItems="center">
            <div>
              <Title>Highest Win Rate Cards</Title>
              <Text className="text-muted-foreground">Cards with best win rates (min 5 games)</Text>
            </div>
            <Badge color="emerald">Top 10</Badge>
          </Flex>
          <div className="mt-4">
            {winRateLeaderboard.length > 0 ? (
              <LeaderboardGrid items={winRateLeaderboard} valueLabel="%" />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Text>No win rate data available for this period.</Text>
                <Text className="text-sm">Card meta stats are aggregated daily.</Text>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <Flex justifyContent="between" alignItems="center">
            <div>
              <Title>Most Played Cards</Title>
              <Text className="text-muted-foreground">Cards played most often</Text>
            </div>
            <Badge color="blue">Top 10</Badge>
          </Flex>
          <div className="mt-4">
            {playRateLeaderboard.length > 0 ? (
              <LeaderboardGrid items={playRateLeaderboard} valueLabel="plays" />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Text>No play rate data available for this period.</Text>
                <Text className="text-sm">Card meta stats are aggregated daily.</Text>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Win Rate Chart */}
      {winRateData.length > 0 && (
        <ChartCard
          title="Win Rate Comparison"
          description="Win rates of top performing cards"
          isLoading={isLoading}
          className="mt-6"
        >
          <BarChart
            className="h-full"
            data={winRateData}
            index="name"
            categories={["Win Rate"]}
            colors={["emerald"]}
            valueFormatter={(v: number) => `${v.toFixed(1)}%`}
            showAnimation
          />
        </ChartCard>
      )}

      {/* Card Details Table */}
      {topByWinRate && topByWinRate.length > 0 && (
        <Card className="mt-6">
          <Title>Card Performance Details</Title>
          <Text className="text-muted-foreground">Detailed stats for top cards</Text>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-muted">
                  <th className="text-left py-2 px-3 font-medium">Card</th>
                  <th className="text-left py-2 px-3 font-medium">Rarity</th>
                  <th className="text-right py-2 px-3 font-medium">Win Rate</th>
                  <th className="text-right py-2 px-3 font-medium">W/L</th>
                  <th className="text-right py-2 px-3 font-medium">Archetype</th>
                  <th className="text-right py-2 px-3 font-medium">Games</th>
                </tr>
              </thead>
              <tbody>
                {topByWinRate?.map((card, idx) => (
                  <tr key={idx} className="border-b border-muted/50 hover:bg-muted/30">
                    <td className="py-2 px-3 font-medium">{card.cardName}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs border ${getRarityBadgeClass(card.rarity)}`}
                      >
                        {card.rarity}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span
                        className={
                          card.winRate > 55
                            ? "text-emerald-500"
                            : card.winRate < 45
                              ? "text-rose-500"
                              : ""
                        }
                      >
                        {card.winRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      {card.wins}/{card.gamesPlayed}
                    </td>
                    <td className="py-2 px-3 text-right">{card.archetype}</td>
                    <td className="py-2 px-3 text-right text-muted-foreground">
                      {card.gamesPlayed}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Archetype Distribution */}
      {uniqueArchetypes.length > 0 && (
        <Card className="mt-6">
          <Flex justifyContent="between" alignItems="center">
            <div>
              <Title>Archetype Analysis</Title>
              <Text className="text-muted-foreground">
                Click an archetype to see detailed stats
              </Text>
            </div>
            {selectedArchetype && (
              <Button variant="outline" size="sm" onClick={() => setSelectedArchetype(null)}>
                Clear Selection
              </Button>
            )}
          </Flex>
          <div className="mt-4 grid gap-4 md:grid-cols-5">
            {uniqueArchetypes.slice(0, 5).map((archetype: string) => {
              const cardsInArchetype =
                topByPlayRate?.filter((c) => c.archetype === archetype) ?? [];
              const count = cardsInArchetype.length;
              // Get win rate from winRate data for cards in this archetype
              const winRateCards = topByWinRate?.filter((c) => c.archetype === archetype) ?? [];
              const avgWin =
                winRateCards.length > 0
                  ? winRateCards.reduce((sum, c) => sum + c.winRate, 0) / winRateCards.length
                  : 0;
              const isSelected = selectedArchetype === archetype;
              return (
                <button
                  type="button"
                  key={archetype}
                  onClick={() => setSelectedArchetype(isSelected ? null : archetype)}
                  className={`p-4 rounded-lg text-center transition-all cursor-pointer ${
                    isSelected
                      ? "bg-primary/20 border-2 border-primary"
                      : "bg-muted/50 hover:bg-muted/80 border-2 border-transparent"
                  }`}
                >
                  <Text className="text-lg font-bold">{archetype}</Text>
                  <Text className="text-sm text-muted-foreground">{count} cards</Text>
                  <Text className="text-xs text-emerald-500 mt-1">
                    {avgWin.toFixed(1)}% avg win
                  </Text>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* Archetype Details */}
      {selectedArchetype && archetypeStats && archetypeStats.length > 0 && (
        <Card className="mt-6">
          <Flex justifyContent="between" alignItems="center">
            <div>
              <Title>{selectedArchetype} Cards</Title>
              <Text className="text-muted-foreground">
                Detailed stats for {archetypeStats.length} cards in this archetype
              </Text>
            </div>
            <Badge color="violet">{period}</Badge>
          </Flex>
          <div className="mt-4">
            <LeaderboardGrid items={archetypeLeaderboard} valueLabel="%" />
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-muted">
                  <th className="text-left py-2 px-3 font-medium">Card</th>
                  <th className="text-left py-2 px-3 font-medium">Rarity</th>
                  <th className="text-right py-2 px-3 font-medium">Win Rate</th>
                  <th className="text-right py-2 px-3 font-medium">W/L</th>
                  <th className="text-right py-2 px-3 font-medium">Games</th>
                </tr>
              </thead>
              <tbody>
                {archetypeStats?.map((card, idx) => (
                  <tr key={idx} className="border-b border-muted/50 hover:bg-muted/30">
                    <td className="py-2 px-3 font-medium">{card.cardName}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs border ${getRarityBadgeClass(card.rarity)}`}
                      >
                        {card.rarity}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span
                        className={
                          card.winRate > 55
                            ? "text-emerald-500"
                            : card.winRate < 45
                              ? "text-rose-500"
                              : ""
                        }
                      >
                        {card.winRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      {card.wins}/{card.gamesPlayed}
                    </td>
                    <td className="py-2 px-3 text-right text-muted-foreground">
                      {card.gamesPlayed}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Info Card */}
      <Card className="mt-6">
        <Title>About Card Analytics</Title>
        <Text className="text-muted-foreground">
          Card analytics track performance metrics to help balance the game meta.
        </Text>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li>
            • <strong>Win Rate</strong>: Percentage of games won when card is in deck
          </li>
          <li>
            • <strong>Play Rate</strong>: Percentage of times card is played when drawn
          </li>
          <li>
            • <strong>Pick Rate</strong>: Percentage of decks that include this card
          </li>
          <li>
            • <strong>Min Games Filter</strong>: Cards need at least 5 games for reliable stats
          </li>
        </ul>
      </Card>
    </PageWrapper>
  );
}
