"use client";

import type Konva from "konva";
import { useEffect, useRef } from "react";
import { Image, Transformer } from "react-konva";
import useImage from "use-image";
import type { FreeformElement, ElementId } from "./types";

interface FreeformImageProps {
  element: FreeformElement;
  isSelected: boolean;
  onSelect: (id: ElementId) => void;
  onTransform: (id: ElementId, attrs: { x: number; y: number; width: number; height: number; rotation: number }) => void;
  onDragEnd: (id: ElementId, x: number, y: number) => void;
}

export function FreeformImage({ element, isSelected, onSelect, onTransform, onDragEnd }: FreeformImageProps) {
  const imageRef = useRef<Konva.Image>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [image] = useImage(element.imageUrl || "", "anonymous");

  useEffect(() => {
    if (isSelected && transformerRef.current && imageRef.current) {
      transformerRef.current.nodes([imageRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      <Image
        ref={imageRef}
        image={image}
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        rotation={element.rotation}
        opacity={element.opacity}
        draggable
        onClick={() => onSelect(element._id)}
        onTap={() => onSelect(element._id)}
        onDragEnd={(e) => {
          onDragEnd(element._id, e.target.x(), e.target.y());
        }}
        onTransformEnd={() => {
          const node = imageRef.current;
          if (!node) return;

          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          // Reset scale and apply to width/height
          node.scaleX(1);
          node.scaleY(1);

          onTransform(element._id, {
            x: node.x(),
            y: node.y(),
            width: Math.max(5, node.width() * scaleX),
            height: Math.max(5, node.height() * scaleY),
            rotation: node.rotation(),
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={transformerRef}
          boundBoxFunc={(oldBox, newBox) => {
            // Minimum size
            if (newBox.width < 5 || newBox.height < 5) return oldBox;
            return newBox;
          }}
          rotateEnabled
          keepRatio={false}
        />
      )}
    </>
  );
}
