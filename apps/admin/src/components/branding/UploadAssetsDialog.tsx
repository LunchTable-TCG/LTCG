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
import { Textarea } from "@/components/ui/textarea";
import { api, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import { upload } from "@vercel/blob/client";
import { useMutation } from "convex/react";
import {
  FileIcon,
  ImageIcon,
  Loader2Icon,
  Music2Icon,
  UploadIcon,
  VideoIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { UploadAssetsDialogProps } from "./types";
import { USAGE_CONTEXTS } from "./types";

interface FileToUpload {
  file: File;
  name: string;
  tags: string[];
  usageContext: string[];
  aiDescription: string;
  preview?: string;
}

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return ImageIcon;
  if (type.startsWith("video/")) return VideoIcon;
  if (type.startsWith("audio/")) return Music2Icon;
  return FileIcon;
}

export function UploadAssetsDialog({
  isOpen,
  onClose,
  folderId,
  onUploadComplete,
}: UploadAssetsDialogProps) {
  const [files, setFiles] = useState<FileToUpload[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentTag, setCurrentTag] = useState("");

  const saveMetadata = useMutation(api.admin.assets.saveAssetMetadata);
  const createBrandingAsset = useMutation(api.admin.branding.createAsset);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);

    const newFiles: FileToUpload[] = selectedFiles.map((file) => {
      const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;

      return {
        file,
        name: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
        tags: [],
        usageContext: [],
        aiDescription: "",
        preview,
      };
    });

    setFiles((prev) => [...prev, ...newFiles]);
    e.target.value = ""; // Reset input
  }, []);

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => {
      const newFiles = [...prev];
      if (newFiles[index]?.preview) {
        URL.revokeObjectURL(newFiles[index].preview!);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const handleUpdateFile = (index: number, updates: Partial<FileToUpload>) => {
    setFiles((prev) => prev.map((file, i) => (i === index ? { ...file, ...updates } : file)));
  };

  const handleAddTag = (index: number, tag: string) => {
    if (!tag.trim()) return;
    const normalizedTag = tag.trim().toLowerCase();
    const file = files[index];
    if (!file) return;
    handleUpdateFile(index, {
      tags: [...new Set([...file.tags, normalizedTag])],
    });
  };

  const handleRemoveTag = (index: number, tag: string) => {
    const file = files[index];
    if (!file) return;
    handleUpdateFile(index, {
      tags: file.tags.filter((t) => t !== tag),
    });
  };

  const handleToggleContext = (index: number, context: string) => {
    const file = files[index];
    if (!file) return;
    const current = file.usageContext;
    const updated = current.includes(context)
      ? current.filter((c) => c !== context)
      : [...current, context];
    handleUpdateFile(index, { usageContext: updated });
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    let completed = 0;
    const errors: string[] = [];

    for (const fileData of files) {
      try {
        // Upload to Vercel Blob
        const blob = await upload(fileData.file.name, fileData.file, {
          access: "public",
          handleUploadUrl: "/api/admin/upload",
          clientPayload: JSON.stringify({
            category: "branding",
            description: fileData.aiDescription,
          }),
        });

        // Save file metadata to Convex
        const metadataResult = await saveMetadata({
          fileName: fileData.file.name,
          contentType: fileData.file.type,
          size: fileData.file.size,
          blobUrl: blob.url,
          blobPathname: blob.pathname,
          category: "branding",
          description: fileData.aiDescription,
        });

        // Create branding asset
        await createBrandingAsset({
          folderId,
          fileMetadataId: metadataResult.fileId,
          name: fileData.name,
          tags: fileData.tags,
          usageContext: fileData.usageContext,
          aiDescription: fileData.aiDescription || `Asset: ${fileData.name}`,
        });

        completed++;
        setUploadProgress((completed / files.length) * 100);
      } catch (error) {
        console.error("Upload error:", error);
        errors.push(fileData.name);
      }
    }

    setIsUploading(false);

    if (errors.length > 0) {
      toast.error(`Failed to upload: ${errors.join(", ")}`);
    }
    if (completed > 0) {
      toast.success(`Uploaded ${completed} asset${completed > 1 ? "s" : ""}`);
      onUploadComplete();
    }

    // Cleanup
    files.forEach((f) => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
    setFiles([]);
    onClose();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isUploading) {
      files.forEach((f) => {
        if (f.preview) URL.revokeObjectURL(f.preview);
      });
      setFiles([]);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Upload Assets</DialogTitle>
          <DialogDescription>
            Add brand assets to this folder. Add metadata to help AI find and use them.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-4 space-y-4">
          {/* File input */}
          {files.length === 0 && (
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <UploadIcon className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                Drag and drop files here, or click to select
              </p>
              <Input
                type="file"
                multiple
                accept="image/*,video/*,audio/*,application/pdf,.svg"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <Label htmlFor="file-upload" asChild>
                <Button variant="outline">Select Files</Button>
              </Label>
            </div>
          )}

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {files.length} file{files.length > 1 ? "s" : ""} selected
                </span>
                <Label htmlFor="file-upload-more" asChild>
                  <Button variant="outline" size="sm">
                    Add More
                  </Button>
                </Label>
                <Input
                  type="file"
                  multiple
                  accept="image/*,video/*,audio/*,application/pdf,.svg"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload-more"
                />
              </div>

              {files.map((fileData, index) => {
                const FileTypeIcon = getFileIcon(fileData.file.type);
                return (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start gap-4">
                      {/* Preview */}
                      <div className="w-20 h-20 rounded-md bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {fileData.preview ? (
                          <img
                            src={fileData.preview}
                            alt={fileData.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FileTypeIcon className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <Input
                            value={fileData.name}
                            onChange={(e) => handleUpdateFile(index, { name: e.target.value })}
                            placeholder="Display name"
                            className="font-medium"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 ml-2"
                            onClick={() => handleRemoveFile(index)}
                          >
                            <XIcon className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {fileData.file.name} • {(fileData.file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="space-y-1">
                      <Label className="text-xs">Tags</Label>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {fileData.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                            <button
                              onClick={() => handleRemoveTag(index, tag)}
                              className="ml-1 hover:text-destructive"
                            >
                              <XIcon className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <Input
                        placeholder="Add tag and press Enter"
                        value={currentTag}
                        onChange={(e) => setCurrentTag(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddTag(index, currentTag);
                            setCurrentTag("");
                          }
                        }}
                        className="h-8 text-xs"
                      />
                    </div>

                    {/* Usage Context */}
                    <div className="space-y-1">
                      <Label className="text-xs">Usage Context</Label>
                      <div className="flex flex-wrap gap-2">
                        {USAGE_CONTEXTS.map((ctx) => (
                          <label
                            key={ctx.value}
                            className="flex items-center gap-1.5 text-xs cursor-pointer"
                          >
                            <Checkbox
                              checked={fileData.usageContext.includes(ctx.value)}
                              onCheckedChange={() => handleToggleContext(index, ctx.value)}
                            />
                            {ctx.label}
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* AI Description */}
                    <div className="space-y-1">
                      <Label className="text-xs">AI Usage Guidelines</Label>
                      <Textarea
                        placeholder="Describe when and how AI should use this asset..."
                        value={fileData.aiDescription}
                        onChange={(e) => handleUpdateFile(index, { aiDescription: e.target.value })}
                        rows={2}
                        className="text-xs"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Upload progress */}
          {isUploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} />
              <p className="text-sm text-center text-muted-foreground">
                Uploading... {Math.round(uploadProgress)}%
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={files.length === 0 || isUploading}>
            {isUploading ? (
              <>
                <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <UploadIcon className="h-4 w-4 mr-2" />
                Upload {files.length > 0 ? `(${files.length})` : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
