"use client";

/**
 * Promo Codes List Page
 *
 * Browse, search, and manage promo codes.
 */

import { PageWrapper } from "@/components/layout";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { RoleGuard } from "@/contexts/AdminContext";
import { typedApi, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import type { Id } from "@convex/_generated/dataModel";
import { Badge, Card, Text, Title } from "@tremor/react";
import {
  CalendarIcon,
  CoinsIcon,
  CopyIcon,
  GemIcon,
  Loader2Icon,
  PackageIcon,
  PlusIcon,
  SearchIcon,
  SparklesIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
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

interface PromoCode {
  _id: Id<"promoCodes">;
  code: string;
  description?: string;
  rewardType: RewardType;
  rewardAmount?: number;
  rewardPackId?: string;
  maxRedemptions?: number;
  redemptionCount?: number;
  expiresAt?: number;
  isActive: boolean;
  createdAt: number;
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
// Components
// =============================================================================

function CreatePromoCodeDialog() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [rewardType, setRewardType] = useState<RewardType>("gold");
  const [rewardAmount, setRewardAmount] = useState("");
  const [rewardPackId, setRewardPackId] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createPromoCode = useConvexMutation(typedApi.admin.promoCodes.createPromoCode);

  // Get available packs for pack rewards
  const productsResult = useConvexQuery(typedApi.admin.shop.listProducts, {
    productType: "pack",
    includeInactive: false,
  });

  const handleSubmit = async () => {
    if (!code.trim()) {
      toast.error("Code is required");
      return;
    }
    if (!rewardAmount || Number.parseInt(rewardAmount) <= 0) {
      toast.error("Reward amount must be positive");
      return;
    }
    if (rewardType === "pack" && !rewardPackId) {
      toast.error("Pack product is required for pack rewards");
      return;
    }

    setIsSubmitting(true);
    try {
      const expiresAt = expiresInDays
        ? Date.now() + Number.parseInt(expiresInDays) * 24 * 60 * 60 * 1000
        : undefined;

      await createPromoCode({
        code: code.trim(),
        description: description.trim(),
        rewardType,
        rewardAmount: Number.parseInt(rewardAmount),
        rewardPackId: rewardType === "pack" ? rewardPackId : undefined,
        maxRedemptions: maxRedemptions ? Number.parseInt(maxRedemptions) : undefined,
        expiresAt,
      });

      toast.success(`Created promo code "${code.toUpperCase()}"`);
      setOpen(false);
      // Reset form
      setCode("");
      setDescription("");
      setRewardType("gold");
      setRewardAmount("");
      setRewardPackId("");
      setMaxRedemptions("");
      setExpiresInDays("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create promo code");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon className="mr-2 h-4 w-4" />
          New Code
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Promo Code</DialogTitle>
          <DialogDescription>Create a new redeemable promo code for players.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Code *</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="WELCOME2024"
              />
              <Text className="text-xs text-muted-foreground">Will be normalized to uppercase</Text>
            </div>

            <div className="space-y-2">
              <Label>Reward Type *</Label>
              <Select value={rewardType} onValueChange={(v) => setRewardType(v as RewardType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gold">Gold</SelectItem>
                  <SelectItem value="gems">Gems</SelectItem>
                  <SelectItem value="pack">Pack</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Welcome bonus for new players..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Reward Amount *</Label>
              <Input
                type="number"
                value={rewardAmount}
                onChange={(e) => setRewardAmount(e.target.value)}
                placeholder={rewardType === "pack" ? "1" : "100"}
                min="1"
              />
              <Text className="text-xs text-muted-foreground">
                {rewardType === "pack" ? "Number of packs" : `Amount of ${rewardType}`}
              </Text>
            </div>

            {rewardType === "pack" && (
              <div className="space-y-2">
                <Label>Pack Product *</Label>
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Max Redemptions</Label>
              <Input
                type="number"
                value={maxRedemptions}
                onChange={(e) => setMaxRedemptions(e.target.value)}
                placeholder="Unlimited"
                min="1"
              />
              <Text className="text-xs text-muted-foreground">Leave empty for unlimited</Text>
            </div>

            <div className="space-y-2">
              <Label>Expires In (days)</Label>
              <Input
                type="number"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
                placeholder="Never"
                min="1"
              />
              <Text className="text-xs text-muted-foreground">Leave empty for no expiration</Text>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Code"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BulkGenerateDialog() {
  const [open, setOpen] = useState(false);
  const [prefix, setPrefix] = useState("");
  const [count, setCount] = useState("10");
  const [description, setDescription] = useState("");
  const [rewardType, setRewardType] = useState<RewardType>("gold");
  const [rewardAmount, setRewardAmount] = useState("");
  const [rewardPackId, setRewardPackId] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("1");
  const [expiresInDays, setExpiresInDays] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);

  const bulkGenerate = useConvexMutation(typedApi.admin.promoCodes.bulkGeneratePromoCodes);

  const productsResult = useConvexQuery(typedApi.admin.shop.listProducts, {
    productType: "pack",
    includeInactive: false,
  });

  const handleSubmit = async () => {
    if (!prefix.trim()) {
      toast.error("Prefix is required");
      return;
    }
    if (!count || Number.parseInt(count) < 1 || Number.parseInt(count) > 100) {
      toast.error("Count must be between 1 and 100");
      return;
    }
    if (!rewardAmount || Number.parseInt(rewardAmount) <= 0) {
      toast.error("Reward amount must be positive");
      return;
    }

    setIsSubmitting(true);
    try {
      const expiresAt = expiresInDays
        ? Date.now() + Number.parseInt(expiresInDays) * 24 * 60 * 60 * 1000
        : undefined;

      const result = (await bulkGenerate({
        prefix: prefix.trim(),
        count: Number.parseInt(count),
        description: description.trim(),
        rewardType,
        rewardAmount: Number.parseInt(rewardAmount),
        rewardPackId: rewardType === "pack" ? rewardPackId : undefined,
        maxRedemptions: maxRedemptions ? Number.parseInt(maxRedemptions) : undefined,
        expiresAt,
      })) as { message: string; codes: string[] };

      toast.success(result.message);
      setGeneratedCodes(result.codes);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate codes");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCodes = () => {
    navigator.clipboard.writeText(generatedCodes.join("\n"));
    toast.success("Copied codes to clipboard");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <SparklesIcon className="mr-2 h-4 w-4" />
          Bulk Generate
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Generate Promo Codes</DialogTitle>
          <DialogDescription>
            Generate multiple random promo codes with a common prefix.
          </DialogDescription>
        </DialogHeader>

        {generatedCodes.length > 0 ? (
          <div className="py-4">
            <div className="flex items-center justify-between mb-2">
              <Text className="font-medium">Generated {generatedCodes.length} codes:</Text>
              <Button variant="outline" size="sm" onClick={handleCopyCodes}>
                <CopyIcon className="mr-2 h-3 w-3" />
                Copy All
              </Button>
            </div>
            <div className="max-h-[200px] overflow-y-auto bg-muted p-3 rounded-lg font-mono text-sm">
              {generatedCodes.map((code) => (
                <div key={code}>{code}</div>
              ))}
            </div>
            <DialogFooter className="mt-4">
              <Button
                onClick={() => {
                  setGeneratedCodes([]);
                  setOpen(false);
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prefix *</Label>
                  <Input
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                    placeholder="PROMO"
                  />
                  <Text className="text-xs text-muted-foreground">Codes will be PREFIX-XXXXXX</Text>
                </div>

                <div className="space-y-2">
                  <Label>Count *</Label>
                  <Input
                    type="number"
                    value={count}
                    onChange={(e) => setCount(e.target.value)}
                    placeholder="10"
                    min="1"
                    max="100"
                  />
                  <Text className="text-xs text-muted-foreground">Max 100 at a time</Text>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Promotional code for event..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Reward Type *</Label>
                  <Select value={rewardType} onValueChange={(v) => setRewardType(v as RewardType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gold">Gold</SelectItem>
                      <SelectItem value="gems">Gems</SelectItem>
                      <SelectItem value="pack">Pack</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Reward Amount *</Label>
                  <Input
                    type="number"
                    value={rewardAmount}
                    onChange={(e) => setRewardAmount(e.target.value)}
                    placeholder="100"
                    min="1"
                  />
                </div>
              </div>

              {rewardType === "pack" && (
                <div className="space-y-2">
                  <Label>Pack Product *</Label>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max Uses Per Code</Label>
                  <Input
                    type="number"
                    value={maxRedemptions}
                    onChange={(e) => setMaxRedemptions(e.target.value)}
                    placeholder="1"
                    min="1"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Expires In (days)</Label>
                  <Input
                    type="number"
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(e.target.value)}
                    placeholder="Never"
                    min="1"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Codes"
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function PromoCodesPage() {
  // Filters
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [showExpired, setShowExpired] = useState(false);

  // Query
  const codesResult = useConvexQuery(typedApi.admin.promoCodes.listPromoCodes, {
    search: search || undefined,
    includeInactive: showInactive,
    includeExpired: showExpired,
  });

  const statsResult = useConvexQuery(typedApi.admin.promoCodes.getPromoCodeStats, {});

  const toggleActive = useConvexMutation(typedApi.admin.promoCodes.togglePromoCodeActive);

  const handleToggleActive = async (promoCodeId: Id<"promoCodes">, _code: string) => {
    try {
      const result = (await toggleActive({ promoCodeId })) as unknown as {
        message?: string;
        isActive?: boolean;
      };
      toast.success(result.message ?? `Code ${result.isActive ? "activated" : "deactivated"}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to toggle code status");
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied to clipboard");
  };

  const isLoading = codesResult === undefined;
  const now = Date.now();

  return (
    <PageWrapper
      title="Promo Codes"
      description="Manage redeemable promo codes"
      actions={
        <RoleGuard permission="config.edit">
          <div className="flex gap-2">
            <BulkGenerateDialog />
            <CreatePromoCodeDialog />
          </div>
        </RoleGuard>
      }
    >
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-6 mb-6">
        <Card>
          <div className="text-center">
            <Text className="text-2xl font-bold">{statsResult?.totalCodes ?? "..."}</Text>
            <Text className="text-sm text-muted-foreground">Total Codes</Text>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <Text className="text-2xl font-bold text-emerald-500">
              {statsResult?.activeCodes ?? "..."}
            </Text>
            <Text className="text-sm text-muted-foreground">Active</Text>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <Text className="text-2xl font-bold text-amber-500">
              {statsResult?.byRewardType?.gold ?? "..."}
            </Text>
            <Text className="text-sm text-muted-foreground">Gold Rewards</Text>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <Text className="text-2xl font-bold text-violet-500">
              {statsResult?.byRewardType?.gems ?? "..."}
            </Text>
            <Text className="text-sm text-muted-foreground">Gem Rewards</Text>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <Text className="text-2xl font-bold text-blue-500">
              {statsResult?.byRewardType?.pack ?? "..."}
            </Text>
            <Text className="text-sm text-muted-foreground">Pack Rewards</Text>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <Text className="text-2xl font-bold">{statsResult?.totalRedemptions ?? "..."}</Text>
            <Text className="text-sm text-muted-foreground">Redemptions</Text>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <Text className="text-sm text-muted-foreground mb-1">Search</Text>
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by code or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={showInactive} onCheckedChange={setShowInactive} />
            <Text className="text-sm">Show Inactive</Text>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={showExpired} onCheckedChange={setShowExpired} />
            <Text className="text-sm">Show Expired</Text>
          </div>
        </div>
      </Card>

      {/* Code List */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <Title>Promo Codes ({codesResult?.totalCount ?? 0})</Title>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 10 }, (_, i) => i).map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : codesResult?.codes.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            No promo codes found matching your filters
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-3">Code</th>
                  <th className="text-left py-3 px-3">Reward</th>
                  <th className="text-left py-3 px-3">Description</th>
                  <th className="text-center py-3 px-3">Redemptions</th>
                  <th className="text-left py-3 px-3">Expires</th>
                  <th className="text-center py-3 px-3">Status</th>
                  <th className="text-right py-3 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(codesResult?.codes as unknown as PromoCode[])?.map((code) => {
                  const rewardConfig = REWARD_TYPE_CONFIG[code.rewardType as RewardType];
                  const isExpired = Boolean(code.expiresAt && code.expiresAt <= now);
                  const isExhausted = Boolean(
                    code.maxRedemptions && (code.redemptionCount ?? 0) >= code.maxRedemptions
                  );

                  return (
                    <tr
                      key={code._id}
                      className={`border-b hover:bg-muted/30 ${
                        !code.isActive || isExpired || isExhausted ? "opacity-50" : ""
                      }`}
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/promo-codes/${code._id}`}
                            className="font-mono font-medium hover:underline text-primary"
                          >
                            {code.code}
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleCopyCode(code.code)}
                          >
                            <CopyIcon className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <Badge color={rewardConfig.color} size="sm">
                          <span className="flex items-center gap-1">
                            {rewardConfig.icon}
                            {(code.rewardAmount ?? 0).toLocaleString()} {rewardConfig.label}
                          </span>
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-muted-foreground max-w-[200px] truncate">
                        {code.description || "-"}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {code.redemptionCount ?? 0}
                        {code.maxRedemptions && (
                          <span className="text-muted-foreground"> / {code.maxRedemptions}</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {code.expiresAt ? (
                          <div
                            className={`flex items-center gap-1 ${
                              isExpired ? "text-red-500" : "text-muted-foreground"
                            }`}
                          >
                            <CalendarIcon className="h-3 w-3" />
                            {new Date(code.expiresAt).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Never</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {isExpired ? (
                          <Badge color="red" size="sm">
                            Expired
                          </Badge>
                        ) : isExhausted ? (
                          <Badge color="gray" size="sm">
                            Exhausted
                          </Badge>
                        ) : (
                          <Badge color={code.isActive ? "emerald" : "gray"} size="sm">
                            {code.isActive ? "Active" : "Inactive"}
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/promo-codes/${code._id}`}>View</Link>
                          </Button>
                          <RoleGuard permission="config.edit">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleActive(code._id, code.code)}
                              disabled={isExpired || isExhausted}
                            >
                              {code.isActive ? "Deactivate" : "Activate"}
                            </Button>
                          </RoleGuard>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PageWrapper>
  );
}
