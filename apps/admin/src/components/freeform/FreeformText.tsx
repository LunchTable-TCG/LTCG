"use client";

import type Konva from "konva";
import { useEffect, useRef, useState } from "react";
import { Text, Transformer } from "react-konva";
import type { FreeformElement, ElementId } from "./types";

interface FreeformTextProps {
  element: FreeformElement;
  isSelected: boolean;
  onSelect: (id: ElementId) => void;
  onTransform: (id: ElementId, attrs: { x: number; y: number; width: number; height: number; rotation: number }) => void;
  onDragEnd: (id: ElementId, x: number, y: number) => void;
  onTextChange: (id: ElementId, text: string) => void;
}

export function FreeformText({ element, isSelected, onSelect, onTransform, onDragEnd, onTextChange }: FreeformTextProps) {
  const textRef = useRef<Konva.Text>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (isSelected && transformerRef.current && textRef.current) {
      transformerRef.current.nodes([textRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  const handleDblClick = () => {
    setIsEditing(true);

    const textNode = textRef.current;
    if (!textNode) return;

    const stage = textNode.getStage();
    if (!stage) return;

    // Hide text node, show textarea
    textNode.hide();
    transformerRef.current?.hide();

    const textPosition = textNode.absolutePosition();
    const stageBox = stage.container().getBoundingClientRect();
    const scale = stage.scaleX();

    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);

    textarea.value = element.text || "Text";
    textarea.style.position = "absolute";
    textarea.style.top = `${stageBox.top + textPosition.y * scale}px`;
    textarea.style.left = `${stageBox.left + textPosition.x * scale}px`;
    textarea.style.width = `${element.width * scale}px`;
    textarea.style.height = `${element.height * scale}px`;
    textarea.style.fontSize = `${(element.fontSize || 24) * scale}px`;
    textarea.style.fontFamily = element.fontFamily || "Arial";
    textarea.style.color = element.fill || "#ffffff";
    textarea.style.background = "rgba(0,0,0,0.7)";
    textarea.style.border = "2px solid #3b82f6";
    textarea.style.borderRadius = "4px";
    textarea.style.padding = "4px";
    textarea.style.outline = "none";
    textarea.style.resize = "none";
    textarea.style.zIndex = "10000";
    textarea.style.lineHeight = "1.2";

    textarea.focus();
    textarea.select();

    const removeTextarea = () => {
      textarea.remove();
      textNode.show();
      transformerRef.current?.show();
      transformerRef.current?.getLayer()?.batchDraw();
      setIsEditing(false);
    };

    textarea.addEventListener("blur", () => {
      onTextChange(element._id, textarea.value);
      removeTextarea();
    });

    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        removeTextarea();
      }
      if (e.key === "Enter" && !e.shiftKey) {
        onTextChange(element._id, textarea.value);
        removeTextarea();
      }
    });
  };

  return (
    <>
      <Text
        ref={textRef}
        text={element.text || "Text"}
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        rotation={element.rotation}
        opacity={element.opacity}
        fontSize={element.fontSize || 24}
        fontFamily={element.fontFamily || "Arial"}
        fontStyle={`${element.fontWeight || "normal"} ${element.fontStyle || "normal"}`}
        fill={element.fill || "#ffffff"}
        align={element.align || "left"}
        verticalAlign="top"
        draggable
        onClick={() => onSelect(element._id)}
        onTap={() => onSelect(element._id)}
        onDblClick={handleDblClick}
        onDblTap={handleDblClick}
        onDragEnd={(e) => {
          onDragEnd(element._id, e.target.x(), e.target.y());
        }}
        onTransformEnd={() => {
          const node = textRef.current;
          if (!node) return;

          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          node.scaleX(1);
          node.scaleY(1);

          onTransform(element._id, {
            x: node.x(),
            y: node.y(),
            width: Math.max(20, node.width() * scaleX),
            height: Math.max(10, node.height() * scaleY),
            rotation: node.rotation(),
          });
        }}
      />
      {isSelected && !isEditing && (
        <Transformer
          ref={transformerRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 20 || newBox.height < 10) return oldBox;
            return newBox;
          }}
          rotateEnabled
          keepRatio={false}
          enabledAnchors={[
            "top-left", "top-right", "bottom-left", "bottom-right",
            "middle-left", "middle-right",
          ]}
        />
      )}
    </>
  );
}
