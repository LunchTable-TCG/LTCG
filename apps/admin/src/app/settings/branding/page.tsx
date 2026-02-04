"use client";

/**
 * Branding Management Page
 *
 * Organize brand assets in folders, edit metadata for AI consumption,
 * and manage brand guidelines.
 */

import {
  AssetDetailSheet,
  BrandingBreadcrumb,
  BrandingContentGrid,
  BrandingSidebar,
  CreateFolderDialog,
  GuidelinesModal,
  UploadAssetsDialog,
} from "@/components/branding";
import type {
  BrandingFolder,
  BrandingGuidelines,
  EnrichedBrandingAsset,
  FolderTreeNode,
} from "@/components/branding/types";
import { PageWrapper } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RoleGuard, useAdmin } from "@/contexts/AdminContext";
import {  useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import type { Id } from "@convex/_generated/dataModel";
import { BookOpenIcon, Loader2Icon, SettingsIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export default function BrandingPage() {
  useAdmin(); // Auth check

  // State
  const [selectedFolderId, setSelectedFolderId] = useState<Id<"brandingFolders"> | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<Id<"brandingAssets"> | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [currentPath, setCurrentPath] = useState("");
  const [viewMode] = useState<"grid" | "list">("grid");

  // Dialog states
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showUploadAssets, setShowUploadAssets] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  // Queries
  const folderTreeResult = useConvexQuery(api.admin.branding.getFolderTree, {});
  const childFoldersResult = useConvexQuery(
    api.admin.branding.listFolders,
    selectedFolderId ? { parentId: selectedFolderId } : "skip"
  );
  const assetsResult = useConvexQuery(
    api.admin.branding.listAssets,
    selectedFolderId ? { folderId: selectedFolderId } : "skip"
  );
  const selectedFolderResult = useConvexQuery(
    api.admin.branding.getFolder,
    selectedFolderId ? { folderId: selectedFolderId } : "skip"
  );
  const selectedAssetResult = useConvexQuery(
    api.admin.branding.getAsset,
    selectedAssetId ? { assetId: selectedAssetId } : "skip"
  );
  const allTagsResult = useConvexQuery(api.admin.branding.getAllTags, {});
  const guidelinesResult = useConvexQuery(api.admin.branding.getAllGuidelines, {});

  // Mutations
  const initializeBranding = useConvexMutation(api.admin.branding.initializeBranding);
  const createFolder = useConvexMutation(api.admin.branding.createFolder);
  const updateAsset = useConvexMutation(api.admin.branding.updateAsset);
  const deleteAsset = useConvexMutation(api.admin.branding.deleteAsset);
  const moveAsset = useConvexMutation(api.admin.branding.moveAsset);
  const updateGuidelines = useConvexMutation(api.admin.branding.updateGuidelines);

  // Derived state
  const folderTree = (folderTreeResult ?? []) as FolderTreeNode[];
  const childFolders = (childFoldersResult ?? []) as BrandingFolder[];
  const assets = (assetsResult ?? []) as EnrichedBrandingAsset[];
  const selectedFolder = selectedFolderResult as BrandingFolder | null;
  const selectedAsset = selectedAssetResult as EnrichedBrandingAsset | null;
  const allTags = (allTagsResult ?? []) as string[];
  const allGuidelines = (guidelinesResult ?? []) as BrandingGuidelines[];

  const isLoading = folderTreeResult === undefined;
  const hasNoFolders = !isLoading && folderTree.length === 0;

  // Update path when folder changes
  useEffect(() => {
    if (selectedFolder) {
      setCurrentPath(selectedFolder.path);
      // Auto-expand parent folders
      const parts = selectedFolder.path.split("/");
      const newExpanded = new Set(expandedFolders);
      let path = "";
      for (const part of parts) {
        path = path ? `${path}/${part}` : part;
        // Find folder id by path and add to expanded
        const findFolderId = (nodes: FolderTreeNode[]): string | null => {
          for (const node of nodes) {
            if (node.path === path) return node._id;
            const found = findFolderId(node.children);
            if (found) return found;
          }
          return null;
        };
        const folderId = findFolderId(folderTree);
        if (folderId) newExpanded.add(folderId);
      }
      setExpandedFolders(newExpanded);
    } else {
      setCurrentPath("");
    }
  }, [selectedFolder?.path]);

  // Handlers
  const handleInitialize = async () => {
    setIsInitializing(true);
    try {
      const result = await initializeBranding({});
      toast.success(result.message);
    } catch (_error) {
      toast.error("Failed to initialize branding system");
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSelectFolder = useCallback((folderId: Id<"brandingFolders">) => {
    setSelectedFolderId(folderId);
    setSelectedAssetId(null);
  }, []);

  const handleToggleExpand = useCallback((folderId: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  }, []);

  const handleNavigatePath = useCallback(
    (path: string) => {
      if (!path) {
        setSelectedFolderId(null);
        setCurrentPath("");
        return;
      }
      // Find folder by path
      const findFolder = (nodes: FolderTreeNode[]): string | null => {
        for (const node of nodes) {
          if (node.path === path) return node._id;
          const found = findFolder(node.children);
          if (found) return found;
        }
        return null;
      };
      const folderId = findFolder(folderTree);
      if (folderId) {
        setSelectedFolderId(folderId as Id<"brandingFolders">);
      }
    },
    [folderTree]
  );

  const handleCreateFolder = async (name: string, description?: string) => {
    if (!selectedFolderId || !selectedFolder) return;

    await createFolder({
      name,
      parentId: selectedFolderId,
      section: selectedFolder.section,
      description,
    });
    toast.success("Folder created");
  };

  const handleSaveAsset = async (updates: Partial<EnrichedBrandingAsset>) => {
    if (!selectedAssetId) return;
    await updateAsset({ assetId: selectedAssetId, ...updates });
  };

  const handleDeleteAsset = async () => {
    if (!selectedAssetId) return;
    await deleteAsset({ assetId: selectedAssetId });
    setSelectedAssetId(null);
  };

  const handleMoveAsset = async (newFolderId: Id<"brandingFolders">) => {
    if (!selectedAssetId) return;
    await moveAsset({ assetId: selectedAssetId, newFolderId });
    toast.success("Asset moved");
  };

  const handleSaveGuidelines = async (section: string, data: Partial<BrandingGuidelines>) => {
    await updateGuidelines({
      section,
      structuredData: data.structuredData,
      richTextContent: data.richTextContent,
    });
  };

  // Render
  if (isLoading) {
    return (
      <PageWrapper title="Branding" description="Loading branding assets...">
        <div className="flex h-[calc(100vh-180px)]">
          <div className="w-64 border-r p-4 space-y-2">
            <Skeleton className="h-6 w-24 mb-4" />
            {[...Array(9)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
          <div className="flex-1 p-6">
            <Skeleton className="h-10 w-64 mb-6" />
            <div className="grid grid-cols-6 gap-4">
              {[...Array(12)].map((_, i) => (
                <Skeleton key={i} className="aspect-square" />
              ))}
            </div>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (hasNoFolders) {
    return (
      <PageWrapper
        title="Branding"
        description="Manage brand assets and guidelines for AI content generation"
      >
        <div className="flex flex-col items-center justify-center h-[calc(100vh-250px)] text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <SettingsIcon className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Set Up Branding</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            Initialize the branding system to create folder sections for organizing your brand
            assets. AI will use these assets when generating content.
          </p>
          <RoleGuard permission="admin.manage">
            <Button onClick={handleInitialize} disabled={isInitializing} size="lg">
              {isInitializing ? (
                <>
                  <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                  Initializing...
                </>
              ) : (
                <>
                  <SettingsIcon className="h-4 w-4 mr-2" />
                  Initialize Branding System
                </>
              )}
            </Button>
          </RoleGuard>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Branding"
      description="Manage brand assets and guidelines for AI content generation"
      actions={
        <RoleGuard permission="admin.manage">
          <Button variant="outline" onClick={() => setShowGuidelines(true)}>
            <BookOpenIcon className="h-4 w-4 mr-2" />
            Edit Guidelines
          </Button>
        </RoleGuard>
      }
    >
      <div className="flex h-[calc(100vh-180px)] border rounded-lg overflow-hidden bg-card">
        {/* Sidebar */}
        <BrandingSidebar
          folderTree={folderTree}
          selectedFolderId={selectedFolderId}
          expandedFolders={expandedFolders}
          onSelectFolder={handleSelectFolder}
          onToggleExpand={handleToggleExpand}
        />

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Breadcrumb */}
          {currentPath && (
            <div className="px-4 py-2 border-b bg-muted/30">
              <BrandingBreadcrumb path={currentPath} onNavigate={handleNavigatePath} />
            </div>
          )}

          {/* Content grid */}
          <BrandingContentGrid
            folders={childFolders}
            assets={assets}
            selectedFolderId={selectedFolderId}
            onSelectFolder={handleSelectFolder}
            onSelectAsset={(id) => setSelectedAssetId(id)}
            onCreateFolder={() => setShowCreateFolder(true)}
            onUploadAssets={() => setShowUploadAssets(true)}
            isLoading={childFoldersResult === undefined && !!selectedFolderId}
            viewMode={viewMode}
          />
        </div>
      </div>

      {/* Dialogs */}
      <CreateFolderDialog
        isOpen={showCreateFolder}
        onClose={() => setShowCreateFolder(false)}
        parentFolder={selectedFolder}
        section={selectedFolder?.section ?? "Brand Identity"}
        onCreate={handleCreateFolder}
      />

      <UploadAssetsDialog
        isOpen={showUploadAssets && !!selectedFolderId}
        onClose={() => setShowUploadAssets(false)}
        folderId={selectedFolderId!}
        onUploadComplete={() => setShowUploadAssets(false)}
      />

      <AssetDetailSheet
        asset={selectedAsset}
        isOpen={!!selectedAssetId}
        onClose={() => setSelectedAssetId(null)}
        onSave={handleSaveAsset}
        onDelete={handleDeleteAsset}
        onMove={handleMoveAsset}
        allTags={allTags}
      />

      <GuidelinesModal
        isOpen={showGuidelines}
        onClose={() => setShowGuidelines(false)}
        guidelines={allGuidelines}
        onSave={handleSaveGuidelines}
      />
    </PageWrapper>
  );
}
