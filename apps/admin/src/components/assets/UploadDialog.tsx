/**
 * UploadDialog Component
 *
 * Modal for uploading files to Vercel Blob storage.
 * Supports drag-and-drop and file picker.
 */

"use client";

import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { upload } from "@vercel/blob/client";
import { Loader2Icon, UploadCloudIcon, XIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { ASSET_CATEGORIES, type AssetCategory } from "./types";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: (result: {
    blobUrl: string;
    blobPathname: string;
    fileName: string;
    contentType: string;
    size: number;
    category: AssetCategory;
    description: string;
  }) => Promise<void>;
  webAppUrl: string;
}

export function UploadDialog({
  open,
  onOpenChange,
  onUploadComplete,
  webAppUrl,
}: UploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<AssetCategory>("other");
  const [description, setDescription] = useState("");
  const [customPath, setCustomPath] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const resetForm = useCallback(() => {
    setFile(null);
    setCategory("other");
    setDescription("");
    setCustomPath("");
    setUploadProgress(0);
  }, []);

  const handleClose = useCallback(() => {
    if (!isUploading) {
      resetForm();
      onOpenChange(false);
    }
  }, [isUploading, onOpenChange, resetForm]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  }, []);

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Determine the pathname
      const pathname = customPath || file.name;

      // Upload directly to Vercel Blob via the web app API
      const blob = await upload(pathname, file, {
        access: "public",
        handleUploadUrl: `${webAppUrl}/api/admin/upload`,
        clientPayload: JSON.stringify({ category, description }),
        onUploadProgress: (progress) => {
          setUploadProgress(Math.round(progress.percentage));
        },
      });

      // Call the completion handler to save metadata
      await onUploadComplete({
        blobUrl: blob.url,
        blobPathname: blob.pathname,
        fileName: file.name,
        contentType: blob.contentType || file.type,
        size: file.size,
        category,
        description,
      });

      toast.success("Asset uploaded successfully");
      handleClose();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload asset");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Asset</DialogTitle>
          <DialogDescription>
            Upload a file to Vercel Blob storage. Images, videos, and documents are supported.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop zone */}
          <div
            className={cn(
              "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50",
              file && "border-green-500 bg-green-500/5"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {file ? (
              <div className="flex items-center gap-3">
                <div className="flex-1 truncate">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => setFile(null)}
                  disabled={isUploading}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <UploadCloudIcon className="mb-2 h-10 w-10 text-muted-foreground" />
                <p className="text-sm font-medium">Drop file here or click to browse</p>
                <p className="text-xs text-muted-foreground">
                  Max 50MB. Images, videos, and documents.
                </p>
              </>
            )}
            <input
              type="file"
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={handleFileChange}
              disabled={isUploading}
              accept="image/*,video/*,audio/*,.pdf"
            />
          </div>

          {/* Category select */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={category}
              onValueChange={(value) => setCategory(value as AssetCategory)}
              disabled={isUploading}
            >
              <SelectTrigger id="category" className="w-full">
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

          {/* Custom path */}
          <div className="space-y-2">
            <Label htmlFor="path">
              Custom Path <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="path"
              placeholder="e.g., backgrounds/hero.jpg"
              value={customPath}
              onChange={(e) => setCustomPath(e.target.value)}
              disabled={isUploading}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to use the original filename
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Add notes about this asset..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isUploading}
              rows={2}
            />
          </div>

          {/* Progress bar */}
          {isUploading && (
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!file || isUploading}>
            {isUploading ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              "Upload"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
