/**
 * Assets Management Page
 *
 * Upload, browse, and manage Vercel Blob assets.
 */

"use client";

import {
  ASSET_CATEGORIES,
  type Asset,
  type AssetCategory,
  AssetDetailSheet,
  AssetGrid,
  UploadDialog,
} from "@/components/assets";
import { StatCard, StatGrid } from "@/components/data";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RoleGuard } from "@/contexts/AdminContext";
import {  useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import { Loader2Icon, SearchIcon, UploadIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface BlobAsset {
  url: string;
  pathname: string;
  size: number;
  uploadedAt: string;
}

// Web app URL for API calls
const WEB_APP_URL = process.env["NEXT_PUBLIC_WEB_APP_URL"] || "http://localhost:3000";

export default function AssetsPage() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [deleteConfirmAsset, setDeleteConfirmAsset] = useState<Asset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<AssetCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Convex queries and mutations
  const assetsResult = useConvexQuery(api.admin.assets.listAssets, {
    category: categoryFilter === "all" ? undefined : categoryFilter,
    search: searchQuery || undefined,
    limit: 100,
  });

  const statsResult = useConvexQuery(api.admin.assets.getAssetStats, {});

  const saveAssetMetadata = useConvexMutation(api.admin.assets.saveAssetMetadata);
  const updateAsset = useConvexMutation(api.admin.assets.updateAsset);
  const deleteAssetMetadata = useConvexMutation(api.admin.assets.deleteAssetMetadata);
  const syncBlobAssets = useConvexMutation(api.admin.assets.syncBlobAssets);

  // Auto-sync on mount - only run once
  const hasSynced = useRef(false);

  useEffect(() => {
    if (hasSynced.current) return;
    hasSynced.current = true;

    const syncFromBlob = async () => {
      try {
        // Fetch all blobs from Vercel
        const response = await fetch(`${WEB_APP_URL}/api/admin/upload`, {
          method: "GET",
        });

        if (!response.ok) {
          console.error("Failed to fetch blobs from storage");
          return;
        }

        const data = await response.json();
        const blobs: BlobAsset[] = data.blobs || [];

        if (blobs.length === 0) return;

        // Sync to Convex (silently)
        const result = await syncBlobAssets({ blobs });

        // Only show toast if new assets were synced
        if (result.synced > 0) {
          toast.success(`Synced ${result.synced} new assets from blob storage`);
        }
      } catch (error) {
        console.error("Auto-sync error:", error);
      }
    };

    syncFromBlob();
  }, [syncBlobAssets]);

  // Handlers
  const handleUploadComplete = useCallback(
    async (result: {
      blobUrl: string;
      blobPathname: string;
      fileName: string;
      contentType: string;
      size: number;
      category: AssetCategory;
      description: string;
    }) => {
      await saveAssetMetadata({
        fileName: result.fileName,
        contentType: result.contentType,
        size: result.size,
        category: result.category,
        description: result.description || undefined,
        blobUrl: result.blobUrl,
        blobPathname: result.blobPathname,
      });
    },
    [saveAssetMetadata]
  );

  const handleSelectAsset = useCallback((asset: Asset) => {
    setSelectedAsset(asset);
    setDetailSheetOpen(true);
  }, []);

  const handleCopyUrl = useCallback((asset: Asset) => {
    if (asset.blobUrl) {
      navigator.clipboard.writeText(asset.blobUrl);
      toast.success("URL copied to clipboard");
    }
  }, []);

  const handleUpdateAsset = useCallback(
    async (assetId: string, data: { category?: AssetCategory; description?: string }) => {
      await updateAsset({
        assetId,
        category: data.category,
        description: data.description,
      });
    },
    [updateAsset]
  );

  const handleDeleteAsset = useCallback(async (asset: Asset) => {
    setDeleteConfirmAsset(asset);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteConfirmAsset) return;

    setIsDeleting(true);
    try {
      // Delete from Vercel Blob first
      if (deleteConfirmAsset.blobUrl) {
        const response = await fetch(`${WEB_APP_URL}/api/admin/upload`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: deleteConfirmAsset.blobUrl }),
        });

        if (!response.ok) {
          throw new Error("Failed to delete from blob storage");
        }
      }

      // Then delete metadata from Convex
      await deleteAssetMetadata({ assetId: deleteConfirmAsset._id });

      toast.success("Asset deleted");
      setDeleteConfirmAsset(null);
      setDetailSheetOpen(false);
      setSelectedAsset(null);
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete asset");
    } finally {
      setIsDeleting(false);
    }
  }, [deleteConfirmAsset, deleteAssetMetadata]);

  const handleDeleteFromSheet = useCallback(
    async (asset: Asset) => {
      // Actually delete the asset (sheet already has its own confirmation dialog)
      // Delete from Vercel Blob first
      if (asset.blobUrl) {
        const response = await fetch(`${WEB_APP_URL}/api/admin/upload`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: asset.blobUrl }),
        });

        if (!response.ok) {
          throw new Error("Failed to delete from blob storage");
        }
      }

      // Then delete metadata from Convex
      await deleteAssetMetadata({ assetId: asset._id });

      // Clear selection
      setSelectedAsset(null);
    },
    [deleteAssetMetadata]
  );

  // Format total size
  const formatTotalSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <RoleGuard minRole="admin">
      <PageWrapper
        title="Assets"
        description="Upload and manage Vercel Blob assets"
        actions={
          <Button onClick={() => setUploadDialogOpen(true)}>
            <UploadIcon className="mr-2 h-4 w-4" />
            Upload
          </Button>
        }
      >
        {/* Stats */}
        <StatGrid columns={3}>
          <StatCard
            title="Total Assets"
            value={statsResult?.totalAssets ?? 0}
            isLoading={!statsResult}
          />
          <StatCard
            title="Total Size"
            value={statsResult ? formatTotalSize(statsResult.totalSize) : "-"}
            isLoading={!statsResult}
          />
          <StatCard
            title="Categories"
            value={statsResult?.categoryCounts?.length ?? 0}
            isLoading={!statsResult}
          />
        </StatGrid>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Select
            value={categoryFilter}
            onValueChange={(value) => setCategoryFilter(value as AssetCategory | "all")}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {ASSET_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by filename..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="text-sm text-muted-foreground">
            {assetsResult?.totalCount ?? 0} assets
          </div>
        </div>

        {/* Asset grid */}
        <AssetGrid
          assets={assetsResult?.assets as Asset[] | undefined}
          isLoading={!assetsResult}
          onSelect={handleSelectAsset}
          onDelete={handleDeleteAsset}
          onCopyUrl={handleCopyUrl}
        />

        {/* Upload dialog */}
        <UploadDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          onUploadComplete={handleUploadComplete}
          webAppUrl={WEB_APP_URL}
        />

        {/* Detail sheet */}
        <AssetDetailSheet
          asset={selectedAsset}
          open={detailSheetOpen}
          onOpenChange={setDetailSheetOpen}
          onUpdate={handleUpdateAsset}
          onDelete={handleDeleteFromSheet}
        />

        {/* Delete confirmation dialog */}
        <AlertDialog
          open={!!deleteConfirmAsset}
          onOpenChange={(open) => !open && setDeleteConfirmAsset(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Asset</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{deleteConfirmAsset?.fileName}&quot;? This
                will remove the file from Vercel Blob storage. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={isDeleting}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <>
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageWrapper>
    </RoleGuard>
  );
}
