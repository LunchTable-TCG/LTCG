"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useTokenBalance } from "@/hooks/economy/useTokenBalance";
import { type WalletType, useGameWallet } from "@/hooks/wallet/useGameWallet";
import { typedApi } from "@/lib/convexHelpers";
import { cn } from "@/lib/utils";
import { useExportWallet, useSignAndSendTransaction } from "@privy-io/react-auth/solana";
import bs58 from "bs58";
import { useAction } from "convex/react";
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  Coins,
  Copy,
  ExternalLink,
  Key,
  Loader2,
  LogOut,
  RefreshCw,
  Send,
  Shield,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Truncates a wallet address for display.
 * @param address - Full wallet address
 * @param chars - Number of characters to show at start and end (default 4)
 */
function truncateAddress(address: string, chars = 4) {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

interface WalletDisplayProps {
  /** Optional additional class names */
  className?: string;
  /** Compact mode - smaller display for tight spaces */
  compact?: boolean;
}

/**
 * Displays connected wallet information including address, type, and balance.
 * Provides actions for copying address, refreshing balance, and disconnecting.
 */
export function WalletDisplay({ className, compact = false }: WalletDisplayProps) {
  const { walletAddress, walletType, disconnectWallet, isConnecting, isLoading, solanaWallet } =
    useGameWallet();
  const {
    isStale,
    isLoading: balanceLoading,
    isRefreshing,
    refresh,
    formatBalance,
    balance,
  } = useTokenBalance();
  const { exportWallet } = useExportWallet();

  const [copied, setCopied] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleCopyAddress = async () => {
    if (!walletAddress) return;
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      toast.success("Address copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy address");
    }
  };

  const handleRefreshBalance = async () => {
    try {
      await refresh();
    } catch {
      // Error is handled in the hook with toast
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await disconnectWallet();
      toast.success("Wallet disconnected");
      setShowDisconnectDialog(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to disconnect wallet";
      toast.error(message);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleExportWallet = async () => {
    if (!walletAddress || walletType !== "privy_embedded") {
      toast.error("Can only export Privy embedded wallets");
      return;
    }

    setIsExporting(true);
    try {
      await exportWallet({ address: walletAddress });
      setShowExportDialog(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to export wallet";
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <Skeleton className="w-10 h-10 rounded-lg" />
        <div className="space-y-1.5">
          <Skeleton variant="text" className="w-24 h-4" />
          <Skeleton variant="text" className="w-16 h-3" />
        </div>
      </div>
    );
  }

  // Not connected
  if (!walletAddress) {
    return null;
  }

  const walletTypeBadge = getWalletTypeBadge(walletType);

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <button
          type="button"
          onClick={handleCopyAddress}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/20 hover:bg-black/30 transition-colors"
          title="Click to copy full address"
        >
          <WalletIcon walletType={walletType} className="w-3.5 h-3.5" />
          <span className="text-xs font-mono text-[#a89f94]">{truncateAddress(walletAddress)}</span>
        </button>
        <div className="flex items-center gap-1 text-xs">
          {balanceLoading ? (
            <Skeleton variant="text" className="w-12 h-4" />
          ) : (
            <>
              <Coins className="w-3 h-3 text-primary" />
              <span className={cn("font-medium", isStale && "text-yellow-400/80")}>
                {formatBalance(2)}
              </span>
              {isStale && <AlertTriangle className="w-3 h-3 text-yellow-400" />}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          "p-4 rounded-xl bg-[#1a1410]/95 backdrop-blur-sm border border-[#3d2b1f] shadow-xl",
          className
        )}
      >
        {/* Wallet Address Section */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#3d2b1f]/50 flex items-center justify-center">
              <WalletIcon walletType={walletType} className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-[#e8e0d5]">
                  {truncateAddress(walletAddress, 6)}
                </span>
                <button
                  type="button"
                  onClick={handleCopyAddress}
                  className="p-1 rounded hover:bg-white/5 transition-colors"
                  title="Copy full address"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-[#a89f94]" />
                  )}
                </button>
              </div>
              <div className="mt-0.5">
                <span
                  className={cn(
                    "text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider",
                    walletTypeBadge.className
                  )}
                >
                  {walletTypeBadge.label}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowDisconnectDialog(true)}
            disabled={isConnecting}
            className="p-2 rounded-lg hover:bg-red-500/10 text-[#a89f94] hover:text-red-400 transition-colors"
            title="Disconnect wallet"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Balance Section */}
        <div className="mt-4 pt-4 border-t border-[#3d2b1f]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-primary" />
              <span className="text-xs text-[#a89f94] uppercase tracking-wider">Balance</span>
            </div>
            <button
              type="button"
              onClick={handleRefreshBalance}
              disabled={isRefreshing}
              className="p-1.5 rounded hover:bg-white/5 transition-colors disabled:opacity-50"
              title="Refresh balance"
            >
              <RefreshCw
                className={cn("w-3.5 h-3.5 text-[#a89f94]", isRefreshing && "animate-spin")}
              />
            </button>
          </div>

          <div className="mt-2 flex items-baseline gap-2">
            {balanceLoading ? (
              <Skeleton variant="text" className="w-20 h-6" />
            ) : (
              <>
                <span className="text-2xl font-bold text-[#e8e0d5]">{formatBalance(2)}</span>
                <span className="text-sm text-[#a89f94]">LTCG</span>
              </>
            )}
          </div>

          {isStale && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-yellow-400/80">
              <AlertTriangle className="w-3 h-3" />
              <span>Balance may be outdated</span>
            </div>
          )}
        </div>

        {/* Wallet Actions */}
        <div className="mt-4 pt-4 border-t border-[#3d2b1f] flex gap-2">
          {walletType === "privy_embedded" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExportDialog(true)}
              className="flex-1 border-[#3d2b1f] text-[#a89f94] hover:text-[#e8e0d5] hover:bg-[#3d2b1f]/30"
            >
              <Key className="w-3.5 h-3.5 mr-1.5" />
              Export Key
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTransferDialog(true)}
            disabled={!balance || balance === 0}
            className="flex-1 border-[#3d2b1f] text-[#a89f94] hover:text-[#e8e0d5] hover:bg-[#3d2b1f]/30"
          >
            <Send className="w-3.5 h-3.5 mr-1.5" />
            Transfer
          </Button>
        </div>
      </div>

      {/* Disconnect Confirmation Dialog */}
      <Dialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
              <Wallet className="w-8 h-8 text-yellow-400" />
            </div>
            <DialogTitle className="text-xl text-[#e8e0d5]">Disconnect Wallet?</DialogTitle>
            <DialogDescription className="text-[#a89f94]">
              Your wallet will be unlinked from your game account. You can reconnect anytime.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-200/80">
                <p className="font-medium text-yellow-300 mb-1">Note:</p>
                <ul className="space-y-1 text-xs">
                  <li>Your tokens and assets remain safe in your wallet</li>
                  <li>Game progress and collection are saved to your account</li>
                  <li>You&apos;ll need to reconnect to use the marketplace</li>
                </ul>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDisconnectDialog(false)}
              disabled={isDisconnecting}
              className="w-full sm:w-auto border-[#3d2b1f] text-[#a89f94] hover:text-[#e8e0d5]"
            >
              Keep Connected
            </Button>
            <Button
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="w-full sm:w-auto bg-yellow-600 hover:bg-yellow-500 text-white"
            >
              {isDisconnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4 mr-2" />
                  Disconnect
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Private Key Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <Key className="w-8 h-8 text-red-400" />
            </div>
            <DialogTitle className="text-xl text-[#e8e0d5]">Export Private Key</DialogTitle>
            <DialogDescription className="text-[#a89f94]">
              This will reveal your wallet&apos;s private key. Keep it safe and never share it.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="text-sm text-red-200/80">
                <p className="font-medium text-red-300 mb-1">Security Warning:</p>
                <ul className="space-y-1 text-xs">
                  <li>Anyone with your private key can steal your funds</li>
                  <li>Never share it with anyone or paste it on websites</li>
                  <li>Store it securely offline if you need a backup</li>
                </ul>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowExportDialog(false)}
              disabled={isExporting}
              className="w-full sm:w-auto border-[#3d2b1f] text-[#a89f94] hover:text-[#e8e0d5]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleExportWallet}
              disabled={isExporting}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-500 text-white"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Opening...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4 mr-2" />
                  Show Private Key
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <TransferDialog
        open={showTransferDialog}
        onOpenChange={setShowTransferDialog}
        walletAddress={walletAddress}
        balance={balance ?? 0}
        solanaWallet={solanaWallet}
        onSuccess={refresh}
      />
    </>
  );
}

