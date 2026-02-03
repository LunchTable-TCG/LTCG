"use client";

/**
 * Drop-off Analysis / Funnel Page
 *
 * Shows user journey funnels and identifies where users abandon key flows.
 */

import { MetricGrid, MetricTile } from "@/components/analytics";
import { PageWrapper } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge, Card, Flex, ProgressBar, Text, Title } from "@tremor/react";
import Link from "next/link";
import { useEffect, useState } from "react";

// =============================================================================
// Types
// =============================================================================

interface FunnelStep {
  name: string;
  event: string;
  count: number;
  dropOff: number;
  conversionRate: number;
}

interface Funnel {
  name: string;
  description: string;
  steps: FunnelStep[];
  overallConversion: number;
}

// =============================================================================
// Predefined Funnels
// =============================================================================

const PREDEFINED_FUNNELS = [
  {
    name: "New User Onboarding",
    description: "From signup to first game",
    events: ["signup_completed", "onboarding_started", "starter_deck_selected", "game_started"],
    labels: ["Signed Up", "Started Onboarding", "Selected Deck", "First Game"],
  },
  {
    name: "Matchmaking Flow",
    description: "From queue to game completion",
    events: ["matchmaking_started", "matchmaking_completed", "game_started", "game_completed"],
    labels: ["Entered Queue", "Match Found", "Game Started", "Game Completed"],
  },
  {
    name: "Shop Engagement",
    description: "From shop visit to purchase",
    events: ["shop_visited", "pack_opened"],
    labels: ["Visited Shop", "Opened Pack"],
  },
  {
    name: "Deck Building",
    description: "Creating and using custom decks",
    events: ["deck_created", "deck_edited", "game_started"],
    labels: ["Created Deck", "Edited Deck", "Used in Game"],
  },
];

// =============================================================================
// Component
// =============================================================================

