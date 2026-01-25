"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Coins,
  CreditCard,
  ExternalLink,
  Gem,
  Gift,
  History,
  Loader2,
  Plus,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useProfile, useCurrency } from "@/hooks";

type TransactionType = "purchase" | "reward" | "sale" | "gift" | "refund";

interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  currency: "gold" | "gems";
  timestamp: number;
  status: "completed" | "pending" | "failed";
}

// Mock transaction data
const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: "t1",
    type: "reward",
    description: "Daily Quest Reward",
    amount: 150,
    currency: "gold",
    timestamp: Date.now() - 2 * 60 * 60 * 1000,
    status: "completed",
  },
  {
    id: "t2",
    type: "purchase",
    description: "Booster Pack",
    amount: -1000,
    currency: "gold",
    timestamp: Date.now() - 5 * 60 * 60 * 1000,
    status: "completed",
  },
  {
    id: "t3",
    type: "sale",
    description: "Marketplace Sale: Flame Drake",
    amount: 500,
    currency: "gold",
    timestamp: Date.now() - 12 * 60 * 60 * 1000,
    status: "completed",
  },
  {
    id: "t4",
    type: "reward",
    description: "Weekly Quest Reward",
    amount: 50,
    currency: "gems",
    timestamp: Date.now() - 1 * 24 * 60 * 60 * 1000,
    status: "completed",
  },
  {
    id: "t5",
    type: "purchase",
    description: "Premium Pack",
    amount: -250,
    currency: "gems",
    timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
    status: "completed",
  },
  {
    id: "t6",
    type: "gift",
    description: "Welcome Bonus",
    amount: 500,
    currency: "gold",
    timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000,
    status: "completed",
  },
  {
    id: "t7",
    type: "purchase",
    description: "Gold Pouch (1000 Gold)",
    amount: -50,
    currency: "gems",
    timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000,
    status: "completed",
  },
];

const transactionIcons: Record<TransactionType, typeof Coins> = {
  purchase: ShoppingBag,
  reward: Gift,
  sale: TrendingUp,
  gift: Gift,
  refund: ArrowDownLeft,
};

