"use client";

/**
 * BatchForms Component
 *
 * Reusable forms for batch operations.
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiAny, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import type { Id } from "@convex/_generated/dataModel";
import { Badge, Text } from "@tremor/react";
import { AlertCircle, CheckCircle2, Eye, Loader2, Play } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PlayerSelector } from "./PlayerSelector";

// =============================================================================
// Types
// =============================================================================

interface BatchOperationFormProps {
  onSuccess?: () => void;
}

interface BatchOperationResult {
  playerId: Id<"users">;
  success: boolean;
  error?: string;
}

interface BatchOperationResponse {
  success: boolean;
  message: string;
  results: BatchOperationResult[];
}

// =============================================================================
// Preview Panel Component
// =============================================================================

interface PreviewPanelProps {
  isLoading: boolean;
  isExecuting: boolean;
  summary?: {
    totalPlayers: number;
    validPlayers: number;
    invalidPlayers: number;
    [key: string]: unknown;
  };
  details?: Array<{
    username?: string;
    email?: string;
    valid: boolean;
    error?: string;
    [key: string]: unknown;
  }>;
  onClose: () => void;
  onExecute: () => void;
  operationName: string;
  operationDescription: string;
  isDestructive?: boolean;
  renderSummaryExtra?: () => React.ReactNode;
  renderDetailItem?: (item: unknown, index: number) => React.ReactNode;
}

function PreviewPanel({
  isLoading,
  isExecuting,
  summary,
  details,
  onClose,
  onExecute,
  operationName,
  operationDescription,
  isDestructive = false,
  renderSummaryExtra,
  renderDetailItem,
}: PreviewPanelProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  if (isLoading) {
    return (
      <div className="p-4 bg-blue-500/10 border border-blue-500/50 rounded-lg animate-pulse">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          <Text className="text-blue-500 font-medium">Loading preview...</Text>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const handleExecuteClick = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirm = () => {
    setShowConfirmDialog(false);
    onExecute();
  };

  return (
    <>
      <div className="space-y-4 p-4 bg-muted/50 border rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-blue-500" />
            <Text className="font-medium">Operation Preview</Text>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isExecuting}>
            X
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 bg-background rounded border">
            <Text className="text-xs text-muted-foreground">Total</Text>
            <Text className="text-lg font-bold">{summary.totalPlayers}</Text>
          </div>
          <div className="p-2 bg-green-500/10 border border-green-500/30 rounded">
            <Text className="text-xs text-green-600">Valid</Text>
            <Text className="text-lg font-bold text-green-600">{summary.validPlayers}</Text>
          </div>
          <div className="p-2 bg-red-500/10 border border-red-500/30 rounded">
            <Text className="text-xs text-red-600">Invalid</Text>
            <Text className="text-lg font-bold text-red-600">{summary.invalidPlayers}</Text>
          </div>
        </div>

        {/* Custom Summary Extra */}
        {renderSummaryExtra?.()}

        {/* Detail List */}
        {details && details.length > 0 && (
          <div className="max-h-48 overflow-y-auto space-y-1">
            <Text className="text-xs text-muted-foreground mb-2">Player Details:</Text>
            {details.map((item, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-2 rounded text-sm ${
                  item.valid ? "bg-green-500/5" : "bg-red-500/5"
                }`}
              >
                <div className="flex items-center gap-2">
                  {item.valid ? (
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-red-500" />
                  )}
                  <span>{item.username || item.email || "Unknown"}</span>
                </div>
                {renderDetailItem ? (
                  renderDetailItem(item, index)
                ) : item.error ? (
                  <Badge color="red" size="xs">
                    {item.error}
                  </Badge>
                ) : null}
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={isExecuting}>
            Cancel
          </Button>
          <Button
            onClick={handleExecuteClick}
            disabled={summary.validPlayers === 0 || isExecuting}
            variant={isDestructive ? "destructive" : "default"}
            className="flex-1"
          >
            {isExecuting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Execute Operation
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm {operationName}</AlertDialogTitle>
            <AlertDialogDescription>
              {operationDescription}
              <br />
              <br />
              This will affect <strong>{summary.validPlayers}</strong> player(s).
              {isDestructive && (
                <>
                  <br />
                  <span className="text-red-500 font-medium">This action cannot be undone.</span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={isDestructive ? "bg-red-600 hover:bg-red-700" : ""}
            >
              Yes, Execute
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// =============================================================================
// Grant Gold Form
// =============================================================================

export function GrantGoldForm({ onSuccess }: BatchOperationFormProps) {
  const [selectedPlayers, setSelectedPlayers] = useState<Id<"users">[]>([]);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewArgs, setPreviewArgs] = useState<{
    playerIds: Id<"users">[];
    amount: number;
  } | null>(null);

  const batchGrantGold = useConvexMutation(apiAny.admin.batchAdmin.batchGrantGold);
  const previewData = useConvexQuery(
    apiAny.admin.batchAdmin.previewBatchGrantGold,
    previewArgs ?? "skip"
  );

  const handlePreview = () => {
    if (selectedPlayers.length === 0) {
      toast.error("Please select at least one player");
      return;
    }
    if (!amount || Number.parseInt(amount, 10) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    setPreviewArgs({
      playerIds: selectedPlayers,
      amount: Number.parseInt(amount, 10),
    });
    setShowPreview(true);
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = (await batchGrantGold({
        playerIds: selectedPlayers,
        amount: Number.parseInt(amount, 10),
        reason: reason.trim(),
      })) as BatchOperationResponse;
      toast.success(
        `Granted ${amount} gold to ${result.results.filter((r) => r.success).length} players`
      );
      setSelectedPlayers([]);
      setAmount("");
      setReason("");
      setShowPreview(false);
      setPreviewArgs(null);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Operation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const closePreview = () => {
    setShowPreview(false);
    setPreviewArgs(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-medium">Select Players</Label>
        <Text className="text-sm text-muted-foreground mb-4">
          Choose which players will receive gold
        </Text>
        <PlayerSelector selectedIds={selectedPlayers} onSelectionChange={setSelectedPlayers} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="gold-amount">Gold Amount</Label>
          <Input
            id="gold-amount"
            type="number"
            placeholder="e.g., 1000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="1"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gold-reason">Reason</Label>
          <Input
            id="gold-reason"
            placeholder="e.g., Season 1 reward"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      </div>

      {/* Preview Panel */}
      {showPreview && (
        <PreviewPanel
          isLoading={previewData === undefined}
          isExecuting={isSubmitting}
          summary={previewData?.summary}
          details={previewData?.preview}
          onClose={closePreview}
          onExecute={handleSubmit}
          operationName="Grant Gold"
          operationDescription={`You are about to grant ${Number(amount).toLocaleString()} gold to the selected players. Reason: "${reason.trim() || "No reason provided"}"`}
          renderSummaryExtra={() => (
            <div className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded">
              <Text className="text-xs text-yellow-600">Total Gold to Grant</Text>
              <Text className="text-lg font-bold text-yellow-600">
                {previewData?.summary?.totalGoldToGrant?.toLocaleString() ?? 0}
              </Text>
            </div>
          )}
          renderDetailItem={(item) => {
            const preview = item as { currentGold: number; newGold: number };
            return (
              <Text className="text-xs text-muted-foreground">
                {preview.currentGold?.toLocaleString()} -{">"} {preview.newGold?.toLocaleString()}
              </Text>
            );
          }}
        />
      )}

      {/* Action Buttons */}
      {!showPreview && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handlePreview}
            disabled={isSubmitting || selectedPlayers.length === 0 || !amount}
            className="flex-1"
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Grant Premium Form
// =============================================================================

export function GrantPremiumForm({ onSuccess: _onSuccess }: BatchOperationFormProps) {
  const [selectedPlayers, setSelectedPlayers] = useState<Id<"users">[]>([]);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  return (
    <div className="space-y-6">
      {/* Not Implemented Warning */}
      <div className="p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
          <div>
            <Text className="text-yellow-500 font-medium">Feature Not Yet Implemented</Text>
            <Text className="text-sm text-muted-foreground">
              The premium currency system is not yet available in the database schema. This feature
              will be enabled once the isPremium and premiumExpiresAt fields are added to the users
              table.
            </Text>
          </div>
        </div>
      </div>

      <div>
        <Label className="text-base font-medium">Select Players</Label>
        <Text className="text-sm text-muted-foreground mb-4">
          Choose which players will receive premium currency
        </Text>
        <PlayerSelector selectedIds={selectedPlayers} onSelectionChange={setSelectedPlayers} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="premium-amount">Premium Amount</Label>
          <Input
            id="premium-amount"
            type="number"
            placeholder="e.g., 100"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="1"
            disabled
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="premium-reason">Reason</Label>
          <Input
            id="premium-reason"
            placeholder="e.g., Compensation"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled
          />
        </div>
      </div>

      <Button type="button" disabled={true} className="w-full">
        Coming Soon - Grant Premium to {selectedPlayers.length} Players
      </Button>
    </div>
  );
}

// =============================================================================
// Reset Ratings Form
// =============================================================================

export function ResetRatingsForm({ onSuccess }: BatchOperationFormProps) {
  const [selectedPlayers, setSelectedPlayers] = useState<Id<"users">[]>([]);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewArgs, setPreviewArgs] = useState<{ playerIds: Id<"users">[] } | null>(null);

  const batchResetRatings = useConvexMutation(apiAny.admin.batchAdmin.batchResetRatings);
  const previewData = useConvexQuery(
    apiAny.admin.batchAdmin.previewBatchResetRatings,
    previewArgs ?? "skip"
  );

  const handlePreview = () => {
    if (selectedPlayers.length === 0) {
      toast.error("Please select at least one player");
      return;
    }
    setPreviewArgs({ playerIds: selectedPlayers });
    setShowPreview(true);
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = (await batchResetRatings({
        playerIds: selectedPlayers,
        reason: reason.trim(),
      })) as BatchOperationResponse;
      toast.success(`Reset ratings for ${result.results.filter((r) => r.success).length} players`);
      setSelectedPlayers([]);
      setReason("");
      setShowPreview(false);
      setPreviewArgs(null);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Operation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const closePreview = () => {
    setShowPreview(false);
    setPreviewArgs(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-medium">Select Players</Label>
        <Text className="text-sm text-muted-foreground mb-4">
          Choose which players will have their ratings reset to 1000
        </Text>
        <PlayerSelector selectedIds={selectedPlayers} onSelectionChange={setSelectedPlayers} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reset-reason">Reason</Label>
        <Textarea
          id="reset-reason"
          placeholder="Explain why ratings are being reset..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
        />
      </div>

      {/* Preview Panel */}
      {showPreview && (
        <PreviewPanel
          isLoading={previewData === undefined}
          isExecuting={isSubmitting}
          summary={previewData?.summary}
          details={previewData?.preview}
          onClose={closePreview}
          onExecute={handleSubmit}
          operationName="Reset Ratings"
          operationDescription={`You are about to reset ELO ratings to 1000 for the selected players. Reason: "${reason.trim() || "No reason provided"}"`}
          isDestructive={true}
          renderSummaryExtra={() => (
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-red-500/10 border border-red-500/30 rounded">
                <Text className="text-xs text-red-600">Losing Rating</Text>
                <Text className="text-lg font-bold text-red-600">
                  {previewData?.summary?.playersLosingRating ?? 0}
                </Text>
              </div>
              <div className="p-2 bg-green-500/10 border border-green-500/30 rounded">
                <Text className="text-xs text-green-600">Gaining Rating</Text>
                <Text className="text-lg font-bold text-green-600">
                  {previewData?.summary?.playersGainingRating ?? 0}
                </Text>
              </div>
            </div>
          )}
          renderDetailItem={(item) => {
            const preview = item as {
              currentRankedElo: number;
              rankedChange: number;
            };
            return (
              <div className="flex items-center gap-2">
                <Text className="text-xs text-muted-foreground">
                  {preview.currentRankedElo} -{">"} 1000
                </Text>
                <Badge
                  color={
                    preview.rankedChange > 0 ? "green" : preview.rankedChange < 0 ? "red" : "gray"
                  }
                  size="xs"
                >
                  {preview.rankedChange > 0 ? "+" : ""}
                  {preview.rankedChange}
                </Badge>
              </div>
            );
          }}
        />
      )}

      <div className="p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
        <Text className="text-yellow-500 font-medium">Warning</Text>
        <Text className="text-sm text-muted-foreground">
          This will reset all selected players&apos; ELO ratings to 1000. This action cannot be
          undone.
        </Text>
      </div>

      {/* Action Buttons */}
      {!showPreview && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handlePreview}
            disabled={isSubmitting || selectedPlayers.length === 0}
            className="flex-1"
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview Impact
          </Button>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Grant Packs Form
// =============================================================================

export function GrantPacksForm({ onSuccess }: BatchOperationFormProps) {
  const [selectedPlayers, setSelectedPlayers] = useState<Id<"users">[]>([]);
  const [packDefinitionId, setPackDefinitionId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewArgs, setPreviewArgs] = useState<{
    playerIds: Id<"users">[];
    packType: string;
    quantity: number;
  } | null>(null);

  const batchGrantPacks = useConvexMutation(apiAny.admin.batchAdmin.batchGrantPacks);
  const previewData = useConvexQuery(
    apiAny.admin.batchAdmin.previewBatchGrantPacks,
    previewArgs ?? "skip"
  );

  const handlePreview = () => {
    if (selectedPlayers.length === 0) {
      toast.error("Please select at least one player");
      return;
    }
    if (!packDefinitionId.trim()) {
      toast.error("Please enter a pack definition ID");
      return;
    }
    if (!quantity || Number.parseInt(quantity, 10) <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }
    setPreviewArgs({
      playerIds: selectedPlayers,
      packType: packDefinitionId.trim(),
      quantity: Number.parseInt(quantity, 10),
    });
    setShowPreview(true);
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = (await batchGrantPacks({
        playerIds: selectedPlayers,
        packType: packDefinitionId.trim(),
        quantity: Number.parseInt(quantity, 10),
        reason: reason.trim(),
      })) as BatchOperationResponse;
      toast.success(
        `Granted ${quantity} packs to ${result.results.filter((r) => r.success).length} players`
      );
      setSelectedPlayers([]);
      setPackDefinitionId("");
      setQuantity("1");
      setReason("");
      setShowPreview(false);
      setPreviewArgs(null);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Operation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const closePreview = () => {
    setShowPreview(false);
    setPreviewArgs(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-medium">Select Players</Label>
        <Text className="text-sm text-muted-foreground mb-4">
          Choose which players will receive card packs
        </Text>
        <PlayerSelector selectedIds={selectedPlayers} onSelectionChange={setSelectedPlayers} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="pack-id">Pack Definition ID</Label>
          <Input
            id="pack-id"
            placeholder="e.g., starter_pack"
            value={packDefinitionId}
            onChange={(e) => setPackDefinitionId(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pack-quantity">Quantity</Label>
          <Input
            id="pack-quantity"
            type="number"
            placeholder="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            min="1"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pack-reason">Reason</Label>
          <Input
            id="pack-reason"
            placeholder="e.g., Event reward"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      </div>

      {/* Preview Panel */}
      {showPreview && (
        <PreviewPanel
          isLoading={previewData === undefined}
          isExecuting={isSubmitting}
          summary={previewData?.summary}
          details={previewData?.preview}
          onClose={closePreview}
          onExecute={handleSubmit}
          operationName="Grant Packs"
          operationDescription={`You are about to grant ${quantity} "${packDefinitionId}" pack(s) to the selected players. Reason: "${reason.trim() || "No reason provided"}"`}
          renderSummaryExtra={() => (
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-purple-500/10 border border-purple-500/30 rounded">
                <Text className="text-xs text-purple-600">Total Packs</Text>
                <Text className="text-lg font-bold text-purple-600">
                  {previewData?.summary?.totalPacksToGrant ?? 0}
                </Text>
              </div>
              <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded">
                <Text className="text-xs text-blue-600">Est. Total Cards</Text>
                <Text className="text-lg font-bold text-blue-600">
                  {previewData?.summary?.estimatedTotalCards ?? 0}
                </Text>
              </div>
            </div>
          )}
        />
      )}

      {/* Action Buttons */}
      {!showPreview && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handlePreview}
            disabled={
              isSubmitting || selectedPlayers.length === 0 || !packDefinitionId.trim() || !quantity
            }
            className="flex-1"
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Grant Cards Form (Single Player)
// =============================================================================

interface CardGrant {
  cardId: string;
  quantity: number;
}

export function GrantCardsForm({ onSuccess }: BatchOperationFormProps) {
  const [playerId, setPlayerId] = useState("");
  const [cardGrants, setCardGrants] = useState<CardGrant[]>([{ cardId: "", quantity: 1 }]);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const grantCards = useConvexMutation(apiAny.admin.batchAdmin.grantCardsToPlayer);

  const addCardGrant = () => {
    setCardGrants([...cardGrants, { cardId: "", quantity: 1 }]);
  };

  const removeCardGrant = (index: number) => {
    setCardGrants(cardGrants.filter((_, i) => i !== index));
  };

  const updateCardGrant = (index: number, field: keyof CardGrant, value: string | number) => {
    const updated = [...cardGrants];
    updated[index] = { ...updated[index], [field]: value } as CardGrant;
    setCardGrants(updated);
  };

  const validGrants = cardGrants.filter((g) => g.cardId.trim() && g.quantity > 0);

  const handlePreviewClick = () => {
    if (!playerId.trim()) {
      toast.error("Please enter a player ID");
      return;
    }
    if (validGrants.length === 0) {
      toast.error("Please add at least one valid card grant");
      return;
    }
    if (!reason.trim()) {
      toast.error("Please provide a reason");
      return;
    }
    setShowConfirmDialog(true);
  };

  const handleSubmit = async () => {
    setShowConfirmDialog(false);
    setIsSubmitting(true);
    try {
      const result = await grantCards({
        playerId: playerId.trim() as Id<"users">,
        cardIds: validGrants.map((g) => g.cardId.trim()),
        reason: reason.trim(),
      });
      const typedResult = result as { success: boolean; message: string };
      toast.success(typedResult.message || "Granted cards to player successfully");
      setPlayerId("");
      setCardGrants([{ cardId: "", quantity: 1 }]);
      setReason("");
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Operation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="player-id">Player ID</Label>
        <Input
          id="player-id"
          placeholder="Enter player ID"
          value={playerId}
          onChange={(e) => setPlayerId(e.target.value)}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <Label className="text-base font-medium">Cards to Grant</Label>
          <Button type="button" variant="outline" size="sm" onClick={addCardGrant}>
            + Add Card
          </Button>
        </div>
        <div className="space-y-3">
          {cardGrants.map((grant, index) => (
            <div key={index} className="flex gap-3 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Card ID</Label>
                <Input
                  placeholder="Card ID"
                  value={grant.cardId}
                  onChange={(e) => updateCardGrant(index, "cardId", e.target.value)}
                />
              </div>
              <div className="w-24 space-y-1">
                <Label className="text-xs">Qty</Label>
                <Input
                  type="number"
                  min="1"
                  value={grant.quantity}
                  onChange={(e) =>
                    updateCardGrant(index, "quantity", Number.parseInt(e.target.value, 10) || 1)
                  }
                />
              </div>
              {cardGrants.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCardGrant(index)}
                >
                  ✕
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cards-reason">Reason</Label>
        <Input
          id="cards-reason"
          placeholder="e.g., Tournament prize"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      {/* Summary Preview */}
      {validGrants.length > 0 && playerId.trim() && (
        <div className="p-4 bg-muted/50 border rounded-lg">
          <Text className="font-medium mb-2">Operation Summary</Text>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <Text className="text-muted-foreground">Target Player:</Text>
              <Text className="font-mono text-xs">{playerId.trim()}</Text>
            </div>
            <div>
              <Text className="text-muted-foreground">Cards to Grant:</Text>
              <Text>{validGrants.length} card(s)</Text>
            </div>
          </div>
        </div>
      )}

      <Button
        type="button"
        onClick={handlePreviewClick}
        disabled={isSubmitting || !playerId.trim() || validGrants.length === 0}
        className="w-full"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Play className="w-4 h-4 mr-2" />
            Grant {validGrants.length} Card(s)
          </>
        )}
      </Button>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Card Grant</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to grant <strong>{validGrants.length}</strong> card(s) to player{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">{playerId.trim()}</code>.
              <br />
              <br />
              <strong>Reason:</strong> {reason.trim() || "No reason provided"}
              <br />
              <br />
              This action will be logged in the audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit}>Yes, Grant Cards</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// =============================================================================
// Remove Cards Form
// =============================================================================

export function RemoveCardsForm({ onSuccess }: BatchOperationFormProps) {
  const [playerId, setPlayerId] = useState("");
  const [cardRemovals, setCardRemovals] = useState<CardGrant[]>([{ cardId: "", quantity: 1 }]);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const removeCards = useConvexMutation(apiAny.admin.batchAdmin.removeCardsFromPlayer);

  const addCardRemoval = () => {
    setCardRemovals([...cardRemovals, { cardId: "", quantity: 1 }]);
  };

  const removeCardRemoval = (index: number) => {
    setCardRemovals(cardRemovals.filter((_, i) => i !== index));
  };

  const updateCardRemoval = (index: number, field: keyof CardGrant, value: string | number) => {
    const updated = [...cardRemovals];
    updated[index] = { ...updated[index], [field]: value } as CardGrant;
    setCardRemovals(updated);
  };

  const validRemovals = cardRemovals.filter((r) => r.cardId.trim() && r.quantity > 0);

  const handlePreviewClick = () => {
    if (!playerId.trim()) {
      toast.error("Please enter a player ID");
      return;
    }
    if (validRemovals.length === 0) {
      toast.error("Please add at least one valid card removal");
      return;
    }
    if (!reason.trim()) {
      toast.error("Please provide a reason");
      return;
    }
    setShowConfirmDialog(true);
  };

  const handleSubmit = async () => {
    setShowConfirmDialog(false);
    setIsSubmitting(true);
    try {
      const result = await removeCards({
        playerId: playerId.trim() as Id<"users">,
        cardIds: validRemovals.map((r) => r.cardId.trim()),
        reason: reason.trim(),
      });
      const typedResult = result as { success: boolean; message: string };
      toast.success(typedResult.message || "Removed cards from player successfully");
      setPlayerId("");
      setCardRemovals([{ cardId: "", quantity: 1 }]);
      setReason("");
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Operation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="remove-player-id">Player ID</Label>
        <Input
          id="remove-player-id"
          placeholder="Enter player ID"
          value={playerId}
          onChange={(e) => setPlayerId(e.target.value)}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <Label className="text-base font-medium">Cards to Remove</Label>
          <Button type="button" variant="outline" size="sm" onClick={addCardRemoval}>
            + Add Card
          </Button>
        </div>
        <div className="space-y-3">
          {cardRemovals.map((removal, index) => (
            <div key={index} className="flex gap-3 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Card ID</Label>
                <Input
                  placeholder="Card ID"
                  value={removal.cardId}
                  onChange={(e) => updateCardRemoval(index, "cardId", e.target.value)}
                />
              </div>
              <div className="w-24 space-y-1">
                <Label className="text-xs">Qty</Label>
                <Input
                  type="number"
                  min="1"
                  value={removal.quantity}
                  onChange={(e) =>
                    updateCardRemoval(index, "quantity", Number.parseInt(e.target.value, 10) || 1)
                  }
                />
              </div>
              {cardRemovals.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCardRemoval(index)}
                >
                  ✕
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="remove-reason">Reason</Label>
        <Textarea
          id="remove-reason"
          placeholder="Explain why cards are being removed..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
        />
      </div>

      {/* Summary Preview */}
      {validRemovals.length > 0 && playerId.trim() && (
        <div className="p-4 bg-red-500/5 border border-red-500/30 rounded-lg">
          <Text className="font-medium mb-2 text-red-600">Removal Summary</Text>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <Text className="text-muted-foreground">Target Player:</Text>
              <Text className="font-mono text-xs">{playerId.trim()}</Text>
            </div>
            <div>
              <Text className="text-muted-foreground">Cards to Remove:</Text>
              <Text className="text-red-600 font-medium">{validRemovals.length} card(s)</Text>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
          <div>
            <Text className="text-red-500 font-medium">Warning - Destructive Action</Text>
            <Text className="text-sm text-muted-foreground">
              This will permanently remove cards from the player&apos;s inventory. This action
              cannot be undone.
            </Text>
          </div>
        </div>
      </div>

      <Button
        type="button"
        onClick={handlePreviewClick}
        disabled={isSubmitting || !playerId.trim() || validRemovals.length === 0}
        variant="destructive"
        className="w-full"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Removing...
          </>
        ) : (
          <>
            <Play className="w-4 h-4 mr-2" />
            Remove {validRemovals.length} Card(s)
          </>
        )}
      </Button>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Card Removal</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to <strong className="text-red-600">permanently remove</strong>{" "}
              <strong>{validRemovals.length}</strong> card(s) from player{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">{playerId.trim()}</code>.
              <br />
              <br />
              <strong>Reason:</strong> {reason.trim() || "No reason provided"}
              <br />
              <br />
              <span className="text-red-600 font-medium">
                This action cannot be undone and will be logged in the audit trail.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit} className="bg-red-600 hover:bg-red-700">
              Yes, Remove Cards
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// =============================================================================
// Batch Grant Cards Form (Multiple Players)
// =============================================================================

export function BatchGrantCardsForm({ onSuccess }: BatchOperationFormProps) {
  const [selectedPlayers, setSelectedPlayers] = useState<Id<"users">[]>([]);
  const [cardGrants, setCardGrants] = useState<CardGrant[]>([{ cardId: "", quantity: 1 }]);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewArgs, setPreviewArgs] = useState<{
    playerIds: Id<"users">[];
    cardIds: Id<"cardDefinitions">[];
  } | null>(null);

  const batchGrantCards = useConvexMutation(apiAny.admin.batchAdmin.batchGrantCards);
  const previewData = useConvexQuery(
    apiAny.admin.batchAdmin.previewBatchGrantCards,
    previewArgs ?? "skip"
  );

  const addCardGrant = () => {
    setCardGrants([...cardGrants, { cardId: "", quantity: 1 }]);
  };

  const removeCardGrant = (index: number) => {
    setCardGrants(cardGrants.filter((_, i) => i !== index));
  };

  const updateCardGrant = (index: number, field: keyof CardGrant, value: string | number) => {
    const updated = [...cardGrants];
    updated[index] = { ...updated[index], [field]: value } as CardGrant;
    setCardGrants(updated);
  };

  const handlePreview = () => {
    if (selectedPlayers.length === 0) {
      toast.error("Please select at least one player");
      return;
    }
    const validGrants = cardGrants.filter((g) => g.cardId.trim() && g.quantity > 0);
    if (validGrants.length === 0) {
      toast.error("Please add at least one valid card grant");
      return;
    }
    setPreviewArgs({
      playerIds: selectedPlayers,
      cardIds: validGrants.map((g) => g.cardId.trim() as Id<"cardDefinitions">),
    });
    setShowPreview(true);
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason");
      return;
    }
    const validGrants = cardGrants.filter((g) => g.cardId.trim() && g.quantity > 0);

    setIsSubmitting(true);
    try {
      await batchGrantCards({
        playerIds: selectedPlayers,
        cardIds: validGrants.map((g) => g.cardId.trim()),
        reason: reason.trim(),
      });
      toast.success(`Granted cards to ${selectedPlayers.length} players successfully`);
      setSelectedPlayers([]);
      setCardGrants([{ cardId: "", quantity: 1 }]);
      setReason("");
      setShowPreview(false);
      setPreviewArgs(null);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Operation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const closePreview = () => {
    setShowPreview(false);
    setPreviewArgs(null);
  };

  const validGrants = cardGrants.filter((g) => g.cardId.trim() && g.quantity > 0);

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-medium">Select Players</Label>
        <Text className="text-sm text-muted-foreground mb-4">
          Choose which players will receive cards
        </Text>
        <PlayerSelector selectedIds={selectedPlayers} onSelectionChange={setSelectedPlayers} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <Label className="text-base font-medium">Cards to Grant</Label>
          <Button type="button" variant="outline" size="sm" onClick={addCardGrant}>
            + Add Card
          </Button>
        </div>
        <div className="space-y-3">
          {cardGrants.map((grant, index) => (
            <div key={index} className="flex gap-3 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Card ID</Label>
                <Input
                  placeholder="Card ID"
                  value={grant.cardId}
                  onChange={(e) => updateCardGrant(index, "cardId", e.target.value)}
                />
              </div>
              <div className="w-24 space-y-1">
                <Label className="text-xs">Qty</Label>
                <Input
                  type="number"
                  min="1"
                  value={grant.quantity}
                  onChange={(e) =>
                    updateCardGrant(index, "quantity", Number.parseInt(e.target.value, 10) || 1)
                  }
                />
              </div>
              {cardGrants.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCardGrant(index)}
                >
                  ✕
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="batch-cards-reason">Reason</Label>
        <Input
          id="batch-cards-reason"
          placeholder="e.g., Season reward"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      {/* Preview Panel */}
      {showPreview && (
        <PreviewPanel
          isLoading={previewData === undefined}
          isExecuting={isSubmitting}
          summary={previewData?.summary}
          details={previewData?.playerPreview}
          onClose={closePreview}
          onExecute={handleSubmit}
          operationName="Grant Cards"
          operationDescription={`You are about to grant ${validGrants.length} card(s) to the selected players. Reason: "${reason.trim() || "No reason provided"}"`}
          renderSummaryExtra={() => (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded">
                  <Text className="text-xs text-blue-600">Cards Per Player</Text>
                  <Text className="text-lg font-bold text-blue-600">
                    {previewData?.summary?.cardsPerPlayer ?? 0}
                  </Text>
                </div>
                <div className="p-2 bg-purple-500/10 border border-purple-500/30 rounded">
                  <Text className="text-xs text-purple-600">Total Cards</Text>
                  <Text className="text-lg font-bold text-purple-600">
                    {previewData?.summary?.totalCardsToGrant ?? 0}
                  </Text>
                </div>
              </div>
              {previewData?.cardPreview && (
                <div className="p-2 bg-muted rounded">
                  <Text className="text-xs text-muted-foreground mb-1">Cards to grant:</Text>
                  <div className="flex flex-wrap gap-1">
                    {previewData.cardPreview
                      .filter((c: { valid: boolean }) => c.valid)
                      .map((card: { name: string; rarity: string }, idx: number) => (
                        <Badge key={idx} size="xs" color="blue">
                          {card.name} ({card.rarity})
                        </Badge>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        />
      )}

      {/* Action Buttons */}
      {!showPreview && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handlePreview}
            disabled={isSubmitting || selectedPlayers.length === 0 || validGrants.length === 0}
            className="flex-1"
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
        </div>
      )}
    </div>
  );
}
