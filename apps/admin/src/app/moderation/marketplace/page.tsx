"use client";

/**
 * Marketplace Moderation Page
 *
 * Monitor and moderate marketplace listings, detect price anomalies,
 * manage price caps, and handle bid refunds.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAdmin } from "@/contexts/AdminContext";
import { apiAny, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import { format, formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  Check,
  ChevronsUpDown,
  DollarSign,
  History,
  RefreshCw,
  Trash2,
  Undo2,
  User,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

type ListingStatus = "active" | "sold" | "cancelled" | "expired" | "suspended";

const STATUS_BADGES: Record<
  ListingStatus,
  { variant: "default" | "secondary" | "destructive" | "outline"; label: string }
> = {
  active: { variant: "default", label: "Active" },
  sold: { variant: "secondary", label: "Sold" },
  cancelled: { variant: "destructive", label: "Cancelled" },
  expired: { variant: "outline", label: "Expired" },
  suspended: { variant: "destructive", label: "Suspended" },
};

const RARITY_COLORS: Record<string, string> = {
  common: "text-gray-500",
  uncommon: "text-green-500",
  rare: "text-blue-500",
  epic: "text-purple-500",
  legendary: "text-orange-500",
};

// Type definitions for API responses
interface CardDefinition {
  _id: string;
  name: string;
  rarity: string;
  cardType: string;
  archetype: string;
}

interface Bid {
  _id: string;
  listingId: string;
  bidderId: string;
  bidderUsername: string;
  bidAmount: number;
  bidStatus: string;
  createdAt: number;
}

interface SellerHistoryData {
  seller: {
    _id: string;
    username: string;
    accountStatus: string;
    createdAt: number;
  };
  stats: {
    totalListings: number;
    byStatus: {
      active: number;
      sold: number;
      cancelled: number;
      expired: number;
    };
    totalSalesVolume: number;
    totalBids: number;
  };
  recentListings: Array<{
    _id: string;
    cardName: string;
    cardRarity: string;
    price: number;
    status: string;
    _creationTime: number;
  }>;
  recentBids: Bid[];
}

interface PriceCap {
  _id: string;
  cardDefinitionId: string;
  cardName: string;
  cardRarity: string;
  maxPrice: number;
  reason: string;
  setBy: string;
  setByUsername: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export default function MarketplaceModerationPage() {
  const { isAdmin } = useAdmin();

  // Listing filters
  const [statusFilter, setStatusFilter] = useState<ListingStatus | "all">("active");
  const [search, setSearch] = useState("");

  // Suspend dialog state
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [suspendListingId, setSuspendListingId] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState("");

  // Price cap dialog state
  const [priceCapDialogOpen, setPriceCapDialogOpen] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedCardName, setSelectedCardName] = useState<string>("");
  const [priceCapAmount, setPriceCapAmount] = useState<string>("");
  const [priceCapReason, setPriceCapReason] = useState("");
  const [cardSearchOpen, setCardSearchOpen] = useState(false);
  const [cardSearchQuery, setCardSearchQuery] = useState("");

  // Refund bid dialog state
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundBidId, setRefundBidId] = useState<string | null>(null);
  const [refundBidInfo, setRefundBidInfo] = useState<{ username: string; amount: number } | null>(
    null
  );
  const [refundReason, setRefundReason] = useState("");

  // Seller history sheet state
  const [sellerHistoryOpen, setSellerHistoryOpen] = useState(false);
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState(false);

  const listings = useConvexQuery(
    apiAny.admin.marketplace.listListings,
    isAdmin
      ? {
          status: statusFilter === "all" ? undefined : statusFilter,
          search: search || undefined,
          limit: 100,
        }
      : "skip"
  );

  const stats = useConvexQuery(apiAny.admin.marketplace.getMarketplaceStats, isAdmin ? {} : "skip");

  const anomalies = useConvexQuery(
    apiAny.admin.marketplace.getPriceAnomalies,
    isAdmin ? {} : "skip"
  );

  // Cards query for price cap selector
  const cardsResult = useConvexQuery(
    apiAny.admin.cards.listCards,
    isAdmin
      ? {
          search: cardSearchQuery || undefined,
          includeInactive: false,
          limit: 20,
        }
      : "skip"
  );

  // Seller history query
  const sellerHistory = useConvexQuery(
    apiAny.admin.marketplace.getSellerHistory,
    isAdmin && selectedSellerId ? { sellerId: selectedSellerId } : "skip"
  ) as SellerHistoryData | undefined;

  // Price caps query
  const priceCaps = useConvexQuery(apiAny.admin.marketplace.getPriceCaps, isAdmin ? {} : "skip") as
    | PriceCap[]
    | undefined;

  // Mutations
  const suspendListing = useConvexMutation(apiAny.admin.marketplace.suspendListing);
  const unsuspendListing = useConvexMutation(apiAny.admin.marketplace.unsuspendListing);
  const setPriceCap = useConvexMutation(apiAny.admin.marketplace.setPriceCap);
  const removePriceCap = useConvexMutation(apiAny.admin.marketplace.removePriceCap);
  const refundBid = useConvexMutation(apiAny.admin.marketplace.refundBid);

  const handleSuspend = async () => {
    if (!suspendListingId || !suspendReason) return;

    setIsSubmitting(true);
    try {
      await suspendListing({
        listingId: suspendListingId,
        reason: suspendReason,
      });
      toast.success("Listing suspended successfully");
      setSuspendDialogOpen(false);
      setSuspendListingId(null);
      setSuspendReason("");
    } catch (error) {
      console.error("Failed to suspend listing:", error);
      toast.error(error instanceof Error ? error.message : "Failed to suspend listing");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openSuspendDialog = (listingId: string) => {
    setSuspendListingId(listingId);
    setSuspendDialogOpen(true);
  };

  const handleUnsuspend = async (listingId: string) => {
    setIsSubmitting(true);
    try {
      await unsuspendListing({ listingId });
      toast.success("Listing reactivated successfully");
    } catch (error) {
      console.error("Failed to unsuspend listing:", error);
      toast.error(error instanceof Error ? error.message : "Failed to unsuspend listing");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemovePriceCap = async (priceCapId: string, cardName: string) => {
    setIsSubmitting(true);
    try {
      await removePriceCap({ priceCapId });
      toast.success(`Price cap removed for ${cardName}`);
    } catch (error) {
      console.error("Failed to remove price cap:", error);
      toast.error(error instanceof Error ? error.message : "Failed to remove price cap");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetPriceCap = async () => {
    if (!selectedCardId || !priceCapAmount || !priceCapReason) return;

    const maxPrice = Number.parseInt(priceCapAmount, 10);
    if (Number.isNaN(maxPrice) || maxPrice <= 0) {
      toast.error("Please enter a valid price cap amount");
      return;
    }

    setIsSubmitting(true);
    try {
      await setPriceCap({
        cardDefinitionId: selectedCardId,
        maxPrice,
        reason: priceCapReason,
      });
      toast.success(`Price cap of ${formatGold(maxPrice)} set for ${selectedCardName}`);
      setPriceCapDialogOpen(false);
      setSelectedCardId(null);
      setSelectedCardName("");
      setPriceCapAmount("");
      setPriceCapReason("");
    } catch (error) {
      console.error("Failed to set price cap:", error);
      toast.error(error instanceof Error ? error.message : "Failed to set price cap");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefundBid = async () => {
    if (!refundBidId || !refundReason) return;

    setIsSubmitting(true);
    try {
      const result = await refundBid({
        bidId: refundBidId,
        reason: refundReason,
      });
      toast.success(result.message || "Bid refunded successfully");
      setRefundDialogOpen(false);
      setRefundBidId(null);
      setRefundBidInfo(null);
      setRefundReason("");
    } catch (error) {
      console.error("Failed to refund bid:", error);
      toast.error(error instanceof Error ? error.message : "Failed to refund bid");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openRefundDialog = (bidId: string, username: string, amount: number) => {
    setRefundBidId(bidId);
    setRefundBidInfo({ username, amount });
    setRefundDialogOpen(true);
  };

  const openSellerHistory = (sellerId: string) => {
    setSelectedSellerId(sellerId);
    setSellerHistoryOpen(true);
  };

  const formatGold = (amount: number) => {
    return amount.toLocaleString();
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Access denied</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Marketplace Moderation</h1>
        <p className="text-muted-foreground">
          Monitor listings, detect anomalies, and take action on suspicious activity
        </p>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Listings</CardDescription>
              <CardTitle className="text-2xl">{stats.byStatus.active}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Sales (24h)</CardDescription>
              <CardTitle className="text-2xl">{stats.salesLast24h}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Sales (7d)</CardDescription>
              <CardTitle className="text-2xl">{stats.salesLastWeek}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Volume (24h)</CardDescription>
              <CardTitle className="text-2xl">{formatGold(stats.volumeLast24h)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Volume (7d)</CardDescription>
              <CardTitle className="text-2xl">{formatGold(stats.volumeLastWeek)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Price Anomalies</CardDescription>
              <CardTitle className="text-2xl text-yellow-500">
                {stats.priceAnomaliesCount}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Admin Actions Bar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Admin Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setPriceCapDialogOpen(true)} variant="outline">
              <DollarSign className="mr-2 h-4 w-4" />
              Set Price Cap
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="listings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="listings">All Listings</TabsTrigger>
          <TabsTrigger value="anomalies" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Price Anomalies
            {anomalies && anomalies.length > 0 && (
              <Badge variant="destructive" className="ml-1">
                {anomalies.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pricecaps" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Price Caps
            {priceCaps && priceCaps.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {priceCaps.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="listings" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-1 gap-4">
                  <Input
                    placeholder="Search by seller..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-sm"
                  />
                  <Select
                    value={statusFilter}
                    onValueChange={(v) => setStatusFilter(v as ListingStatus | "all")}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="sold">Sold</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!listings ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-muted-foreground">Loading...</p>
                </div>
              ) : listings.listings.length === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-muted-foreground">No listings found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Card</TableHead>
                      <TableHead>Seller</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Listed</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {listings.listings.map(
                      (listing: {
                        _id: string;
                        cardName: string;
                        cardRarity: string;
                        sellerId: string;
                        sellerUsername: string;
                        listingType: string;
                        price: number;
                        currentBid?: number;
                        status: ListingStatus;
                        _creationTime: number;
                        quantity: number;
                      }) => (
                        <TableRow key={listing._id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{listing.cardName}</p>
                              <p
                                className={`text-xs capitalize ${RARITY_COLORS[listing.cardRarity] ?? ""}`}
                              >
                                {listing.cardRarity}
                                {listing.quantity > 1 && ` (x${listing.quantity})`}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/players/${listing.sellerId}`}
                                className="text-primary hover:underline"
                              >
                                {listing.sellerUsername}
                              </Link>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openSellerHistory(listing.sellerId);
                                }}
                                title="View seller history"
                              >
                                <History className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {listing.listingType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{formatGold(listing.price)} gold</p>
                              {listing.listingType === "auction" && listing.currentBid && (
                                <p className="text-xs text-muted-foreground">
                                  Current bid: {formatGold(listing.currentBid)}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={STATUS_BADGES[listing.status].variant}>
                              {STATUS_BADGES[listing.status].label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDistanceToNow(new Date(listing._creationTime), {
                              addSuffix: true,
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  (window.location.href = `/moderation/marketplace/${listing._id}`)
                                }
                              >
                                View
                              </Button>
                              {listing.status === "active" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => openSuspendDialog(listing._id)}
                                >
                                  Suspend
                                </Button>
                              )}
                              {(listing.status === "suspended" ||
                                listing.status === "cancelled") && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-green-600 hover:text-green-600"
                                  onClick={() => handleUnsuspend(listing._id)}
                                  disabled={isSubmitting}
                                >
                                  <Undo2 className="mr-1 h-3 w-3" />
                                  Reactivate
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    )}
                  </TableBody>
                </Table>
              )}

              {listings?.hasMore && (
                <div className="flex justify-center mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {listings.listings.length} of {listings.totalCount} listings
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="anomalies" className="space-y-4">
          {/* Price Anomaly Alert Banner */}
          {anomalies && anomalies.length > 0 && (
            <Card className="border-yellow-500/50 bg-yellow-500/5">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <div className="flex-1">
                    <p className="font-medium text-yellow-600 dark:text-yellow-400">
                      {anomalies.length} price anomal{anomalies.length === 1 ? "y" : "ies"} detected
                    </p>
                    <p className="text-sm text-muted-foreground">
                      These listings are priced 3x or more above the average for their card type.
                      Consider setting price caps or suspending suspicious listings.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setPriceCapDialogOpen(true)}>
                    <DollarSign className="mr-2 h-4 w-4" />
                    Set Price Cap
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Price Anomalies</CardTitle>
              <CardDescription>
                Listings priced significantly above the average for their card (3x or more)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!anomalies ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-muted-foreground">Loading...</p>
                </div>
              ) : anomalies.length === 0 ? (
                <div className="flex items-center justify-center h-32 flex-col gap-2">
                  <Check className="h-8 w-8 text-green-500" />
                  <p className="text-muted-foreground">No price anomalies detected</p>
                  <p className="text-xs text-muted-foreground">
                    All listings are within normal price ranges
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Card</TableHead>
                      <TableHead>Seller</TableHead>
                      <TableHead>Listed Price</TableHead>
                      <TableHead>Average Price</TableHead>
                      <TableHead>Deviation</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {anomalies.map(
                      (anomaly: {
                        listingId: string;
                        cardDefinitionId?: string;
                        cardName: string;
                        price: number;
                        avgPrice: number;
                        deviation: number;
                        sellerUsername: string;
                        sellerId?: string;
                      }) => (
                        <TableRow key={anomaly.listingId} className="bg-yellow-500/5">
                          <TableCell className="font-medium">{anomaly.cardName}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {anomaly.sellerUsername}
                              {anomaly.sellerId && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={() => openSellerHistory(anomaly.sellerId!)}
                                  title="View seller history"
                                >
                                  <History className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-red-500 font-medium">
                            {formatGold(anomaly.price)} gold
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatGold(anomaly.avgPrice)} gold
                          </TableCell>
                          <TableCell>
                            <Badge variant="destructive">{anomaly.deviation}x</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  (window.location.href = `/moderation/marketplace/${anomaly.listingId}`)
                                }
                              >
                                View
                              </Button>
                              {anomaly.cardDefinitionId && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedCardId(anomaly.cardDefinitionId!);
                                    setSelectedCardName(anomaly.cardName);
                                    setPriceCapAmount(String(Math.round(anomaly.avgPrice * 2)));
                                    setPriceCapDialogOpen(true);
                                  }}
                                  title="Set price cap for this card"
                                >
                                  <DollarSign className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => openSuspendDialog(anomaly.listingId)}
                              >
                                Suspend
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricecaps" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Price Caps</CardTitle>
                  <CardDescription>
                    Manage maximum prices for specific cards to prevent price gouging
                  </CardDescription>
                </div>
                <Button onClick={() => setPriceCapDialogOpen(true)}>
                  <DollarSign className="mr-2 h-4 w-4" />
                  Add Price Cap
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!priceCaps ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-muted-foreground">Loading...</p>
                </div>
              ) : priceCaps.length === 0 ? (
                <div className="flex items-center justify-center h-32 flex-col gap-2">
                  <DollarSign className="h-8 w-8 text-muted-foreground" />
                  <p className="text-muted-foreground">No price caps set</p>
                  <p className="text-xs text-muted-foreground">
                    Price caps help prevent price manipulation on specific cards
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Card</TableHead>
                      <TableHead>Max Price</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Set By</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {priceCaps.map((cap) => (
                      <TableRow key={cap._id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{cap.cardName}</p>
                            <p
                              className={`text-xs capitalize ${RARITY_COLORS[cap.cardRarity] ?? ""}`}
                            >
                              {cap.cardRarity}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-yellow-600">
                            {formatGold(cap.maxPrice)} gold
                          </p>
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <p className="text-sm text-muted-foreground truncate" title={cap.reason}>
                            {cap.reason}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{cap.setByUsername}</p>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDistanceToNow(new Date(cap.updatedAt), {
                            addSuffix: true,
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedCardId(cap.cardDefinitionId);
                                setSelectedCardName(cap.cardName);
                                setPriceCapAmount(String(cap.maxPrice));
                                setPriceCapReason(cap.reason);
                                setPriceCapDialogOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleRemovePriceCap(cap._id, cap.cardName)}
                              disabled={isSubmitting}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Suspend Dialog */}
      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Listing</DialogTitle>
            <DialogDescription>
              This will remove the listing from the marketplace. The seller will be notified.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Reason</Label>
              <Textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Reason for suspending this listing..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSuspend}
              disabled={!suspendReason || isSubmitting}
            >
              {isSubmitting ? "Suspending..." : "Suspend Listing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Price Cap Dialog */}
      <Dialog open={priceCapDialogOpen} onOpenChange={setPriceCapDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Set Price Cap</DialogTitle>
            <DialogDescription>
              Set a maximum price for a specific card. Listings above this price may be flagged or
              prevented.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Select Card</Label>
              <Popover open={cardSearchOpen} onOpenChange={setCardSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={cardSearchOpen}
                    className="w-full justify-between mt-1"
                  >
                    {selectedCardName || "Search for a card..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Search cards..."
                      value={cardSearchQuery}
                      onValueChange={setCardSearchQuery}
                    />
                    <CommandList>
                      <CommandEmpty>No cards found.</CommandEmpty>
                      <CommandGroup>
                        {cardsResult?.cards?.map((card: CardDefinition) => (
                          <CommandItem
                            key={card._id}
                            value={card.name}
                            onSelect={() => {
                              setSelectedCardId(card._id);
                              setSelectedCardName(card.name);
                              setCardSearchOpen(false);
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <Check
                                className={`h-4 w-4 ${
                                  selectedCardId === card._id ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              <div>
                                <p className="font-medium">{card.name}</p>
                                <p
                                  className={`text-xs capitalize ${RARITY_COLORS[card.rarity] ?? ""}`}
                                >
                                  {card.rarity} {card.cardType}
                                </p>
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Maximum Price (Gold)</Label>
              <Input
                type="number"
                value={priceCapAmount}
                onChange={(e) => setPriceCapAmount(e.target.value)}
                placeholder="Enter max price..."
                className="mt-1"
                min={1}
              />
            </div>

            <div>
              <Label>Reason</Label>
              <Textarea
                value={priceCapReason}
                onChange={(e) => setPriceCapReason(e.target.value)}
                placeholder="Reason for setting this price cap..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPriceCapDialogOpen(false);
                setSelectedCardId(null);
                setSelectedCardName("");
                setPriceCapAmount("");
                setPriceCapReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSetPriceCap}
              disabled={!selectedCardId || !priceCapAmount || !priceCapReason || isSubmitting}
            >
              {isSubmitting ? "Setting..." : "Set Price Cap"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Bid Dialog */}
      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refund Bid</DialogTitle>
            <DialogDescription>
              Refund this bid amount back to the bidder. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {refundBidInfo && (
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bidder:</span>
                <span className="font-medium">{refundBidInfo.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-medium text-green-500">
                  {formatGold(refundBidInfo.amount)} gold
                </span>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label>Reason for Refund</Label>
              <Textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Reason for refunding this bid (e.g., auction manipulation, technical error)..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRefundDialogOpen(false);
                setRefundBidId(null);
                setRefundBidInfo(null);
                setRefundReason("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleRefundBid} disabled={!refundReason || isSubmitting}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {isSubmitting ? "Processing..." : "Refund Bid"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Seller History Sheet */}
      <Sheet open={sellerHistoryOpen} onOpenChange={setSellerHistoryOpen}>
        <SheetContent className="w-[500px] sm:w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Seller History
            </SheetTitle>
            <SheetDescription>Review seller trading activity and history</SheetDescription>
          </SheetHeader>

          {!sellerHistory ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              {/* Seller Info */}
              <div className="space-y-2">
                <h4 className="font-medium">Seller Information</h4>
                <div className="bg-muted rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Username:</span>
                    <Link
                      href={`/players/${sellerHistory.seller._id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {sellerHistory.seller.username}
                    </Link>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account Status:</span>
                    <Badge
                      variant={
                        sellerHistory.seller.accountStatus === "active" ? "default" : "destructive"
                      }
                    >
                      {sellerHistory.seller.accountStatus}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Member Since:</span>
                    <span className="text-sm">
                      {format(new Date(sellerHistory.seller.createdAt), "PPP")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-2">
                <h4 className="font-medium">Trading Statistics</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold">{sellerHistory.stats.totalListings}</p>
                    <p className="text-xs text-muted-foreground">Total Listings</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-500">
                      {formatGold(sellerHistory.stats.totalSalesVolume)}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Volume</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold">{sellerHistory.stats.byStatus.sold}</p>
                    <p className="text-xs text-muted-foreground">Sold</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold">{sellerHistory.stats.byStatus.active}</p>
                    <p className="text-xs text-muted-foreground">Active</p>
                  </div>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Cancelled: {sellerHistory.stats.byStatus.cancelled}</span>
                  <span>Expired: {sellerHistory.stats.byStatus.expired}</span>
                  <span>Total Bids: {sellerHistory.stats.totalBids}</span>
                </div>
              </div>

              <Separator />

              {/* Recent Listings */}
              <div className="space-y-2">
                <h4 className="font-medium">Recent Listings</h4>
                {sellerHistory.recentListings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No listings found</p>
                ) : (
                  <div className="space-y-2">
                    {sellerHistory.recentListings.slice(0, 10).map((listing) => (
                      <div
                        key={listing._id}
                        className="flex items-center justify-between py-2 border-b last:border-0"
                      >
                        <div>
                          <p className="font-medium text-sm">{listing.cardName}</p>
                          <p
                            className={`text-xs capitalize ${RARITY_COLORS[listing.cardRarity] ?? ""}`}
                          >
                            {listing.cardRarity}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-sm">{formatGold(listing.price)} gold</p>
                          <Badge
                            variant={
                              listing.status === "active"
                                ? "default"
                                : listing.status === "sold"
                                  ? "secondary"
                                  : "outline"
                            }
                            className="text-xs"
                          >
                            {listing.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Recent Bids */}
              <div className="space-y-2">
                <h4 className="font-medium">Recent Bids (as buyer)</h4>
                {sellerHistory.recentBids.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No bids found</p>
                ) : (
                  <div className="space-y-2">
                    {sellerHistory.recentBids.slice(0, 10).map((bid) => (
                      <div
                        key={bid._id}
                        className="flex items-center justify-between py-2 border-b last:border-0"
                      >
                        <div>
                          <p className="font-medium text-sm">{formatGold(bid.bidAmount)} gold</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(bid.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              bid.bidStatus === "active"
                                ? "default"
                                : bid.bidStatus === "won"
                                  ? "secondary"
                                  : bid.bidStatus === "refunded"
                                    ? "destructive"
                                    : "outline"
                            }
                          >
                            {bid.bidStatus}
                          </Badge>
                          {bid.bidStatus !== "refunded" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() =>
                                openRefundDialog(bid._id, bid.bidderUsername, bid.bidAmount)
                              }
                            >
                              Refund
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
