"use client";

/**
 * TemplateEditor Component
 *
 * Main editor component that wraps the canvas, layers, and properties panels.
 * Handles drag-and-drop context and state management.
 */

import { useState, useCallback, useEffect } from "react";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useMutation } from "convex/react";
import { toast } from "sonner";

import { CanvasPreview } from "./CanvasPreview";
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
import { ZoomIn, ZoomOut, Grid3X3, ImageIcon, Eye } from "lucide-react";

const api = apiAny;

interface TemplateEditorProps {
  template: TemplateWithBlocks;
}

export function TemplateEditor({ template }: TemplateEditorProps) {
  // State
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [showGrid, setShowGrid] = useState(true);
  const [showArtworkBounds, setShowArtworkBounds] = useState(true);
  const [previewRarity, setPreviewRarity] = useState<Rarity>("legendary");
  const [previewData] = useState(SAMPLE_CARD_DATA);

  // Local blocks state for optimistic updates
  const [blocks, setBlocks] = useState<CardTemplateBlock[]>(template.blocks);

  // Sync blocks when template changes
  useEffect(() => {
    setBlocks(template.blocks);
  }, [template.blocks]);

  // Get selected block
  const selectedBlock = blocks.find((b) => b._id === selectedBlockId) || null;

  // Mutations
  const addBlockMutation = useMutation(api.admin.templates.addBlock);
  const updateBlockMutation = useMutation(api.admin.templates.updateBlock);
  const deleteBlockMutation = useMutation(api.admin.templates.deleteBlock);
  const reorderBlocksMutation = useMutation(api.admin.templates.reorderBlocks);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // Handle drag end
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, delta } = event;

      if (!delta) return;

      const blockId = active.id as string;
      const block = blocks.find((b) => b._id === blockId);
      if (!block) return;

      // Calculate new position based on drag delta
      // Convert pixel delta to percentage
      const deltaXPercent = (delta.x / (template.width * zoom)) * 100;
      const deltaYPercent = (delta.y / (template.height * zoom)) * 100;

      const newX = Math.max(0, Math.min(100 - block.width, block.x + deltaXPercent));
      const newY = Math.max(0, Math.min(100 - block.height, block.y + deltaYPercent));

      // Optimistic update
      setBlocks((prev) =>
        prev.map((b) => (b._id === blockId ? { ...b, x: newX, y: newY } : b))
      );

      // Persist to database (debounced in real usage)
      try {
        await updateBlockMutation({
          blockId: blockId as any,
          x: Math.round(newX * 10) / 10,
          y: Math.round(newY * 10) / 10,
        });
      } catch (error) {
        toast.error("Failed to update block position");
        // Revert on error
        setBlocks(template.blocks);
      }
    },
    [blocks, template.width, template.height, zoom, updateBlockMutation, template.blocks]
  );

  // Handle block property changes
  const handleBlockChange = useCallback(
    async (updates: Partial<CardTemplateBlock>) => {
      if (!selectedBlockId) return;

      // Optimistic update
      setBlocks((prev) =>
        prev.map((b) => (b._id === selectedBlockId ? { ...b, ...updates } : b))
      );

      // Persist to database
      try {
        await updateBlockMutation({
          blockId: selectedBlockId as any,
          ...updates,
        });
      } catch (error) {
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
          templateId: template._id as any,
          blockType,
          label,
          x: 10,
          y: 10,
          width: config.defaultWidth,
          height: config.defaultHeight,
          fontSize: config.defaultFontSize,
          fontWeight: config.defaultFontWeight,
          textAlign: config.defaultTextAlign,
        });
        toast.success("Block added");
      } catch (error) {
        toast.error("Failed to add block");
      }
    },
    [template._id, addBlockMutation]
  );

  // Handle deleting a block
  const handleDeleteBlock = useCallback(
    async (blockId: string) => {
      // Optimistic update
      setBlocks((prev) => prev.filter((b) => b._id !== blockId));
      if (selectedBlockId === blockId) {
        setSelectedBlockId(null);
      }

      try {
        await deleteBlockMutation({ blockId: blockId as any });
        toast.success("Block deleted");
      } catch (error) {
        toast.error("Failed to delete block");
        setBlocks(template.blocks);
      }
    },
    [selectedBlockId, deleteBlockMutation, template.blocks]
  );

  // Handle reordering blocks
  const handleReorderBlocks = useCallback(
    async (blockIds: string[]) => {
      // Optimistic update
      const reorderedBlocks = blockIds
        .map((id, index) => {
          const block = blocks.find((b) => b._id === id);
          return block ? { ...block, zIndex: index } : null;
        })
        .filter(Boolean) as CardTemplateBlock[];

      setBlocks(reorderedBlocks);

      try {
        await reorderBlocksMutation({
          templateId: template._id as any,
          blockIds: blockIds as any[],
        });
      } catch (error) {
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

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
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
          <CanvasPreview
            template={template}
            blocks={blocks}
            selectedBlockId={selectedBlockId}
            onSelectBlock={setSelectedBlockId}
            zoom={zoom}
            previewData={previewData}
            previewRarity={previewRarity}
            showGrid={showGrid}
            showArtworkBounds={showArtworkBounds}
          />

          {/* Properties Panel (Right) */}
          <PropertiesPanel block={selectedBlock} onChange={handleBlockChange} />
        </div>
      </div>
    </DndContext>
  );
}
