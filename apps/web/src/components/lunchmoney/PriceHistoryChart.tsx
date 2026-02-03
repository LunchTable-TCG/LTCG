"use client";

import { cn } from "@/lib/utils";
import { getAssetUrl } from "@/lib/blob";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  ChevronDown,
  Loader2,
  TrendingUp,
} from "lucide-react";
import Image from "next/image";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface PriceDataPoint {
  date: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  volume: number;
  goldSales: number;
  tokenSales: number;
}

interface TopTradedCard {
  cardDefinitionId: string;
  name: string;
  rarity: string;
  archetype: string;
  imageUrl?: string;
  volume: number;
  totalValue: number;
  avgPrice: number;
  sales: number;
}

type TimeRange = "7d" | "30d" | "90d" | "all";

interface PriceHistoryChartProps {
  priceHistory: PriceDataPoint[];
  topCards: TopTradedCard[];
  selectedCard: string | null;
  setSelectedCard: (cardId: string | null) => void;
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  avgPrice: number;
  priceChange: number;
  priceChangePercent: number;
  totalVolume: number;
  isLoading: boolean;
  isLoadingTopCards: boolean;
}

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  "7d": "7 Days",
  "30d": "30 Days",
  "90d": "90 Days",
  all: "All Time",
};

const RARITY_COLORS: Record<string, string> = {
  common: "text-gray-400",
  uncommon: "text-green-400",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-yellow-400",
};

