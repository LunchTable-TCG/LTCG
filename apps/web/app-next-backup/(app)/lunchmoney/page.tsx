"use client";

import { BalanceCards } from "@/components/lunchmoney/BalanceCards";
import { MyListings } from "@/components/lunchmoney/MyListings";
import { PriceHistoryChart } from "@/components/lunchmoney/PriceHistoryChart";
import { TransactionHistory } from "@/components/lunchmoney/TransactionHistory";
import { useLunchMoneyInteraction } from "@/hooks/economy/useLunchMoneyInteraction";
import { getAssetUrl } from "@/lib/blob";
import { cn } from "@/lib/utils";
import { BarChart3, History, LineChart, Loader2, Package, PieChart, Wallet } from "lucide-react";

type TabType = "overview" | "transactions" | "listings" | "prices" | "chart";

export default function LunchMoneyPage() {
  const {
    activeTab,
    setActiveTab,
    transactionFilter,
    setTransactionFilter,
    economy,
    transactions,
    prices,
    isLoading,
  } = useLunchMoneyInteraction();

  // Economy data
  const {
    gold,
    gems,
    lifetimeGoldEarned,
    lifetimeGoldSpent,
    lifetimeGemsEarned,
    lifetimeGemsSpent,
    tokenBalance,
    tokenBalanceStale,
    walletAddress,
    lastTokenUpdate,
    goldListings,
    tokenListings,
    pendingPurchases,
    cancelGoldListing,
    cancelTokenListing,
    refreshTokenBalance,
  } = economy;

  // Transaction history
  const {
    transactions: historyTransactions,
    tokenTransactions,
    loadMore: loadMoreTransactions,
    hasMore: hasMoreTransactions,
    isLoading: isLoadingTransactions,
  } = transactions;

  // Price history
  const {
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
    isLoading: isLoadingPrices,
    isLoadingTopCards,
  } = prices;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0d0a09] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-[#a89f94]">Loading your economy dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0a09] relative overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-30"
        style={{ backgroundImage: `url('${getAssetUrl("/assets/backgrounds/shop-bg.png")}')` }}
      />
      <div className="absolute inset-0 bg-black/70 z-0" />
      <div className="absolute inset-0 bg-vignette z-0" />

      <div className="container mx-auto px-4 pt-28 pb-16 relative z-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Wallet className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-[#e8e0d5]">LunchMoney</h1>
          </div>
          <p className="text-[#a89f94]">
            Your economy dashboard - track balances, listings, and market prices
          </p>
        </div>

        {/* Balance Cards - Always visible */}
        <div className="mb-8">
          <BalanceCards
            gold={gold}
            gems={gems}
            lifetimeGoldEarned={lifetimeGoldEarned}
            lifetimeGoldSpent={lifetimeGoldSpent}
            lifetimeGemsEarned={lifetimeGemsEarned}
            lifetimeGemsSpent={lifetimeGemsSpent}
            tokenBalance={tokenBalance}
            tokenBalanceStale={tokenBalanceStale}
            walletAddress={walletAddress}
            lastTokenUpdate={lastTokenUpdate}
            onRefreshToken={refreshTokenBalance}
            isLoading={isLoading}
          />
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 p-1 bg-black/40 rounded-xl border border-[#3d2b1f] w-fit">
          {[
            { id: "overview" as TabType, label: "Overview", icon: PieChart },
            { id: "transactions" as TabType, label: "Transactions", icon: History },
            { id: "listings" as TabType, label: "My Listings", icon: Package },
            { id: "prices" as TabType, label: "Price History", icon: BarChart3 },
            { id: "chart" as TabType, label: "LUNCH Chart", icon: LineChart },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const listingCount =
              tab.id === "listings" ? goldListings.length + tokenListings.length : 0;
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 sm:px-6 py-3 rounded-lg font-medium transition-all text-sm sm:text-base",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-[#a89f94] hover:text-[#e8e0d5] hover:bg-white/5"
                )}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="whitespace-nowrap">{tab.label}</span>
                {tab.id === "listings" && listingCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs font-bold rounded-full bg-primary/20 text-primary">
                    {listingCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Transactions */}
              <div className="rounded-xl border border-[#3d2b1f] bg-black/40 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-[#e8e0d5] flex items-center gap-2">
                    <History className="w-5 h-5 text-primary" />
                    Recent Transactions
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab("transactions")}
                    className="text-sm text-primary hover:underline"
                  >
                    View All
                  </button>
                </div>
                <TransactionHistory
                  transactions={historyTransactions.slice(0, 5)}
                  tokenTransactions={tokenTransactions.slice(0, 5)}
                  hasMore={false}
                  loadMore={() => {}}
                  isLoading={isLoadingTransactions}
                  filter="all"
                  setFilter={() => {}}
                />
              </div>

              {/* Active Listings Summary */}
              <div className="rounded-xl border border-[#3d2b1f] bg-black/40 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-[#e8e0d5] flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    Active Listings
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab("listings")}
                    className="text-sm text-primary hover:underline"
                  >
                    Manage All
                  </button>
                </div>
                <MyListings
                  goldListings={goldListings.slice(0, 4)}
                  tokenListings={tokenListings.slice(0, 4)}
                  pendingPurchases={[]}
                  onCancelGoldListing={cancelGoldListing}
                  onCancelTokenListing={cancelTokenListing}
                  isLoading={false}
                />
              </div>
            </div>
          )}

          {/* Transactions Tab */}
          {activeTab === "transactions" && (
            <div className="rounded-xl border border-[#3d2b1f] bg-black/40 p-6">
              <h2 className="text-lg font-semibold text-[#e8e0d5] flex items-center gap-2 mb-4">
                <History className="w-5 h-5 text-primary" />
                Transaction History
              </h2>
              <TransactionHistory
                transactions={historyTransactions}
                tokenTransactions={tokenTransactions}
                hasMore={hasMoreTransactions}
                loadMore={loadMoreTransactions}
                isLoading={isLoadingTransactions}
                filter={transactionFilter}
                setFilter={setTransactionFilter}
              />
            </div>
          )}

          {/* Listings Tab */}
          {activeTab === "listings" && (
            <div className="rounded-xl border border-[#3d2b1f] bg-black/40 p-6">
              <h2 className="text-lg font-semibold text-[#e8e0d5] flex items-center gap-2 mb-4">
                <Package className="w-5 h-5 text-primary" />
                My Active Listings
              </h2>
              <MyListings
                goldListings={goldListings}
                tokenListings={tokenListings}
                pendingPurchases={pendingPurchases}
                onCancelGoldListing={cancelGoldListing}
                onCancelTokenListing={cancelTokenListing}
                isLoading={false}
              />
            </div>
          )}

          {/* Price History Tab */}
          {activeTab === "prices" && (
            <div className="rounded-xl border border-[#3d2b1f] bg-black/40 p-6">
              <h2 className="text-lg font-semibold text-[#e8e0d5] flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-primary" />
                Card Price History
              </h2>
              <PriceHistoryChart
                priceHistory={priceHistory}
                topCards={topCards}
                selectedCard={selectedCard}
                setSelectedCard={setSelectedCard}
                timeRange={timeRange}
                setTimeRange={setTimeRange}
                avgPrice={avgPrice}
                priceChange={priceChange}
                priceChangePercent={priceChangePercent}
                totalVolume={totalVolume}
                isLoading={isLoadingPrices}
                isLoadingTopCards={isLoadingTopCards}
              />
            </div>
          )}

          {/* LUNCH Token Chart Tab */}
          {activeTab === "chart" && (
            <div className="rounded-xl border border-[#3d2b1f] bg-black/40 p-6">
              <h2 className="text-lg font-semibold text-[#e8e0d5] flex items-center gap-2 mb-4">
                <LineChart className="w-5 h-5 text-primary" />
                LUNCH Token Live Chart
              </h2>
              <div className="relative w-full" style={{ paddingBottom: "65%" }}>
                <iframe
                  src={`https://dexscreener.com/solana/${process.env.NEXT_PUBLIC_DEXSCREENER_PAIR_ADDRESS || "BdDkntHfNoe77xjXDACaXJCVa6DksrgcHKn6gfr7dTPU"}?embed=1&loadChartSettings=0&chartLeftToolbar=0&chartTheme=dark&theme=dark&chartStyle=0&chartType=usd&interval=15`}
                  className="absolute top-0 left-0 w-full h-full rounded-lg"
                  style={{ border: 0 }}
                  title="LUNCH Token DexScreener Chart"
                  allow="clipboard-write"
                  loading="lazy"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
