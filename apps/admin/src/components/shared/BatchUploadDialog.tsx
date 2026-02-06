"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { typedApi, useConvexMutation } from "@/lib/convexHelpers";
import type { Id } from "@convex/_generated/dataModel";
import { upload } from "@vercel/blob/client";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  FileIcon,
  ImageIcon,
  Loader2Icon,
  Music2Icon,
  UploadIcon,
  VideoIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

// =============================================================================
// Types
// =============================================================================

export interface BatchUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "assets" | "branding";
  onSuccess?: () => void;
  defaultCategory?: string;
  folderId?: Id<"brandingFolders">; // Only used in branding mode
}

type UploadStatus = "pending" | "uploading" | "success" | "error";

interface FileToUpload {
  id: string;
  file: File;
  displayName: string;
  category: string;
  description: string;
  tags: string[];
  // Branding mode only
  usageContexts: string[];
  aiGuidelines: string;
  // State
  preview?: string;
  status: UploadStatus;
  error?: string;
}

// =============================================================================
// Constants
// =============================================================================

const ASSET_CATEGORIES = [
  { value: "background", label: "Backgrounds" },
  { value: "card_image", label: "Cards" },
  { value: "ui_element", label: "Icons / UI" },
  { value: "texture", label: "Effects / Textures" },
  { value: "shop_asset", label: "Shop Assets" },
  { value: "story_asset", label: "Story Assets" },
  { value: "logo", label: "Logos" },
  { value: "other", label: "Other" },
] as const;

const USAGE_CONTEXTS = [
  { value: "newsletter", label: "Newsletter" },
  { value: "social", label: "Social Media" },
  { value: "print", label: "Print" },
  { value: "website", label: "Website" },
  { value: "email", label: "Email" },
  { value: "merch", label: "Merchandise" },
] as const;

// =============================================================================
// Helpers
// =============================================================================

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return ImageIcon;
  if (type.startsWith("video/")) return VideoIcon;
  if (type.startsWith("audio/")) return Music2Icon;
  return FileIcon;
}

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// =============================================================================
// Component
// =============================================================================

