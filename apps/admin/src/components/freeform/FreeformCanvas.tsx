"use client";

import { useCallback, useRef } from "react";
import { Layer, Rect, Stage } from "react-konva";
import type Konva from "konva";
import type { FreeformElement, ElementId } from "./types";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "./types";
import { FreeformImage } from "./FreeformImage";
import { FreeformText } from "./FreeformText";

interface FreeformCanvasProps {
  elements: FreeformElement[];
  selectedElementId: ElementId | null;
  zoom: number;
  onSelectElement: (id: ElementId | null) => void;
  onElementDragEnd: (id: ElementId, x: number, y: number) => void;
  onElementTransform: (id: ElementId, attrs: { x: number; y: number; width: number; height: number; rotation: number }) => void;
  onTextChange: (id: ElementId, text: string) => void;
  onDrop?: (files: File[], x: number, y: number) => void;
  stageRef?: React.RefObject<Konva.Stage | null>;
}

export function FreeformCanvas({
  elements,
  selectedElementId,
  zoom,
  onSelectElement,
  onElementDragEnd,
  onElementTransform,
  onTextChange,
  onDrop,
  stageRef: externalStageRef,
}: FreeformCanvasProps) {
  const internalStageRef = useRef<Konva.Stage>(null);
  const stageRef = externalStageRef || internalStageRef;
  const containerRef = useRef<HTMLDivElement>(null);

  // Sort elements by zIndex for rendering order
  const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      // Click on empty area = deselect
      if (e.target === e.target.getStage() || e.target.name() === "background") {
        onSelectElement(null);
      }
    },
    [onSelectElement]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDropEvent = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!onDrop) return;

      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/")
      );
      if (files.length === 0) return;

      // Calculate drop position on canvas
      const stage = stageRef.current;
      if (!stage) return;

      const stageBox = stage.container().getBoundingClientRect();
      const x = (e.clientX - stageBox.left) / zoom;
      const y = (e.clientY - stageBox.top) / zoom;

      onDrop(files, x, y);
    },
    [onDrop, zoom, stageRef]
  );

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-center flex-1 overflow-auto bg-neutral-900/50"
      onDragOver={handleDragOver}
      onDrop={handleDropEvent}
    >
      <div
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: "center center",
        }}
      >
        <Stage
          ref={stageRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onClick={handleStageClick}
          onTap={handleStageClick}
          style={{
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "4px",
            boxShadow: "0 0 40px rgba(0,0,0,0.5)",
          }}
        >
          <Layer>
            {/* Canvas background */}
            <Rect
              name="background"
              x={0}
              y={0}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              fill="#1a1a2e"
            />

            {/* Render elements */}
            {sortedElements.map((el) => {
              if (el.type === "image") {
                return (
                  <FreeformImage
                    key={el._id}
                    element={el}
                    isSelected={selectedElementId === el._id}
                    onSelect={onSelectElement}
                    onTransform={onElementTransform}
                    onDragEnd={onElementDragEnd}
                  />
                );
              }
              if (el.type === "text") {
                return (
                  <FreeformText
                    key={el._id}
                    element={el}
                    isSelected={selectedElementId === el._id}
                    onSelect={onSelectElement}
                    onTransform={onElementTransform}
                    onDragEnd={onElementDragEnd}
                    onTextChange={onTextChange}
                  />
                );
              }
              return null;
            })}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}
