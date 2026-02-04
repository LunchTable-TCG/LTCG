"use client";

/**
 * Treasury Wallets Management Page
 *
 * Create, view, and manage treasury wallets.
 */

import { PageWrapper } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api, useMutation, useQuery } from "@/lib/convexHelpers";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { Badge, Text, Title } from "@tremor/react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

// =============================================================================
// Types
// =============================================================================

type TreasuryWallet = Doc<"treasuryWallets">;

// =============================================================================
// Helper Functions
// =============================================================================

function formatLamports(lamports: number) {
  const sol = lamports / 1_000_000_000;
  return sol >= 1 ? `${sol.toFixed(4)} SOL` : `${(sol * 1000).toFixed(2)} mSOL`;
}

function formatTokens(rawAmount: number, decimals = 6) {
  const amount = rawAmount / 10 ** decimals;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(2)}K`;
  return amount.toFixed(2);
}

function getPurposeLabel(purpose: string) {
  switch (purpose) {
    case "fee_collection":
      return "Fee Collection";
    case "distribution":
      return "Distribution";
    case "liquidity":
      return "Liquidity";
    case "reserves":
      return "Reserves";
    default:
      return purpose;
  }
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
    case "active":
      return <Badge color="emerald">Active</Badge>;
    case "frozen":
      return <Badge color="amber">Frozen</Badge>;
    case "archived":
      return <Badge color="gray">Archived</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

function getCreationStatusBadge(creationStatus: string | undefined) {
  if (!creationStatus) {
    return <Badge color="amber">Legacy - No Status</Badge>;
  }

  switch (creationStatus) {
    case "pending":
      return <Badge color="slate">Pending</Badge>;
    case "creating":
      return <Badge color="blue">Creating</Badge>;
    case "active":
      return <Badge color="emerald">Created</Badge>;
    case "failed":
      return <Badge color="red">Failed</Badge>;
    default:
      return <Badge>{creationStatus}</Badge>;
  }
}

function getErrorTypeLabel(errorMessage?: string) {
  if (!errorMessage) return "Unknown error";
  if (errorMessage.includes("credentials not configured")) return "⚙️ Configuration Error";
  if (errorMessage.includes("Privy API error")) return "🔌 API Error";
  if (errorMessage.includes("Legacy wallet")) return "🕐 Legacy Wallet";
  return "❌ Creation Error";
}

function truncateAddress(address: string) {
  if (!address) return "Pending...";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// =============================================================================
// Component
// =============================================================================

export default function TreasuryWalletsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newWalletName, setNewWalletName] = useState("");
  const [newWalletPurpose, setNewWalletPurpose] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);

  // Fetch wallets
  const wallets = useQuery(api.treasury.wallets.listWallets, {});
  // policies query will be used when policy assignment UI is implemented

  // Mutations
  const createWallet = useMutation(api.treasury.wallets.createWallet);
  const syncBalance = useMutation(api.treasury.wallets.syncBalance);
  const updateWallet = useMutation(api.treasury.wallets.updateWallet);
  const retryWalletCreation = useMutation(api.treasury.wallets.retryWalletCreation);

  const isLoading = wallets === undefined;

  async function handleCreateWallet() {
    if (!newWalletName || !newWalletPurpose) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsCreating(true);
    try {
      await createWallet({
        name: newWalletName,
        purpose: newWalletPurpose as "fee_collection" | "distribution" | "liquidity" | "reserves",
      });
      toast.success("Wallet creation initiated");
      setIsCreateOpen(false);
      setNewWalletName("");
      setNewWalletPurpose("");
    } catch (error) {
      toast.error(`Failed to create wallet: ${error}`);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleSyncBalance(walletId: string) {
    try {
      await syncBalance({ walletId: walletId as Id<"treasuryWallets"> });
      toast.success("Balance sync initiated");
    } catch (error) {
      toast.error(`Failed to sync balance: ${error}`);
    }
  }

  async function handleRetryCreation(walletId: string) {
    try {
      await retryWalletCreation({ walletId: walletId as Id<"treasuryWallets"> });
      toast.success("Wallet creation retry initiated");
    } catch (error) {
      toast.error(`Failed to retry: ${error}`);
    }
  }

  async function handleFreezeWallet(walletId: string, currentStatus: string) {
    const newStatus = currentStatus === "active" ? "frozen" : "active";
    try {
      await updateWallet({ walletId: walletId as Id<"treasuryWallets">, status: newStatus });
      toast.success(`Wallet ${newStatus === "frozen" ? "frozen" : "unfrozen"}`);
    } catch (error) {
      toast.error(`Failed to update wallet: ${error}`);
    }
  }

  return (
    <PageWrapper
      title="Treasury Wallets"
      description="Manage platform treasury wallets"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/treasury">← Back to Overview</Link>
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>Create Wallet</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Treasury Wallet</DialogTitle>
                <DialogDescription>
                  Create a new Privy server wallet for treasury operations.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Wallet Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Main Fee Collection"
                    value={newWalletName}
                    onChange={(e) => setNewWalletName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purpose">Purpose</Label>
                  <Select value={newWalletPurpose} onValueChange={setNewWalletPurpose}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select purpose" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fee_collection">
                        💵 Fee Collection - Platform fees
                      </SelectItem>
                      <SelectItem value="distribution">
                        🎁 Distribution - Rewards & airdrops
                      </SelectItem>
                      <SelectItem value="liquidity">💧 Liquidity - LP & bonding curve</SelectItem>
                      <SelectItem value="reserves">🏦 Reserves - General reserves</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateWallet} disabled={isCreating}>
                  {isCreating ? "Creating..." : "Create Wallet"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      {/* Wallets Grid */}
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (wallets?.length ?? 0) > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {wallets?.map((wallet: TreasuryWallet) => (
            <Card key={wallet._id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getPurposeIcon(wallet.purpose)}</span>
                    <div>
                      <CardTitle className="text-lg">{wallet.name}</CardTitle>
                      <CardDescription>{getPurposeLabel(wallet.purpose)}</CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {getCreationStatusBadge(wallet.creationStatus)}
                    {wallet.creationStatus === "active" && getStatusBadge(wallet.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Creation Status Section */}
                {wallet.creationStatus !== "active" && (
                  <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                    {!wallet.creationStatus && (
                      <div className="flex items-center gap-2">
                        <span>⚠️</span>
                        <Text>
                          Legacy wallet without creation status. Run migration to populate status.
                        </Text>
                      </div>
                    )}
                    {wallet.creationStatus === "pending" && (
                      <div className="flex items-center gap-2">
                        <span>⏳</span>
                        <Text>Wallet creation scheduled...</Text>
                      </div>
                    )}
                    {wallet.creationStatus === "creating" && (
                      <div className="flex items-center gap-2">
                        <span>⚙️</span>
                        <Text>Creating wallet via Privy API...</Text>
                      </div>
                    )}
                    {wallet.creationStatus === "failed" && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span>{getErrorTypeLabel(wallet.creationErrorMessage)}</span>
                        </div>
                        <Text className="text-sm text-muted-foreground">
                          {wallet.creationErrorMessage}
                        </Text>
                        {wallet.creationAttempts !== undefined && (
                          <Text className="text-xs text-muted-foreground">
                            Attempts: {wallet.creationAttempts}
                          </Text>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Only show address and balances for active wallets */}
                {wallet.creationStatus === "active" && (
                  <>
                    {/* Address */}
                    <div className="space-y-1">
                      <Text className="text-xs text-muted-foreground">Address</Text>
                      <div className="flex items-center gap-2">
                        <code className="rounded bg-muted px-2 py-1 text-sm">
                          {truncateAddress(wallet.address)}
                        </code>
                        {wallet.address && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(wallet.address);
                              toast.success("Address copied");
                            }}
                          >
                            📋
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Balances */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Text className="text-xs text-muted-foreground">SOL Balance</Text>
                        <Title className="text-xl">{formatLamports(wallet.balance || 0)}</Title>
                      </div>
                      <div className="space-y-1">
                        <Text className="text-xs text-muted-foreground">LTCG Balance</Text>
                        <Title className="text-xl">{formatTokens(wallet.tokenBalance || 0)}</Title>
                      </div>
                    </div>

                    {/* Last Synced */}
                    {wallet.lastSyncedAt && (
                      <div className="text-xs text-muted-foreground">
                        Last synced: {new Date(wallet.lastSyncedAt).toLocaleString()}
                      </div>
                    )}
                  </>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  {wallet.creationStatus === "active" ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleSyncBalance(wallet._id)}
                        disabled={!wallet.address}
                      >
                        🔄 Sync
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleFreezeWallet(wallet._id, wallet.status)}
                      >
                        {wallet.status === "active" ? "🔒 Freeze" : "🔓 Unfreeze"}
                      </Button>
                      {wallet.address && (
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={`https://solscan.io/account/${wallet.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            🔗
                          </a>
                        </Button>
                      )}
                    </>
                  ) : wallet.creationStatus === "failed" ? (
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleRetryCreation(wallet._id)}
                    >
                      🔄 Retry Creation
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" className="flex-1" disabled>
                      Creating...
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-4xl mb-4">💳</div>
            <Title>No Treasury Wallets</Title>
            <Text className="text-muted-foreground mb-4">
              Create your first treasury wallet to manage platform funds.
            </Text>
            <Button onClick={() => setIsCreateOpen(true)}>Create Wallet</Button>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>About Treasury Wallets</CardTitle>
        </CardHeader>
        <CardContent>
          <Text className="text-muted-foreground">
            Treasury wallets are managed via Privy Server Wallet API. Each wallet is a Solana
            address controlled by your platform.
          </Text>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>
              • <strong>Fee Collection</strong>: Receives platform fees from marketplace
              transactions
            </li>
            <li>
              • <strong>Distribution</strong>: Sends rewards, airdrops, and promotional funds
            </li>
            <li>
              • <strong>Liquidity</strong>: Manages LP positions and bonding curve reserves
            </li>
            <li>
              • <strong>Reserves</strong>: General purpose treasury for emergencies and operations
            </li>
          </ul>
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
