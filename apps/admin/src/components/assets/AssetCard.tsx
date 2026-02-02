/**
 * AssetCard Component
 *
 * Displays a single asset with thumbnail, name, and category badge.
 */

"use client";

import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CopyIcon, FileIcon, MoreVerticalIcon, TrashIcon } from "lucide-react";
import { CategoryBadge } from "./CategoryBadge";
import type { Asset } from "./types";

interface AssetCardProps {
  asset: Asset;
  onSelect: (asset: Asset) => void;
  onDelete: (asset: Asset) => void;
  onCopyUrl: (asset: Asset) => void;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageType(contentType: string) {
  return contentType.startsWith("image/");
}

function isVideoType(contentType: string) {
  return contentType.startsWith("video/");
}

export function AssetCard({ asset, onSelect, onDelete, onCopyUrl }: AssetCardProps) {
  const imageUrl = asset.blobUrl || "";
  const canPreview = isImageType(asset.contentType) || isVideoType(asset.contentType);

  return (
    <Card
      className="group relative cursor-pointer overflow-hidden transition-all hover:ring-2 hover:ring-primary/50"
      onClick={() => onSelect(asset)}
    >
      {/* Thumbnail */}
      <div className="relative aspect-square bg-muted">
        {canPreview && imageUrl ? (
          isImageType(asset.contentType) ? (
            <img
              src={imageUrl}
              alt={asset.fileName}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <video
              src={imageUrl}
              className="h-full w-full object-cover"
              muted
              preload="metadata"
            />
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <FileIcon className="h-12 w-12 text-muted-foreground" />
          </div>
        )}

        {/* Quick actions overlay */}
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            className="rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/30"
            onClick={(e) => {
              e.stopPropagation();
              onCopyUrl(asset);
            }}
            title="Copy URL"
          >
            <CopyIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded-full bg-red-500/20 p-2 text-red-400 transition-colors hover:bg-red-500/30"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(asset);
            }}
            title="Delete"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="space-y-1 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-medium" title={asset.fileName}>
            {asset.fileName}
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="shrink-0 rounded p-1 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVerticalIcon className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onCopyUrl(asset);
                }}
              >
                <CopyIcon className="mr-2 h-4 w-4" />
                Copy URL
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(asset);
                }}
              >
                <TrashIcon className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center justify-between gap-2">
          <CategoryBadge category={asset.category} />
          <span className="text-xs text-muted-foreground">
            {formatFileSize(asset.size)}
          </span>
        </div>
      </div>
    </Card>
  );
}
