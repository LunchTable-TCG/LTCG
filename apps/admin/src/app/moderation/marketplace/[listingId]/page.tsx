"use client";

/**
 * Marketplace Listing Detail Page
 *
 * View listing details, price analysis, and take moderation actions.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAdmin } from "@/contexts/AdminContext";
import { apiAny, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import { format, formatDistanceToNow } from "date-fns";
import { DollarSign, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type ListingStatus = "active" | "sold" | "cancelled" | "expired";

const STATUS_BADGES: Record<
  ListingStatus,
  { variant: "default" | "secondary" | "destructive" | "outline"; label: string }
> = {
  active: { variant: "default", label: "Active" },
  sold: { variant: "secondary", label: "Sold" },
  cancelled: { variant: "destructive", label: "Cancelled" },
  expired: { variant: "outline", label: "Expired" },
};

const RARITY_COLORS: Record<string, string> = {
  common: "text-gray-500",
  uncommon: "text-green-500",
  rare: "text-blue-500",
  epic: "text-purple-500",
  legendary: "text-orange-500",
};

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAdmin } = useAdmin();
  const listingId = params.listingId as string;

  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refund bid dialog state
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundBidId, setRefundBidId] = useState<string | null>(null);
  const [refundBidInfo, setRefundBidInfo] = useState<{ username: string; amount: number } | null>(
    null
  );
  const [refundReason, setRefundReason] = useState("");

  // Price cap dialog state
  const [priceCapDialogOpen, setPriceCapDialogOpen] = useState(false);
  const [priceCapAmount, setPriceCapAmount] = useState<string>("");
  const [priceCapReason, setPriceCapReason] = useState("");

  const listing = useConvexQuery(
    apiAny.admin.marketplace.getListing,
    isAdmin ? { listingId } : "skip"
  );

  const suspendListing = useConvexMutation(apiAny.admin.marketplace.suspendListing);
  const suspendSellerListings = useConvexMutation(apiAny.admin.marketplace.suspendSellerListings);
  const refundBid = useConvexMutation(apiAny.admin.marketplace.refundBid);
  const setPriceCap = useConvexMutation(apiAny.admin.marketplace.setPriceCap);

  const formatGold = (amount: number) => {
    return amount.toLocaleString();
  };

  const handleSuspend = async () => {
    if (!suspendReason) return;

    setIsSubmitting(true);
    try {
      await suspendListing({
        listingId,
        reason: suspendReason,
      });
      toast.success("Listing suspended successfully");
      setSuspendDialogOpen(false);
      router.push("/moderation/marketplace");
    } catch (error) {
      console.error("Failed to suspend listing:", error);
      toast.error(error instanceof Error ? error.message : "Failed to suspend listing");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuspendAllSellerListings = async () => {
    if (!listing?.seller || !suspendReason) return;

    setIsSubmitting(true);
    try {
      await suspendSellerListings({
        sellerId: listing.seller._id,
        reason: suspendReason,
      });
      toast.success("All seller listings suspended");
      setSuspendDialogOpen(false);
      router.push("/moderation/marketplace");
    } catch (error) {
      console.error("Failed to suspend seller listings:", error);
      toast.error(error instanceof Error ? error.message : "Failed to suspend seller listings");
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

  const handleSetPriceCap = async () => {
    if (!listing?.cardDefinitionId || !priceCapAmount || !priceCapReason) return;

    const maxPrice = Number.parseInt(priceCapAmount, 10);
    if (Number.isNaN(maxPrice) || maxPrice <= 0) {
      toast.error("Please enter a valid price cap amount");
      return;
    }

    setIsSubmitting(true);
    try {
      await setPriceCap({
        cardDefinitionId: listing.cardDefinitionId,
        maxPrice,
        reason: priceCapReason,
      });
      toast.success(
        `Price cap of ${formatGold(maxPrice)} set for ${listing.card?.name || "this card"}`
      );
      setPriceCapDialogOpen(false);
      setPriceCapAmount("");
      setPriceCapReason("");
    } catch (error) {
      console.error("Failed to set price cap:", error);
      toast.error(error instanceof Error ? error.message : "Failed to set price cap");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Access denied</p>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const priceDeviation =
    listing.priceStats.avgActivePrice > 0
      ? Math.round((listing.price / listing.priceStats.avgActivePrice) * 100) / 100
      : 0;

  const isAnomalous = priceDeviation >= 3;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/moderation/marketplace"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back to Marketplace
            </Link>
          </div>
          <h1 className="text-3xl font-bold">Listing Details</h1>
          <p className="text-muted-foreground">
            {listing.card?.name ?? "Unknown Card"} by {listing.sellerUsername}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={STATUS_BADGES[listing.status as ListingStatus].variant}
            className="text-lg px-4 py-1"
          >
            {STATUS_BADGES[listing.status as ListingStatus].label}
          </Badge>
          {isAnomalous && (
            <Badge variant="destructive" className="text-lg px-4 py-1">
              Price Anomaly
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Listing Info */}
          <Card>
            <CardHeader>
              <CardTitle>Listing Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground">Card</Label>
                  <p className="font-medium">{listing.card?.name ?? "Unknown"}</p>
                  {listing.card && (
                    <p className={`text-sm capitalize ${RARITY_COLORS[listing.card.rarity] ?? ""}`}>
                      {listing.card.rarity} • {listing.card.archetype}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-muted-foreground">Seller</Label>
                  <p className="font-medium">
                    {listing.seller ? (
                      <Link
                        href={`/players/${listing.seller._id}`}
                        className="text-primary hover:underline"
                      >
                        {listing.seller.username}
                      </Link>
                    ) : (
                      listing.sellerUsername
                    )}
                  </p>
                  {listing.seller && (
                    <Badge
                      variant={
                        listing.seller.accountStatus === "active" ? "default" : "destructive"
                      }
                      className="mt-1"
                    >
                      {listing.seller.accountStatus}
                    </Badge>
                  )}
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label className="text-muted-foreground">Listing Type</Label>
                  <p className="font-medium capitalize">{listing.listingType}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Quantity</Label>
                  <p className="font-medium">{listing.quantity}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Price</Label>
                  <p className="font-medium text-lg">{formatGold(listing.price)} gold</p>
                </div>
              </div>

              {listing.listingType === "auction" && (
                <>
                  <Separator />
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <Label className="text-muted-foreground">Current Bid</Label>
                      <p className="font-medium">
                        {listing.currentBid ? `${formatGold(listing.currentBid)} gold` : "No bids"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Highest Bidder</Label>
                      <p className="font-medium">{listing.highestBidderUsername ?? "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Ends At</Label>
                      <p className="font-medium">
                        {listing.endsAt ? format(new Date(listing.endsAt), "PPpp") : "N/A"}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {listing.status === "sold" && (
                <>
                  <Separator />
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label className="text-muted-foreground">Sold For</Label>
                      <p className="font-medium text-green-500">
                        {listing.soldFor ? `${formatGold(listing.soldFor)} gold` : "N/A"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Sold At</Label>
                      <p className="font-medium">
                        {listing.soldAt ? format(new Date(listing.soldAt), "PPpp") : "N/A"}
                      </p>
                    </div>
                  </div>
                </>
              )}

              <Separator />

              <div>
                <Label className="text-muted-foreground">Listed</Label>
                <p className="font-medium">{format(new Date(listing._creationTime), "PPpp")}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(listing._creationTime), { addSuffix: true })}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Price Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Price Analysis</CardTitle>
              <CardDescription>
                Comparison with other listings for {listing.card?.name ?? "this card"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">This Listing</p>
                  <p className={`text-2xl font-bold ${isAnomalous ? "text-red-500" : ""}`}>
                    {formatGold(listing.price)}
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Avg Active Price</p>
                  <p className="text-2xl font-bold">
                    {formatGold(listing.priceStats.avgActivePrice)}
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Price Range</p>
                  <p className="text-xl font-bold">
                    {formatGold(listing.priceStats.minActivePrice)} -{" "}
                    {formatGold(listing.priceStats.maxActivePrice)}
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Deviation</p>
                  <p className={`text-2xl font-bold ${isAnomalous ? "text-red-500" : ""}`}>
                    {priceDeviation}x
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Active Listings</p>
                  <p className="text-xl font-medium">{listing.priceStats.activeListings}</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Recent Sales</p>
                  <p className="text-xl font-medium">
                    {listing.priceStats.recentSales} at avg{" "}
                    {formatGold(listing.priceStats.avgSalePrice)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bid History */}
          {listing.bids && listing.bids.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Bid History</CardTitle>
                <CardDescription>{listing.bids.length} bids on this listing</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bidder</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {listing.bids.map(
                      (bid: {
                        _id: string;
                        bidderId: string;
                        bidderUsername: string;
                        bidAmount: number;
                        bidStatus: string;
                        createdAt: number;
                      }) => (
                        <TableRow key={bid._id}>
                          <TableCell>
                            <Link
                              href={`/players/${bid.bidderId}`}
                              className="text-primary hover:underline"
                            >
                              {bid.bidderUsername}
                            </Link>
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatGold(bid.bidAmount)} gold
                          </TableCell>
                          <TableCell>
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
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDistanceToNow(new Date(bid.createdAt), {
                              addSuffix: true,
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            {bid.bidStatus !== "refunded" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  openRefundDialog(bid._id, bid.bidderUsername, bid.bidAmount)
                                }
                              >
                                <RefreshCw className="mr-1 h-3 w-3" />
                                Refund
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {listing.status === "active" && (
                <>
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => setSuspendDialogOpen(true)}
                  >
                    Suspend Listing
                  </Button>
                  {listing.seller && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setSuspendDialogOpen(true)}
                    >
                      Suspend All Seller Listings
                    </Button>
                  )}
                </>
              )}
              {listing.card && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setPriceCapAmount(String(Math.round(listing.priceStats.avgActivePrice * 2)));
                    setPriceCapDialogOpen(true);
                  }}
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  Set Price Cap
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Seller Info */}
          {listing.seller && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Seller Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-muted-foreground text-xs">Username</Label>
                  <p className="font-medium">{listing.seller.username}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Account Status</Label>
                  <p>
                    <Badge
                      variant={
                        listing.seller.accountStatus === "active" ? "default" : "destructive"
                      }
                    >
                      {listing.seller.accountStatus}
                    </Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Other Listings</Label>
                  <p className="font-medium">{listing.sellerOtherListings}</p>
                </div>
                <Separator />
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href={`/players/${listing.seller._id}`}>View Seller Profile</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Suspend Dialog */}
      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Listing</DialogTitle>
            <DialogDescription>
              Choose to suspend this listing or all listings from the seller.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Reason</Label>
              <Textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Reason for suspending..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setSuspendDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSuspend}
              disabled={!suspendReason || isSubmitting}
            >
              {isSubmitting ? "Suspending..." : "Suspend This Listing"}
            </Button>
            {listing.seller && (
              <Button
                variant="destructive"
                onClick={handleSuspendAllSellerListings}
                disabled={!suspendReason || isSubmitting}
              >
                Suspend All ({listing.sellerOtherListings + 1})
              </Button>
            )}
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

      {/* Price Cap Dialog */}
      <Dialog open={priceCapDialogOpen} onOpenChange={setPriceCapDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Price Cap</DialogTitle>
            <DialogDescription>
              Set a maximum price for {listing.card?.name || "this card"}. Listings above this price
              may be flagged or prevented.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-muted rounded-lg p-4 space-y-2 mb-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Card:</span>
              <span className="font-medium">{listing.card?.name || "Unknown"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Avg Price:</span>
              <span className="font-medium">
                {formatGold(listing.priceStats.avgActivePrice)} gold
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">This Listing:</span>
              <span className="font-medium text-yellow-500">{formatGold(listing.price)} gold</span>
            </div>
          </div>

          <div className="space-y-4">
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
              <p className="text-xs text-muted-foreground mt-1">
                Suggested: {formatGold(Math.round(listing.priceStats.avgActivePrice * 2))} gold (2x
                average)
              </p>
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
                setPriceCapAmount("");
                setPriceCapReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSetPriceCap}
              disabled={!priceCapAmount || !priceCapReason || isSubmitting}
            >
              {isSubmitting ? "Setting..." : "Set Price Cap"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
