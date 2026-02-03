"use client";

/**
 * Draggable Image Element
 *
 * A Konva image element that can be dragged, resized, and transformed.
 */

import type Konva from "konva";
import { useCallback, useEffect, useRef } from "react";
import { Group, Image, Rect, Transformer } from "react-konva";
import useImage from "use-image";
import type {
  BlockId,
  BlockPosition,
  BlockTransformAttrs,
  CardTemplateBlock,
  ImageFit,
} from "../../types";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../types";

interface DraggableImageProps {
  block: CardTemplateBlock;
  isSelected: boolean;
  onSelect: (id: BlockId) => void;
  onDragEnd: (id: BlockId, position: BlockPosition) => void;
  onTransformEnd?: (id: BlockId, attrs: BlockTransformAttrs) => void;
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

/** Calculate image dimensions based on fit mode */
function calculateImageDimensions(
  imgWidth: number,
  imgHeight: number,
  containerWidth: number,
  containerHeight: number,
  fit: ImageFit = "contain"
): { width: number; height: number; x: number; y: number } {
  const imgAspect = imgWidth / imgHeight;
  const containerAspect = containerWidth / containerHeight;

  let width = containerWidth;
  let height = containerHeight;
  let x = 0;
  let y = 0;

  switch (fit) {
    case "fill":
      // Stretch to fill container
      width = containerWidth;
      height = containerHeight;
      break;

    case "contain":
      // Fit inside container maintaining aspect ratio
      if (imgAspect > containerAspect) {
        width = containerWidth;
        height = containerWidth / imgAspect;
        y = (containerHeight - height) / 2;
      } else {
        height = containerHeight;
        width = containerHeight * imgAspect;
        x = (containerWidth - width) / 2;
      }
      break;

    case "cover":
      // Cover container maintaining aspect ratio (may crop)
      if (imgAspect > containerAspect) {
        height = containerHeight;
        width = containerHeight * imgAspect;
        x = (containerWidth - width) / 2;
      } else {
        width = containerWidth;
        height = containerWidth / imgAspect;
        y = (containerHeight - height) / 2;
      }
      break;

    case "none":
      // Use original image size, centered
      width = imgWidth;
      height = imgHeight;
      x = (containerWidth - width) / 2;
      y = (containerHeight - height) / 2;
      break;
  }

  return { width, height, x, y };
}

export function DraggableImage({
  block,
  isSelected,
  onSelect,
  onDragEnd,
  onTransformEnd,
}: DraggableImageProps) {
  const groupRef = useRef<Konva.Group>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  // Load image
  const [image, status] = useImage(block.imageUrl ?? "", "anonymous");

  // Convert percentage positions to pixels
  const x = toPixels(block.x, "width");
  const y = toPixels(block.y, "height");
  const width = toPixels(block.width, "width");
  const height = toPixels(block.height, "height");
  const rotation = block.rotation ?? 0;
  const opacity = block.opacity ?? 1;

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
      rotation: node.rotation(),
    };

    onTransformEnd(block._id, newAttrs);
  }, [block._id, onTransformEnd]);

  // Calculate image dimensions based on fit mode
  const imageDimensions =
    image && status === "loaded"
      ? calculateImageDimensions(
          image.width,
          image.height,
          width,
          height,
          block.imageFit ?? "contain"
        )
      : null;

  return (
    <>
      <Group
        ref={groupRef}
        x={x}
        y={y}
        width={width}
        height={height}
        rotation={rotation}
        opacity={opacity}
        draggable
        onClick={() => onSelect(block._id)}
        onTap={() => onSelect(block._id)}
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
      >
        {/* Background/Border container */}
        <Rect
          width={width}
          height={height}
          fill={block.backgroundColor ?? "transparent"}
          stroke={block.borderColor ?? (isSelected ? "#3b82f6" : "transparent")}
          strokeWidth={block.borderWidth ?? (isSelected ? 1 : 0)}
          cornerRadius={block.borderRadius ?? 0}
        />

        {/* Placeholder when no image or loading */}
        {(!image || status === "loading") && (
          <Rect x={4} y={4} width={width - 8} height={height - 8} fill="#f3f4f6" cornerRadius={4} />
        )}

        {/* Image */}
        {image && status === "loaded" && imageDimensions && (
          <Image
            image={image}
            x={imageDimensions.x}
            y={imageDimensions.y}
            width={imageDimensions.width}
            height={imageDimensions.height}
          />
        )}
      </Group>

      {/* Transformer for resize/rotate */}
      {isSelected && (
        <Transformer
          ref={transformerRef}
          rotateEnabled={true}
          boundBoxFunc={(oldBox, newBox) => {
            // Limit minimum size
            const minSize = 20;
            if (newBox.width < minSize || newBox.height < minSize) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
}
