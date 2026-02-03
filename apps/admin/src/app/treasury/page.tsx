"use client";

/**
 * Treasury Overview Page
 *
 * Dashboard showing treasury wallet balances, recent transactions,
 * and quick actions for treasury management.
 */

import { MetricGrid, MetricTile } from "@/components/analytics";
import { PageWrapper } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiAny, useConvexQuery } from "@/lib/convexHelpers";
import { Badge, BarList } from "@tremor/react";
import Link from "next/link";

// =============================================================================
// Helper Functions
// =============================================================================

function formatLamports(lamports: number) {
  const sol = lamports / 1_000_000_000;
  return sol >= 1 ? `${sol.toFixed(2)} SOL` : `${(sol * 1000).toFixed(1)} mSOL`;
}

function formatTokens(rawAmount: number, decimals = 6) {
  const amount = rawAmount / 10 ** decimals;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(2)}K`;
  return amount.toFixed(2);
}

function getPurposeIcon(purpose: string) {
  switch (purpose) {
    case "fee_collection":
      return "💵";
    case "distribution":
      return "🎁";
    case "liquidity":
      return "💧";
    case "reserves":
      return "🏦";
    default:
      return "💳";
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "confirmed":
      return <Badge color="emerald">Confirmed</Badge>;
    case "pending":
      return <Badge color="amber">Pending</Badge>;
    case "submitted":
      return <Badge color="blue">Submitted</Badge>;
    case "failed":
      return <Badge color="rose">Failed</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

function getTransactionTypeLabel(type: string) {
  switch (type) {
    case "fee_received":
      return "Fee Received";
    case "distribution":
      return "Distribution";
    case "liquidity_add":
      return "Add Liquidity";
    case "liquidity_remove":
      return "Remove Liquidity";
    case "transfer_internal":
      return "Internal Transfer";
    case "transfer_external":
      return "External Transfer";
    default:
      return type;
  }
}

// =============================================================================
// Component
// =============================================================================

export default function TreasuryOverviewPage() {
  // Fetch treasury data
  const overview = useConvexQuery(apiAny.treasury.wallets.getOverview);
  const wallets = useConvexQuery(apiAny.treasury.wallets.listWallets, { status: "active" });

  const isLoading = overview === undefined;

  // Transform wallets for bar list
  const walletBalances =
    wallets?.map((w: any) => ({
      name: `${getPurposeIcon(w.purpose)} ${w.name}`,
      value: w.balance || 0,
      href: `/treasury/wallets`,
    })) ?? [];

  // Transaction type breakdown
  const txByType = overview
    ? [
        { name: "Fees Received", value: overview.byType?.fee_received ?? 0 },
        { name: "Distributions", value: overview.byType?.distribution ?? 0 },
        { name: "Liquidity Add", value: overview.byType?.liquidity_add ?? 0 },
        { name: "Liquidity Remove", value: overview.byType?.liquidity_remove ?? 0 },
        { name: "Internal", value: overview.byType?.transfer_internal ?? 0 },
        { name: "External", value: overview.byType?.transfer_external ?? 0 },
      ].filter((t) => t.value > 0)
    : [];

  return (
    <PageWrapper
      title="Treasury Overview"
      description="Manage platform treasury wallets and funds"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/treasury/wallets">Manage Wallets</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/treasury/transactions">View Transactions</Link>
          </Button>
          <Button asChild>
            <Link href="/treasury/policies">Policies</Link>
          </Button>
        </div>
      }
    >
      {/* Key Metrics */}
      <MetricGrid columns={4}>
        <MetricTile
          title="Total SOL Balance"
          value={formatLamports(overview?.totalSolBalance ?? 0)}
          icon={<span className="text-lg">◎</span>}
          subtitle="Across all wallets"
          isLoading={isLoading}
        />
        <MetricTile
          title="Total LTCG Balance"
          value={formatTokens(overview?.totalTokenBalance ?? 0)}
          icon={<span className="text-lg">🪙</span>}
          subtitle="Platform token"
          isLoading={isLoading}
        />
        <MetricTile
          title="Active Wallets"
          value={overview?.totalWallets ?? 0}
          icon={<span className="text-lg">💳</span>}
          subtitle="Treasury wallets"
          isLoading={isLoading}
        />
        <MetricTile
          title="Pending Transactions"
          value={overview?.pendingTransactions ?? 0}
          icon={<span className="text-lg">⏳</span>}
          subtitle="Awaiting confirmation"
          isLoading={isLoading}
          delta={
            (overview?.pendingTransactions ?? 0) > 0
              ? `${overview?.pendingTransactions} pending`
              : undefined
          }
          deltaType={(overview?.pendingTransactions ?? 0) > 0 ? "increase" : "unchanged"}
        />
      </MetricGrid>

      {/* Wallet Purpose Breakdown */}
      <div className="mt-6 grid gap-6 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Fee Collection</CardTitle>
            <CardDescription>Platform fees</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview?.byPurpose?.fee_collection ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">wallet(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Distribution</CardTitle>
            <CardDescription>Rewards & airdrops</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview?.byPurpose?.distribution ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">wallet(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Liquidity</CardTitle>
            <CardDescription>LP & bonding curve</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview?.byPurpose?.liquidity ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">wallet(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Reserves</CardTitle>
            <CardDescription>General reserves</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview?.byPurpose?.reserves ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">wallet(s)</p>
          </CardContent>
        </Card>
      </div>

      {/* Wallets and Transactions */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Wallet Balances */}
        <Card>
          <CardHeader>
            <CardTitle>Wallet Balances</CardTitle>
            <CardDescription>SOL balance by wallet (lamports)</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : walletBalances.length > 0 ? (
              <BarList
                data={walletBalances}
                valueFormatter={(v: number) => formatLamports(v)}
                color="blue"
              />
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <p>No wallets configured</p>
                <Button variant="outline" className="mt-4" asChild>
                  <Link href="/treasury/wallets">Create Wallet</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transaction Types */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction Breakdown</CardTitle>
            <CardDescription>By transaction type</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : txByType.length > 0 ? (
              <BarList data={txByType} color="emerald" />
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <p>No transactions yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Latest treasury activity</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/treasury/transactions">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : (overview?.recentTransactions?.length ?? 0) > 0 ? (
            <div className="space-y-3">
              {overview?.recentTransactions?.map((tx: any) => (
                <div
                  key={tx._id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      {tx.type === "fee_received" ? "💵" : tx.type === "distribution" ? "🎁" : "📤"}
                    </div>
                    <div>
                      <p className="font-medium">{getTransactionTypeLabel(tx.type)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm">
                      {formatTokens(tx.amount)}
                    </span>
                    {getStatusBadge(tx.status)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <p>No recent transactions</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common treasury operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-auto flex-col gap-2 p-4" asChild>
              <Link href="/treasury/wallets">
                <span className="text-2xl">💳</span>
                <span>Create Wallet</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 p-4" asChild>
              <Link href="/treasury/transactions">
                <span className="text-2xl">📤</span>
                <span>New Distribution</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 p-4" asChild>
              <Link href="/treasury/policies">
                <span className="text-2xl">📜</span>
                <span>Manage Policies</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 p-4" asChild>
              <Link href="/analytics/token">
                <span className="text-2xl">📈</span>
                <span>Token Analytics</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
