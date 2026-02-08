"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { FolderPlusIcon, GridIcon, ListIcon, SearchIcon, UploadIcon } from "lucide-react";
import { useState } from "react";
import { BrandingAssetCard } from "./BrandingAssetCard";
import { FolderCard } from "./FolderCard";
import type { BrandingContentGridProps } from "./types";

export function BrandingContentGrid({
  folders,
  assets,
  selectedFolderId,
  onSelectFolder,
  onSelectAsset,
  onCreateFolder,
  onUploadAssets,
  isLoading,
  viewMode,
}: BrandingContentGridProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter items by search
  const filteredFolders = folders.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredAssets = assets.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const isEmpty = filteredFolders.length === 0 && filteredAssets.length === 0;

  if (isLoading) {
    return (
      <div className="flex-1 p-6">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }, (_, i) => i).map((i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-4 p-4 border-b bg-card">
        <div className="relative flex-1 max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search folders and assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onCreateFolder} disabled={!selectedFolderId}>
            <FolderPlusIcon className="h-4 w-4 mr-2" />
            New Folder
          </Button>
          <Button size="sm" onClick={onUploadAssets} disabled={!selectedFolderId}>
            <UploadIcon className="h-4 w-4 mr-2" />
            Upload
          </Button>
        </div>

        {/* View toggle - for future use */}
        <div className="flex items-center border rounded-md">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8 rounded-r-none"
          >
            <GridIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8 rounded-l-none"
          >
            <ListIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              {selectedFolderId ? (
                <UploadIcon className="h-8 w-8 text-muted-foreground" />
              ) : (
                <FolderPlusIcon className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <h3 className="font-medium mb-1">
              {searchQuery
                ? "No results found"
                : selectedFolderId
                  ? "This folder is empty"
                  : "Select a section to get started"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery
                ? "Try a different search term"
                : selectedFolderId
                  ? "Upload assets or create subfolders"
                  : "Choose a section from the sidebar"}
            </p>
            {selectedFolderId && !searchQuery && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onCreateFolder}>
                  <FolderPlusIcon className="h-4 w-4 mr-2" />
                  New Folder
                </Button>
                <Button size="sm" onClick={onUploadAssets}>
                  <UploadIcon className="h-4 w-4 mr-2" />
                  Upload Assets
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div
            className={cn(
              "grid gap-4",
              viewMode === "grid"
                ? "grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
                : "grid-cols-1"
            )}
          >
            {/* Folders first */}
            {filteredFolders.map((folder) => (
              <FolderCard
                key={folder._id}
                folder={folder}
                onClick={() => onSelectFolder(folder._id)}
              />
            ))}
            {/* Then assets */}
            {filteredAssets.map((asset) => (
              <BrandingAssetCard
                key={asset._id}
                asset={asset}
                onClick={() => onSelectAsset(asset._id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
