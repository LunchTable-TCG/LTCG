"use client";

/**
 * Asset Picker Dialog
 *
 * Modal dialog for browsing and selecting assets from Vercel Blob storage.
 * Integrates with the admin asset management system.
 */

import { useState, useCallback, useMemo } from "react";
import { useQuery } from "convex/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Image, Loader2, Check, X } from "lucide-react";
import { apiAny } from "@/lib/convexHelpers";
import { cn } from "@/lib/utils";
import type { AssetCategory, Asset } from "../types";
import { isValidAssetCategory } from "../types";

interface AssetPickerDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog should close */
  onOpenChange: (open: boolean) => void;
  /** Callback when an asset is selected */
  onSelect: (asset: { url: string; id: string; name: string }) => void;
  /** Optional title override */
  title?: string;
  /** Filter to specific categories */
  allowedCategories?: AssetCategory[];
}

const CATEGORY_LABELS: Record<AssetCategory, string> = {
  all: "All Categories",
  profile_picture: "Profile Pictures",
  card_image: "Card Images",
  document: "Documents",
  other: "Other",
  background: "Backgrounds",
  texture: "Textures",
  ui_element: "UI Elements",
  shop_asset: "Shop Assets",
  story_asset: "Story Assets",
  logo: "Logos",
};

export function AssetPickerDialog({
  open,
  onOpenChange,
  onSelect,
  title = "Select Asset",
  allowedCategories,
}: AssetPickerDialogProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<AssetCategory>("all");
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // Query assets from Convex
  const queryArgs = useMemo(() => {
    const args: { category?: string; search?: string; limit: number } = {
      limit: 50,
    };
    if (category !== "all") {
      args.category = category;
    }
    if (search.trim()) {
      args.search = search.trim();
    }
    return args;
  }, [category, search]);

  const assetsResult = useQuery(apiAny.admin.assets.listAssets, queryArgs);

  const isLoading = assetsResult === undefined;
  const assets = assetsResult?.assets ?? [];

  // Filter by allowed categories if specified
  const filteredAssets = useMemo(() => {
    if (!allowedCategories || allowedCategories.includes("all")) {
      return assets;
    }
    return assets.filter((asset: Asset) =>
      isValidAssetCategory(asset.category) && allowedCategories.includes(asset.category)
    );
  }, [assets, allowedCategories]);

  // Available categories for filter
  const availableCategories = useMemo(() => {
    if (allowedCategories) {
      return allowedCategories;
    }
    return Object.keys(CATEGORY_LABELS) as AssetCategory[];
  }, [allowedCategories]);

  const handleSelect = useCallback(() => {
    if (selectedAsset) {
      onSelect({
        url: selectedAsset.blobUrl,
        id: selectedAsset._id,
        name: selectedAsset.fileName,
      });
      onOpenChange(false);
      setSelectedAsset(null);
    }
  }, [selectedAsset, onSelect, onOpenChange]);

  const handleCancel = useCallback(() => {
    onOpenChange(false);
    setSelectedAsset(null);
  }, [onOpenChange]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <Label htmlFor="search" className="sr-only">
              Search
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search assets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="w-48">
            <Label htmlFor="category" className="sr-only">
              Category
            </Label>
            <Select value={category} onValueChange={(v) => isValidAssetCategory(v) && setCategory(v)}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {availableCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Asset Grid */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <Image className="h-12 w-12 mb-2 opacity-50" />
              <p>No assets found</p>
              <p className="text-sm">Try adjusting your search or category filter</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 py-2">
              {filteredAssets.map((asset: Asset) => (
                <button
                  key={asset._id}
                  type="button"
                  onClick={() => setSelectedAsset(asset)}
                  className={cn(
                    "group relative aspect-square rounded-lg overflow-hidden border-2 transition-all",
                    selectedAsset?._id === asset._id
                      ? "border-primary ring-2 ring-primary/50"
                      : "border-transparent hover:border-muted-foreground/50"
                  )}
                >
                  {/* Image preview */}
                  {asset.contentType.startsWith("image/") ? (
                    <img
                      src={asset.blobUrl}
                      alt={asset.fileName}
                      className="w-full h-full object-cover bg-muted"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Image className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}

                  {/* Selection indicator */}
                  {selectedAsset?._id === asset._id && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <div className="bg-primary text-primary-foreground rounded-full p-1">
                        <Check className="h-4 w-4" />
                      </div>
                    </div>
                  )}

                  {/* Hover overlay with filename */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-xs text-white truncate">{asset.fileName}</p>
                    <p className="text-xs text-white/70">{formatFileSize(asset.size)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Selected asset preview */}
        {selectedAsset && (
          <div className="border-t pt-4 flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
              {selectedAsset.contentType.startsWith("image/") ? (
                <img
                  src={selectedAsset.blobUrl}
                  alt={selectedAsset.fileName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Image className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{selectedAsset.fileName}</p>
              <p className="text-sm text-muted-foreground">
                {isValidAssetCategory(selectedAsset.category)
                  ? CATEGORY_LABELS[selectedAsset.category]
                  : selectedAsset.category} •{" "}
                {formatFileSize(selectedAsset.size)}
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSelect} disabled={!selectedAsset}>
            <Check className="h-4 w-4 mr-2" />
            Select
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
