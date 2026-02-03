"use client";

/**
 * TemplateEditor Component
 *
 * Main editor component using Konva.js canvas for card template design.
 * Handles state management, block operations, and export capabilities.
 */

import { useState, useCallback, useEffect } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import type { Stage } from "konva/lib/Stage";

import { useCanvasExport } from "./canvas/hooks/useCanvasExport";

// Dynamic import with SSR disabled to avoid canvas module issues
const KonvaCanvas = dynamic(
  () => import("./canvas/KonvaCanvas").then((mod) => mod.KonvaCanvas),
  { ssr: false, loading: () => <div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading canvas...</div></div> }
);
import { LayersPanel } from "./LayersPanel";
import { PropertiesPanel } from "./PropertiesPanel";
import {
  SAMPLE_CARD_DATA,
  DEFAULT_ZOOM,
  ZOOM_LEVELS,
  type TemplateWithBlocks,
  type CardTemplateBlock,
  type BlockType,
  type Rarity,
  type BlockId,
  type BlockTransformAttrs,
  type BlockPosition,
  BLOCK_CONFIGS,
} from "./types";
import { apiAny } from "@/lib/convexHelpers";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ZoomIn,
  ZoomOut,
  Grid3X3,
  ImageIcon,
  Eye,
  Download,
  Magnet,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const api = apiAny;

interface TemplateEditorProps {
  template: TemplateWithBlocks;
}

