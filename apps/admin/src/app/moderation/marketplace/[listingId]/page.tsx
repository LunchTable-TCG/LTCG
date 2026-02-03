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
import { formatDistanceToNow, format } from "date-fns";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

type ListingStatus = "active" | "sold" | "cancelled" | "expired";

const STATUS_BADGES: Record<ListingStatus, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
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

  const listing = useConvexQuery(
    apiAny.admin.marketplace.getListing,
    isAdmin ? { listingId } : "skip"
  );

  const suspendListing = useConvexMutation(apiAny.admin.marketplace.suspendListing);
  const suspendSellerListings = useConvexMutation(apiAny.admin.marketplace.suspendSellerListings);

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
      setSuspendDialogOpen(false);
      router.push("/moderation/marketplace");
    } catch (error) {
      console.error("Failed to suspend listing:", error);
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
      setSuspendDialogOpen(false);
      router.push("/moderation/marketplace");
    } catch (error) {
      console.error("Failed to suspend seller listings:", error);
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

  const priceDeviation = listing.priceStats.avgActivePrice > 0
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
          <Badge variant={STATUS_BADGES[listing.status as ListingStatus].variant} className="text-lg px-4 py-1">
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
                        listing.seller.accountStatus === "active"
                          ? "default"
                          : "destructive"
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
                  <p className="font-medium text-lg">
                    {formatGold(listing.price)} gold
                  </p>
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
                      <p className="font-medium">
                        {listing.highestBidderUsername ?? "N/A"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Ends At</Label>
                      <p className="font-medium">
                        {listing.endsAt
                          ? format(new Date(listing.endsAt), "PPpp")
                          : "N/A"}
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
                        {listing.soldAt
                          ? format(new Date(listing.soldAt), "PPpp")
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </>
              )}

              <Separator />

              <div>
                <Label className="text-muted-foreground">Listed</Label>
                <p className="font-medium">
                  {format(new Date(listing._creationTime), "PPpp")}
                </p>
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
                    {formatGold(listing.priceStats.minActivePrice)} - {formatGold(listing.priceStats.maxActivePrice)}
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
                    {listing.priceStats.recentSales} at avg {formatGold(listing.priceStats.avgSalePrice)}
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
                <CardDescription>
                  {listing.bids.length} bids on this listing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bidder</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {listing.bids.map((bid: {
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          {listing.status === "active" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
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
              </CardContent>
            </Card>
          )}

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
                        listing.seller.accountStatus === "active"
                          ? "default"
                          : "destructive"
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
                  <Link href={`/players/${listing.seller._id}`}>
                    View Seller Profile
                  </Link>
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
              Suspend This Listing
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
    </div>
  );
}