export default function FunnelsPage() {
  const [events, setEvents] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [selectedFunnel, setSelectedFunnel] = useState<(typeof PREDEFINED_FUNNELS)[number]>(
    PREDEFINED_FUNNELS[0]!
  );

  useEffect(() => {
    async function fetchEventCounts() {
      try {
        // Fetch all relevant events
        const allEvents = [...new Set(PREDEFINED_FUNNELS.flatMap((f) => f.events))];

        const counts: Record<string, number> = {};

        // Fetch each event type (in real app, this would be a single aggregated query)
        for (const eventName of allEvents) {
          const res = await fetch(`/api/posthog/events?event=${eventName}&limit=1000`);
          if (res.ok) {
            const data = await res.json();
            if (!data.configured) {
              setConfigured(false);
              return;
            }
            counts[eventName] = data.events?.length || 0;
          }
        }

        setEvents(counts);
      } catch (error) {
        console.error("Failed to fetch funnel data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchEventCounts();
  }, []);

  // Build funnel data from event counts
  const buildFunnel = (funnelConfig: (typeof PREDEFINED_FUNNELS)[0]): Funnel => {
    const steps: FunnelStep[] = funnelConfig.events.map((event, idx) => {
      const count = events[event] || 0;
      const prevEventKey = funnelConfig.events[idx - 1];
      const prevCount = idx > 0 && prevEventKey ? events[prevEventKey] || 1 : count;
      const dropOff = idx > 0 ? prevCount - count : 0;
      const conversionRate = idx > 0 && prevCount > 0 ? (count / prevCount) * 100 : 100;

      return {
        name: funnelConfig.labels[idx] ?? `Step ${idx + 1}`,
        event,
        count,
        dropOff,
        conversionRate: Math.round(conversionRate * 10) / 10,
      };
    });

    const firstCount = steps[0]?.count || 1;
    const lastCount = steps[steps.length - 1]?.count || 0;
    const overallConversion = firstCount > 0 ? (lastCount / firstCount) * 100 : 0;

    return {
      name: funnelConfig.name,
      description: funnelConfig.description,
      steps,
      overallConversion: Math.round(overallConversion * 10) / 10,
    };
  };

  const currentFunnel = buildFunnel(selectedFunnel);

  // Find biggest drop-off
  const biggestDropOff = currentFunnel.steps.reduce(
    (max, step, idx) => {
      if (idx === 0) return max;
      const dropOffRate = 100 - step.conversionRate;
      return dropOffRate > max.rate ? { step: step.name, rate: dropOffRate, idx } : max;
    },
    { step: "", rate: 0, idx: 0 }
  );

  if (!configured && !loading) {
    return (
      <PageWrapper
        title="Drop-off Analysis"
        description="User journey funnel analysis"
        actions={
          <Button variant="outline" asChild>
            <Link href="/analytics/behavior">← Back to Behavior</Link>
          </Button>
        }
      >
        <Card>
          <Badge color="amber">PostHog Not Configured</Badge>
          <Text className="mt-2">
            Please configure PostHog API access to view funnel analytics.
          </Text>
        </Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Drop-off Analysis"
      description="Track user journeys and identify where users abandon key flows"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/analytics/behavior">← Back to Behavior</Link>
          </Button>
          <Button variant="outline" asChild>
            <a href="https://app.posthog.com" target="_blank" rel="noopener noreferrer">
              View in PostHog →
            </a>
          </Button>
        </div>
      }
    >
      {/* Key Metrics */}
      <MetricGrid columns={4}>
        <MetricTile
          title="Overall Conversion"
          value={`${currentFunnel.overallConversion}%`}
          icon={<span className="text-lg">📊</span>}
          isLoading={loading}
        />
        <MetricTile
          title="Funnel Steps"
          value={currentFunnel.steps.length}
          icon={<span className="text-lg">🔢</span>}
          isLoading={loading}
        />
        <MetricTile
          title="Biggest Drop-off"
          value={biggestDropOff.step || "N/A"}
          icon={<span className="text-lg">⚠️</span>}
          subtitle={biggestDropOff.rate > 0 ? `${biggestDropOff.rate.toFixed(1)}% drop` : undefined}
          isLoading={loading}
        />
        <MetricTile
          title="First Step Users"
          value={currentFunnel.steps[0]?.count || 0}
          icon={<span className="text-lg">👥</span>}
          isLoading={loading}
        />
      </MetricGrid>

      {/* Funnel Selector */}
      <Card className="mt-6">
        <Title>Select Funnel</Title>
        <Text className="text-muted-foreground">Choose a user journey to analyze</Text>

        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {PREDEFINED_FUNNELS.map((funnel) => {
            const funnelData = buildFunnel(funnel);
            const isSelected = selectedFunnel.name === funnel.name;

            return (
              <button
                key={funnel.name}
                onClick={() => setSelectedFunnel(funnel)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border hover:border-primary/50 hover:bg-muted/30"
                }`}
              >
                <Text className="font-semibold">{funnel.name}</Text>
                <Text className="text-xs text-muted-foreground mt-1">{funnel.description}</Text>
                <Flex justifyContent="between" alignItems="center" className="mt-3">
                  <Badge
                    color={
                      funnelData.overallConversion >= 50
                        ? "emerald"
                        : funnelData.overallConversion >= 25
                          ? "amber"
                          : "rose"
                    }
                  >
                    {funnelData.overallConversion}% conversion
                  </Badge>
                  <Text className="text-xs text-muted-foreground">
                    {funnel.events.length} steps
                  </Text>
                </Flex>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Funnel Visualization */}
      <Card className="mt-6">
        <Flex justifyContent="between" alignItems="center">
          <div>
            <Title>{currentFunnel.name}</Title>
            <Text className="text-muted-foreground">{currentFunnel.description}</Text>
          </div>
          <Badge
            color={
              currentFunnel.overallConversion >= 50
                ? "emerald"
                : currentFunnel.overallConversion >= 25
                  ? "amber"
                  : "rose"
            }
            size="lg"
          >
            {currentFunnel.overallConversion}% Overall
          </Badge>
        </Flex>

        <div className="mt-6 space-y-4">
          {currentFunnel.steps.map((step, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === currentFunnel.steps.length - 1;
            const widthPercent = currentFunnel.steps[0]?.count
              ? (step.count / currentFunnel.steps[0].count) * 100
              : 0;

            return (
              <div key={step.event} className="relative">
                {/* Step */}
                <div className="flex items-center gap-4">
                  {/* Step Number */}
                  <div
                    className={`w-10 h-10 flex items-center justify-center rounded-full font-bold ${
                      isFirst
                        ? "bg-blue-500 text-white"
                        : isLast
                          ? "bg-emerald-500 text-white"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {idx + 1}
                  </div>

                  {/* Step Content */}
                  <div className="flex-1">
                    <Flex justifyContent="between" alignItems="center">
                      <div>
                        <Text className="font-semibold">{step.name}</Text>
                        <Text className="text-xs text-muted-foreground font-mono">
                          {step.event}
                        </Text>
                      </div>
                      <div className="text-right">
                        <Text className="text-lg font-bold">{step.count.toLocaleString()}</Text>
                        {!isFirst && (
                          <Text
                            className={`text-xs ${
                              step.conversionRate >= 80
                                ? "text-emerald-500"
                                : step.conversionRate >= 50
                                  ? "text-amber-500"
                                  : "text-rose-500"
                            }`}
                          >
                            {step.conversionRate}% from previous
                          </Text>
                        )}
                      </div>
                    </Flex>

                    {/* Progress Bar */}
                    <div className="mt-2">
                      <ProgressBar
                        value={widthPercent}
                        color={
                          widthPercent >= 75
                            ? "emerald"
                            : widthPercent >= 50
                              ? "blue"
                              : widthPercent >= 25
                                ? "amber"
                                : "rose"
                        }
                        className="h-3"
                      />
                    </div>
                  </div>
                </div>

                {/* Drop-off Indicator */}
                {!isLast && step.dropOff > 0 && (
                  <div className="ml-5 pl-9 border-l-2 border-dashed border-rose-300 py-2">
                    <Badge color="rose" size="sm">
                      ↓ {step.dropOff.toLocaleString()} dropped (
                      {(100 - (currentFunnel.steps[idx + 1]?.conversionRate || 0)).toFixed(1)}%)
                    </Badge>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Insights & Recommendations */}
      <Card className="mt-6">
        <Title>Insights & Recommendations</Title>
        <Text className="text-muted-foreground">
          Based on your funnel data, here are some observations:
        </Text>

        <div className="mt-4 space-y-3">
          {/* Overall Performance */}
          <div
            className={`p-3 rounded-lg border ${
              currentFunnel.overallConversion >= 50
                ? "bg-emerald-500/10 border-emerald-500/30"
                : currentFunnel.overallConversion >= 25
                  ? "bg-amber-500/10 border-amber-500/30"
                  : "bg-rose-500/10 border-rose-500/30"
            }`}
          >
            <Flex alignItems="center" className="gap-2">
              <span>
                {currentFunnel.overallConversion >= 50
                  ? "✅"
                  : currentFunnel.overallConversion >= 25
                    ? "⚠️"
                    : "🔴"}
              </span>
              <Text className="text-sm">
                <strong>Overall Conversion:</strong> {currentFunnel.overallConversion}% of users
                complete the full {currentFunnel.name.toLowerCase()} flow.
                {currentFunnel.overallConversion < 50 &&
                  " This is below the typical benchmark of 50%."}
              </Text>
            </Flex>
          </div>

          {/* Biggest Drop-off */}
          {biggestDropOff.rate > 20 && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30">
              <Flex alignItems="center" className="gap-2">
                <span>🚨</span>
                <Text className="text-sm">
                  <strong>Critical Drop-off:</strong> {biggestDropOff.rate.toFixed(1)}% of users
                  drop off at "{biggestDropOff.step}". Consider:
                </Text>
              </Flex>
              <ul className="mt-2 ml-6 text-sm text-muted-foreground list-disc">
                <li>Watch session recordings of users who dropped off at this step</li>
                <li>Check for errors or UX friction at this point</li>
                <li>Consider adding progress indicators or encouragement</li>
              </ul>
            </div>
          )}

          {/* Session Recording Link */}
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <Flex alignItems="center" className="gap-2">
              <span>💡</span>
              <Text className="text-sm">
                <strong>Pro Tip:</strong> Watch session recordings to see exactly where and why
                users abandon each step. Look for rage clicks, confusion, or errors.
              </Text>
            </Flex>
            <Button variant="outline" size="sm" className="mt-2" asChild>
              <Link href="/analytics/behavior/sessions">View Session Recordings →</Link>
            </Button>
          </div>
        </div>
      </Card>

      {/* All Funnels Summary */}
      <Card className="mt-6">
        <Title>All Funnels Summary</Title>
        <Text className="text-muted-foreground">Quick overview of all tracked user journeys</Text>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3 text-sm font-medium">Funnel</th>
                <th className="text-left py-2 px-3 text-sm font-medium">Steps</th>
                <th className="text-left py-2 px-3 text-sm font-medium">Start</th>
                <th className="text-left py-2 px-3 text-sm font-medium">End</th>
                <th className="text-left py-2 px-3 text-sm font-medium">Conversion</th>
              </tr>
            </thead>
            <tbody>
              {PREDEFINED_FUNNELS.map((funnel) => {
                const data = buildFunnel(funnel);
                return (
                  <tr
                    key={funnel.name}
                    className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                    onClick={() => setSelectedFunnel(funnel)}
                  >
                    <td className="py-3 px-3">
                      <Text className="font-medium">{funnel.name}</Text>
                    </td>
                    <td className="py-3 px-3">
                      <Badge color="gray">{data.steps.length}</Badge>
                    </td>
                    <td className="py-3 px-3">
                      <Text>{data.steps[0]?.count || 0}</Text>
                    </td>
                    <td className="py-3 px-3">
                      <Text>{data.steps[data.steps.length - 1]?.count || 0}</Text>
                    </td>
                    <td className="py-3 px-3">
                      <Badge
                        color={
                          data.overallConversion >= 50
                            ? "emerald"
                            : data.overallConversion >= 25
                              ? "amber"
                              : "rose"
                        }
                      >
                        {data.overallConversion}%
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </PageWrapper>
  );
}
