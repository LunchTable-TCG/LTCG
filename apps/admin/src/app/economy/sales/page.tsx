"use client";

/**
 * Sales Management Page
 *
 * Admin interface to create, edit, and monitor promotional sales.
 * Includes quick flash sale creation and usage analytics.
 */

import { PageWrapper } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { RoleGuard } from "@/contexts/AdminContext";
import { type Id, typedApi, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import { Badge, DonutChart, Metric, Text, Title } from "@tremor/react";
import {
  CalendarIcon,
  ClockIcon,
  EditIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  StopCircleIcon,
  TagIcon,
  TrashIcon,
  ZapIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// =============================================================================
// Types
// =============================================================================

type SaleType = "flash" | "weekend" | "launch" | "holiday" | "anniversary" | "returning";

interface Sale {
  _id: Id<"shopSales">;
  saleId: string;
  name: string;
  description: string;
  saleType: SaleType;
  discountPercent?: number;
  bonusCards?: number;
  bonusGems?: number;
  applicableProducts: string[];
  startsAt: number;
  endsAt: number;
  isActive: boolean;
  usageCount: number;
  totalDiscountGiven: number;
  priority: number;
  conditions?: {
    minPurchaseAmount?: number;
    maxUsesTotal?: number;
    maxUsesPerUser?: number;
    returningPlayerOnly?: boolean;
    newPlayerOnly?: boolean;
  };
}

// =============================================================================
// Stats Overview
// =============================================================================

function SalesStatsOverview() {
  const stats = useConvexQuery(typedApi.admin.sales.getSaleStats, {});

  if (!stats) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-16 animate-pulse bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const usageData = Object.entries(stats.usageByType).map(([type, count]) => ({
    name: type,
    value: count,
  }));

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <Card>
        <CardContent className="pt-6">
          <Text className="text-sm text-muted-foreground">Active Sales</Text>
          <Metric className="text-emerald-600">{stats.activeSales}</Metric>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <Text className="text-sm text-muted-foreground">Upcoming</Text>
          <Metric className="text-blue-600">{stats.upcomingSales}</Metric>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <Text className="text-sm text-muted-foreground">Expired</Text>
          <Metric className="text-gray-400">{stats.expiredSales}</Metric>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <Text className="text-sm text-muted-foreground">Total Usage</Text>
          <Metric>{stats.totalUsage.toLocaleString()}</Metric>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <Text className="text-sm text-muted-foreground mb-2">By Type</Text>
          {usageData.length > 0 ? (
            <DonutChart
              className="h-20"
              data={usageData}
              category="value"
              index="name"
              colors={["amber", "blue", "emerald", "purple", "rose", "cyan"]}
              showLabel={false}
            />
          ) : (
            <Text className="text-muted-foreground text-xs">No usage data</Text>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// Flash Sale Dialog
// =============================================================================

function FlashSaleDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [discountPercent, setDiscountPercent] = useState(20);
  const [durationHours, setDurationHours] = useState(4);
  const [products, setProducts] = useState("all");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createFlashSale = useConvexMutation(typedApi.admin.sales.createFlashSale);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Sale name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const applicableProducts =
        products === "all" ? ["*"] : products.split(",").map((p) => p.trim());
      await createFlashSale({
        name,
        discountPercent,
        applicableProducts,
        durationHours,
      });
      toast.success(`Flash sale "${name}" created!`);
      setOpen(false);
      setName("");
      setDiscountPercent(20);
      setDurationHours(4);
      setProducts("all");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create flash sale");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <ZapIcon className="h-4 w-4 text-amber-500" />
          Quick Flash Sale
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ZapIcon className="h-5 w-5 text-amber-500" />
            Create Flash Sale
          </DialogTitle>
          <DialogDescription>Create a quick flash sale that starts immediately</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label>Sale Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Weekend Flash Deal"
            />
          </div>
          <div>
            <Label>Discount: {discountPercent}%</Label>
            <Slider
              value={[discountPercent]}
              min={5}
              max={75}
              step={5}
              onValueChange={([v]) => setDiscountPercent(v ?? 5)}
              className="mt-2"
            />
          </div>
          <div>
            <Label>Duration: {durationHours} hours</Label>
            <Slider
              value={[durationHours]}
              min={1}
              max={48}
              step={1}
              onValueChange={([v]) => setDurationHours(v ?? 1)}
              className="mt-2"
            />
          </div>
          <div>
            <Label>Products</Label>
            <Input
              value={products}
              onChange={(e) => setProducts(e.target.value)}
              placeholder="all or comma-separated product IDs"
            />
          </div>
          <Button onClick={handleCreate} disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Creating..." : "Create Flash Sale"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Create/Edit Sale Dialog
// =============================================================================

function SaleFormDialog({
  editingSale,
  onClose,
}: {
  editingSale?: Sale | null;
  onClose: () => void;
}) {
  const isEditing = !!editingSale;

  const [form, setForm] = useState({
    saleId: editingSale?.saleId ?? "",
    name: editingSale?.name ?? "",
    description: editingSale?.description ?? "",
    saleType: editingSale?.saleType ?? ("flash" as SaleType),
    discountPercent: editingSale?.discountPercent ?? 20,
    bonusCards: editingSale?.bonusCards ?? 0,
    bonusGems: editingSale?.bonusGems ?? 0,
    applicableProducts: editingSale?.applicableProducts.join(", ") ?? "*",
    startsAt: editingSale ? new Date(editingSale.startsAt).toISOString().slice(0, 16) : "",
    endsAt: editingSale ? new Date(editingSale.endsAt).toISOString().slice(0, 16) : "",
    priority: editingSale?.priority ?? 1,
    minPurchaseAmount: editingSale?.conditions?.minPurchaseAmount ?? undefined,
    maxUsesTotal: editingSale?.conditions?.maxUsesTotal ?? undefined,
    maxUsesPerUser: editingSale?.conditions?.maxUsesPerUser ?? undefined,
    returningPlayerOnly: editingSale?.conditions?.returningPlayerOnly ?? false,
    newPlayerOnly: editingSale?.conditions?.newPlayerOnly ?? false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const createSale = useConvexMutation(typedApi.admin.sales.createSale);
  const updateSale = useConvexMutation(typedApi.admin.sales.updateSale);

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Sale name is required");
      return;
    }
    if (!isEditing && !form.saleId.trim()) {
      toast.error("Sale ID is required");
      return;
    }
    if (!form.startsAt || !form.endsAt) {
      toast.error("Start and end dates are required");
      return;
    }

    setIsSubmitting(true);
    try {
      const applicableProducts = form.applicableProducts.split(",").map((p) => p.trim());
      const startsAt = new Date(form.startsAt).getTime();
      const endsAt = new Date(form.endsAt).getTime();

      if (isEditing) {
        await updateSale({
          saleDbId: editingSale._id,
          name: form.name,
          description: form.description,
          discountPercent: form.discountPercent || undefined,
          bonusCards: form.bonusCards || undefined,
          bonusGems: form.bonusGems || undefined,
          applicableProducts,
          startsAt,
          endsAt,
          priority: form.priority,
          minPurchaseAmount: form.minPurchaseAmount,
          maxUsesTotal: form.maxUsesTotal,
          maxUsesPerUser: form.maxUsesPerUser,
          returningPlayerOnly: form.returningPlayerOnly,
          newPlayerOnly: form.newPlayerOnly,
        });
        toast.success(`Sale "${form.name}" updated`);
      } else {
        await createSale({
          saleId: form.saleId,
          name: form.name,
          description: form.description,
          saleType: form.saleType,
          discountPercent: form.discountPercent || undefined,
          bonusCards: form.bonusCards || undefined,
          bonusGems: form.bonusGems || undefined,
          applicableProducts,
          startsAt,
          endsAt,
          priority: form.priority,
          minPurchaseAmount: form.minPurchaseAmount,
          maxUsesTotal: form.maxUsesTotal,
          maxUsesPerUser: form.maxUsesPerUser,
          returningPlayerOnly: form.returningPlayerOnly,
          newPlayerOnly: form.newPlayerOnly,
        });
        toast.success(`Sale "${form.name}" created`);
      }
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save sale");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{isEditing ? "Edit Sale" : "Create New Sale"}</DialogTitle>
        <DialogDescription>
          {isEditing ? "Update the sale configuration" : "Configure a new promotional sale"}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 mt-4">
        <div className="grid gap-4 md:grid-cols-2">
          {!isEditing && (
            <div>
              <Label>Sale ID (unique)</Label>
              <Input
                value={form.saleId}
                onChange={(e) => setForm({ ...form, saleId: e.target.value })}
                placeholder="summer_sale_2026"
              />
            </div>
          )}
          <div className={isEditing ? "md:col-span-2" : ""}>
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Summer Sale 2026"
            />
          </div>
        </div>

        <div>
          <Label>Description</Label>
          <Textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Get amazing discounts this summer!"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Sale Type</Label>
            <Select
              value={form.saleType}
              onValueChange={(v) => setForm({ ...form, saleType: v as SaleType })}
              disabled={isEditing}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="flash">Flash</SelectItem>
                <SelectItem value="weekend">Weekend</SelectItem>
                <SelectItem value="launch">Launch</SelectItem>
                <SelectItem value="holiday">Holiday</SelectItem>
                <SelectItem value="anniversary">Anniversary</SelectItem>
                <SelectItem value="returning">Returning Player</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Priority (higher = shown first)</Label>
            <Input
              type="number"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: Number.parseInt(e.target.value) || 1 })}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label>Discount %</Label>
            <Input
              type="number"
              value={form.discountPercent}
              onChange={(e) =>
                setForm({ ...form, discountPercent: Number.parseInt(e.target.value) || 0 })
              }
            />
          </div>
          <div>
            <Label>Bonus Cards</Label>
            <Input
              type="number"
              value={form.bonusCards}
              onChange={(e) =>
                setForm({ ...form, bonusCards: Number.parseInt(e.target.value) || 0 })
              }
            />
          </div>
          <div>
            <Label>Bonus Gems</Label>
            <Input
              type="number"
              value={form.bonusGems}
              onChange={(e) =>
                setForm({ ...form, bonusGems: Number.parseInt(e.target.value) || 0 })
              }
            />
          </div>
        </div>

        <div>
          <Label>Applicable Products (comma-separated, or * for all)</Label>
          <Input
            value={form.applicableProducts}
            onChange={(e) => setForm({ ...form, applicableProducts: e.target.value })}
            placeholder="*, pack_standard, pack_premium"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Start Date</Label>
            <Input
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
            />
          </div>
          <div>
            <Label>End Date</Label>
            <Input
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
            />
          </div>
        </div>

        <div className="border rounded-lg p-4 space-y-4">
          <Title className="text-sm">Conditions (optional)</Title>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Min Purchase</Label>
              <Input
                type="number"
                value={form.minPurchaseAmount ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    minPurchaseAmount: e.target.value ? Number.parseInt(e.target.value) : undefined,
                  })
                }
                placeholder="None"
              />
            </div>
            <div>
              <Label>Max Uses (Total)</Label>
              <Input
                type="number"
                value={form.maxUsesTotal ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    maxUsesTotal: e.target.value ? Number.parseInt(e.target.value) : undefined,
                  })
                }
                placeholder="Unlimited"
              />
            </div>
            <div>
              <Label>Max Uses (Per User)</Label>
              <Input
                type="number"
                value={form.maxUsesPerUser ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    maxUsesPerUser: e.target.value ? Number.parseInt(e.target.value) : undefined,
                  })
                }
                placeholder="Unlimited"
              />
            </div>
          </div>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Switch
                checked={form.returningPlayerOnly}
                onCheckedChange={(checked) => setForm({ ...form, returningPlayerOnly: checked })}
              />
              <Label>Returning players only</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.newPlayerOnly}
                onCheckedChange={(checked) => setForm({ ...form, newPlayerOnly: checked })}
              />
              <Label>New players only</Label>
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : isEditing ? "Update Sale" : "Create Sale"}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