function formatPrice(price: number) {
  if (price >= 1_000_000) {
    return `${(price / 1_000_000).toFixed(1)}M`;
  }
  if (price >= 1_000) {
    return `${(price / 1_000).toFixed(1)}K`;
  }
  return price.toLocaleString();
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: PriceDataPoint }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="rounded-lg border border-[#3d2b1f] bg-[#0d0a09]/95 p-3 shadow-lg">
      <p className="text-xs text-[#a89f94] mb-2">{label}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-xs text-[#a89f94]">Avg Price:</span>
          <span className="text-xs font-medium text-[#e8e0d5]">
            {formatPrice(data.avgPrice)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-xs text-[#a89f94]">Range:</span>
          <span className="text-xs font-medium text-[#e8e0d5]">
            {formatPrice(data.minPrice)} - {formatPrice(data.maxPrice)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-xs text-[#a89f94]">Volume:</span>
          <span className="text-xs font-medium text-[#e8e0d5]">{data.volume} sales</span>
        </div>
      </div>
    </div>
  );
}

export function PriceHistoryChart({
  priceHistory,
  topCards,
  selectedCard,
  setSelectedCard,
  timeRange,
  setTimeRange,
  avgPrice,
  priceChange,
  priceChangePercent,
  totalVolume,
  isLoading,
  isLoadingTopCards,
}: PriceHistoryChartProps) {
  const selectedCardData = topCards.find(
    (c) => c.cardDefinitionId === selectedCard
  );

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Card Selector */}
        <div className="flex-1">
          <label className="block text-xs text-[#a89f94] mb-1.5">
            Select Card
          </label>
          <div className="relative">
            <select
              value={selectedCard || ""}
              onChange={(e) => setSelectedCard(e.target.value || null)}
              disabled={isLoadingTopCards}
              className="w-full appearance-none rounded-lg border border-[#3d2b1f] bg-[#1a1512] px-4 py-2.5 pr-10 text-sm text-[#e8e0d5] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            >
              <option value="">All Cards (Market Overview)</option>
              {topCards.map((card) => (
                <option key={card.cardDefinitionId} value={card.cardDefinitionId}>
                  {card.name} ({card.sales} sales)
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#a89f94] pointer-events-none" />
          </div>
        </div>

        {/* Time Range */}
        <div>
          <label className="block text-xs text-[#a89f94] mb-1.5">
            Time Range
          </label>
          <div className="flex gap-1">
            {(["7d", "30d", "90d", "all"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  timeRange === range
                    ? "bg-primary text-primary-foreground"
                    : "bg-[#1a1512] text-[#a89f94] hover:bg-[#2a2118] hover:text-[#e8e0d5]"
                )}
              >
                {TIME_RANGE_LABELS[range]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Card Preview */}
      {selectedCardData && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-[#1a1512] border border-[#3d2b1f]">
          {selectedCardData.imageUrl && (
            <div className="relative w-12 h-16 rounded overflow-hidden bg-[#0d0a09]">
              <Image
                src={getAssetUrl(selectedCardData.imageUrl)}
                alt={selectedCardData.name}
                fill
                className="object-cover"
              />
            </div>
          )}
          <div>
            <h4 className="font-medium text-[#e8e0d5]">{selectedCardData.name}</h4>
            <p
              className={cn(
                "text-xs font-medium capitalize",
                RARITY_COLORS[selectedCardData.rarity] || "text-gray-400"
              )}
            >
              {selectedCardData.rarity} - {selectedCardData.archetype}
            </p>
          </div>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg bg-[#1a1512] border border-[#3d2b1f] p-3">
          <p className="text-xs text-[#a89f94]">Avg Price</p>
          <p className="text-lg font-bold text-[#e8e0d5]">{formatPrice(avgPrice)}</p>
        </div>
        <div className="rounded-lg bg-[#1a1512] border border-[#3d2b1f] p-3">
          <p className="text-xs text-[#a89f94]">Price Change</p>
          <div className="flex items-center gap-1">
            {priceChange >= 0 ? (
              <ArrowUp className="h-4 w-4 text-green-400" />
            ) : (
              <ArrowDown className="h-4 w-4 text-red-400" />
            )}
            <p
              className={cn(
                "text-lg font-bold",
                priceChange >= 0 ? "text-green-400" : "text-red-400"
              )}
            >
              {priceChangePercent > 0 ? "+" : ""}
              {priceChangePercent}%
            </p>
          </div>
        </div>
        <div className="rounded-lg bg-[#1a1512] border border-[#3d2b1f] p-3">
          <p className="text-xs text-[#a89f94]">Total Volume</p>
          <p className="text-lg font-bold text-[#e8e0d5]">{totalVolume} sales</p>
        </div>
        <div className="rounded-lg bg-[#1a1512] border border-[#3d2b1f] p-3">
          <p className="text-xs text-[#a89f94]">Data Points</p>
          <p className="text-lg font-bold text-[#e8e0d5]">{priceHistory.length}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-[#3d2b1f] bg-black/40 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : priceHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <BarChart3 className="h-12 w-12 text-[#3d2b1f] mb-4" />
            <p className="text-[#a89f94]">No price data available</p>
            <p className="text-sm text-[#a89f94]/60 mt-1">
              Price history will appear once cards are sold
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={priceHistory}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                stroke="#a89f94"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString([], { month: "short", day: "numeric" });
                }}
              />
              <YAxis
                stroke="#a89f94"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatPrice(value)}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="avgPrice"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#priceGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top Traded Cards */}
      {topCards.length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-medium text-[#e8e0d5]">
            <TrendingUp className="h-4 w-4 text-primary" />
            Top Traded Cards
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {topCards.slice(0, 6).map((card, index) => (
              <button
                key={card.cardDefinitionId}
                onClick={() => setSelectedCard(card.cardDefinitionId)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                  selectedCard === card.cardDefinitionId
                    ? "bg-primary/10 border-primary"
                    : "bg-[#1a1512] border-[#3d2b1f] hover:border-[#5a3f2a]"
                )}
              >
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#0d0a09] text-xs font-bold text-[#a89f94]">
                  {index + 1}
                </div>
                {card.imageUrl && (
                  <div className="relative w-8 h-10 rounded overflow-hidden bg-[#0d0a09] flex-shrink-0">
                    <Image
                      src={getAssetUrl(card.imageUrl)}
                      alt={card.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#e8e0d5] truncate">
                    {card.name}
                  </p>
                  <p className="text-xs text-[#a89f94]">
                    {card.sales} sales | {formatPrice(card.avgPrice)} avg
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
