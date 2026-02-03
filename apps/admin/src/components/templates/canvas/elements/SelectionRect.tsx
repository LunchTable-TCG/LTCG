"use client";

/**
 * Selection Rectangle
 *
 * Renders a selection rectangle for multi-select and alignment guides.
 */

import { Rect, Line } from "react-konva";
import type { SnapGuide } from "../../types";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../../types";

interface SelectionRectProps {
  /** Selection rectangle bounds (null if not active) */
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  /** Active alignment guides */
  guides: SnapGuide[];
  /** Canvas zoom level */
  zoom: number;
}

/** Convert percentage to pixels */
function toPixels(percent: number, dimension: "width" | "height") {
  const base = dimension === "width" ? CANVAS_WIDTH : CANVAS_HEIGHT;
  return (percent / 100) * base;
}

export function SelectionRect({ rect, guides, zoom }: SelectionRectProps) {
  return (
    <>
      {/* Multi-select rectangle */}
      {rect && (
        <Rect
          x={toPixels(rect.x, "width")}
          y={toPixels(rect.y, "height")}
          width={toPixels(rect.width, "width")}
          height={toPixels(rect.height, "height")}
          fill="rgba(59, 130, 246, 0.1)"
          stroke="#3b82f6"
          strokeWidth={1 / zoom}
          dash={[4 / zoom, 4 / zoom]}
        />
      )}

      {/* Alignment guides */}
      {guides.map((guide, index) => {
        if (guide.orientation === "vertical") {
          const x = toPixels(guide.position, "width");
          return (
            <Line
              key={`v-${index}`}
              points={[x, 0, x, CANVAS_HEIGHT]}
              stroke={guide.type === "center" ? "#f59e0b" : "#3b82f6"}
              strokeWidth={1 / zoom}
              dash={guide.type === "center" ? [8 / zoom, 4 / zoom] : undefined}
            />
          );
        } else {
          const y = toPixels(guide.position, "height");
          return (
            <Line
              key={`h-${index}`}
              points={[0, y, CANVAS_WIDTH, y]}
              stroke={guide.type === "center" ? "#f59e0b" : "#3b82f6"}
              strokeWidth={1 / zoom}
              dash={guide.type === "center" ? [8 / zoom, 4 / zoom] : undefined}
            />
          );
        }
      })}
    </>
  );
}
