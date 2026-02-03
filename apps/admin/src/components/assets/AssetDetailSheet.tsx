/**
 * AssetDetailSheet Component
 *
 * Side panel showing full asset details with edit and delete options.
 */

"use client";

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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  FileIcon,
  Loader2Icon,
  TrashIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CategoryBadge } from "./CategoryBadge";
import { ASSET_CATEGORIES, type Asset, type AssetCategory } from "./types";

interface AssetDetailSheetProps {
  asset: Asset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (
    assetId: string,
    data: { category?: AssetCategory; description?: string }
  ) => Promise<void>;
  onDelete: (asset: Asset) => Promise<void>;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleString();
}

function isImageType(contentType: string) {
  return contentType.startsWith("image/");
}

function isVideoType(contentType: string) {
  return contentType.startsWith("video/");
}

export function AssetDetailSheet({
  asset,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
}: AssetDetailSheetProps) {
  const [category, setCategory] = useState<AssetCategory>("other");
  const [description, setDescription] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  // Reset form when asset changes
  useEffect(() => {
    if (asset) {
      setCategory(asset.category);
      setDescription(asset.description || "");
    }
  }, [asset]);

  const hasChanges =
    asset && (category !== asset.category || description !== (asset.description || ""));

  const handleCopyUrl = useCallback(() => {
    if (asset?.blobUrl) {
      navigator.clipboard.writeText(asset.blobUrl);
      setCopied(true);
      toast.success("URL copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  }, [asset?.blobUrl]);

  const handleUpdate = async () => {
    if (!asset || !hasChanges) return;

    setIsUpdating(true);
    try {
      await onUpdate(asset._id, {
        category: category !== asset.category ? category : undefined,
        description: description !== (asset.description || "") ? description : undefined,
      });
      toast.success("Asset updated");
    } catch (_error) {
      toast.error("Failed to update asset");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!asset) return;

    setIsDeleting(true);
    try {
      await onDelete(asset);
      setShowDeleteDialog(false);
      onOpenChange(false);
      toast.success("Asset deleted");
    } catch (_error) {
      toast.error("Failed to delete asset");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!asset) return null;

  const imageUrl = asset.blobUrl || "";
  const canPreview = isImageType(asset.contentType) || isVideoType(asset.contentType);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex w-full flex-col sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="truncate">{asset.fileName}</SheetTitle>
            <SheetDescription>Uploaded {formatDate(asset.uploadedAt)}</SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-6 overflow-y-auto py-4">
            {/* Preview */}
            <div className="overflow-hidden rounded-lg bg-muted">
              {canPreview && imageUrl ? (
                isImageType(asset.contentType) ? (
                  <img
                    src={imageUrl}
                    alt={asset.fileName}
                    className="max-h-64 w-full object-contain"
                  />
                ) : (
                  <video src={imageUrl} className="max-h-64 w-full" controls preload="metadata" />
                )
              ) : (
                <div className="flex h-32 items-center justify-center">
                  <FileIcon className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Size</span>
                <span>{formatFileSize(asset.size)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span>{asset.contentType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category</span>
                <CategoryBadge category={asset.category} />
              </div>
              {asset.blobPathname && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Path</span>
                  <code className="max-w-[200px] truncate rounded bg-muted px-1 text-xs">
                    {asset.blobPathname}
                  </code>
                </div>
              )}
            </div>

            {/* URL section */}
            {asset.blobUrl && (
              <div className="space-y-2">
                <Label>Blob URL</Label>
                <div className="flex gap-2">
                  <Input value={asset.blobUrl} readOnly className="flex-1 font-mono text-xs" />
                  <Button variant="outline" size="icon" onClick={handleCopyUrl}>
                    {copied ? (
                      <CheckIcon className="h-4 w-4 text-green-500" />
                    ) : (
                      <CopyIcon className="h-4 w-4" />
                    )}
                  </Button>
                  <Button variant="outline" size="icon" asChild>
                    <a href={asset.blobUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLinkIcon className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            )}

            {/* Edit section */}
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium">Edit Asset</h4>

              <div className="space-y-2">
                <Label htmlFor="edit-category">Category</Label>
                <Select
                  value={category}
                  onValueChange={(value) => setCategory(value as AssetCategory)}
                >
                  <SelectTrigger id="edit-category" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  placeholder="Add notes about this asset..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </div>

          <SheetFooter className="flex-row gap-2 border-t pt-4">
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isUpdating || isDeleting}
            >
              <TrashIcon className="mr-2 h-4 w-4" />
              Delete
            </Button>
            <div className="flex-1" />
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={!hasChanges || isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Asset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{asset.fileName}&quot;? This will remove the
              file from Vercel Blob storage. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
    </>
  );
}