export function BatchUploadDialog({
  open,
  onOpenChange,
  mode,
  onSuccess,
  defaultCategory = "other",
  folderId,
}: BatchUploadDialogProps) {
  const [files, setFiles] = useState<FileToUpload[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentTagInputs, setCurrentTagInputs] = useState<Record<string, string>>({});
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Convex mutations
  const saveAssetMetadata = useConvexMutation(typedApi.admin.assets.saveAssetMetadata);
  const createBrandingAsset = useConvexMutation(typedApi.admin.branding.createAsset);

  // ---------------------------------------------------------------------------
  // File Selection
  // ---------------------------------------------------------------------------

  const processFiles = useCallback(
    (selectedFiles: File[]) => {
      const newFiles: FileToUpload[] = selectedFiles.map((file) => {
        const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;

        return {
          id: generateId(),
          file,
          displayName: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
          category: defaultCategory,
          description: "",
          tags: [],
          usageContexts: [],
          aiGuidelines: "",
          preview,
          status: "pending" as const,
        };
      });

      setFiles((prev) => [...prev, ...newFiles]);
    },
    [defaultCategory]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []);
      processFiles(selectedFiles);
      e.target.value = ""; // Reset input
    },
    [processFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const droppedFiles = Array.from(e.dataTransfer.files);
      processFiles(droppedFiles);
    },
    [processFiles]
  );

  // ---------------------------------------------------------------------------
  // File Updates
  // ---------------------------------------------------------------------------

  const handleRemoveFile = (id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
    setCurrentTagInputs((prev) => {
      const newInputs = { ...prev };
      delete newInputs[id];
      return newInputs;
    });
  };

  const handleUpdateFile = (id: string, updates: Partial<FileToUpload>) => {
    setFiles((prev) => prev.map((file) => (file.id === id ? { ...file, ...updates } : file)));
  };

  const handleAddTag = (id: string, tag: string) => {
    if (!tag.trim()) return;
    const normalizedTag = tag.trim().toLowerCase();
    const file = files.find((f) => f.id === id);
    if (!file) return;
    if (file.tags.includes(normalizedTag)) return;

    handleUpdateFile(id, {
      tags: [...file.tags, normalizedTag],
    });
    setCurrentTagInputs((prev) => ({ ...prev, [id]: "" }));
  };

  const handleRemoveTag = (id: string, tag: string) => {
    const file = files.find((f) => f.id === id);
    if (!file) return;
    handleUpdateFile(id, {
      tags: file.tags.filter((t) => t !== tag),
    });
  };

  const handleToggleUsageContext = (id: string, context: string) => {
    const file = files.find((f) => f.id === id);
    if (!file) return;
    const current = file.usageContexts;
    const updated = current.includes(context)
      ? current.filter((c) => c !== context)
      : [...current, context];
    handleUpdateFile(id, { usageContexts: updated });
  };

  // ---------------------------------------------------------------------------
  // Upload Logic
  // ---------------------------------------------------------------------------

  const handleUpload = async () => {
    if (files.length === 0) return;
    if (mode === "branding" && !folderId) {
      toast.error("No folder selected for branding assets");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    let completed = 0;
    const errors: string[] = [];

    for (const fileData of files) {
      // Mark as uploading
      handleUpdateFile(fileData.id, { status: "uploading" });

      try {
        // Upload to Vercel Blob (route lives on the web app, not admin app)
        const webAppUrl = process.env["NEXT_PUBLIC_WEB_APP_URL"] || "http://localhost:3000";
        const blob = await upload(fileData.file.name, fileData.file, {
          access: "public",
          handleUploadUrl: `${webAppUrl}/api/admin/upload`,
          clientPayload: JSON.stringify({
            category: mode === "branding" ? "branding" : fileData.category,
            description: fileData.description,
          }),
        });

        // Save file metadata to Convex
        const metadataResult = await saveAssetMetadata({
          fileName: fileData.file.name,
          contentType: fileData.file.type,
          size: fileData.file.size,
          blobUrl: blob.url,
          blobPathname: blob.pathname,
          category: mode === "branding" ? "other" : (fileData.category as "other"),
          description: fileData.description || undefined,
        });

        // For branding mode, create branding asset entry
        if (mode === "branding" && folderId) {
          await createBrandingAsset({
            folderId,
            fileMetadataId: metadataResult.assetId,
            name: fileData.displayName,
            tags: fileData.tags,
            usageContext: fileData.usageContexts,
            aiDescription: fileData.aiGuidelines || `Asset: ${fileData.displayName}`,
          });
        }

        // Mark as success
        handleUpdateFile(fileData.id, { status: "success" });
        completed++;
      } catch (error) {
        console.error("Upload error:", error);
        handleUpdateFile(fileData.id, {
          status: "error",
          error: error instanceof Error ? error.message : "Upload failed",
        });
        errors.push(fileData.displayName);
      }

      setUploadProgress(((completed + errors.length) / files.length) * 100);
    }

    setIsUploading(false);

    if (errors.length > 0) {
      toast.error(`Failed to upload: ${errors.join(", ")}`);
    }
    if (completed > 0) {
      toast.success(`Uploaded ${completed} asset${completed > 1 ? "s" : ""}`);
      onSuccess?.();
    }

    // If all succeeded, close dialog
    if (errors.length === 0) {
      handleClose();
    }
  };

  // ---------------------------------------------------------------------------
  // Dialog Management
  // ---------------------------------------------------------------------------

  const handleClose = () => {
    if (isUploading) return;

    // Cleanup previews
    files.forEach((f) => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
    setFiles([]);
    setCurrentTagInputs({});
    setUploadProgress(0);
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isUploading) {
      handleClose();
    } else if (newOpen) {
      onOpenChange(true);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const completedCount = files.filter((f) => f.status === "success").length;
  const errorCount = files.filter((f) => f.status === "error").length;
  const pendingCount = files.filter(
    (f) => f.status === "pending" || f.status === "uploading"
  ).length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{mode === "branding" ? "Upload Brand Assets" : "Upload Assets"}</DialogTitle>
          <DialogDescription>
            {mode === "branding"
              ? "Add brand assets to this folder. Configure metadata to help AI find and use them."
              : "Upload assets to the library. Add metadata for organization and searchability."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-4 space-y-4">
          {/* Drop Zone */}
          {files.length === 0 && (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <UploadIcon className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                Drag and drop files here, or click to select
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*,audio/*,application/pdf,.svg"
                onChange={handleFileSelect}
                className="hidden"
                id="batch-file-upload"
              />
              <Label htmlFor="batch-file-upload" asChild>
                <Button variant="outline">Select Files</Button>
              </Label>
            </div>
          )}

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-4">
              {/* Header */}
              <div
                className={`flex items-center justify-between ${
                  !isUploading ? "border-2 border-dashed rounded-lg p-3" : ""
                } ${isDragging ? "border-primary bg-primary/5" : "border-transparent"}`}
                onDragOver={!isUploading ? handleDragOver : undefined}
                onDragLeave={!isUploading ? handleDragLeave : undefined}
                onDrop={!isUploading ? handleDrop : undefined}
              >
                <span className="text-sm text-muted-foreground">
                  {isUploading ? (
                    <>
                      {completedCount} of {files.length} uploaded
                      {errorCount > 0 && `, ${errorCount} failed`}
                    </>
                  ) : (
                    <>
                      {files.length} file{files.length > 1 ? "s" : ""} selected
                      {isDragging && " - Drop to add more"}
                    </>
                  )}
                </span>
                {!isUploading && (
                  <>
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*,audio/*,application/pdf,.svg"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="batch-file-upload-more"
                    />
                    <Label htmlFor="batch-file-upload-more" asChild>
                      <Button variant="outline" size="sm">
                        Add More
                      </Button>
                    </Label>
                  </>
                )}
              </div>

              {/* File Cards */}
              {files.map((fileData) => {
                const FileTypeIcon = getFileIcon(fileData.file.type);
                const isCompleted = fileData.status === "success";
                const hasError = fileData.status === "error";
                const isCurrentlyUploading = fileData.status === "uploading";

                return (
                  <div
                    key={fileData.id}
                    className={`border rounded-lg p-4 space-y-3 ${
                      isCompleted
                        ? "border-green-500/50 bg-green-500/5"
                        : hasError
                          ? "border-red-500/50 bg-red-500/5"
                          : ""
                    }`}
                  >
                    {/* File Header */}
                    <div className="flex items-start gap-4">
                      {/* Preview */}
                      <div className="w-20 h-20 rounded-md bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                        {fileData.preview ? (
                          <img
                            src={fileData.preview}
                            alt={fileData.displayName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FileTypeIcon className="h-8 w-8 text-muted-foreground" />
                        )}
                        {isCurrentlyUploading && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <Loader2Icon className="h-6 w-6 animate-spin text-white" />
                          </div>
                        )}
                        {isCompleted && (
                          <div className="absolute inset-0 bg-green-500/50 flex items-center justify-center">
                            <CheckCircle2Icon className="h-6 w-6 text-white" />
                          </div>
                        )}
                        {hasError && (
                          <div className="absolute inset-0 bg-red-500/50 flex items-center justify-center">
                            <AlertCircleIcon className="h-6 w-6 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <Input
                            value={fileData.displayName}
                            onChange={(e) =>
                              handleUpdateFile(fileData.id, { displayName: e.target.value })
                            }
                            placeholder="Display name"
                            className="font-medium"
                            disabled={isUploading}
                          />
                          {!isUploading && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 flex-shrink-0"
                              onClick={() => handleRemoveFile(fileData.id)}
                            >
                              <XIcon className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{fileData.file.name}</span>
                          <span>-</span>
                          <span>{formatFileSize(fileData.file.size)}</span>
                          {hasError && fileData.error && (
                            <>
                              <span>-</span>
                              <span className="text-red-500">{fileData.error}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Metadata Form (only shown when not completed) */}
                    {!isCompleted && (
                      <>
                        {/* Category and Description Row */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Category</Label>
                            <Select
                              value={fileData.category}
                              onValueChange={(value) =>
                                handleUpdateFile(fileData.id, { category: value })
                              }
                              disabled={isUploading || mode === "branding"}
                            >
                              <SelectTrigger className="h-8 text-xs w-full">
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
                          <div className="space-y-1">
                            <Label className="text-xs">Description</Label>
                            <Textarea
                              value={fileData.description}
                              onChange={(e) =>
                                handleUpdateFile(fileData.id, { description: e.target.value })
                              }
                              placeholder="Brief description..."
                              rows={1}
                              className="text-xs min-h-[32px] resize-none"
                              disabled={isUploading}
                            />
                          </div>
                        </div>

                        {/* Tags */}
                        <div className="space-y-1">
                          <Label className="text-xs">Tags</Label>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {fileData.tags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                                {!isUploading && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveTag(fileData.id, tag)}
                                    className="ml-1 hover:text-destructive"
                                  >
                                    <XIcon className="h-3 w-3" />
                                  </button>
                                )}
                              </Badge>
                            ))}
                          </div>
                          <Input
                            placeholder="Add tag and press Enter"
                            value={currentTagInputs[fileData.id] || ""}
                            onChange={(e) =>
                              setCurrentTagInputs((prev) => ({
                                ...prev,
                                [fileData.id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddTag(fileData.id, currentTagInputs[fileData.id] || "");
                              }
                            }}
                            className="h-8 text-xs"
                            disabled={isUploading}
                          />
                        </div>

                        {/* Branding Mode Fields */}
                        {mode === "branding" && (
                          <>
                            {/* Usage Contexts */}
                            <div className="space-y-1">
                              <Label className="text-xs">Usage Contexts</Label>
                              <div className="flex flex-wrap gap-3">
                                {USAGE_CONTEXTS.map((ctx) => {
                                  const checkboxId = `usage-${fileData.id}-${ctx.value}`;
                                  return (
                                    <div
                                      key={ctx.value}
                                      className="flex items-center gap-1.5 text-xs"
                                    >
                                      <Checkbox
                                        id={checkboxId}
                                        checked={fileData.usageContexts.includes(ctx.value)}
                                        onCheckedChange={() =>
                                          handleToggleUsageContext(fileData.id, ctx.value)
                                        }
                                        disabled={isUploading}
                                      />
                                      <Label
                                        htmlFor={checkboxId}
                                        className="text-xs cursor-pointer font-normal"
                                      >
                                        {ctx.label}
                                      </Label>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* AI Guidelines */}
                            <div className="space-y-1">
                              <Label className="text-xs">AI Usage Guidelines</Label>
                              <Textarea
                                placeholder="Describe when and how AI should use this asset..."
                                value={fileData.aiGuidelines}
                                onChange={(e) =>
                                  handleUpdateFile(fileData.id, { aiGuidelines: e.target.value })
                                }
                                rows={2}
                                className="text-xs"
                                disabled={isUploading}
                              />
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2 pt-2">
              <Progress value={uploadProgress} />
              <p className="text-sm text-center text-muted-foreground">
                Uploading... {Math.round(uploadProgress)}%
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            {isUploading ? "Please wait..." : "Cancel"}
          </Button>
          <Button onClick={handleUpload} disabled={pendingCount === 0 || isUploading}>
            {isUploading ? (
              <>
                <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <UploadIcon className="h-4 w-4 mr-2" />
                Upload {pendingCount > 0 ? `(${pendingCount})` : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
