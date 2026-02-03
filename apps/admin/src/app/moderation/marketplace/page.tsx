"use client";

/**
 * Marketplace Moderation Page
 *
 * Monitor and moderate marketplace listings, detect price anomalies.
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
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

export default function MarketplaceModerationPage() {
  const { isAdmin } = useAdmin();

  const [statusFilter, setStatusFilter] = useState<ListingStatus | "all">("active");
  const [search, setSearch] = useState("");
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [suspendListingId, setSuspendListingId] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState("");

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

  const stats = useConvexQuery(
    apiAny.admin.marketplace.getMarketplaceStats,
    isAdmin ? {} : "skip"
  );

  const anomalies = useConvexQuery(
    apiAny.admin.marketplace.getPriceAnomalies,
    isAdmin ? {} : "skip"
  );

  const suspendListing = useConvexMutation(apiAny.admin.marketplace.suspendListing);

  const handleSuspend = async () => {
    if (!suspendListingId || !suspendReason) return;

    try {
      await suspendListing({
        listingId: suspendListingId,
        reason: suspendReason,
      });
      setSuspendDialogOpen(false);
      setSuspendListingId(null);
      setSuspendReason("");
    } catch (error) {
      console.error("Failed to suspend listing:", error);
    }
  };

  const openSuspendDialog = (listingId: string) => {
    setSuspendListingId(listingId);
    setSuspendDialogOpen(true);
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

      <Tabs defaultValue="listings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="listings">All Listings</TabsTrigger>
          <TabsTrigger value="anomalies">
            Price Anomalies
            {anomalies && anomalies.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {anomalies.length}
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
                    {listings.listings.map((listing: {
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
                            <p className={`text-xs capitalize ${RARITY_COLORS[listing.cardRarity] ?? ""}`}>
                              {listing.cardRarity}
                              {listing.quantity > 1 && ` (x${listing.quantity})`}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/players/${listing.sellerId}`}
                            className="text-primary hover:underline"
                          >
                            {listing.sellerUsername}
                          </Link>
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
                                window.location.href = `/moderation/marketplace/${listing._id}`
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
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
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
                <div className="flex items-center justify-center h-32">
                  <p className="text-muted-foreground">No price anomalies detected</p>
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
                    {anomalies.map((anomaly: {
                      listingId: string;
                      cardName: string;
                      price: number;
                      avgPrice: number;
                      deviation: number;
                      sellerUsername: string;
                    }) => (
                      <TableRow key={anomaly.listingId}>
                        <TableCell className="font-medium">
                          {anomaly.cardName}
                        </TableCell>
                        <TableCell>{anomaly.sellerUsername}</TableCell>
                        <TableCell className="text-red-500 font-medium">
                          {formatGold(anomaly.price)} gold
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatGold(anomaly.avgPrice)} gold
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive">
                            {anomaly.deviation}x
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                window.location.href = `/moderation/marketplace/${anomaly.listingId}`
                              }
                            >
                              View
                            </Button>
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
              disabled={!suspendReason}
            >
              Suspend Listing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
