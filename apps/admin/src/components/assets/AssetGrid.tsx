/**
 * AssetGrid Component
 *
 * Displays a grid of assets with loading and empty states.
 */

"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { AssetCard } from "./AssetCard";
import type { Asset } from "./types";

interface AssetGridProps {
  assets: Asset[] | undefined;
  isLoading: boolean;
  onSelect: (asset: Asset) => void;
  onDelete: (asset: Asset) => void;
  onCopyUrl: (asset: Asset) => void;
}

export function AssetGrid({ assets, isLoading, onSelect, onDelete, onCopyUrl }: AssetGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-square w-full rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (!assets || assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
        <div className="text-4xl">📁</div>
        <h3 className="mt-4 text-lg font-medium">No assets found</h3>
        <p className="mt-1 text-sm text-muted-foreground">Upload your first asset to get started</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {assets.map((asset) => (
        <AssetCard
          key={asset._id}
          asset={asset}
          onSelect={onSelect}
          onDelete={onDelete}
          onCopyUrl={onCopyUrl}
        />
      ))}
    </div>
  );
}