const transactionColors: Record<TransactionType, string> = {
  purchase: "text-red-400",
  reward: "text-green-400",
  sale: "text-green-400",
  gift: "text-purple-400",
  refund: "text-blue-400",
};

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export default function WalletPage() {
  const { profile: currentUser, isLoading: profileLoading } = useProfile();
  const { balance, transactions, gold: goldBalance, gems: gemBalance } = useCurrency();

  const [filter, setFilter] = useState<"all" | "gold" | "gems">("all");

  const filteredTransactions =
    transactions?.transactions.map((t: any): Transaction => ({
      id: t._id,
      type: t.transactionType,
      description: t.description,
      amount: t.amount,
      currency: t.currencyType,
      timestamp: t.createdAt,
      status: "completed" as const,
    })) ?? [];

  const totalEarned = balance?.lifetimeStats.goldEarned ?? 0;
  const totalSpent = balance?.lifetimeStats.goldSpent ?? 0;

  if (profileLoading || !currentUser) {
    return (
      <div className="min-h-screen bg-[#0d0a09] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#d4af37] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0a09] relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-yellow-900/10 via-[#0d0a09] to-[#0d0a09]" />

      <div className="container mx-auto px-4 pt-28 pb-16 relative z-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Wallet className="w-8 h-8 text-[#d4af37]" />
            <h1 className="text-3xl font-bold text-[#e8e0d5]">Wallet</h1>
          </div>
          <p className="text-[#a89f94]">Manage your currencies and view transaction history</p>
        </div>

        {/* Balance Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Gold Balance */}
          <div className="relative p-6 rounded-xl bg-linear-to-br from-yellow-500/20 to-amber-600/10 border border-yellow-500/30 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                    <Coins className="w-6 h-6 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-sm text-yellow-300/60">Gold Balance</p>
                    <p className="text-3xl font-black text-yellow-400">
                      {goldBalance.toLocaleString()}
                    </p>
                  </div>
                </div>
                <Button className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/30">
                  <Plus className="w-4 h-4 mr-1" />
                  Get Gold
                </Button>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-green-400" />
                  <span className="text-[#a89f94]">Earned:</span>
                  <span className="text-green-400 font-medium">{totalEarned.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowDownLeft className="w-4 h-4 text-red-400" />
                  <span className="text-[#a89f94]">Spent:</span>
                  <span className="text-red-400 font-medium">{totalSpent.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Gem Balance */}
          <div className="relative p-6 rounded-xl bg-linear-to-br from-purple-500/20 to-indigo-600/10 border border-purple-500/30 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <Gem className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-purple-300/60">Gem Balance</p>
                    <p className="text-3xl font-black text-purple-400">
                      {gemBalance.toLocaleString()}
                    </p>
                  </div>
                </div>
                <Button className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30">
                  <CreditCard className="w-4 h-4 mr-1" />
                  Buy Gems
                </Button>
              </div>
              <p className="text-sm text-[#a89f94]">
                Premium currency for exclusive items and packs
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <Button
            variant="outline"
            className="h-auto py-4 border-[#3d2b1f] text-[#a89f94] hover:text-[#e8e0d5] hover:border-[#d4af37]/50 flex flex-col items-center gap-2"
          >
            <ShoppingBag className="w-6 h-6" />
            <span>Shop</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 border-[#3d2b1f] text-[#a89f94] hover:text-[#e8e0d5] hover:border-[#d4af37]/50 flex flex-col items-center gap-2"
          >
            <Gift className="w-6 h-6" />
            <span>Redeem Code</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 border-[#3d2b1f] text-[#a89f94] hover:text-[#e8e0d5] hover:border-[#d4af37]/50 flex flex-col items-center gap-2"
          >
            <ExternalLink className="w-6 h-6" />
            <span>Transfer</span>
          </Button>
        </div>

        {/* Transaction History */}
        <div className="rounded-xl bg-black/40 border border-[#3d2b1f] overflow-hidden">
          <div className="p-6 border-b border-[#3d2b1f]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <History className="w-6 h-6 text-[#d4af37]" />
                <h2 className="text-xl font-bold text-[#e8e0d5]">Transaction History</h2>
              </div>

              {/* Filter Tabs */}
              <div className="flex gap-2 p-1 bg-black/40 rounded-lg">
                {[
                  { id: "all" as const, label: "All" },
                  { id: "gold" as const, label: "Gold", icon: Coins },
                  { id: "gems" as const, label: "Gems", icon: Gem },
                ].map((tab) => (
                  <button
                    type="button"
                    key={tab.id}
                    onClick={() => setFilter(tab.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all",
                      filter === tab.id
                        ? "bg-[#d4af37] text-[#1a1614]"
                        : "text-[#a89f94] hover:text-[#e8e0d5]"
                    )}
                  >
                    {tab.icon && <tab.icon className="w-4 h-4" />}
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Transaction List */}
          <div className="divide-y divide-[#3d2b1f]">
            {filteredTransactions.length === 0 ? (
              <div className="p-12 text-center">
                <Clock className="w-12 h-12 mx-auto mb-4 text-[#a89f94]/50" />
                <p className="text-[#a89f94]">No transactions found</p>
              </div>
            ) : (
              filteredTransactions.map((transaction) => {
                const Icon = transactionIcons[transaction.type];
                const colorClass = transactionColors[transaction.type];
                const isPositive = transaction.amount > 0;

                return (
                  <div key={transaction.id} className="p-4 hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center",
                          isPositive ? "bg-green-500/20" : "bg-red-500/20"
                        )}
                      >
                        <Icon className={cn("w-5 h-5", colorClass)} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#e8e0d5] truncate">
                          {transaction.description}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-[#a89f94]">
                          <Clock className="w-3 h-3" />
                          <span>{formatTimeAgo(transaction.timestamp)}</span>
                          <span className="capitalize px-2 py-0.5 rounded bg-black/40 text-xs">
                            {transaction.type}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div
                          className={cn(
                            "flex items-center gap-1.5 font-bold",
                            isPositive ? "text-green-400" : "text-red-400"
                          )}
                        >
                          {transaction.currency === "gold" ? (
                            <Coins className="w-4 h-4 text-yellow-400" />
                          ) : (
                            <Gem className="w-4 h-4 text-purple-400" />
                          )}
                          <span>
                            {isPositive ? "+" : ""}
                            {transaction.amount.toLocaleString()}
                          </span>
                        </div>
                        <span
                          className={cn(
                            "text-xs",
                            transaction.status === "completed"
                              ? "text-green-400/60"
                              : transaction.status === "pending"
                                ? "text-yellow-400/60"
                                : "text-red-400/60"
                          )}
                        >
                          {transaction.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Load More */}
          {filteredTransactions.length > 0 && (
            <div className="p-4 border-t border-[#3d2b1f]">
              <Button variant="ghost" className="w-full text-[#a89f94] hover:text-[#e8e0d5]">
                Load More Transactions
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
