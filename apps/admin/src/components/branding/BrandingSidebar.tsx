"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Id } from "@convex/_generated/dataModel";
import { ChevronDownIcon, ChevronRightIcon, FolderIcon, FolderOpenIcon } from "lucide-react";
import type { BrandingSidebarProps, FolderTreeNode } from "./types";
import { BRANDING_SECTIONS } from "./types";

interface TreeItemProps {
  node: FolderTreeNode;
  depth: number;
  selectedFolderId: Id<"brandingFolders"> | null;
  expandedFolders: Set<string>;
  onSelectFolder: (folderId: Id<"brandingFolders">) => void;
  onToggleExpand: (folderId: string) => void;
}

function TreeItem({
  node,
  depth,
  selectedFolderId,
  expandedFolders,
  onSelectFolder,
  onToggleExpand,
}: TreeItemProps) {
  const isExpanded = expandedFolders.has(node._id);
  const isSelected = selectedFolderId === node._id;
  const hasChildren = node.children.length > 0;

  // Get section icon color
  const sectionIndex = BRANDING_SECTIONS.findIndex((s) => s.name === node.section);
  const sectionColors = [
    "text-blue-500",
    "text-purple-500",
    "text-pink-500",
    "text-orange-500",
    "text-green-500",
    "text-yellow-500",
    "text-cyan-500",
    "text-red-500",
    "text-indigo-500",
  ];
  const iconColor =
    depth === 0 ? sectionColors[sectionIndex] || "text-primary" : "text-muted-foreground";

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 py-1 px-2 rounded-md cursor-pointer text-sm",
          "hover:bg-accent/50 transition-colors",
          isSelected && "bg-accent text-accent-foreground"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => onSelectFolder(node._id as Id<"brandingFolders">)}
      >
        {hasChildren ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(node._id);
            }}
          >
            {isExpanded ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronRightIcon className="h-4 w-4" />
            )}
          </Button>
        ) : (
          <span className="w-5" />
        )}
        {isExpanded && hasChildren ? (
          <FolderOpenIcon className={cn("h-4 w-4 flex-shrink-0", iconColor)} />
        ) : (
          <FolderIcon className={cn("h-4 w-4 flex-shrink-0", iconColor)} />
        )}
        <span className="truncate flex-1">{node.name}</span>
      </div>

      {isExpanded && hasChildren && (
        <div>
          {node.children
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((child) => (
              <TreeItem
                key={child._id}
                node={child}
                depth={depth + 1}
                selectedFolderId={selectedFolderId}
                expandedFolders={expandedFolders}
                onSelectFolder={onSelectFolder}
                onToggleExpand={onToggleExpand}
              />
            ))}
        </div>
      )}
    </div>
  );
}

export function BrandingSidebar({
  folderTree,
  selectedFolderId,
  expandedFolders,
  onSelectFolder,
  onToggleExpand,
  isLoading,
}: BrandingSidebarProps) {
  if (isLoading) {
    return (
      <div className="w-64 border-r bg-card p-4 space-y-2">
        <Skeleton className="h-6 w-32 mb-4" />
        {[...Array(9)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="w-64 border-r bg-card flex flex-col">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Sections
        </h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2">
          {folderTree.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 text-center">
              No folders yet. Initialize branding to get started.
            </p>
          ) : (
            folderTree.map((node) => (
              <TreeItem
                key={node._id}
                node={node}
                depth={0}
                selectedFolderId={selectedFolderId}
                expandedFolders={expandedFolders}
                onSelectFolder={onSelectFolder}
                onToggleExpand={onToggleExpand}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