/**
 * Transfer dialog for sending LTCG tokens
 *
 * Flow:
 * 1. User enters recipient and amount
 * 2. Frontend calls Convex action to build unsigned transaction
 * 3. Frontend signs with Privy's signAndSendTransaction
 * 4. Transaction is submitted to Solana network
 */
function TransferDialog({
  open,
  onOpenChange,
  walletAddress,
  balance,
  solanaWallet,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletAddress: string | null;
  balance: number;
  solanaWallet: ReturnType<typeof useGameWallet>["solanaWallet"];
  onSuccess?: () => void;
}) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const buildTransferTransaction = useAction(
    typedApi.wallet.tokenTransfer.buildTransferTransaction
  );
  const { signAndSendTransaction } = useSignAndSendTransaction();

  const handleTransfer = async () => {
    if (!walletAddress || !solanaWallet || !recipient || !amount) {
      toast.error("Please fill in all fields");
      return;
    }

    const amountNum = Number.parseFloat(amount);
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (amountNum > balance) {
      toast.error("Insufficient balance");
      return;
    }

    // Validate Solana address (base58, 32-44 chars)
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(recipient)) {
      toast.error("Invalid Solana address");
      return;
    }

    setIsSending(true);
    setTxSignature(null);

    try {
      // Step 1: Build unsigned transaction on backend
      const { transaction: base64Transaction } = await buildTransferTransaction({
        from: walletAddress,
        to: recipient,
        amount: amountNum,
      });

      // Step 2: Convert base64 to Uint8Array for Privy
      const transactionBytes = new Uint8Array(
        atob(base64Transaction)
          .split("")
          .map((c) => c.charCodeAt(0))
      );

      // Step 3: Sign and send with Privy
      const result = await signAndSendTransaction({
        transaction: transactionBytes,
        wallet: solanaWallet,
      });

      // Step 4: Convert signature Uint8Array to base58 string for display
      const signatureBase58 = bs58.encode(result.signature);

      setTxSignature(signatureBase58);
      toast.success("Transfer successful!");

      // Refresh balance after successful transfer
      onSuccess?.();
    } catch (err) {
      console.error("Transfer failed:", err);
      const message = err instanceof Error ? err.message : "Transfer failed";
      toast.error(message);
    } finally {
      setIsSending(false);
    }
  };

  const handleMaxAmount = () => {
    setAmount(balance.toString());
  };

  const handleClose = () => {
    setRecipient("");
    setAmount("");
    setTxSignature(null);
    onOpenChange(false);
  };

  // Show success state with transaction link
  if (txSignature) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
              <Check className="w-8 h-8 text-green-400" />
            </div>
            <DialogTitle className="text-xl text-[#e8e0d5]">Transfer Complete!</DialogTitle>
            <DialogDescription className="text-[#a89f94]">
              Your LTCG tokens have been sent successfully.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
            <p className="text-xs text-green-200/80 mb-2">Transaction Signature:</p>
            <p className="font-mono text-xs text-green-300 break-all">{txSignature}</p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => window.open(`https://solscan.io/tx/${txSignature}`, "_blank")}
              className="w-full border-[#3d2b1f] text-[#a89f94] hover:text-[#e8e0d5]"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View on Solscan
            </Button>
            <Button
              onClick={handleClose}
              className="w-full bg-primary hover:bg-primary/90 text-white"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Send className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="text-xl text-[#e8e0d5]">Transfer LTCG</DialogTitle>
          <DialogDescription className="text-[#a89f94]">
            Send LTCG tokens to another Solana wallet
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-4">
          <div>
            <label className="block text-[10px] font-black text-[#a89f94] uppercase tracking-widest mb-2">
              Recipient Address
            </label>
            <Input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Solana wallet address..."
              className="bg-[#1a1410] border-[#3d2b1f] text-[#e8e0d5] placeholder:text-[#a89f94]/50"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-[#a89f94] uppercase tracking-widest mb-2">
              Amount
            </label>
            <div className="relative">
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="bg-[#1a1410] border-[#3d2b1f] text-[#e8e0d5] placeholder:text-[#a89f94]/50 pr-20"
              />
              <button
                type="button"
                onClick={handleMaxAmount}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-primary hover:text-primary/80 uppercase"
              >
                Max
              </button>
            </div>
            <p className="text-[10px] text-[#a89f94]/60 mt-1">
              Available: {balance.toLocaleString()} LTCG
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSending}
            className="w-full sm:w-auto border-[#3d2b1f] text-[#a89f94] hover:text-[#e8e0d5]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={isSending || !recipient || !amount}
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <ArrowUpRight className="w-4 h-4 mr-2" />
                Send LTCG
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Icon component for different wallet types.
 */
function WalletIcon({
  walletType,
  className,
}: { walletType: WalletType | null; className?: string }) {
  if (walletType === "privy_embedded") {
    return <Shield className={className} />;
  }
  return <Wallet className={className} />;
}

/**
 * Returns badge styling for wallet type.
 */
function getWalletTypeBadge(walletType: WalletType | null) {
  if (walletType === "privy_embedded") {
    return {
      label: "Game Wallet",
      className: "bg-primary/20 text-primary border border-primary/30",
    };
  }
  return {
    label: "External",
    className: "bg-[#3d2b1f]/50 text-[#a89f94] border border-[#3d2b1f]",
  };
}
