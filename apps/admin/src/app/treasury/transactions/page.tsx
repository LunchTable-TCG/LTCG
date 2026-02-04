"use client";

/**
 * Treasury Transactions Page
 *
 * View and manage treasury transaction history.
 */

import { PageWrapper } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { typedApi, useQuery } from "@/lib/convexHelpers";
import type { Doc } from "@convex/_generated/dataModel";
import { Badge } from "@tremor/react";
import Link from "next/link";
import { useState } from "react";

// =============================================================================
// Types
// =============================================================================

type TreasuryTransaction = Doc<"treasuryTransactions"> & {
  walletName: string;
  walletAddress: string;
};

// =============================================================================
// Helper Functions
// =============================================================================

function formatTokens(rawAmount: number, decimals = 6) {
  const amount = rawAmount / 10 ** decimals;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(2)}K`;
  return amount.toFixed(4);
}

function getTypeLabel(type: string) {
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

function getTypeIcon(type: string) {
  switch (type) {
    case "fee_received":
      return "💵";
    case "distribution":
      return "🎁";
    case "liquidity_add":
      return "💧";
    case "liquidity_remove":
      return "🌊";
    case "transfer_internal":
      return "🔄";
    case "transfer_external":
      return "📤";
    default:
      return "📋";
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

function truncateSignature(sig: string | undefined) {
  if (!sig) return "—";
  return `${sig.slice(0, 8)}...${sig.slice(-8)}`;
}

// =============================================================================
// Component
// =============================================================================

export default function TreasuryTransactionsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const limit = 20;

  // Fetch transactions
  // biome-ignore lint/suspicious/noExplicitAny: TypedAPI has incorrect return type
  const { transactions, total } = (useQuery(typedApi.treasury.transactions.listTransactions, {
    status:
      statusFilter !== "all"
        ? (statusFilter as "pending" | "submitted" | "confirmed" | "failed")
        : undefined,
    type:
      typeFilter !== "all"
        ? (typeFilter as
            | "distribution"
            | "fee_received"
            | "liquidity_add"
            | "liquidity_remove"
            | "transfer_internal"
            | "transfer_external")
        : undefined,
    limit,
    offset: page * limit,
  }) as any) ?? { transactions: [], total: 0 };

  // Fetch stats
  // biome-ignore lint/suspicious/noExplicitAny: TypedAPI has incorrect return type
  const stats = useQuery(typedApi.treasury.transactions.getStats, { daysBack: 30 }) as any;

  const isLoading = transactions === undefined;
  const totalPages = Math.ceil(total / limit);

  return (
    <PageWrapper
      title="Treasury Transactions"
      description="View and manage transaction history"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/treasury">← Back to Overview</Link>
          </Button>
        </div>
      }
    >
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalTransactions ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
            <CardDescription>Successfully processed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">
              {stats?.byStatus?.confirmed ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <CardDescription>Awaiting confirmation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{stats?.byStatus?.pending ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <CardDescription>Errors encountered</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-500">{stats?.byStatus?.failed ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="fee_received">Fee Received</SelectItem>
                  <SelectItem value="distribution">Distribution</SelectItem>
                  <SelectItem value="liquidity_add">Add Liquidity</SelectItem>
                  <SelectItem value="liquidity_remove">Remove Liquidity</SelectItem>
                  <SelectItem value="transfer_internal">Internal Transfer</SelectItem>
                  <SelectItem value="transfer_external">External Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            Showing {transactions?.length ?? 0} of {total} transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : transactions && transactions.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Wallet</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Signature</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx: TreasuryTransaction) => (
                    <TableRow key={tx._id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{getTypeIcon(tx.type)}</span>
                          <span>{getTypeLabel(tx.type)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{tx.walletName}</span>
                      </TableCell>
                      <TableCell className="font-mono">{formatTokens(tx.amount)}</TableCell>
                      <TableCell>{getStatusBadge(tx.status)}</TableCell>
                      <TableCell>
                        {tx.signature ? (
                          <a
                            href={`https://solscan.io/tx/${tx.signature}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs text-blue-500 hover:underline"
                          >
                            {truncateSignature(tx.signature)}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Page {page + 1} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.max(0, page - 1))}
                      disabled={page === 0}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                      disabled={page >= totalPages - 1}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <div className="text-4xl mb-4">📋</div>
              <p>No transactions found</p>
              {(statusFilter !== "all" || typeFilter !== "all") && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setStatusFilter("all");
                    setTypeFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
