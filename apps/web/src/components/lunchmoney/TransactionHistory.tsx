"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  Coins,
  ExternalLink,
  Gem,
  Loader2,
  Wallet,
} from "lucide-react";

interface Transaction {
  _id: string;
  transactionType: string;
  currencyType?: string;
  amount: number;
  balanceAfter?: number;
  description?: string;
  createdAt: number;
}

interface TokenTransaction {
  _id: string;
  transactionType: string;
  amount: number;
  signature?: string;
  status: string;
  description?: string;
  createdAt: number;
  confirmedAt?: number;
}

interface TransactionHistoryProps {
  transactions: Transaction[];
  tokenTransactions: TokenTransaction[];
  hasMore: boolean;
  loadMore: () => void;
  isLoading: boolean;
  filter: "all" | "gold" | "gems" | "token";
  setFilter: (filter: "all" | "gold" | "gems" | "token") => void;
}

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  purchase: "Purchase",
  reward: "Reward",
  sale: "Sale",
  gift: "Gift",
  refund: "Refund",
  conversion: "Conversion",
  marketplace_fee: "Marketplace Fee",
  auction_bid: "Auction Bid",
  auction_refund: "Auction Refund",
  marketplace_purchase: "Marketplace Purchase",
  marketplace_sale: "Marketplace Sale",
  platform_fee: "Platform Fee",
};

function formatDate(timestamp: number) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 24) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffHours < 48) {
    return "Yesterday";
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function TransactionIcon({ type, amount }: { type: string; amount: number }) {
  const isPositive = amount > 0;

  if (type === "marketplace_purchase" || type === "purchase") {
    return <ArrowUpRight className="h-4 w-4 text-red-400" />;
  }
  if (type === "sale" || type === "marketplace_sale" || type === "reward") {
    return <ArrowDownLeft className="h-4 w-4 text-green-400" />;
  }
  return isPositive ? (
    <ArrowDownLeft className="h-4 w-4 text-green-400" />
  ) : (
    <ArrowUpRight className="h-4 w-4 text-red-400" />
  );
}

function CurrencyIcon({ currency }: { currency?: string }) {
  if (currency === "gems") {
    return <Gem className="h-4 w-4 text-purple-400" />;
  }
  if (currency === "token") {
    return <Wallet className="h-4 w-4 text-primary" />;
  }
  return <Coins className="h-4 w-4 text-yellow-400" />;
}

export function TransactionHistory({
  transactions,
  tokenTransactions,
  hasMore,
  loadMore,
  isLoading,
  filter,
  setFilter,
}: TransactionHistoryProps) {
  // Combine and filter transactions based on selected filter
  const allTransactions = [
    ...transactions.map((tx) => ({ ...tx, isToken: false })),
    ...tokenTransactions.map((tx) => ({ ...tx, isToken: true, currencyType: "token" as const })),
  ].sort((a, b) => b.createdAt - a.createdAt);

  const filteredTransactions =
    filter === "all"
      ? allTransactions
      : filter === "token"
        ? allTransactions.filter((tx) => tx.isToken)
        : allTransactions.filter((tx) => !tx.isToken && tx.currencyType === filter);

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "gold", "gems", "token"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-[#1a1512] text-[#a89f94] hover:bg-[#2a2118] hover:text-[#e8e0d5]"
            )}
          >
            {f === "all" ? "All" : f === "gold" ? "Gold" : f === "gems" ? "Gems" : "Tokens"}
          </button>
        ))}
      </div>

      {/* Transaction List */}
      <div className="rounded-xl border border-[#3d2b1f] bg-black/40 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-12 text-center text-[#a89f94]">
            <p>No transactions found</p>
            <p className="text-sm text-[#a89f94]/60 mt-1">Your transaction history will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-[#3d2b1f]/50">
            {filteredTransactions.map((tx) => (
              <div
                key={tx._id}
                className="flex items-center justify-between px-4 py-3 hover:bg-[#1a1512]/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#1a1512]">
                    <TransactionIcon type={tx.transactionType} amount={tx.amount} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#e8e0d5]">
                      {TRANSACTION_TYPE_LABELS[tx.transactionType] || tx.transactionType}
                    </p>
                    <p className="text-xs text-[#a89f94]">
                      {tx.description || formatDate(tx.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        tx.amount > 0 ? "text-green-400" : "text-red-400"
                      )}
                    >
                      {tx.amount > 0 ? "+" : ""}
                      {tx.amount.toLocaleString()}
                    </p>
                    {"balanceAfter" in tx && tx.balanceAfter !== undefined && (
                      <p className="text-xs text-[#a89f94]">
                        Balance: {tx.balanceAfter.toLocaleString()}
                      </p>
                    )}
                  </div>
                  <CurrencyIcon currency={tx.currencyType} />
                  {"signature" in tx && tx.signature && (
                    <a
                      href={`https://solscan.io/tx/${tx.signature}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded hover:bg-[#2a2118] transition-colors"
                      title="View on Solscan"
                    >
                      <ExternalLink className="h-4 w-4 text-[#a89f94]" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More */}
        {hasMore && (
          <div className="p-4 border-t border-[#3d2b1f]/50">
            <Button
              variant="outline"
              size="sm"
              onClick={loadMore}
              className="w-full border-[#3d2b1f] text-[#a89f94] hover:bg-[#1a1512] hover:text-[#e8e0d5]"
            >
              <ChevronDown className="h-4 w-4 mr-2" />
              Load More
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