// =============================================================================
// Sale Card
// =============================================================================

function SaleCard({ sale, onEdit }: { sale: Sale; onEdit: () => void }) {
  const now = Date.now();
  const isActive = sale.isActive && sale.startsAt <= now && sale.endsAt > now;
  const isUpcoming = sale.isActive && sale.startsAt > now;
  const isExpired = sale.endsAt <= now;

  const toggleActive = useConvexMutation(typedApi.admin.sales.toggleSaleActive);
  const endEarly = useConvexMutation(typedApi.admin.sales.endSaleEarly);
  const deleteSale = useConvexMutation(typedApi.admin.sales.deleteSale);

  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      await toggleActive({ saleDbId: sale._id });
      toast.success(sale.isActive ? "Sale deactivated" : "Sale activated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to toggle sale");
    } finally {
      setIsToggling(false);
    }
  };

  const handleEndEarly = async () => {
    if (!confirm(`End "${sale.name}" early? This cannot be undone.`)) return;
    try {
      await endEarly({ saleDbId: sale._id });
      toast.success("Sale ended");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to end sale");
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Permanently delete "${sale.name}"? This cannot be undone.`)) return;
    try {
      await deleteSale({ saleDbId: sale._id });
      toast.success("Sale deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete sale");
    }
  };

  const saleTypeColors = {
    flash: "amber",
    weekend: "blue",
    launch: "emerald",
    holiday: "rose",
    anniversary: "purple",
    returning: "cyan",
  } as const;

  return (
    <Card className={`${isExpired ? "opacity-60" : ""}`}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Title className="text-lg">{sale.name}</Title>
              <Badge color={saleTypeColors[sale.saleType]}>{sale.saleType}</Badge>
            </div>
            <Text className="text-sm text-muted-foreground">{sale.saleId}</Text>
          </div>
          <div className="flex items-center gap-1">
            {isActive && <Badge color="emerald">Active</Badge>}
            {isUpcoming && <Badge color="blue">Upcoming</Badge>}
            {isExpired && <Badge color="gray">Expired</Badge>}
            {!sale.isActive && !isExpired && <Badge color="rose">Paused</Badge>}
          </div>
        </div>

        <Text className="text-sm mb-4">{sale.description}</Text>

        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          {sale.discountPercent && (
            <div className="flex items-center gap-2">
              <TagIcon className="h-4 w-4 text-amber-500" />
              <span>{sale.discountPercent}% off</span>
            </div>
          )}
          {sale.bonusCards && sale.bonusCards > 0 && (
            <div className="flex items-center gap-2">
              <PlusIcon className="h-4 w-4 text-blue-500" />
              <span>+{sale.bonusCards} cards</span>
            </div>
          )}
          {sale.bonusGems && sale.bonusGems > 0 && (
            <div className="flex items-center gap-2">
              <PlusIcon className="h-4 w-4 text-emerald-500" />
              <span>+{sale.bonusGems} gems</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span>{new Date(sale.startsAt).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <ClockIcon className="h-4 w-4 text-muted-foreground" />
            <span>{new Date(sale.endsAt).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <Text className="text-sm text-muted-foreground">
            {sale.usageCount.toLocaleString()} uses
          </Text>
          <div className="flex gap-1">
            <RoleGuard permission="shop.edit">
              <Button variant="ghost" size="sm" onClick={onEdit}>
                <EditIcon className="h-4 w-4" />
              </Button>
              {!isExpired && (
                <>
                  <Button variant="ghost" size="sm" onClick={handleToggle} disabled={isToggling}>
                    {sale.isActive ? (
                      <PauseIcon className="h-4 w-4" />
                    ) : (
                      <PlayIcon className="h-4 w-4" />
                    )}
                  </Button>
                  {isActive && (
                    <Button variant="ghost" size="sm" onClick={handleEndEarly}>
                      <StopCircleIcon className="h-4 w-4 text-rose-500" />
                    </Button>
                  )}
                </>
              )}
            </RoleGuard>
            <RoleGuard permission="superadmin">
              <Button variant="ghost" size="sm" onClick={handleDelete}>
                <TrashIcon className="h-4 w-4 text-destructive" />
              </Button>
            </RoleGuard>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Sales List
// =============================================================================

function SalesList({ filter }: { filter: "active" | "upcoming" | "all" | "expired" }) {
  const sales = useConvexQuery(typedApi.admin.sales.listSales, {
    includeInactive: filter === "all" || filter === "expired",
    includeExpired: filter === "all" || filter === "expired",
  });

  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  if (!sales) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-48 animate-pulse bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const now = Date.now();
  const filteredSales = sales.filter(
    (sale: { isActive: boolean; startsAt: number; endsAt: number }) => {
      if (filter === "active") {
        return sale.isActive && sale.startsAt <= now && sale.endsAt > now;
      }
      if (filter === "upcoming") {
        return sale.isActive && sale.startsAt > now;
      }
      if (filter === "expired") {
        return sale.endsAt <= now;
      }
      return true;
    }
  );

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <Text className="text-muted-foreground">{filteredSales.length} sales</Text>
        <RoleGuard permission="shop.edit">
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button>
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Sale
              </Button>
            </DialogTrigger>
            <SaleFormDialog editingSale={null} onClose={() => setShowCreate(false)} />
          </Dialog>
        </RoleGuard>
      </div>

      {filteredSales.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <Text className="text-muted-foreground text-center">No sales in this category</Text>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredSales.map((sale: Sale) => (
            <SaleCard key={sale._id} sale={sale} onEdit={() => setEditingSale(sale)} />
          ))}
        </div>
      )}

      <Dialog open={!!editingSale} onOpenChange={(open) => !open && setEditingSale(null)}>
        {editingSale && (
          <SaleFormDialog editingSale={editingSale} onClose={() => setEditingSale(null)} />
        )}
      </Dialog>
    </>
  );
}

// =============================================================================
// Main Page
// =============================================================================

export default function SalesManagementPage() {
  return (
    <PageWrapper
      title="Sales Management"
      description="Create and manage promotional sales"
      actions={
        <RoleGuard permission="shop.edit">
          <FlashSaleDialog />
        </RoleGuard>
      }
    >
      <div className="space-y-6">
        <SalesStatsOverview />

        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="all">All Sales</TabsTrigger>
            <TabsTrigger value="expired">Expired</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            <SalesList filter="active" />
          </TabsContent>

          <TabsContent value="upcoming" className="mt-6">
            <SalesList filter="upcoming" />
          </TabsContent>

          <TabsContent value="all" className="mt-6">
            <SalesList filter="all" />
          </TabsContent>

          <TabsContent value="expired" className="mt-6">
            <SalesList filter="expired" />
          </TabsContent>
        </Tabs>
      </div>
    </PageWrapper>
  );
}
