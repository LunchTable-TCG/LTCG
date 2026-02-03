"use client";

/**
 * Konva Canvas
 *
 * Main canvas component using Konva.js for rendering card templates.
 * Provides layer-based rendering, drag-drop, and export capabilities.
 */

import { useRef, useCallback } from "react";
import { Stage, Layer, Line } from "react-konva";
import type Konva from "konva";
import type { Id } from "@convex/_generated/dataModel";
import type { CardTemplateBlock, Rarity, TemplateMode } from "../types";
import { CANVAS_WIDTH, CANVAS_HEIGHT, isImageBlockType } from "../types";
import { BackgroundLayer } from "./layers/BackgroundLayer";
import { ArtworkLayer } from "./layers/ArtworkLayer";
import { TextLayer } from "./layers/TextLayer";
import { EffectsLayer } from "./layers/EffectsLayer";
import { SelectionRect } from "./elements/SelectionRect";
import { useSnapToGrid } from "./hooks/useSnapToGrid";

interface KonvaCanvasProps {
  /** Template data */
  template: {
    width: number;
    height: number;
    mode?: TemplateMode;
    frameImages: {
      common?: string;
      uncommon?: string;
      rare?: string;
      epic?: string;
      legendary?: string;
    };
    defaultFrameImageUrl?: string;
    artworkBounds: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
  /** Blocks to render */
  blocks: CardTemplateBlock[];
  /** Currently selected block ID */
  selectedBlockId: Id<"cardTemplateBlocks"> | null;
  /** Current zoom level */
  zoom: number;
  /** Show grid overlay */
  showGrid: boolean;
  /** Show artwork bounds indicator */
  showArtworkBounds: boolean;
  /** Current rarity for preview */
  previewRarity: Rarity;
  /** Preview artwork URL (used in frame_artwork mode) */
  previewArtworkUrl?: string;
  /** Full card image URL (used in full_card_image mode) */
  previewCardImageUrl?: string;
  /** Callback when a block is selected */
  onSelectBlock: (id: Id<"cardTemplateBlocks"> | null) => void;
  /** Callback when a block position changes */
  onBlockMove: (
    id: Id<"cardTemplateBlocks">,
    position: { x: number; y: number }
  ) => void;
  /** Callback when a block is transformed */
  onBlockTransform?: (
    id: Id<"cardTemplateBlocks">,
    attrs: {
      x: number;
      y: number;
      width: number;
      height: number;
      rotation?: number;
    }
  ) => void;
  /** Reference to expose stage for export */
  stageRef?: React.RefObject<Konva.Stage | null>;
}

export function KonvaCanvas({
  template,
  blocks,
  selectedBlockId,
  zoom,
  showGrid,
  showArtworkBounds,
  previewRarity,
  previewArtworkUrl,
  previewCardImageUrl,
  onSelectBlock,
  onBlockMove,
  onBlockTransform,
  stageRef: externalStageRef,
}: KonvaCanvasProps) {
  // Determine rendering mode (default to frame_artwork for backwards compatibility)
  const mode = template.mode ?? "frame_artwork";
  const internalStageRef = useRef<Konva.Stage>(null);
  const stageRef = externalStageRef ?? internalStageRef;
  const containerRef = useRef<HTMLDivElement>(null);

  // Snapping functionality
  const { snapPosition, activeGuides, clearGuides } = useSnapToGrid();

  // Calculate scaled dimensions
  const scaledWidth = CANVAS_WIDTH * zoom;
  const scaledHeight = CANVAS_HEIGHT * zoom;

  // Click on empty space deselects
  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      // Only deselect if clicking on the stage or background
      const clickedOnEmpty = e.target === e.target.getStage();
      const clickedOnBackground =
        e.target.getLayer()?.name() === "background-layer" ||
        e.target.getLayer()?.name() === "artwork-layer";

      if (clickedOnEmpty || clickedOnBackground) {
        onSelectBlock(null);
      }
    },
    [onSelectBlock]
  );

  // Handle block drag with snapping
  const handleBlockDragEnd = useCallback(
    (id: Id<"cardTemplateBlocks">, position: { x: number; y: number }) => {
      const block = blocks.find((b) => b._id === id);
      if (!block) return;

      // Apply snapping
      const snapped = snapPosition(position.x, position.y, block.width, block.height);
      onBlockMove(id, snapped);
      clearGuides();
    },
    [blocks, snapPosition, onBlockMove, clearGuides]
  );

  // Handle block transform
  const handleBlockTransform = useCallback(
    (
      id: Id<"cardTemplateBlocks">,
      attrs: {
        x: number;
        y: number;
        width: number;
        height: number;
        rotation?: number;
      }
    ) => {
      if (onBlockTransform) {
        // Apply snapping to final position
        const snapped = snapPosition(attrs.x, attrs.y, attrs.width, attrs.height);
        onBlockTransform(id, { ...attrs, x: snapped.x, y: snapped.y });
      }
      clearGuides();
    },
    [onBlockTransform, snapPosition, clearGuides]
  );

  // Render grid
  const renderGrid = useCallback(() => {
    if (!showGrid) return null;

    const gridSize = 10; // 10px grid cells
    const lines: React.ReactNode[] = [];

    // Vertical lines
    for (let x = 0; x <= CANVAS_WIDTH; x += gridSize) {
      lines.push(
        <Line
          key={`v-${x}`}
          points={[x, 0, x, CANVAS_HEIGHT]}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={1}
        />
      );
    }

    // Horizontal lines
    for (let y = 0; y <= CANVAS_HEIGHT; y += gridSize) {
      lines.push(
        <Line
          key={`h-${y}`}
          points={[0, y, CANVAS_WIDTH, y]}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={1}
        />
      );
    }

    return <Layer name="grid-layer">{lines}</Layer>;
  }, [showGrid]);

  // Separate text and image blocks
  const textBlocks = blocks.filter((b) => !isImageBlockType(b.blockType));
  const imageBlocks = blocks.filter((b) => isImageBlockType(b.blockType));

  return (
    <div
      ref={containerRef}
      className="relative overflow-auto bg-[#121212] rounded-lg"
      style={{
        width: scaledWidth,
        height: scaledHeight,
      }}
    >
      <Stage
        ref={stageRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        scaleX={zoom}
        scaleY={zoom}
        onClick={handleStageClick}
        onTap={handleStageClick}
        style={{
          backgroundColor: "#121212",
        }}
      >
        {/* Layer 1: Background (frame image or full card image) */}
        <BackgroundLayer
          mode={mode}
          frameImages={template.frameImages}
          defaultFrameUrl={template.defaultFrameImageUrl}
          cardImageUrl={previewCardImageUrl}
          previewRarity={previewRarity}
        />

        {/* Layer 2: Artwork (only in frame_artwork mode) */}
        {mode === "frame_artwork" && (
          <ArtworkLayer
            artworkBounds={template.artworkBounds}
            artworkUrl={previewArtworkUrl}
            showBounds={showArtworkBounds}
          />
        )}

        {/* Grid overlay */}
        {renderGrid()}

        {/* Layer 3: Text/Content blocks */}
        <TextLayer
          blocks={textBlocks}
          selectedBlockId={selectedBlockId}
          onSelect={onSelectBlock}
          onDragEnd={handleBlockDragEnd}
          onTransformEnd={handleBlockTransform}
        />

        {/* Layer 4: Image/Effects blocks */}
        <EffectsLayer
          blocks={imageBlocks}
          selectedBlockId={selectedBlockId}
          onSelect={onSelectBlock}
          onDragEnd={handleBlockDragEnd}
          onTransformEnd={handleBlockTransform}
        />

        {/* Layer 5: Selection/guides (not exported) */}
        <Layer name="selection-layer">
          <SelectionRect rect={null} guides={activeGuides} zoom={zoom} />
        </Layer>
      </Stage>
    </div>
  );
}
