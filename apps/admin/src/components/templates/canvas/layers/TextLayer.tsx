"use client";

/**
 * Text Layer (Content Layer)
 *
 * Renders all text blocks on the canvas.
 */

import { Layer } from "react-konva";
import type { CardTemplateBlock, BlockId, BlockPosition, BlockTransformAttrs } from "../../types";
import { isTextBlockType } from "../../types";
import { DraggableText } from "../elements/DraggableText";

interface TextLayerProps {
  /** All blocks to render */
  blocks: CardTemplateBlock[];
  /** Currently selected block ID */
  selectedBlockId: BlockId | null;
  /** Callback when a block is selected */
  onSelect: (id: BlockId) => void;
  /** Callback when a block is dragged */
  onDragEnd: (id: BlockId, position: BlockPosition) => void;
  /** Callback when a block is transformed */
  onTransformEnd?: (id: BlockId, attrs: BlockTransformAttrs) => void;
}

export function TextLayer({
  blocks,
  selectedBlockId,
  onSelect,
  onDragEnd,
  onTransformEnd,
}: TextLayerProps) {
  // Filter to only text blocks and sort by z-index
  const textBlocks = blocks
    .filter((block) => isTextBlockType(block.blockType))
    .sort((a, b) => a.zIndex - b.zIndex);

  return (
    <Layer name="text-layer">
      {textBlocks.map((block) => (
        <DraggableText
          key={block._id}
          block={block}
          isSelected={block._id === selectedBlockId}
          onSelect={onSelect}
          onDragEnd={onDragEnd}
          onTransformEnd={onTransformEnd}
        />
      ))}
    </Layer>
  );
}
