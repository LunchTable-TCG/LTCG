"use client";

/**
 * Draggable Text Element
 *
 * A Konva text element that can be dragged, resized, and edited.
 */

import { useRef, useEffect, useCallback } from "react";
import { Text, Group, Rect, Transformer } from "react-konva";
import type Konva from "konva";
import type { CardTemplateBlock, BlockId, BlockPosition, BlockTransformAttrs } from "../../types";
import { CANVAS_WIDTH, CANVAS_HEIGHT, SAMPLE_CARD_DATA } from "../../types";

interface DraggableTextProps {
  block: CardTemplateBlock;
  isSelected: boolean;
  onSelect: (id: BlockId) => void;
  onDragEnd: (id: BlockId, position: BlockPosition) => void;
  onTransformEnd?: (id: BlockId, attrs: BlockTransformAttrs) => void;
}

/** Get content to display for a block type */
function getBlockContent(block: CardTemplateBlock): string {
  const data = SAMPLE_CARD_DATA;

  switch (block.blockType) {
    case "name":
      return data.name;
    case "level":
      return data.level?.toString() ?? "";
    case "attribute":
      return data.attribute?.toUpperCase() ?? "";
    case "attack":
      return `ATK ${data.attack ?? 0}`;
    case "defense":
      return `DEF ${data.defense ?? 0}`;
    case "cost":
      return data.cost.toString();
    case "cardType":
      return data.cardType.toUpperCase();
    case "monsterType":
      return data.monsterType ?? "";
    case "effect":
      return data.effect ?? "";
    case "flavorText":
      return data.flavorText ?? "";
    case "custom":
      return block.customContent ?? "Custom Text";
    default:
      return "";
  }
}

/** Convert percentage to pixels */
function toPixels(percent: number, dimension: "width" | "height") {
  const base = dimension === "width" ? CANVAS_WIDTH : CANVAS_HEIGHT;
  return (percent / 100) * base;
}

/** Convert pixels to percentage */
function toPercent(pixels: number, dimension: "width" | "height") {
  const base = dimension === "width" ? CANVAS_WIDTH : CANVAS_HEIGHT;
  return (pixels / base) * 100;
}

export function DraggableText({
  block,
  isSelected,
  onSelect,
  onDragEnd,
  onTransformEnd,
}: DraggableTextProps) {
  const groupRef = useRef<Konva.Group>(null);
  const textRef = useRef<Konva.Text>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  // Convert percentage positions to pixels
  const x = toPixels(block.x, "width");
  const y = toPixels(block.y, "height");
  const width = toPixels(block.width, "width");
  const height = toPixels(block.height, "height");

  // Attach transformer when selected
  useEffect(() => {
    if (isSelected && transformerRef.current && groupRef.current) {
      transformerRef.current.nodes([groupRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target;
      const newX = toPercent(node.x(), "width");
      const newY = toPercent(node.y(), "height");
      onDragEnd(block._id, { x: newX, y: newY });
    },
    [block._id, onDragEnd]
  );

  const handleTransformEnd = useCallback(() => {
    if (!groupRef.current || !onTransformEnd) return;

    const node = groupRef.current;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset scale and apply to width/height
    node.scaleX(1);
    node.scaleY(1);

    const newAttrs = {
      x: toPercent(node.x(), "width"),
      y: toPercent(node.y(), "height"),
      width: toPercent(node.width() * scaleX, "width"),
      height: toPercent(node.height() * scaleY, "height"),
    };

    onTransformEnd(block._id, newAttrs);
  }, [block._id, onTransformEnd]);

  const content = getBlockContent(block);
  const padding = block.padding ?? 0;

  return (
    <>
      <Group
        ref={groupRef}
        x={x}
        y={y}
        width={width}
        height={height}
        draggable
        onClick={() => onSelect(block._id)}
        onTap={() => onSelect(block._id)}
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
      >
        {/* Background */}
        {block.backgroundColor && (
          <Rect
            width={width}
            height={height}
            fill={block.backgroundColor}
            cornerRadius={block.borderRadius ?? 0}
          />
        )}

        {/* Border */}
        {block.borderWidth && block.borderWidth > 0 && (
          <Rect
            width={width}
            height={height}
            stroke={block.borderColor ?? "#000"}
            strokeWidth={block.borderWidth}
            cornerRadius={block.borderRadius ?? 0}
          />
        )}

        {/* Text */}
        <Text
          ref={textRef}
          x={padding}
          y={padding}
          width={width - padding * 2}
          height={height - padding * 2}
          text={content}
          fontFamily={block.fontFamily}
          fontSize={block.fontSize}
          fontStyle={
            block.fontWeight === "bold" && block.fontStyle === "italic"
              ? "bold italic"
              : block.fontWeight === "bold"
                ? "bold"
                : block.fontStyle === "italic"
                  ? "italic"
                  : "normal"
          }
          fill={block.color}
          align={block.textAlign}
          verticalAlign="middle"
          wrap="word"
          ellipsis={true}
        />
      </Group>

      {/* Transformer for resize/rotate */}
      {isSelected && (
        <Transformer
          ref={transformerRef}
          rotateEnabled={false}
          boundBoxFunc={(oldBox, newBox) => {
            // Limit minimum size
            const minWidth = 20;
            const minHeight = 20;
            if (newBox.width < minWidth || newBox.height < minHeight) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
}
