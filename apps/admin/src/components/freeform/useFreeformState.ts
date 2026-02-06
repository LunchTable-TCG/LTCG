"use client";

import { useCallback, useState } from "react";
import type { ElementId } from "./types";

export function useFreeformState() {
  const [selectedElementId, setSelectedElementId] = useState<ElementId | null>(null);
  const [zoom, setZoom] = useState(0.5);

  const selectElement = useCallback((id: ElementId | null) => {
    setSelectedElementId(id);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedElementId(null);
  }, []);

  const zoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + 0.25, 2));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((z) => Math.max(z - 0.25, 0.25));
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(0.5);
  }, []);

  return {
    selectedElementId,
    selectElement,
    clearSelection,
    zoom,
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
  };
}
