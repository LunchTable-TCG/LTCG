"use client";

/**
 * Battle Pass Tier Editor Page
 *
 * Visual editor for configuring battle pass tier rewards.
 */

import { PageWrapper } from "@/components/layout";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RoleGuard } from "@/contexts/AdminContext";
import { apiAny, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import { Card, Text, Title } from "@tremor/react";
import {
  ArrowLeftIcon,
  CheckIcon,
  CoinsIcon,
  CrownIcon,
  GemIcon,
  LayersIcon,
  Loader2Icon,
  SaveIcon,
  SparklesIcon,
  StarIcon,
  WandIcon,
  ZapIcon,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// =============================================================================
// Types & Constants
// =============================================================================

type RewardType = "gold" | "gems" | "xp" | "card" | "pack" | "title" | "avatar";

interface TierReward {
  type: RewardType;
  amount?: number;
  cardId?: string;
  packProductId?: string;
  titleName?: string;
  avatarUrl?: string;
}

interface TierConfig {
  tier: number;
  freeReward?: TierReward;
  premiumReward?: TierReward;
  isMilestone: boolean;
  isDirty?: boolean;
}

const REWARD_TYPES = [
  { value: "gold", label: "Gold", icon: CoinsIcon, color: "text-amber-500" },
  { value: "gems", label: "Gems", icon: GemIcon, color: "text-violet-500" },
  { value: "xp", label: "XP", icon: ZapIcon, color: "text-emerald-500" },
  { value: "card", label: "Card", icon: SparklesIcon, color: "text-blue-500" },
  { value: "pack", label: "Pack", icon: LayersIcon, color: "text-orange-500" },
  { value: "title", label: "Title", icon: CrownIcon, color: "text-pink-500" },
  { value: "avatar", label: "Avatar", icon: StarIcon, color: "text-cyan-500" },
];

const MILESTONE_TIERS = [10, 20, 30, 40, 50];

// =============================================================================
// Tier Row Component
// =============================================================================

interface TierRowProps {
  tier: TierConfig;
  onUpdate: (tier: TierConfig) => void;
  isEditable: boolean;
}

function TierRow({ tier, onUpdate, isEditable }: TierRowProps) {
  const updateReward = (
    track: "free" | "premium",
    field: keyof TierReward | "type",
    value: string | number | undefined
  ) => {
    const rewardKey = track === "free" ? "freeReward" : "premiumReward";
    const currentReward = tier[rewardKey] || { type: "gold" };

    let newReward: TierReward;
    if (field === "type") {
      // Reset reward when type changes
      newReward = { type: value as RewardType };
      if (["gold", "gems", "xp"].includes(value as string)) {
        newReward.amount = 100;
      }
    } else {
      newReward = { ...currentReward, [field]: value };
    }

    onUpdate({
      ...tier,
      [rewardKey]: newReward,
      isDirty: true,
    });
  };

  const clearReward = (track: "free" | "premium") => {
    const rewardKey = track === "free" ? "freeReward" : "premiumReward";
    onUpdate({
      ...tier,
      [rewardKey]: undefined,
      isDirty: true,
    });
  };

  const toggleMilestone = () => {
    onUpdate({
      ...tier,
      isMilestone: !tier.isMilestone,
      isDirty: true,
    });
  };

  const RewardEditor = ({
    reward,
    track,
  }: {
    reward?: TierReward;
    track: "free" | "premium";
  }) => {
    const rewardType = reward?.type || "none";
    const RewardIcon = REWARD_TYPES.find((r) => r.value === rewardType)?.icon;
    const iconColor = REWARD_TYPES.find((r) => r.value === rewardType)?.color;

    return (
      <div className="flex items-center gap-2">
        <Select
          value={rewardType}
          onValueChange={(v) => {
            if (v === "none") {
              clearReward(track);
            } else {
              updateReward(track, "type", v);
            }
          }}
          disabled={!isEditable}
        >
          <SelectTrigger className="w-[100px] h-8">
            <SelectValue>
              <span className="flex items-center gap-1">
                {RewardIcon && <RewardIcon className={`h-3 w-3 ${iconColor}`} />}
                {rewardType === "none" ? "None" : rewardType}
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {REWARD_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                <span className="flex items-center gap-2">
                  <type.icon className={`h-4 w-4 ${type.color}`} />
                  {type.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {reward && ["gold", "gems", "xp"].includes(reward.type) && (
          <Input
            type="number"
            className="w-20 h-8"
            value={reward.amount || ""}
            onChange={(e) =>
              updateReward(track, "amount", Number.parseInt(e.target.value, 10) || 0)
            }
            placeholder="Amount"
            disabled={!isEditable}
          />
        )}

        {reward && reward.type === "pack" && (
          <Input
            className="w-24 h-8"
            value={reward.packProductId || ""}
            onChange={(e) => updateReward(track, "packProductId", e.target.value)}
            placeholder="Pack ID"
            disabled={!isEditable}
          />
        )}

        {reward && reward.type === "title" && (
          <Input
            className="w-24 h-8"
            value={reward.titleName || ""}
            onChange={(e) => updateReward(track, "titleName", e.target.value)}
            placeholder="Title"
            disabled={!isEditable}
          />
        )}
      </div>
    );
  };

  return (
    <tr
      className={`border-b hover:bg-muted/30 ${
        tier.isMilestone ? "bg-amber-500/5" : ""
      } ${tier.isDirty ? "bg-blue-500/5" : ""}`}
    >
      <td className="py-2 px-3">
        <div className="flex items-center gap-2">
          <span className={`font-mono font-bold ${tier.isMilestone ? "text-amber-500" : ""}`}>
            {tier.tier}
          </span>
          {tier.isMilestone && (
            <Badge variant="secondary" className="text-amber-600 bg-amber-100 text-xs">
              <StarIcon className="h-3 w-3 mr-1" />
              Milestone
            </Badge>
          )}
          {tier.isDirty && (
            <Badge variant="secondary" className="text-blue-600 bg-blue-100 text-xs">
              Modified
            </Badge>
          )}
        </div>
      </td>
      <td className="py-2 px-3">
        <RewardEditor reward={tier.freeReward} track="free" />
      </td>
      <td className="py-2 px-3">
        <RewardEditor reward={tier.premiumReward} track="premium" />
      </td>
      <td className="py-2 px-3 text-center">
        <Checkbox
          checked={tier.isMilestone}
          onCheckedChange={toggleMilestone}
          disabled={!isEditable}
        />
      </td>
    </tr>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function BattlePassTiersPage() {
  const params = useParams();
  const battlePassId = params.seasonId as string;

  const [tiers, setTiers] = useState<TierConfig[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState<"gold" | "gems" | "defaults">("defaults");
  const [bulkAmount, setBulkAmount] = useState("100");

  // Queries and mutations
  const battlePass = useConvexQuery(apiAny.admin.battlePass.getBattlePass, {
    battlePassId: battlePassId as any,
  });

  const existingTiers = useConvexQuery(apiAny.admin.battlePass.getBattlePassTiers, {
    battlePassId: battlePassId as any,
  });

  const defineTiers = useConvexMutation(apiAny.admin.battlePass.defineBattlePassTiers);

  // Initialize tiers when data loads
  useEffect(() => {
    if (battlePass && existingTiers) {
      const totalTiers = battlePass.totalTiers;
      const tierMap = new Map<number, any>();

      // Map existing tiers
      for (const tier of existingTiers) {
        tierMap.set(tier.tier, tier);
      }

      // Build full tier list
      const fullTiers: TierConfig[] = [];
      for (let i = 1; i <= totalTiers; i++) {
        const existing = tierMap.get(i);
        fullTiers.push({
          tier: i,
          freeReward: existing?.freeReward,
          premiumReward: existing?.premiumReward,
          isMilestone: existing?.isMilestone ?? MILESTONE_TIERS.includes(i),
          isDirty: false,
        });
      }
      setTiers(fullTiers);
    }
  }, [battlePass, existingTiers]);

  const handleTierUpdate = (updatedTier: TierConfig) => {
    setTiers((prev) => prev.map((t) => (t.tier === updatedTier.tier ? updatedTier : t)));
  };

  const handleSaveAll = async () => {
    const dirtyTiers = tiers.filter((t) => t.isDirty);
    if (dirtyTiers.length === 0) {
      toast.info("No changes to save");
      return;
    }

    setIsSaving(true);
    try {
      const result = await defineTiers({
        battlePassId: battlePassId as any,
        tiers: dirtyTiers.map((t) => ({
          tier: t.tier,
          freeReward: t.freeReward,
          premiumReward: t.premiumReward,
          isMilestone: t.isMilestone,
        })),
        replaceExisting: false,
      });

      toast.success(result.message);

      // Clear dirty flags
      setTiers((prev) => prev.map((t) => ({ ...t, isDirty: false })));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save tiers");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkAction = () => {
    const amount = Number.parseInt(bulkAmount, 10) || 100;

    setTiers((prev) =>
      prev.map((tier) => {
        if (bulkAction === "gold") {
          return {
            ...tier,
            freeReward: { type: "gold", amount },
            isDirty: true,
          };
        }
        if (bulkAction === "gems") {
          return {
            ...tier,
            premiumReward: { type: "gems", amount: tier.isMilestone ? amount * 2 : amount },
            isDirty: true,
          };
        }
        // defaults
        const isMilestone = MILESTONE_TIERS.includes(tier.tier) || tier.tier === 50;
        return {
          ...tier,
          freeReward: { type: "gold", amount: isMilestone ? 500 : 100 },
          premiumReward: isMilestone
            ? { type: "gems", amount: tier.tier === 50 ? 100 : 50 }
            : { type: "gold", amount: 200 },
          isMilestone,
          isDirty: true,
        };
      })
    );

    setShowBulkDialog(false);
    toast.success("Bulk action applied. Don't forget to save!");
  };

  const dirtyCount = tiers.filter((t) => t.isDirty).length;
  const isEditable = battlePass?.status !== "ended";

  if (battlePass === undefined || existingTiers === undefined) {
    return (
      <PageWrapper title="Loading..." description="Loading tier data">
        <div className="flex justify-center py-12">
          <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageWrapper>
    );
  }

  if (battlePass === null) {
    return (
      <PageWrapper title="Not Found" description="Battle pass not found">
        <Card>
          <div className="text-center py-12">
            <Text className="text-lg font-semibold">Battle Pass Not Found</Text>
            <Button asChild className="mt-4">
              <Link href="/battle-pass">Back to Battle Pass</Link>
            </Button>
          </div>
        </Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title={`${battlePass.name} - Tiers`}
      description={`Configure rewards for ${battlePass.totalTiers} tiers`}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/battle-pass/${battlePassId}`}>
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          {isEditable && (
            <>
              <RoleGuard permission="config.edit">
                <Button variant="outline" onClick={() => setShowBulkDialog(true)}>
                  <WandIcon className="mr-2 h-4 w-4" />
                  Bulk Actions
                </Button>
              </RoleGuard>
              <RoleGuard permission="config.edit">
                <Button onClick={handleSaveAll} disabled={isSaving || dirtyCount === 0}>
                  {isSaving ? (
                    <>
                      <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <SaveIcon className="mr-2 h-4 w-4" />
                      Save All {dirtyCount > 0 && `(${dirtyCount})`}
                    </>
                  )}
                </Button>
              </RoleGuard>
            </>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <div className="text-center">
              <Text className="text-2xl font-bold">{battlePass.totalTiers}</Text>
              <Text className="text-sm text-muted-foreground">Total Tiers</Text>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <Text className="text-2xl font-bold text-emerald-500">
                {tiers.filter((t) => t.freeReward).length}
              </Text>
              <Text className="text-sm text-muted-foreground">Free Rewards</Text>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <Text className="text-2xl font-bold text-violet-500">
                {tiers.filter((t) => t.premiumReward).length}
              </Text>
              <Text className="text-sm text-muted-foreground">Premium Rewards</Text>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <Text className="text-2xl font-bold text-amber-500">
                {tiers.filter((t) => t.isMilestone).length}
              </Text>
              <Text className="text-sm text-muted-foreground">Milestones</Text>
            </div>
          </Card>
        </div>

        {/* Unsaved Changes Warning */}
        {dirtyCount > 0 && (
          <Card className="bg-blue-500/10 border-blue-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckIcon className="h-5 w-5 text-blue-500" />
                <Text>
                  {dirtyCount} tier{dirtyCount > 1 ? "s" : ""} modified. Don't forget to save!
                </Text>
              </div>
              <Button size="sm" onClick={handleSaveAll} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save All"}
              </Button>
            </div>
          </Card>
        )}

        {/* Tier Editor */}
        <Card>
          <div className="flex justify-between items-center mb-4">
            <Title>Tier Rewards</Title>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-amber-500/30 rounded" />
                Milestone
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500/30 rounded" />
                Modified
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-3 px-3 w-32">Tier</th>
                  <th className="text-left py-3 px-3">
                    <span className="flex items-center gap-2">Free Reward</span>
                  </th>
                  <th className="text-left py-3 px-3">
                    <span className="flex items-center gap-2">
                      <CrownIcon className="h-4 w-4 text-amber-500" />
                      Premium Reward
                    </span>
                  </th>
                  <th className="text-center py-3 px-3 w-24">Milestone</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((tier) => (
                  <TierRow
                    key={tier.tier}
                    tier={tier}
                    onUpdate={handleTierUpdate}
                    isEditable={isEditable}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Bulk Actions Dialog */}
      <AlertDialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bulk Actions</AlertDialogTitle>
            <AlertDialogDescription>
              Apply changes to all tiers at once. This will mark all tiers as modified.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Action</Label>
              <Select
                value={bulkAction}
                onValueChange={(v) => setBulkAction(v as "gold" | "gems" | "defaults")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="defaults">
                    <span className="flex items-center gap-2">
                      <WandIcon className="h-4 w-4" />
                      Auto-generate Defaults
                    </span>
                  </SelectItem>
                  <SelectItem value="gold">
                    <span className="flex items-center gap-2">
                      <CoinsIcon className="h-4 w-4 text-amber-500" />
                      Set All Free Rewards to Gold
                    </span>
                  </SelectItem>
                  <SelectItem value="gems">
                    <span className="flex items-center gap-2">
                      <GemIcon className="h-4 w-4 text-violet-500" />
                      Set All Premium Rewards to Gems
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(bulkAction === "gold" || bulkAction === "gems") && (
              <div className="space-y-2">
                <Label>Amount per Tier</Label>
                <Input
                  type="number"
                  value={bulkAmount}
                  onChange={(e) => setBulkAmount(e.target.value)}
                  placeholder="100"
                />
                {bulkAction === "gems" && (
                  <Text className="text-xs text-muted-foreground">
                    Milestone tiers will receive 2x this amount
                  </Text>
                )}
              </div>
            )}

            {bulkAction === "defaults" && (
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <Text className="font-medium mb-2">Default rewards will be:</Text>
                <ul className="space-y-1 text-muted-foreground">
                  <li>Free: 100 Gold (500 at milestones)</li>
                  <li>Premium: 200 Gold (50 Gems at milestones, 100 at tier 50)</li>
                  <li>Milestones: Tiers 10, 20, 30, 40, 50</li>
                </ul>
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkAction}>Apply</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
