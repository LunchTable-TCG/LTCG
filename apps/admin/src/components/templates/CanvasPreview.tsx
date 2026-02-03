"use client";

/**
 * CanvasPreview Component
 *
 * Renders the card template canvas with draggable text blocks.
 * Supports zoom and displays artwork area.
 */

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { TextBlockLayer } from "./TextBlockLayer";
import type {
  CardTemplateBlock,
  TemplateWithBlocks,
  CardPreviewData,
  Rarity,
} from "./types";

interface CanvasPreviewProps {
  template: TemplateWithBlocks;
  blocks: CardTemplateBlock[];
  selectedBlockId: string | null;
  onSelectBlock: (blockId: string | null) => void;
  zoom: number;
  previewData: CardPreviewData;
  previewRarity: Rarity;
  showGrid?: boolean;
  showArtworkBounds?: boolean;
}

export function CanvasPreview({
  template,
  blocks,
  selectedBlockId,
  onSelectBlock,
  zoom,
  previewData,
  previewRarity,
  showGrid = true,
  showArtworkBounds = true,
}: CanvasPreviewProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: "canvas",
  });

  // Get frame URL based on rarity
  const frameUrl =
    template.frameImages[previewRarity] || template.defaultFrameImageUrl;

  // Calculate scaled dimensions
  const scaledWidth = template.width * zoom;
  const scaledHeight = template.height * zoom;

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-muted/30 overflow-auto">
      <div
        ref={setNodeRef}
        id="card-canvas"
        className={cn(
          "relative bg-card rounded-lg shadow-xl overflow-hidden transition-shadow",
          isOver && "ring-2 ring-primary ring-offset-2"
        )}
        style={{
          width: scaledWidth,
          height: scaledHeight,
        }}
        onClick={(e) => {
          // Deselect when clicking canvas background
          if (e.target === e.currentTarget) {
            onSelectBlock(null);
          }
        }}
      >
        {/* Grid overlay */}
        {showGrid && (
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: `
                linear-gradient(to right, var(--border) 1px, transparent 1px),
                linear-gradient(to bottom, var(--border) 1px, transparent 1px)
              `,
              backgroundSize: `${10 * zoom}px ${10 * zoom}px`,
            }}
          />
        )}

        {/* Frame/Background Image */}
        {frameUrl && (
          <img
            src={frameUrl}
            alt="Card frame"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            draggable={false}
          />
        )}

        {/* Artwork area indicator */}
        {showArtworkBounds && (
          <div
            className="absolute border-2 border-dashed border-primary/40 rounded bg-primary/5 pointer-events-none"
            style={{
              left: `${(template.artworkBounds.x / template.width) * 100}%`,
              top: `${(template.artworkBounds.y / template.height) * 100}%`,
              width: `${(template.artworkBounds.width / template.width) * 100}%`,
              height: `${(template.artworkBounds.height / template.height) * 100}%`,
            }}
          >
            {/* Artwork placeholder or actual image */}
            {previewData.imageUrl ? (
              <img
                src={previewData.imageUrl}
                alt="Card artwork"
                className="w-full h-full object-cover rounded"
                draggable={false}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-primary/40 text-xs">
                Artwork Area
              </div>
            )}
          </div>
        )}

        {/* Text Blocks */}
        {blocks
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((block) => (
            <TextBlockLayer
              key={block._id}
              block={block}
              isSelected={selectedBlockId === block._id}
              onSelect={() => onSelectBlock(block._id)}
              zoom={zoom}
              previewData={previewData}
            />
          ))}
      </div>
    </div>
  );
}

/**
 * Get the content to display for a block based on its type
 */
export function getBlockContent(
  block: CardTemplateBlock,
  previewData: CardPreviewData
): string {
  switch (block.blockType) {
    case "name":
      return previewData.name || "Card Name";
    case "level":
      return previewData.level?.toString() || "8";
    case "attribute":
      return previewData.attribute?.toUpperCase() || "FIRE";
    case "attack":
      return `ATK ${previewData.attack ?? 0}`;
    case "defense":
      return `DEF ${previewData.defense ?? 0}`;
    case "cost":
      return previewData.cost?.toString() || "0";
    case "cardType":
      if (previewData.cardType === "creature") {
        return `${previewData.attribute || "Fire"} ${previewData.monsterType || "Dragon"}`;
      }
      return previewData.cardType?.toUpperCase() || "CREATURE";
    case "monsterType":
      return previewData.monsterType?.toUpperCase() || "DRAGON";
    case "effect":
      return previewData.effect || "Effect text goes here...";
    case "flavorText":
      return previewData.flavorText || "Flavor text...";
    case "custom":
      return block.customContent || "Custom text";
    default:
      return block.label;
  }
}
