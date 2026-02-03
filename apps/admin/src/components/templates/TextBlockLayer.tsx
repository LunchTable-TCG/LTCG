"use client";

/**
 * TextBlockLayer Component
 *
 * A draggable text block that can be positioned on the canvas.
 * Uses @dnd-kit for drag functionality.
 */

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { getBlockContent } from "./CanvasPreview";
import type { CardTemplateBlock, CardPreviewData } from "./types";

interface TextBlockLayerProps {
  block: CardTemplateBlock;
  isSelected: boolean;
  onSelect: () => void;
  zoom: number;
  previewData: CardPreviewData;
}

export function TextBlockLayer({
  block,
  isSelected,
  onSelect,
  zoom,
  previewData,
}: TextBlockLayerProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: block._id,
    data: { block },
  });

  const content = getBlockContent(block, previewData);

  // Calculate position and size based on percentages
  const style: React.CSSProperties = {
    position: "absolute",
    left: `${block.x}%`,
    top: `${block.y}%`,
    width: `${block.width}%`,
    height: `${block.height}%`,
    // Apply drag transform
    transform: CSS.Transform.toString(transform),
    // Typography
    fontFamily: block.fontFamily,
    fontSize: block.fontSize * zoom,
    fontWeight: block.fontWeight,
    fontStyle: block.fontStyle,
    textAlign: block.textAlign,
    color: block.color,
    // Optional styling
    backgroundColor: block.backgroundColor || "transparent",
    borderColor: block.borderColor,
    borderWidth: block.borderWidth ? block.borderWidth * zoom : undefined,
    borderStyle: block.borderWidth ? "solid" : undefined,
    borderRadius: block.borderRadius ? block.borderRadius * zoom : undefined,
    padding: block.padding ? block.padding * zoom : undefined,
    // Layering
    zIndex: block.zIndex + (isDragging ? 1000 : 0),
    // Interaction
    cursor: isDragging ? "grabbing" : "grab",
    userSelect: "none",
    // Overflow
    overflow: "hidden",
    display: "flex",
    alignItems: "flex-start",
    lineHeight: 1.2,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "transition-shadow",
        isSelected && "ring-2 ring-primary ring-offset-1",
        isDragging && "opacity-80 shadow-lg"
      )}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      {...listeners}
      {...attributes}
    >
      {/* Content */}
      <span
        className="w-full"
        style={{
          textAlign: block.textAlign,
          wordBreak: "break-word",
        }}
      >
        {content}
      </span>

      {/* Selection handles */}
      {isSelected && !isDragging && (
        <>
          {/* Corner handles */}
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-primary rounded-full" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-primary rounded-full" />
          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-primary rounded-full" />
          {/* Block type label */}
          <div className="absolute -top-5 left-0 text-[10px] bg-primary text-primary-foreground px-1 rounded">
            {block.label}
          </div>
        </>
      )}
    </div>
  );
}