export function TemplateEditor({ template }: TemplateEditorProps) {
  // State - using proper BlockId type
  const [selectedBlockId, setSelectedBlockId] = useState<BlockId | null>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [showGrid, setShowGrid] = useState(true);
  const [showArtworkBounds, setShowArtworkBounds] = useState(true);
  const [previewRarity, setPreviewRarity] = useState<Rarity>("legendary");
  const [previewData] = useState(SAMPLE_CARD_DATA);
  const [snapEnabled, setSnapEnabled] = useState(true);

  // Local blocks state for optimistic updates
  const [blocks, setBlocks] = useState<CardTemplateBlock[]>(template.blocks);

  // Export hook
  const { stageRef, downloadImage } = useCanvasExport();

  // Sync blocks when template changes
  useEffect(() => {
    setBlocks(template.blocks);
  }, [template.blocks]);

  // Get selected block
  const selectedBlock = blocks.find((b) => b._id === selectedBlockId) ?? null;

  // Mutations
  const addBlockMutation = useMutation(api.admin.templates.addBlock);
  const updateBlockMutation = useMutation(api.admin.templates.updateBlock);
  const deleteBlockMutation = useMutation(api.admin.templates.deleteBlock);
  const reorderBlocksMutation = useMutation(api.admin.templates.reorderBlocks);

  // Handle block selection from canvas
  const handleSelectBlock = useCallback((id: BlockId | null) => {
    setSelectedBlockId(id);
  }, []);

  // Handle block move from canvas
  const handleBlockMove = useCallback(
    async (blockId: BlockId, position: BlockPosition) => {
      const block = blocks.find((b) => b._id === blockId);
      if (!block) return;

      // Clamp position
      const newX = Math.max(0, Math.min(100 - block.width, position.x));
      const newY = Math.max(0, Math.min(100 - block.height, position.y));

      // Optimistic update
      setBlocks((prev) =>
        prev.map((b) => (b._id === blockId ? { ...b, x: newX, y: newY } : b))
      );

      // Persist to database
      try {
        await updateBlockMutation({
          blockId,
          x: Math.round(newX * 10) / 10,
          y: Math.round(newY * 10) / 10,
        });
      } catch {
        toast.error("Failed to update block position");
        setBlocks(template.blocks);
      }
    },
    [blocks, updateBlockMutation, template.blocks]
  );

  // Handle block transform from canvas (resize/rotate)
  const handleBlockTransform = useCallback(
    async (blockId: BlockId, attrs: BlockTransformAttrs) => {
      // Clamp values
      const newX = Math.max(0, Math.min(100 - attrs.width, attrs.x));
      const newY = Math.max(0, Math.min(100 - attrs.height, attrs.y));
      const newWidth = Math.max(1, Math.min(100, attrs.width));
      const newHeight = Math.max(1, Math.min(100, attrs.height));

      // Optimistic update
      setBlocks((prev) =>
        prev.map((b) =>
          b._id === blockId
            ? {
                ...b,
                x: newX,
                y: newY,
                width: newWidth,
                height: newHeight,
                rotation: attrs.rotation,
              }
            : b
        )
      );

      // Persist to database
      try {
        await updateBlockMutation({
          blockId,
          x: Math.round(newX * 10) / 10,
          y: Math.round(newY * 10) / 10,
          width: Math.round(newWidth * 10) / 10,
          height: Math.round(newHeight * 10) / 10,
          rotation: attrs.rotation,
        });
      } catch {
        toast.error("Failed to update block");
        setBlocks(template.blocks);
      }
    },
    [updateBlockMutation, template.blocks]
  );

  // Handle block property changes from properties panel
  const handleBlockChange = useCallback(
    async (updates: Partial<CardTemplateBlock>) => {
      if (!selectedBlockId) return;

      // Optimistic update
      setBlocks((prev) =>
        prev.map((b) => (b._id === selectedBlockId ? { ...b, ...updates } : b))
      );

      // Persist to database - extract only the fields the mutation accepts
      const {
        _id: _ignoreId,
        _creationTime: _ignoreTime,
        templateId: _ignoreTemplateId,
        blockType: _ignoreBlockType,
        ...mutationUpdates
      } = updates as CardTemplateBlock;

      try {
        await updateBlockMutation({
          blockId: selectedBlockId,
          ...mutationUpdates,
        });
      } catch {
        toast.error("Failed to update block");
        setBlocks(template.blocks);
      }
    },
    [selectedBlockId, updateBlockMutation, template.blocks]
  );

  // Handle adding a new block
  const handleAddBlock = useCallback(
    async (blockType: BlockType, label: string) => {
      const config = BLOCK_CONFIGS[blockType];

      try {
        await addBlockMutation({
          templateId: template._id,
          blockType,
          label,
          x: 10,
          y: 10,
          width: config.defaultWidth,
          height: config.defaultHeight,
          fontSize: config.defaultFontSize,
          fontWeight: config.defaultFontWeight,
          textAlign: config.defaultTextAlign,
          // For image blocks
          imageFit: config.isImageBlock ? config.defaultImageFit : undefined,
        });
        toast.success("Block added");
      } catch {
        toast.error("Failed to add block");
      }
    },
    [template._id, addBlockMutation]
  );

  // Handle deleting a block
  const handleDeleteBlock = useCallback(
    async (blockId: BlockId) => {
      // Optimistic update
      setBlocks((prev) => prev.filter((b) => b._id !== blockId));
      if (selectedBlockId === blockId) {
        setSelectedBlockId(null);
      }

      try {
        await deleteBlockMutation({ blockId });
        toast.success("Block deleted");
      } catch {
        toast.error("Failed to delete block");
        setBlocks(template.blocks);
      }
    },
    [selectedBlockId, deleteBlockMutation, template.blocks]
  );

  // Handle reordering blocks
  const handleReorderBlocks = useCallback(
    async (blockIds: BlockId[]) => {
      // Optimistic update
      const reorderedBlocks = blockIds
        .map((id, index) => {
          const block = blocks.find((b) => b._id === id);
          return block ? { ...block, zIndex: index } : null;
        })
        .filter((b): b is CardTemplateBlock => b !== null);

      setBlocks(reorderedBlocks);

      try {
        await reorderBlocksMutation({
          templateId: template._id,
          blockIds,
        });
      } catch {
        toast.error("Failed to reorder blocks");
        setBlocks(template.blocks);
      }
    },
    [blocks, template._id, reorderBlocksMutation, template.blocks]
  );

  // Zoom controls
  const zoomIn = () => {
    const currentIndex = ZOOM_LEVELS.indexOf(zoom as (typeof ZOOM_LEVELS)[number]);
    const nextZoom = ZOOM_LEVELS[currentIndex + 1];
    if (currentIndex < ZOOM_LEVELS.length - 1 && nextZoom !== undefined) {
      setZoom(nextZoom);
    }
  };

  const zoomOut = () => {
    const currentIndex = ZOOM_LEVELS.indexOf(zoom as (typeof ZOOM_LEVELS)[number]);
    const prevZoom = ZOOM_LEVELS[currentIndex - 1];
    if (currentIndex > 0 && prevZoom !== undefined) {
      setZoom(prevZoom);
    }
  };

  // Export handlers
  const handleExportPNG = () => {
    downloadImage(`${template.name}-${previewRarity}`, { format: "png", pixelRatio: 2 });
    toast.success("PNG exported");
  };

  const handleExportJPEG = () => {
    downloadImage(`${template.name}-${previewRarity}`, { format: "jpeg", quality: 0.9 });
    toast.success("JPEG exported");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card">
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <Button size="sm" variant="outline" onClick={zoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm w-16 text-center">{Math.round(zoom * 100)}%</span>
          <Button size="sm" variant="outline" onClick={zoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-2" />

          {/* View toggles */}
          <Button
            size="sm"
            variant={showGrid ? "default" : "outline"}
            onClick={() => setShowGrid(!showGrid)}
          >
            <Grid3X3 className="h-4 w-4 mr-1" />
            Grid
          </Button>
          <Button
            size="sm"
            variant={showArtworkBounds ? "default" : "outline"}
            onClick={() => setShowArtworkBounds(!showArtworkBounds)}
          >
            <ImageIcon className="h-4 w-4 mr-1" />
            Artwork
          </Button>
          <Button
            size="sm"
            variant={snapEnabled ? "default" : "outline"}
            onClick={() => setSnapEnabled(!snapEnabled)}
          >
            <Magnet className="h-4 w-4 mr-1" />
            Snap
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Preview rarity selector */}
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <Select
              value={previewRarity}
              onValueChange={(v) => setPreviewRarity(v as Rarity)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="common">Common</SelectItem>
                <SelectItem value="uncommon">Uncommon</SelectItem>
                <SelectItem value="rare">Rare</SelectItem>
                <SelectItem value="epic">Epic</SelectItem>
                <SelectItem value="legendary">Legendary</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-px h-6 bg-border mx-2" />

          {/* Export dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportPNG}>
                Export as PNG (2x)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportJPEG}>
                Export as JPEG
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Save indicator */}
          <Badge variant="outline" className="text-muted-foreground">
            Auto-saved
          </Badge>
        </div>
      </div>

      {/* Main editor area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Layers Panel (Left) */}
        <LayersPanel
          blocks={blocks}
          selectedBlockId={selectedBlockId}
          templateCardType={template.cardType}
          onSelectBlock={setSelectedBlockId}
          onAddBlock={handleAddBlock}
          onDeleteBlock={handleDeleteBlock}
          onReorderBlocks={handleReorderBlocks}
        />

        {/* Canvas (Center) */}
        <div className="flex-1 overflow-auto bg-muted/30 flex items-center justify-center p-4">
          <KonvaCanvas
            template={template}
            blocks={blocks}
            selectedBlockId={selectedBlockId}
            zoom={zoom}
            showGrid={showGrid}
            showArtworkBounds={showArtworkBounds}
            previewRarity={previewRarity}
            previewArtworkUrl={previewData.imageUrl}
            onSelectBlock={handleSelectBlock}
            onBlockMove={handleBlockMove}
            onBlockTransform={handleBlockTransform}
            stageRef={stageRef as React.RefObject<Stage | null>}
          />
        </div>

        {/* Properties Panel (Right) */}
        <PropertiesPanel block={selectedBlock} onChange={handleBlockChange} />
      </div>
    </div>
  );
}
