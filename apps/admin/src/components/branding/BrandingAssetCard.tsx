"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FileIcon, ImageIcon, Music2Icon, VideoIcon, FileTextIcon } from "lucide-react";
import type { BrandingAssetCardProps } from "./types";

function getFileIcon(contentType?: string) {
  if (!contentType) return FileIcon;
  if (contentType.startsWith("image/")) return ImageIcon;
  if (contentType.startsWith("video/")) return VideoIcon;
  if (contentType.startsWith("audio/")) return Music2Icon;
  if (contentType.includes("pdf")) return FileTextIcon;
  return FileIcon;
}

export function BrandingAssetCard({ asset, onClick, onContextMenu }: BrandingAssetCardProps) {
  const contentType = asset.fileMetadata?.contentType;
  const isImage = contentType?.startsWith("image/");
  const FileTypeIcon = getFileIcon(contentType);

  return (
    <Card
      className={cn(
        "group cursor-pointer overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all"
      )}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      {/* Preview */}
      <div className="aspect-square bg-muted relative">
        {isImage && asset.fileMetadata?.blobUrl ? (
          <img
            src={asset.fileMetadata.blobUrl}
            alt={asset.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FileTypeIcon className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
        {/* Overlay with tags */}
        {asset.tags.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
            <div className="flex flex-wrap gap-1">
              {asset.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs px-1 py-0">
                  {tag}
                </Badge>
              ))}
              {asset.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs px-1 py-0">
                  +{asset.tags.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>
      {/* Info */}
      <div className="p-3">
        <p className="font-medium text-sm truncate">{asset.name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {asset.fileMetadata?.fileName}
        </p>
      </div>
    </Card>
  );
}
