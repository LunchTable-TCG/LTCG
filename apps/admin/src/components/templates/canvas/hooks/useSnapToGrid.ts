/**
 * Snap to Grid Hook
 *
 * Provides grid snapping and alignment guide functionality for the canvas.
 */

import { useCallback, useState } from "react";
import type { SnapGuide } from "../../types";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../../types";

interface SnapConfig {
  /** Enable grid snapping */
  enabled: boolean;
  /** Grid cell size in percentage */
  gridSize: number;
  /** Snap threshold in percentage */
  threshold: number;
  /** Show alignment guides */
  showGuides: boolean;
}

interface UseSnapToGridResult {
  /** Current snap configuration */
  config: SnapConfig;
  /** Update snap configuration */
  setConfig: (config: Partial<SnapConfig>) => void;
  /** Toggle snapping on/off */
  toggleSnapping: () => void;
  /** Snap a position to grid */
  snapPosition: (
    x: number,
    y: number,
    width: number,
    height: number
  ) => { x: number; y: number };
  /** Get alignment guides for current position */
  getAlignmentGuides: (
    x: number,
    y: number,
    width: number,
    height: number,
    otherBlocks: Array<{ x: number; y: number; width: number; height: number }>
  ) => SnapGuide[];
  /** Active alignment guides */
  activeGuides: SnapGuide[];
  /** Clear active guides */
  clearGuides: () => void;
}

const DEFAULT_CONFIG: SnapConfig = {
  enabled: true,
  gridSize: 2, // 2% grid (50 cells across)
  threshold: 1, // 1% snap threshold
  showGuides: true,
};

export function useSnapToGrid(): UseSnapToGridResult {
  const [config, setConfigState] = useState<SnapConfig>(DEFAULT_CONFIG);
  const [activeGuides, setActiveGuides] = useState<SnapGuide[]>([]);

  const setConfig = useCallback((updates: Partial<SnapConfig>) => {
    setConfigState((prev) => ({ ...prev, ...updates }));
  }, []);

  const toggleSnapping = useCallback(() => {
    setConfigState((prev) => ({ ...prev, enabled: !prev.enabled }));
  }, []);

  const snapToGrid = useCallback(
    (value: number) => {
      if (!config.enabled) return value;
      const gridSize = config.gridSize;
      return Math.round(value / gridSize) * gridSize;
    },
    [config.enabled, config.gridSize]
  );

  const snapPosition = useCallback(
    (x: number, y: number, width: number, height: number) => {
      if (!config.enabled) return { x, y };

      // Snap all edges and center
      const centerX = x + width / 2;
      const centerY = y + height / 2;
      const rightEdge = x + width;
      const bottomEdge = y + height;

      // Snap left edge
      const snappedLeft = snapToGrid(x);
      // Snap center
      const snappedCenterX = snapToGrid(centerX) - width / 2;
      // Snap right edge
      const snappedRight = snapToGrid(rightEdge) - width;

      // Pick closest snap for X
      const xOptions = [
        { value: snappedLeft, dist: Math.abs(snappedLeft - x) },
        { value: snappedCenterX, dist: Math.abs(snappedCenterX - x) },
        { value: snappedRight, dist: Math.abs(snappedRight - x) },
      ];
      const bestX = xOptions.reduce((a, b) => (a.dist < b.dist ? a : b));

      // Same for Y
      const snappedTop = snapToGrid(y);
      const snappedCenterY = snapToGrid(centerY) - height / 2;
      const snappedBottom = snapToGrid(bottomEdge) - height;

      const yOptions = [
        { value: snappedTop, dist: Math.abs(snappedTop - y) },
        { value: snappedCenterY, dist: Math.abs(snappedCenterY - y) },
        { value: snappedBottom, dist: Math.abs(snappedBottom - y) },
      ];
      const bestY = yOptions.reduce((a, b) => (a.dist < b.dist ? a : b));

      return {
        x: bestX.dist < config.threshold ? bestX.value : x,
        y: bestY.dist < config.threshold ? bestY.value : y,
      };
    },
    [config.enabled, config.threshold, snapToGrid]
  );

  const getAlignmentGuides = useCallback(
    (
      x: number,
      y: number,
      width: number,
      height: number,
      otherBlocks: Array<{ x: number; y: number; width: number; height: number }>
    ): SnapGuide[] => {
      if (!config.showGuides) return [];

      const guides: SnapGuide[] = [];
      const threshold = config.threshold;

      const centerX = x + width / 2;
      const centerY = y + height / 2;
      const rightEdge = x + width;
      const bottomEdge = y + height;

      // Canvas center guides
      const canvasCenterX = 50;
      const canvasCenterY = 50;

      if (Math.abs(centerX - canvasCenterX) < threshold) {
        guides.push({
          orientation: "vertical",
          position: canvasCenterX,
          type: "center",
        });
      }

      if (Math.abs(centerY - canvasCenterY) < threshold) {
        guides.push({
          orientation: "horizontal",
          position: canvasCenterY,
          type: "center",
        });
      }

      // Check alignment with other blocks
      for (const block of otherBlocks) {
        const blockCenterX = block.x + block.width / 2;
        const blockCenterY = block.y + block.height / 2;
        const blockRight = block.x + block.width;
        const blockBottom = block.y + block.height;

        // Vertical alignment (X axis)
        // Left edge alignment
        if (Math.abs(x - block.x) < threshold) {
          guides.push({
            orientation: "vertical",
            position: block.x,
            type: "edge",
          });
        }
        // Right edge alignment
        if (Math.abs(rightEdge - blockRight) < threshold) {
          guides.push({
            orientation: "vertical",
            position: blockRight,
            type: "edge",
          });
        }
        // Center alignment
        if (Math.abs(centerX - blockCenterX) < threshold) {
          guides.push({
            orientation: "vertical",
            position: blockCenterX,
            type: "center",
          });
        }

        // Horizontal alignment (Y axis)
        // Top edge alignment
        if (Math.abs(y - block.y) < threshold) {
          guides.push({
            orientation: "horizontal",
            position: block.y,
            type: "edge",
          });
        }
        // Bottom edge alignment
        if (Math.abs(bottomEdge - blockBottom) < threshold) {
          guides.push({
            orientation: "horizontal",
            position: blockBottom,
            type: "edge",
          });
        }
        // Center alignment
        if (Math.abs(centerY - blockCenterY) < threshold) {
          guides.push({
            orientation: "horizontal",
            position: blockCenterY,
            type: "center",
          });
        }
      }

      // Deduplicate guides
      const uniqueGuides = guides.filter(
        (guide, index, self) =>
          index ===
          self.findIndex(
            (g) =>
              g.orientation === guide.orientation &&
              Math.abs(g.position - guide.position) < 0.1
          )
      );

      setActiveGuides(uniqueGuides);
      return uniqueGuides;
    },
    [config.showGuides, config.threshold]
  );

  const clearGuides = useCallback(() => {
    setActiveGuides([]);
  }, []);

  return {
    config,
    setConfig,
    toggleSnapping,
    snapPosition,
    getAlignmentGuides,
    activeGuides,
    clearGuides,
  };
}

/** Convert percentage position to pixel position */
export function percentToPixel(
  percent: number,
  dimension: "width" | "height"
) {
  const base = dimension === "width" ? CANVAS_WIDTH : CANVAS_HEIGHT;
  return (percent / 100) * base;
}

/** Convert pixel position to percentage position */
export function pixelToPercent(
  pixel: number,
  dimension: "width" | "height"
) {
  const base = dimension === "width" ? CANVAS_WIDTH : CANVAS_HEIGHT;
  return (pixel / base) * 100;
}
