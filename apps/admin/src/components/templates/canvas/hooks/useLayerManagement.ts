/**
 * Layer Management Hook
 *
 * Manages layer ordering, visibility, and locking for canvas elements.
 */

import { useCallback, useMemo } from "react";
import type { Id } from "@convex/_generated/dataModel";
import type { CardTemplateBlock } from "../../types";

interface LayerItem {
  id: Id<"cardTemplateBlocks">;
  zIndex: number;
  label: string;
  blockType: string;
  isVisible: boolean;
  isLocked: boolean;
}

interface UseLayerManagementProps {
  blocks: CardTemplateBlock[];
  onReorder: (blockIds: Id<"cardTemplateBlocks">[]) => void;
}

interface UseLayerManagementResult {
  /** Blocks sorted by z-index (bottom to top) */
  sortedBlocks: CardTemplateBlock[];
  /** Layer items for the layers panel */
  layers: LayerItem[];
  /** Move block to front (highest z-index) */
  bringToFront: (blockId: Id<"cardTemplateBlocks">) => void;
  /** Move block to back (lowest z-index) */
  sendToBack: (blockId: Id<"cardTemplateBlocks">) => void;
  /** Move block forward one layer */
  bringForward: (blockId: Id<"cardTemplateBlocks">) => void;
  /** Move block backward one layer */
  sendBackward: (blockId: Id<"cardTemplateBlocks">) => void;
  /** Move block to specific index */
  moveToIndex: (blockId: Id<"cardTemplateBlocks">, newIndex: number) => void;
  /** Get z-index for a block */
  getZIndex: (blockId: Id<"cardTemplateBlocks">) => number;
}

export function useLayerManagement({
  blocks,
  onReorder,
}: UseLayerManagementProps): UseLayerManagementResult {
  // Sort blocks by z-index (lowest first = bottom)
  const sortedBlocks = useMemo(() => {
    return [...blocks].sort((a, b) => a.zIndex - b.zIndex);
  }, [blocks]);

  // Convert to layer items for the panel (reversed for display - top items first)
  const layers = useMemo((): LayerItem[] => {
    return [...sortedBlocks]
      .reverse()
      .map((block) => ({
        id: block._id,
        zIndex: block.zIndex,
        label: block.label,
        blockType: block.blockType,
        isVisible: true, // Could be extended with visibility state
        isLocked: false, // Could be extended with lock state
      }));
  }, [sortedBlocks]);

  const getBlockIndex = useCallback(
    (blockId: Id<"cardTemplateBlocks">) => {
      return sortedBlocks.findIndex((b) => b._id === blockId);
    },
    [sortedBlocks]
  );

  const reorderBlocks = useCallback(
    (fromIndex: number, toIndex: number) => {
      const newOrder = [...sortedBlocks];
      const [moved] = newOrder.splice(fromIndex, 1);
      if (moved) {
        newOrder.splice(toIndex, 0, moved);
      }
      onReorder(newOrder.map((b) => b._id));
    },
    [sortedBlocks, onReorder]
  );

  const bringToFront = useCallback(
    (blockId: Id<"cardTemplateBlocks">) => {
      const currentIndex = getBlockIndex(blockId);
      if (currentIndex === -1 || currentIndex === sortedBlocks.length - 1) return;
      reorderBlocks(currentIndex, sortedBlocks.length - 1);
    },
    [getBlockIndex, sortedBlocks.length, reorderBlocks]
  );

  const sendToBack = useCallback(
    (blockId: Id<"cardTemplateBlocks">) => {
      const currentIndex = getBlockIndex(blockId);
      if (currentIndex === -1 || currentIndex === 0) return;
      reorderBlocks(currentIndex, 0);
    },
    [getBlockIndex, reorderBlocks]
  );

  const bringForward = useCallback(
    (blockId: Id<"cardTemplateBlocks">) => {
      const currentIndex = getBlockIndex(blockId);
      if (currentIndex === -1 || currentIndex === sortedBlocks.length - 1) return;
      reorderBlocks(currentIndex, currentIndex + 1);
    },
    [getBlockIndex, sortedBlocks.length, reorderBlocks]
  );

  const sendBackward = useCallback(
    (blockId: Id<"cardTemplateBlocks">) => {
      const currentIndex = getBlockIndex(blockId);
      if (currentIndex === -1 || currentIndex === 0) return;
      reorderBlocks(currentIndex, currentIndex - 1);
    },
    [getBlockIndex, reorderBlocks]
  );

  const moveToIndex = useCallback(
    (blockId: Id<"cardTemplateBlocks">, newIndex: number) => {
      const currentIndex = getBlockIndex(blockId);
      if (currentIndex === -1 || newIndex < 0 || newIndex >= sortedBlocks.length)
        return;
      if (currentIndex === newIndex) return;
      reorderBlocks(currentIndex, newIndex);
    },
    [getBlockIndex, sortedBlocks.length, reorderBlocks]
  );

  const getZIndex = useCallback(
    (blockId: Id<"cardTemplateBlocks">) => {
      const block = blocks.find((b) => b._id === blockId);
      return block?.zIndex ?? 0;
    },
    [blocks]
  );

  return {
    sortedBlocks,
    layers,
    bringToFront,
    sendToBack,
    bringForward,
    sendBackward,
    moveToIndex,
    getZIndex,
  };
}
