"use client";

/**
 * Effects Layer
 *
 * Renders image blocks and overlay effects.
 */

import { Layer } from "react-konva";
import type { BlockId, BlockPosition, BlockTransformAttrs, CardTemplateBlock } from "../../types";
import { isImageBlockType } from "../../types";
import { DraggableImage } from "../elements/DraggableImage";

interface EffectsLayerProps {
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

export function EffectsLayer({
  blocks,
  selectedBlockId,
  onSelect,
  onDragEnd,
  onTransformEnd,
}: EffectsLayerProps) {
  // Filter to only image blocks and sort by z-index
  const imageBlocks = blocks
    .filter((block) => isImageBlockType(block.blockType))
    .sort((a, b) => a.zIndex - b.zIndex);

  return (
    <Layer name="effects-layer">
      {imageBlocks.map((block) => (
        <DraggableImage
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
