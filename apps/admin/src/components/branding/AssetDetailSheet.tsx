"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  CopyIcon,
  DownloadIcon,
  FileIcon,
  ImageIcon,
  Loader2Icon,
  Music2Icon,
  Trash2Icon,
  VideoIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { AssetDetailSheetProps, BrandingAsset } from "./types";
import { USAGE_CONTEXTS } from "./types";

function getFileIcon(contentType?: string) {
  if (!contentType) return FileIcon;
  if (contentType.startsWith("image/")) return ImageIcon;
  if (contentType.startsWith("video/")) return VideoIcon;
  if (contentType.startsWith("audio/")) return Music2Icon;
  return FileIcon;
}

export function AssetDetailSheet({
  asset,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onMove: _onMove,
  allTags,
}: AssetDetailSheetProps) {
  const [name, setName] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [usageContext, setUsageContext] = useState<string[]>([]);
  const [aiDescription, setAiDescription] = useState("");
  const [newTag, setNewTag] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Reset state when asset changes
  useEffect(() => {
    if (asset) {
      setName(asset.name);
      setTags(asset.tags);
      setUsageContext(asset.usageContext);
      setAiDescription(asset.aiDescription);
      setHasChanges(false);
    }
  }, [asset?._id]);

  const handleSave = useCallback(async () => {
    if (!asset || !hasChanges) return;

    setIsSaving(true);
    try {
      const updates: Partial<BrandingAsset> = {};
      if (name !== asset.name) updates.name = name;
      if (JSON.stringify(tags) !== JSON.stringify(asset.tags)) updates.tags = tags;
      if (JSON.stringify(usageContext) !== JSON.stringify(asset.usageContext))
        updates.usageContext = usageContext;
      if (aiDescription !== asset.aiDescription)
        updates.aiDescription = aiDescription;

      await onSave(updates);
      setHasChanges(false);
      toast.success("Asset updated");
    } catch (error) {
      toast.error("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  }, [asset, name, tags, usageContext, aiDescription, hasChanges, onSave]);

  const handleDelete = async () => {
    if (!confirm("Delete this asset? This cannot be undone.")) return;

    setIsDeleting(true);
    try {
      await onDelete();
      toast.success("Asset deleted");
      onClose();
    } catch (error) {
      toast.error("Failed to delete asset");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddTag = (tag: string) => {
    if (!tag.trim()) return;
    const normalized = tag.trim().toLowerCase();
    if (!tags.includes(normalized)) {
      setTags([...tags, normalized]);
      setHasChanges(true);
    }
    setNewTag("");
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
    setHasChanges(true);
  };

  const handleToggleContext = (context: string) => {
    const updated = usageContext.includes(context)
      ? usageContext.filter((c) => c !== context)
      : [...usageContext, context];
    setUsageContext(updated);
    setHasChanges(true);
  };

  const handleCopyUrl = () => {
    if (asset?.fileMetadata?.blobUrl) {
      navigator.clipboard.writeText(asset.fileMetadata.blobUrl);
      toast.success("URL copied to clipboard");
    }
  };

  const handleDownload = () => {
    if (asset?.fileMetadata?.blobUrl) {
      window.open(asset.fileMetadata.blobUrl, "_blank");
    }
  };

  if (!asset) return null;

  const contentType = asset.fileMetadata?.contentType;
  const isImage = contentType?.startsWith("image/");
  const isVideo = contentType?.startsWith("video/");
  const isAudio = contentType?.startsWith("audio/");
  const FileTypeIcon = getFileIcon(contentType);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            Asset Details
            {hasChanges && (
              <Badge variant="outline" className="text-amber-600">
                Unsaved changes
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            Edit asset metadata and AI guidelines
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Preview */}
          <div className="rounded-lg bg-muted overflow-hidden">
            {isImage && asset.fileMetadata?.blobUrl ? (
              <img
                src={asset.fileMetadata.blobUrl}
                alt={asset.name}
                className="w-full max-h-64 object-contain"
              />
            ) : isVideo && asset.fileMetadata?.blobUrl ? (
              <video
                src={asset.fileMetadata.blobUrl}
                controls
                className="w-full max-h-64"
              />
            ) : isAudio && asset.fileMetadata?.blobUrl ? (
              <div className="p-8">
                <audio
                  src={asset.fileMetadata.blobUrl}
                  controls
                  className="w-full"
                />
              </div>
            ) : (
              <div className="p-8 flex flex-col items-center justify-center">
                <FileTypeIcon className="h-16 w-16 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* File info */}
          <div className="text-sm text-muted-foreground">
            <p>{asset.fileMetadata?.fileName}</p>
            <p>
              {asset.fileMetadata?.size
                ? `${(asset.fileMetadata.size / 1024).toFixed(1)} KB`
                : "Unknown size"}{" "}
              • {contentType || "Unknown type"}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyUrl}>
              <CopyIcon className="h-4 w-4 mr-1" />
              Copy URL
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <DownloadIcon className="h-4 w-4 mr-1" />
              Download
            </Button>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label>Display Name</Label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setHasChanges(true);
              }}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-1 mb-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 hover:text-destructive"
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag(newTag);
                  }
                }}
                list="tag-suggestions"
              />
              <datalist id="tag-suggestions">
                {allTags
                  .filter((t) => !tags.includes(t))
                  .map((t) => (
                    <option key={t} value={t} />
                  ))}
              </datalist>
              <Button
                variant="outline"
                onClick={() => handleAddTag(newTag)}
                disabled={!newTag.trim()}
              >
                Add
              </Button>
            </div>
          </div>

          {/* Usage Context */}
          <div className="space-y-2">
            <Label>Usage Context</Label>
            <div className="grid grid-cols-2 gap-2">
              {USAGE_CONTEXTS.map((ctx) => (
                <label
                  key={ctx.value}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <Checkbox
                    checked={usageContext.includes(ctx.value)}
                    onCheckedChange={() => handleToggleContext(ctx.value)}
                  />
                  {ctx.label}
                </label>
              ))}
            </div>
          </div>

          {/* AI Description */}
          <div className="space-y-2">
            <Label>AI Usage Guidelines</Label>
            <Textarea
              value={aiDescription}
              onChange={(e) => {
                setAiDescription(e.target.value);
                setHasChanges(true);
              }}
              placeholder="Describe when and how AI should use this asset..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              This description helps AI understand when and how to use this asset
              in generated content.
            </p>
          </div>

          {/* Save/Delete */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="flex-1"
            >
              {isSaving ? (
                <>
                  <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2Icon className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2Icon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
