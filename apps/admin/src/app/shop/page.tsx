"use client";

/**
 * Shop Products List Page
 *
 * Browse, search, and manage shop products.
 */

import { PageWrapper } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { RoleGuard } from "@/contexts/AdminContext";
import { apiAny, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import { Badge, Card, Text, Title } from "@tremor/react";
import { CoinsIcon, GemIcon, PackageIcon, PlusIcon, SearchIcon, ShoppingCartIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

// =============================================================================
// Types & Constants
// =============================================================================

type ProductType = "pack" | "box" | "currency";

const PRODUCT_TYPE_CONFIG: Record<ProductType, { label: string; color: string; icon: React.ReactNode }> = {
  pack: { label: "Pack", color: "blue", icon: <PackageIcon className="h-4 w-4" /> },
  box: { label: "Box", color: "violet", icon: <ShoppingCartIcon className="h-4 w-4" /> },
  currency: { label: "Currency", color: "amber", icon: <CoinsIcon className="h-4 w-4" /> },
};

const PRODUCT_TYPES = [
  { value: "pack", label: "Pack" },
  { value: "box", label: "Box" },
  { value: "currency", label: "Currency" },
];

// =============================================================================
// Component
// =============================================================================

export default function ShopPage() {
  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showInactive, setShowInactive] = useState(false);

  // Query
  const productsResult = useConvexQuery(apiAny.admin.shop.listProducts, {
    search: search || undefined,
    productType: typeFilter !== "all" ? (typeFilter as ProductType) : undefined,
    includeInactive: showInactive,
  });

  const statsResult = useConvexQuery(apiAny.admin.shop.getShopStats, {});

  const toggleActive = useConvexMutation(apiAny.admin.shop.toggleProductActive);

  const handleToggleActive = async (productDbId: string, productName: string) => {
    try {
      const result = await toggleActive({ productDbId: productDbId as any });
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to toggle product status");
    }
  };

  const isLoading = productsResult === undefined;

  const formatPrice = (gold?: number, gems?: number) => {
    const parts = [];
    if (gold) parts.push(`${gold.toLocaleString()} Gold`);
    if (gems) parts.push(`${gems.toLocaleString()} Gems`);
    return parts.length > 0 ? parts.join(" / ") : "Free";
  };

  return (
    <PageWrapper
      title="Shop Products"
      description="Manage shop product catalog"
      actions={
        <RoleGuard permission="config.edit">
          <Button asChild>
            <Link href="/shop/new">
              <PlusIcon className="mr-2 h-4 w-4" />
              New Product
            </Link>
          </Button>
        </RoleGuard>
      }
    >
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-6 mb-6">
        <Card>
          <div className="text-center">
            <Text className="text-2xl font-bold">{statsResult?.totalProducts ?? "..."}</Text>
            <Text className="text-sm text-muted-foreground">Total Products</Text>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <Text className="text-2xl font-bold text-emerald-500">
              {statsResult?.activeProducts ?? "..."}
            </Text>
            <Text className="text-sm text-muted-foreground">Active</Text>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <Text className="text-2xl font-bold text-blue-500">
              {statsResult?.byType?.pack ?? "..."}
            </Text>
            <Text className="text-sm text-muted-foreground">Packs</Text>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <Text className="text-2xl font-bold text-violet-500">
              {statsResult?.byType?.box ?? "..."}
            </Text>
            <Text className="text-sm text-muted-foreground">Boxes</Text>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <Text className="text-2xl font-bold text-amber-500">
              {statsResult?.byType?.currency ?? "..."}
            </Text>
            <Text className="text-sm text-muted-foreground">Currency</Text>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <Text className="text-2xl font-bold">
              {statsResult?.pricing?.bothPricing ?? "..."}
            </Text>
            <Text className="text-sm text-muted-foreground">Dual Pricing</Text>
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
                placeholder="Search by name or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="w-[150px]">
            <Text className="text-sm text-muted-foreground mb-1">Type</Text>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {PRODUCT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={showInactive} onCheckedChange={setShowInactive} />
            <Text className="text-sm">Show Inactive</Text>
          </div>
        </div>
      </Card>

      {/* Product List */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <Title>Products ({productsResult?.totalCount ?? 0})</Title>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : productsResult?.products.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            No products found matching your filters
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-3">Product</th>
                  <th className="text-left py-3 px-3">Type</th>
                  <th className="text-left py-3 px-3">Pricing</th>
                  <th className="text-left py-3 px-3">Details</th>
                  <th className="text-center py-3 px-3">Order</th>
                  <th className="text-center py-3 px-3">Status</th>
                  <th className="text-right py-3 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {productsResult?.products.map((product: any) => {
                  const typeConfig = PRODUCT_TYPE_CONFIG[product.productType as ProductType];
                  return (
                    <tr
                      key={product._id}
                      className={`border-b hover:bg-muted/30 ${!product.isActive ? "opacity-50" : ""}`}
                    >
                      <td className="py-3 px-3">
                        <Link
                          href={`/shop/${product._id}`}
                          className="font-medium hover:underline text-primary"
                        >
                          {product.name}
                        </Link>
                        <div className="text-xs text-muted-foreground font-mono">
                          {product.productId}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <Badge color={typeConfig.color as any} size="sm">
                          <span className="flex items-center gap-1">
                            {typeConfig.icon}
                            {typeConfig.label}
                          </span>
                        </Badge>
                      </td>
                      <td className="py-3 px-3">
                        <div className="space-y-1">
                          {product.goldPrice && (
                            <div className="flex items-center gap-1 text-amber-600">
                              <CoinsIcon className="h-3 w-3" />
                              {product.goldPrice.toLocaleString()}
                            </div>
                          )}
                          {product.gemPrice && (
                            <div className="flex items-center gap-1 text-violet-600">
                              <GemIcon className="h-3 w-3" />
                              {product.gemPrice.toLocaleString()}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-muted-foreground text-xs">
                        {product.productType === "pack" && product.packConfig && (
                          <div>
                            {product.packConfig.cardCount} cards
                            {product.packConfig.guaranteedRarity && (
                              <span className="ml-1">
                                (1x {product.packConfig.guaranteedRarity}+)
                              </span>
                            )}
                            {product.packConfig.archetype && (
                              <span className="ml-1">
                                [{product.packConfig.archetype}]
                              </span>
                            )}
                          </div>
                        )}
                        {product.productType === "box" && product.boxConfig && (
                          <div>
                            {product.boxConfig.packCount}x {product.boxConfig.packProductId}
                            {product.boxConfig.bonusCards && (
                              <span className="ml-1">+{product.boxConfig.bonusCards} bonus</span>
                            )}
                          </div>
                        )}
                        {product.productType === "currency" && product.currencyConfig && (
                          <div>
                            {product.currencyConfig.amount.toLocaleString()}{" "}
                            {product.currencyConfig.currencyType}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center text-muted-foreground">
                        {product.sortOrder}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge color={product.isActive ? "emerald" : "gray"} size="sm">
                          {product.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/shop/${product._id}`}>Edit</Link>
                          </Button>
                          <RoleGuard permission="config.edit">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleActive(product._id, product.name)}
                            >
                              {product.isActive ? "Deactivate" : "Activate"}
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
