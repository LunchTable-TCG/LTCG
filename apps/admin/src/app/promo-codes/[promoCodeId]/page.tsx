"use client";

/**
 * Promo Code Detail Page
 *
 * View and edit promo code details, see redemption history.
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { RoleGuard } from "@/contexts/AdminContext";
import { typedApi, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import type { PromoCodeId } from "@/lib/convexTypes";
import type { Id } from "@convex/_generated/dataModel";
import { Badge, Card, Text, Title } from "@tremor/react";
import {
  ArrowLeftIcon,
  CoinsIcon,
  CopyIcon,
  GemIcon,
  Loader2Icon,
  PackageIcon,
  SaveIcon,
  TrashIcon,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// =============================================================================
// Types & Constants
// =============================================================================

type RewardType = "gold" | "gems" | "pack";
type BadgeColor = "amber" | "violet" | "blue" | "emerald" | "rose" | "indigo" | "gray" | "slate";

interface ShopProduct {
  productId: string;
  name: string;
}

interface PromoRedemption {
  _id: Id<"promoRedemptions">;
  userId: Id<"users">;
  promoCodeId: Id<"promoCodes">;
  code: string;
  rewardReceived: string;
  redeemedAt: number;
}

const REWARD_TYPE_CONFIG: Record<
  RewardType,
  { label: string; color: BadgeColor; icon: React.ReactNode }
> = {
  gold: { label: "Gold", color: "amber", icon: <CoinsIcon className="h-4 w-4" /> },
  gems: { label: "Gems", color: "violet", icon: <GemIcon className="h-4 w-4" /> },
  pack: { label: "Pack", color: "blue", icon: <PackageIcon className="h-4 w-4" /> },
};

// =============================================================================
// Component
// =============================================================================

export default function PromoCodeDetailPage() {
  const params = useParams<{ promoCodeId: string }>();
  const router = useRouter();
  const promoCodeId = params.promoCodeId as PromoCodeId;

  // Form state
  const [description, setDescription] = useState("");
  const [rewardAmount, setRewardAmount] = useState("");
  const [rewardPackId, setRewardPackId] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [isActive, setIsActive] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Queries and mutations
  const promoCode = useConvexQuery(typedApi.admin.promoCodes.getPromoCode, {
    promoCodeId,
  });

  const productsResult = useConvexQuery(typedApi.admin.shop.listProducts, {
    productType: "pack",
    includeInactive: false,
  });

  const updatePromoCode = useConvexMutation(typedApi.admin.promoCodes.updatePromoCode);
  const deletePromoCode = useConvexMutation(typedApi.admin.promoCodes.deletePromoCode);

  // Populate form with existing data
  useEffect(() => {
    if (promoCode) {
      setDescription(promoCode.description ?? "");
      setRewardAmount(promoCode.rewardAmount?.toString() ?? "0");
      setRewardPackId(promoCode.rewardPackId ?? "");
      setMaxRedemptions(promoCode.maxRedemptions?.toString() ?? "");
      setIsActive(promoCode.isActive);

      // Convert timestamp to date string for input
      if (promoCode.expiresAt) {
        const date = new Date(promoCode.expiresAt);
        const dateStr = date.toISOString().split("T")[0];
        setExpiresAt(dateStr || "");
      } else {
        setExpiresAt("");
      }
    }
  }, [promoCode]);

  const handleSave = async () => {
    if (!rewardAmount || Number.parseInt(rewardAmount) <= 0) {
      toast.error("Reward amount must be positive");
      return;
    }

    setIsSaving(true);
    try {
      // Convert date string to timestamp
      const expiresAtTimestamp = expiresAt
        ? new Date(expiresAt).getTime() + 24 * 60 * 60 * 1000 - 1 // End of day
        : undefined;

      await updatePromoCode({
        promoCodeId,
        description,
        rewardAmount: Number.parseInt(rewardAmount),
        rewardPackId: promoCode?.rewardType === "pack" ? rewardPackId : undefined,
        maxRedemptions: maxRedemptions ? Number.parseInt(maxRedemptions) : undefined,
        clearMaxRedemptions: !maxRedemptions,
        expiresAt: expiresAtTimestamp,
        clearExpiresAt: !expiresAt,
        isActive,
      });

      toast.success("Promo code updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update promo code");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deletePromoCode({ promoCodeId });
      toast.success("Promo code deleted");
      router.push("/promo-codes");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete promo code");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyCode = () => {
    if (promoCode?.code) {
      navigator.clipboard.writeText(promoCode.code);
      toast.success("Code copied to clipboard");
    }
  };

  if (promoCode === undefined) {
    return (
      <PageWrapper title="Loading..." description="Loading promo code data">
        <div className="flex justify-center py-12">
          <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageWrapper>
    );
  }

  if (promoCode === null) {
    return (
      <PageWrapper title="Not Found" description="Promo code not found">
        <Card>
          <div className="text-center py-12">
            <Text className="text-lg font-semibold">Promo Code Not Found</Text>
            <Text className="text-muted-foreground">
              The promo code you're looking for doesn't exist.
            </Text>
            <Button asChild className="mt-4">
              <Link href="/promo-codes">Back to Promo Codes</Link>
            </Button>
          </div>
        </Card>
      </PageWrapper>
    );
  }

  const rewardConfig = REWARD_TYPE_CONFIG[promoCode.rewardType as RewardType];
  const now = Date.now();
  const isExpired = promoCode.expiresAt && promoCode.expiresAt <= now;
  const isExhausted =
    promoCode.maxRedemptions && (promoCode.redemptionCount ?? 0) >= promoCode.maxRedemptions;

  return (
    <PageWrapper
      title={promoCode.code}
      description={promoCode.description || "Promo code details"}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/promo-codes">
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <RoleGuard permission="admin.manage">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={promoCode.redemptionCount > 0}>
                  <TrashIcon className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Promo Code</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to permanently delete "{promoCode.code}"? This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      "Delete Code"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </RoleGuard>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <SaveIcon className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Code Display */}
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <Text className="text-sm text-muted-foreground">Promo Code</Text>
                <Text className="text-3xl font-mono font-bold">{promoCode.code}</Text>
              </div>
              <Button variant="outline" onClick={handleCopyCode}>
                <CopyIcon className="mr-2 h-4 w-4" />
                Copy Code
              </Button>
            </div>
          </Card>

          {/* Configuration */}
          <Card>
            <Title>Configuration</Title>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2 space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this code is for..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Reward Type</Label>
                <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted/50">
                  <Badge color={rewardConfig.color} size="sm">
                    <span className="flex items-center gap-1">
                      {rewardConfig.icon}
                      {rewardConfig.label}
                    </span>
                  </Badge>
                  <Text className="text-sm text-muted-foreground">(Cannot be changed)</Text>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Reward Amount</Label>
                <Input
                  type="number"
                  value={rewardAmount}
                  onChange={(e) => setRewardAmount(e.target.value)}
                  placeholder="100"
                  min="1"
                />
              </div>

              {promoCode.rewardType === "pack" && (
                <div className="space-y-2">
                  <Label>Pack Product</Label>
                  <Select value={rewardPackId} onValueChange={setRewardPackId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select pack..." />
                    </SelectTrigger>
                    <SelectContent>
                      {productsResult?.products.map((p: ShopProduct) => (
                        <SelectItem key={p.productId} value={p.productId}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Max Redemptions</Label>
                <Input
                  type="number"
                  value={maxRedemptions}
                  onChange={(e) => setMaxRedemptions(e.target.value)}
                  placeholder="Unlimited"
                  min="1"
                />
                <Text className="text-xs text-muted-foreground">
                  Leave empty for unlimited uses
                </Text>
              </div>

              <div className="space-y-2">
                <Label>Expiration Date</Label>
                <Input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
                <Text className="text-xs text-muted-foreground">Leave empty for no expiration</Text>
              </div>
            </div>
          </Card>

          {/* Redemption History */}
          <Card>
            <Title>Redemption History</Title>
            {promoCode.redemptions && promoCode.redemptions.length > 0 ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">User ID</th>
                      <th className="text-left py-2 px-3">Reward Received</th>
                      <th className="text-left py-2 px-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(promoCode.redemptions as unknown as PromoRedemption[]).map((redemption) => (
                      <tr key={redemption._id} className="border-b">
                        <td className="py-2 px-3 font-mono text-xs">
                          <Link
                            href={`/players/${redemption.userId}`}
                            className="hover:underline text-primary"
                          >
                            {String(redemption.userId).slice(0, 16)}...
                          </Link>
                        </td>
                        <td className="py-2 px-3">{redemption.rewardReceived}</td>
                        <td className="py-2 px-3 text-muted-foreground">
                          {new Date(redemption.redeemedAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-4 py-8 text-center text-muted-foreground">No redemptions yet</div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <Title>Status</Title>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Text className="font-medium">Active</Text>
                  <Text className="text-sm text-muted-foreground">
                    {isActive ? "Code can be redeemed" : "Code is disabled"}
                  </Text>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>

              {isExpired && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                  <Text className="text-red-600 dark:text-red-400 font-medium">
                    This code has expired
                  </Text>
                  <Text className="text-sm text-red-500 dark:text-red-400">
                    Expired on {new Date(promoCode.expiresAt!).toLocaleDateString()}
                  </Text>
                </div>
              )}

              {isExhausted && (
                <div className="p-3 bg-muted rounded-lg">
                  <Text className="font-medium">Maximum redemptions reached</Text>
                  <Text className="text-sm text-muted-foreground">
                    {promoCode.redemptionCount} / {promoCode.maxRedemptions} used
                  </Text>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <Title>Statistics</Title>
            <div className="mt-4 space-y-3">
              <div className="flex justify-between">
                <Text className="text-muted-foreground">Redemptions</Text>
                <Text className="font-medium">
                  {promoCode.redemptionCount}
                  {promoCode.maxRedemptions && (
                    <span className="text-muted-foreground"> / {promoCode.maxRedemptions}</span>
                  )}
                </Text>
              </div>

              <div className="flex justify-between">
                <Text className="text-muted-foreground">Reward Type</Text>
                <Badge color={rewardConfig.color} size="sm">
                  {rewardConfig.label}
                </Badge>
              </div>

              <div className="flex justify-between">
                <Text className="text-muted-foreground">Reward Value</Text>
                <Text className="font-medium">
                  {promoCode.rewardAmount.toLocaleString()} {rewardConfig.label}
                </Text>
              </div>

              {promoCode.expiresAt && (
                <div className="flex justify-between">
                  <Text className="text-muted-foreground">Expires</Text>
                  <Text className={`font-medium ${isExpired ? "text-red-500" : ""}`}>
                    {new Date(promoCode.expiresAt).toLocaleDateString()}
                  </Text>
                </div>
              )}

              <div className="flex justify-between">
                <Text className="text-muted-foreground">Created</Text>
                <Text className="font-medium">
                  {new Date(promoCode.createdAt).toLocaleDateString()}
                </Text>
              </div>
            </div>
          </Card>

          {promoCode.redemptionCount > 0 && (
            <Card>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                <Text className="text-amber-700 dark:text-amber-400 font-medium">
                  Cannot delete
                </Text>
                <Text className="text-sm text-amber-600 dark:text-amber-400">
                  This code has been redeemed {promoCode.redemptionCount} times. Deactivate it
                  instead.
                </Text>
              </div>
            </Card>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
