"use client";

/**
 * BatchForms Component
 *
 * Reusable forms for batch operations.
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Text } from "@tremor/react";
import { useState } from "react";
import { toast } from "sonner";
import { apiAny, useConvexMutation } from "@/lib/convexHelpers";
import { PlayerSelector } from "./PlayerSelector";
import type { Id } from "@convex/_generated/dataModel";

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
// Grant Gold Form
// =============================================================================

export function GrantGoldForm({ onSuccess }: BatchOperationFormProps) {
  const [selectedPlayers, setSelectedPlayers] = useState<Id<"users">[]>([]);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const batchGrantGold = useConvexMutation(apiAny.admin.batchAdmin.batchGrantGold);

  const handleSubmit = async () => {
    if (selectedPlayers.length === 0) {
      toast.error("Please select at least one player");
      return;
    }
    if (!amount || Number.parseInt(amount, 10) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!reason.trim()) {
      toast.error("Please provide a reason");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await batchGrantGold({
        playerIds: selectedPlayers,
        amount: Number.parseInt(amount, 10),
        reason: reason.trim(),
      }) as BatchOperationResponse;
      toast.success(`Granted ${amount} gold to ${result.results.filter((r) => r.success).length} players`);
      setSelectedPlayers([]);
      setAmount("");
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

      <Button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting || selectedPlayers.length === 0}
        className="w-full"
      >
        {isSubmitting
          ? "Processing..."
          : `Grant ${amount || "0"} Gold to ${selectedPlayers.length} Players`}
      </Button>
    </div>
  );
}

// =============================================================================
// Grant Premium Form
// =============================================================================

export function GrantPremiumForm({ onSuccess }: BatchOperationFormProps) {
  const [selectedPlayers, setSelectedPlayers] = useState<Id<"users">[]>([]);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const batchGrantPremium = useConvexMutation(apiAny.admin.batchAdmin.batchGrantPremium);

  const handleSubmit = async () => {
    if (selectedPlayers.length === 0) {
      toast.error("Please select at least one player");
      return;
    }
    if (!amount || Number.parseInt(amount, 10) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!reason.trim()) {
      toast.error("Please provide a reason");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await batchGrantPremium({
        playerIds: selectedPlayers,
        durationDays: Number.parseInt(amount, 10),
        reason: reason.trim(),
      }) as BatchOperationResponse;
      toast.success(`Granted ${amount} premium to ${result.results.filter((r) => r.success).length} players`);
      setSelectedPlayers([]);
      setAmount("");
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
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="premium-reason">Reason</Label>
          <Input
            id="premium-reason"
            placeholder="e.g., Compensation"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      </div>

      <Button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting || selectedPlayers.length === 0}
        className="w-full"
      >
        {isSubmitting
          ? "Processing..."
          : `Grant ${amount || "0"} Premium to ${selectedPlayers.length} Players`}
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

  const batchResetRatings = useConvexMutation(apiAny.admin.batchAdmin.batchResetRatings);

  const handleSubmit = async () => {
    if (selectedPlayers.length === 0) {
      toast.error("Please select at least one player");
      return;
    }
    if (!reason.trim()) {
      toast.error("Please provide a reason");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await batchResetRatings({
        playerIds: selectedPlayers,
        reason: reason.trim(),
      }) as BatchOperationResponse;
      toast.success(`Reset ratings for ${result.results.filter((r) => r.success).length} players`);
      setSelectedPlayers([]);
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
      <div>
        <Label className="text-base font-medium">Select Players</Label>
        <Text className="text-sm text-muted-foreground mb-4">
          Choose which players will have their ratings reset to 1200
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

      <div className="p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
        <Text className="text-yellow-500 font-medium">⚠️ Warning</Text>
        <Text className="text-sm text-muted-foreground">
          This will reset all selected players&apos; ELO ratings to 1200. This action cannot be
          undone.
        </Text>
      </div>

      <Button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting || selectedPlayers.length === 0}
        variant="destructive"
        className="w-full"
      >
        {isSubmitting ? "Processing..." : `Reset Ratings for ${selectedPlayers.length} Players`}
      </Button>
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

  const batchGrantPacks = useConvexMutation(apiAny.admin.batchAdmin.batchGrantPacks);

  const handleSubmit = async () => {
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
    if (!reason.trim()) {
      toast.error("Please provide a reason");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await batchGrantPacks({
        playerIds: selectedPlayers,
        packType: packDefinitionId.trim(),
        quantity: Number.parseInt(quantity, 10),
        reason: reason.trim(),
      }) as BatchOperationResponse;
      toast.success(`Granted ${quantity} packs to ${result.results.filter((r) => r.success).length} players`);
      setSelectedPlayers([]);
      setPackDefinitionId("");
      setQuantity("1");
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

      <Button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting || selectedPlayers.length === 0}
        className="w-full"
      >
        {isSubmitting
          ? "Processing..."
          : `Grant ${quantity} Packs to ${selectedPlayers.length} Players`}
      </Button>
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

  const handleSubmit = async () => {
    if (!playerId.trim()) {
      toast.error("Please enter a player ID");
      return;
    }
    const validGrants = cardGrants.filter((g) => g.cardId.trim() && g.quantity > 0);
    if (validGrants.length === 0) {
      toast.error("Please add at least one valid card grant");
      return;
    }
    if (!reason.trim()) {
      toast.error("Please provide a reason");
      return;
    }

    setIsSubmitting(true);
    try {
      await grantCards({
        playerId: playerId.trim() as Id<"users">,
        cardIds: validGrants.map((g) => g.cardId.trim()),
        reason: reason.trim(),
      });
      toast.success("Granted cards to player successfully");
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

      <Button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting || !playerId.trim()}
        className="w-full"
      >
        {isSubmitting ? "Processing..." : "Grant Cards"}
      </Button>
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

  const handleSubmit = async () => {
    if (!playerId.trim()) {
      toast.error("Please enter a player ID");
      return;
    }
    const validRemovals = cardRemovals.filter((r) => r.cardId.trim() && r.quantity > 0);
    if (validRemovals.length === 0) {
      toast.error("Please add at least one valid card removal");
      return;
    }
    if (!reason.trim()) {
      toast.error("Please provide a reason");
      return;
    }

    setIsSubmitting(true);
    try {
      await removeCards({
        playerId: playerId.trim() as Id<"users">,
        cardIds: validRemovals.map((r) => r.cardId.trim()),
        reason: reason.trim(),
      });
      toast.success("Removed cards from player successfully");
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

      <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
        <Text className="text-red-500 font-medium">⚠️ Warning</Text>
        <Text className="text-sm text-muted-foreground">
          This will permanently remove cards from the player&apos;s inventory.
        </Text>
      </div>

      <Button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting || !playerId.trim()}
        variant="destructive"
        className="w-full"
      >
        {isSubmitting ? "Processing..." : "Remove Cards"}
      </Button>
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

  const batchGrantCards = useConvexMutation(apiAny.admin.batchAdmin.batchGrantCards);

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

  const handleSubmit = async () => {
    if (selectedPlayers.length === 0) {
      toast.error("Please select at least one player");
      return;
    }
    const validGrants = cardGrants.filter((g) => g.cardId.trim() && g.quantity > 0);
    if (validGrants.length === 0) {
      toast.error("Please add at least one valid card grant");
      return;
    }
    if (!reason.trim()) {
      toast.error("Please provide a reason");
      return;
    }

    setIsSubmitting(true);
    try {
      await batchGrantCards({
        playerIds: selectedPlayers,
        cardIds: validGrants.map((g) => g.cardId.trim()),
        reason: reason.trim(),
      });
      toast.success(
        `Granted cards to ${selectedPlayers.length} players successfully`,
      );
      setSelectedPlayers([]);
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

      <Button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting || selectedPlayers.length === 0}
        className="w-full"
      >
        {isSubmitting ? "Processing..." : `Grant Cards to ${selectedPlayers.length} Players`}
      </Button>
    </div>
  );
}
