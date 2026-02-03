"use client";

/**
 * Shop Product Editor Page
 *
 * Create/edit shop products.
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
import { apiAny, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import { Badge, Card, Text, Title } from "@tremor/react";
import {
  ArrowLeftIcon,
  CoinsIcon,
  CopyIcon,
  GemIcon,
  Loader2Icon,
  PackageIcon,
  SaveIcon,
  ShoppingCartIcon,
  TrashIcon,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// =============================================================================
// Types & Constants
// =============================================================================

type ProductType = "pack" | "box" | "currency";
type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
type CurrencyType = "gold" | "gems";

const PRODUCT_TYPES = [
  { value: "pack", label: "Pack", description: "Contains random cards" },
  { value: "box", label: "Box", description: "Bundle of multiple packs" },
  { value: "currency", label: "Currency", description: "Currency exchange" },
];

const RARITIES = [
  { value: "common", label: "Common" },
  { value: "uncommon", label: "Uncommon" },
  { value: "rare", label: "Rare" },
  { value: "epic", label: "Epic" },
  { value: "legendary", label: "Legendary" },
];

const ARCHETYPES = [
  { value: "infernal_dragons", label: "Infernal Dragons" },
  { value: "abyssal_horrors", label: "Abyssal Horrors" },
  { value: "nature_spirits", label: "Nature Spirits" },
  { value: "storm_elementals", label: "Storm Elementals" },
  { value: "shadow_assassins", label: "Shadow Assassins" },
  { value: "celestial_guardians", label: "Celestial Guardians" },
  { value: "undead_legion", label: "Undead Legion" },
  { value: "divine_knights", label: "Divine Knights" },
  { value: "arcane_mages", label: "Arcane Mages" },
  { value: "mechanical_constructs", label: "Mechanical Constructs" },
  { value: "neutral", label: "Neutral" },
  { value: "fire", label: "Fire" },
  { value: "water", label: "Water" },
  { value: "earth", label: "Earth" },
  { value: "wind", label: "Wind" },
];

const CURRENCY_TYPES = [
  { value: "gold", label: "Gold" },
  { value: "gems", label: "Gems" },
];

// =============================================================================
// Component
// =============================================================================

export default function ShopProductEditorPage() {
  const params = useParams();
  const router = useRouter();
  const productDbId = params["productId"] as string;
  const isNew = productDbId === "new";

  // Form state
  const [productId, setProductId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [productType, setProductType] = useState<ProductType>("pack");
  const [goldPrice, setGoldPrice] = useState<string>("");
  const [gemPrice, setGemPrice] = useState<string>("");
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState<string>("");

  // Pack config
  const [packCardCount, setPackCardCount] = useState<string>("5");
  const [packGuaranteedRarity, setPackGuaranteedRarity] = useState<string>("none");
  const [packArchetype, setPackArchetype] = useState<string>("none");

  // Box config
  const [boxPackProductId, setBoxPackProductId] = useState("");
  const [boxPackCount, setBoxPackCount] = useState<string>("10");
  const [boxBonusCards, setBoxBonusCards] = useState<string>("");

  // Currency config
  const [currencyType, setCurrencyType] = useState<CurrencyType>("gold");
  const [currencyAmount, setCurrencyAmount] = useState<string>("");

  // Duplicate dialog
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateProductId, setDuplicateProductId] = useState("");
  const [duplicateName, setDuplicateName] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Queries and mutations
  const existingProduct = useConvexQuery(
    apiAny.admin.shop.getProduct,
    isNew ? "skip" : { productDbId: productDbId as any }
  );

  const allProducts = useConvexQuery(apiAny.admin.shop.listProducts, {
    includeInactive: true,
  });

  const createProduct = useConvexMutation(apiAny.admin.shop.createProduct);
  const updateProduct = useConvexMutation(apiAny.admin.shop.updateProduct);
  const deleteProduct = useConvexMutation(apiAny.admin.shop.deleteProduct);
  const duplicateProduct = useConvexMutation(apiAny.admin.shop.duplicateProduct);

  // Populate form with existing product data
  useEffect(() => {
    if (existingProduct && !isNew) {
      setProductId(existingProduct.productId);
      setName(existingProduct.name);
      setDescription(existingProduct.description);
      setProductType(existingProduct.productType);
      setGoldPrice(existingProduct.goldPrice?.toString() ?? "");
      setGemPrice(existingProduct.gemPrice?.toString() ?? "");
      setIsActive(existingProduct.isActive);
      setSortOrder(existingProduct.sortOrder.toString());

      if (existingProduct.packConfig) {
        setPackCardCount(existingProduct.packConfig.cardCount.toString());
        setPackGuaranteedRarity(existingProduct.packConfig.guaranteedRarity ?? "none");
        setPackArchetype(existingProduct.packConfig.archetype ?? "none");
      }

      if (existingProduct.boxConfig) {
        setBoxPackProductId(existingProduct.boxConfig.packProductId);
        setBoxPackCount(existingProduct.boxConfig.packCount.toString());
        setBoxBonusCards(existingProduct.boxConfig.bonusCards?.toString() ?? "");
      }

      if (existingProduct.currencyConfig) {
        setCurrencyType(existingProduct.currencyConfig.currencyType);
        setCurrencyAmount(existingProduct.currencyConfig.amount.toString());
      }
    }
  }, [existingProduct, isNew]);

  const handleSave = async () => {
    if (!productId.trim()) {
      toast.error("Product ID is required");
      return;
    }
    if (!name.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (!goldPrice && !gemPrice) {
      toast.error("At least one price is required");
      return;
    }

    setIsSaving(true);
    try {
      if (isNew) {
        const result = await createProduct({
          productId: productId.trim(),
          name: name.trim(),
          description: description.trim(),
          productType,
          goldPrice: goldPrice ? Number.parseInt(goldPrice) : undefined,
          gemPrice: gemPrice ? Number.parseInt(gemPrice) : undefined,
          packCardCount: productType === "pack" ? Number.parseInt(packCardCount) : undefined,
          packGuaranteedRarity:
            productType === "pack" && packGuaranteedRarity !== "none"
              ? (packGuaranteedRarity as Rarity)
              : undefined,
          packArchetype:
            productType === "pack" && packArchetype !== "none" ? packArchetype : undefined,
          boxPackProductId: productType === "box" ? boxPackProductId : undefined,
          boxPackCount: productType === "box" ? Number.parseInt(boxPackCount) : undefined,
          boxBonusCards:
            productType === "box" && boxBonusCards ? Number.parseInt(boxBonusCards) : undefined,
          currencyType: productType === "currency" ? currencyType : undefined,
          currencyAmount: productType === "currency" ? Number.parseInt(currencyAmount) : undefined,
          isActive,
          sortOrder: sortOrder ? Number.parseInt(sortOrder) : undefined,
        });
        toast.success(result.message);
        router.push(`/shop/${result.productDbId}`);
      } else {
        const result = await updateProduct({
          productDbId: productDbId as any,
          name: name.trim(),
          description: description.trim(),
          goldPrice: goldPrice ? Number.parseInt(goldPrice) : undefined,
          gemPrice: gemPrice ? Number.parseInt(gemPrice) : undefined,
          clearGoldPrice: !goldPrice,
          clearGemPrice: !gemPrice,
          packCardCount: productType === "pack" ? Number.parseInt(packCardCount) : undefined,
          packGuaranteedRarity:
            productType === "pack" && packGuaranteedRarity !== "none"
              ? (packGuaranteedRarity as Rarity)
              : undefined,
          clearGuaranteedRarity: productType === "pack" && packGuaranteedRarity === "none",
          packArchetype:
            productType === "pack" && packArchetype !== "none" ? packArchetype : undefined,
          clearArchetype: productType === "pack" && packArchetype === "none",
          boxPackProductId: productType === "box" ? boxPackProductId : undefined,
          boxPackCount: productType === "box" ? Number.parseInt(boxPackCount) : undefined,
          boxBonusCards:
            productType === "box" && boxBonusCards ? Number.parseInt(boxBonusCards) : undefined,
          currencyType: productType === "currency" ? currencyType : undefined,
          currencyAmount: productType === "currency" ? Number.parseInt(currencyAmount) : undefined,
          isActive,
          sortOrder: sortOrder ? Number.parseInt(sortOrder) : undefined,
        });
        toast.success(result.message);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save product");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteProduct({ productDbId: productDbId as any });
      toast.success(result.message);
      router.push("/shop");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete product");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicate = async () => {
    if (!duplicateProductId.trim() || !duplicateName.trim()) {
      toast.error("Product ID and name are required");
      return;
    }

    try {
      const result = await duplicateProduct({
        productDbId: productDbId as any,
        newProductId: duplicateProductId.trim(),
        newName: duplicateName.trim(),
      });
      toast.success(result.message);
      setDuplicateDialogOpen(false);
      router.push(`/shop/${result.productDbId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to duplicate product");
    }
  };

  // Available pack products for box config
  const packProducts = allProducts?.products.filter((p: any) => p.productType === "pack") ?? [];

  if (!isNew && existingProduct === undefined) {
    return (
      <PageWrapper title="Loading..." description="Loading product data">
        <div className="flex justify-center py-12">
          <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageWrapper>
    );
  }

  if (!isNew && existingProduct === null) {
    return (
      <PageWrapper title="Not Found" description="Product not found">
        <Card>
          <div className="text-center py-12">
            <Text className="text-lg font-semibold">Product Not Found</Text>
            <Text className="text-muted-foreground">
              The product you're looking for doesn't exist.
            </Text>
            <Button asChild className="mt-4">
              <Link href="/shop">Back to Shop</Link>
            </Button>
          </div>
        </Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title={isNew ? "New Product" : `Edit: ${existingProduct?.name}`}
      description={
        isNew ? "Create a new shop product" : `Product ID: ${existingProduct?.productId}`
      }
      actions={
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/shop">
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          {!isNew && (
            <>
              <AlertDialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDuplicateProductId(`${productId}-copy`);
                      setDuplicateName(`${name} (Copy)`);
                    }}
                  >
                    <CopyIcon className="mr-2 h-4 w-4" />
                    Duplicate
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Duplicate Product</AlertDialogTitle>
                    <AlertDialogDescription>
                      Create a copy of this product with a new ID and name.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>New Product ID</Label>
                      <Input
                        value={duplicateProductId}
                        onChange={(e) => setDuplicateProductId(e.target.value)}
                        placeholder="unique-product-id"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>New Name</Label>
                      <Input
                        value={duplicateName}
                        onChange={(e) => setDuplicateName(e.target.value)}
                        placeholder="Product Name"
                      />
                    </div>
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDuplicate}>Create Copy</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <RoleGuard permission="admin.manage">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <TrashIcon className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Product</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to permanently delete "{existingProduct?.name}"? This
                        action cannot be undone.
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
                          "Delete Product"
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </RoleGuard>
            </>
          )}
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <SaveIcon className="mr-2 h-4 w-4" />
                {isNew ? "Create Product" : "Save Changes"}
              </>
            )}
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <Title>Basic Information</Title>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Product ID *</Label>
                <Input
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  placeholder="unique-product-id"
                  disabled={!isNew}
                />
                <Text className="text-xs text-muted-foreground">
                  Unique identifier (cannot be changed after creation)
                </Text>
              </div>

              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Product Name"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Product description shown to players..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Product Type *</Label>
                <Select
                  value={productType}
                  onValueChange={(v) => setProductType(v as ProductType)}
                  disabled={!isNew}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <div>
                          <div>{t.label}</div>
                          <div className="text-xs text-muted-foreground">{t.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  placeholder="1"
                />
                <Text className="text-xs text-muted-foreground">Lower numbers appear first</Text>
              </div>
            </div>
          </Card>

          {/* Pricing */}
          <Card>
            <Title>Pricing</Title>
            <Text className="text-muted-foreground">
              At least one price is required. Products can have both gold and gem pricing.
            </Text>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CoinsIcon className="h-4 w-4 text-amber-500" />
                  Gold Price
                </Label>
                <Input
                  type="number"
                  value={goldPrice}
                  onChange={(e) => setGoldPrice(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <GemIcon className="h-4 w-4 text-violet-500" />
                  Gem Price
                </Label>
                <Input
                  type="number"
                  value={gemPrice}
                  onChange={(e) => setGemPrice(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          </Card>

          {/* Type-specific Configuration */}
          {productType === "pack" && (
            <Card>
              <Title className="flex items-center gap-2">
                <PackageIcon className="h-5 w-5" />
                Pack Configuration
              </Title>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Card Count *</Label>
                  <Input
                    type="number"
                    value={packCardCount}
                    onChange={(e) => setPackCardCount(e.target.value)}
                    placeholder="5"
                    min="1"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Guaranteed Rarity</Label>
                  <Select value={packGuaranteedRarity} onValueChange={setPackGuaranteedRarity}>
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {RARITIES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}+
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Text className="text-xs text-muted-foreground">
                    One card guaranteed to be this rarity or higher
                  </Text>
                </div>

                <div className="space-y-2">
                  <Label>Archetype Filter</Label>
                  <Select value={packArchetype} onValueChange={setPackArchetype}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Any Archetype</SelectItem>
                      {ARCHETYPES.map((a) => (
                        <SelectItem key={a.value} value={a.value}>
                          {a.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Text className="text-xs text-muted-foreground">
                    Only cards from this archetype
                  </Text>
                </div>
              </div>
            </Card>
          )}

          {productType === "box" && (
            <Card>
              <Title className="flex items-center gap-2">
                <ShoppingCartIcon className="h-5 w-5" />
                Box Configuration
              </Title>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Pack Product *</Label>
                  <Select value={boxPackProductId} onValueChange={setBoxPackProductId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select pack..." />
                    </SelectTrigger>
                    <SelectContent>
                      {packProducts.map((p: any) => (
                        <SelectItem key={p.productId} value={p.productId}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Text className="text-xs text-muted-foreground">
                    Which pack does this box contain?
                  </Text>
                </div>

                <div className="space-y-2">
                  <Label>Pack Count *</Label>
                  <Input
                    type="number"
                    value={boxPackCount}
                    onChange={(e) => setBoxPackCount(e.target.value)}
                    placeholder="10"
                    min="1"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Bonus Cards</Label>
                  <Input
                    type="number"
                    value={boxBonusCards}
                    onChange={(e) => setBoxBonusCards(e.target.value)}
                    placeholder="0"
                    min="0"
                  />
                  <Text className="text-xs text-muted-foreground">
                    Extra cards added as a bonus
                  </Text>
                </div>
              </div>
            </Card>
          )}

          {productType === "currency" && (
            <Card>
              <Title className="flex items-center gap-2">
                <CoinsIcon className="h-5 w-5" />
                Currency Configuration
              </Title>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Currency Type *</Label>
                  <Select
                    value={currencyType}
                    onValueChange={(v) => setCurrencyType(v as CurrencyType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCY_TYPES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Amount *</Label>
                  <Input
                    type="number"
                    value={currencyAmount}
                    onChange={(e) => setCurrencyAmount(e.target.value)}
                    placeholder="1000"
                    min="1"
                  />
                  <Text className="text-xs text-muted-foreground">
                    Amount of {currencyType} to give
                  </Text>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar - Preview & Status */}
        <div className="space-y-6">
          <Card>
            <Title>Status</Title>
            <div className="mt-4 flex items-center justify-between">
              <div>
                <Text className="font-medium">Active</Text>
                <Text className="text-sm text-muted-foreground">
                  {isActive ? "Visible in shop" : "Hidden from players"}
                </Text>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </Card>

          <Card>
            <Title>Preview</Title>
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <Text className="font-bold text-lg">{name || "Product Name"}</Text>
                  <Text className="text-sm text-muted-foreground font-mono">
                    {productId || "product-id"}
                  </Text>
                </div>
                <Badge
                  color={
                    productType === "pack" ? "blue" : productType === "box" ? "violet" : "amber"
                  }
                  size="sm"
                >
                  {productType}
                </Badge>
              </div>

              <Text className="text-sm text-muted-foreground mt-2">
                {description || "No description"}
              </Text>

              <div className="mt-4 flex gap-4">
                {goldPrice && (
                  <div className="flex items-center gap-1 text-amber-600">
                    <CoinsIcon className="h-4 w-4" />
                    <span className="font-medium">
                      {Number.parseInt(goldPrice).toLocaleString()}
                    </span>
                  </div>
                )}
                {gemPrice && (
                  <div className="flex items-center gap-1 text-violet-600">
                    <GemIcon className="h-4 w-4" />
                    <span className="font-medium">
                      {Number.parseInt(gemPrice).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-4 text-xs text-muted-foreground">
                {productType === "pack" && (
                  <div>
                    {packCardCount} cards
                    {packGuaranteedRarity !== "none" && (
                      <span> (1x {packGuaranteedRarity}+ guaranteed)</span>
                    )}
                    {packArchetype !== "none" && (
                      <div className="mt-1">
                        Archetype: {ARCHETYPES.find((a) => a.value === packArchetype)?.label}
                      </div>
                    )}
                  </div>
                )}
                {productType === "box" && (
                  <div>
                    {boxPackCount}x {boxPackProductId || "pack"}
                    {boxBonusCards && <span> + {boxBonusCards} bonus cards</span>}
                  </div>
                )}
                {productType === "currency" && (
                  <div>
                    {Number.parseInt(currencyAmount || "0").toLocaleString()} {currencyType}
                  </div>
                )}
              </div>
            </div>
          </Card>

          {!isNew && (
            <Card>
              <Title>Metadata</Title>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <Text className="text-muted-foreground">Created</Text>
                  <Text>
                    {existingProduct?.createdAt
                      ? new Date(existingProduct.createdAt).toLocaleDateString()
                      : "-"}
                  </Text>
                </div>
                <div className="flex justify-between">
                  <Text className="text-muted-foreground">Status</Text>
                  <Badge color={isActive ? "emerald" : "gray"} size="sm">
                    {isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <Text className="text-muted-foreground">Sort Order</Text>
                  <Text>{sortOrder || existingProduct?.sortOrder || "-"}</Text>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
