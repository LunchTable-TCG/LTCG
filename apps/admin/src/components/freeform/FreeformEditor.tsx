"use client";

import type Konva from "konva";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { typedApi, useConvexMutation } from "@/lib/convexHelpers";
import type { DesignWithElements, ElementId } from "./types";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "./types";
import { FreeformCanvas } from "./FreeformCanvas";
import { FloatingToolbar } from "./FloatingToolbar";
import { FloatingProperties } from "./FloatingProperties";
import { useFreeformState } from "./useFreeformState";
import { useImageUpload } from "./useImageUpload";

interface FreeformEditorProps {
  design: DesignWithElements;
}

export function FreeformEditor({ design }: FreeformEditorProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const [isSaving, setIsSaving] = useState(false);

  const {
    selectedElementId,
    selectElement,
    clearSelection,
    zoom,
    zoomIn,
    zoomOut,
    resetZoom,
  } = useFreeformState();

  const { uploadImage, uploadMultipleImages, isUploading } = useImageUpload();

  // Mutations
  const addElement = useConvexMutation(typedApi.admin.freeformDesigns.addElement);
  const updateElement = useConvexMutation(typedApi.admin.freeformDesigns.updateElement);
  const deleteElement = useConvexMutation(typedApi.admin.freeformDesigns.deleteElement);
  const reorderElements = useConvexMutation(typedApi.admin.freeformDesigns.reorderElements);
  const updateDesign = useConvexMutation(typedApi.admin.freeformDesigns.updateDesign);

  const selectedElement = design.elements.find((el) => el._id === selectedElementId) || null;

  // --- Handlers ---

  const handleAddImage = useCallback(
    async (files: File[]) => {
      try {
        const urls = await uploadMultipleImages(files);
        for (const url of urls) {
          // Create image element centered on canvas with reasonable default size
          await addElement({
            designId: design._id,
            type: "image" as const,
            x: CANVAS_WIDTH / 2 - 150,
            y: CANVAS_HEIGHT / 2 - 150,
            width: 300,
            height: 300,
            imageUrl: url,
          });
        }
        toast.success(`Added ${urls.length} image(s)`);
      } catch {
        toast.error("Failed to upload image(s)");
      }
    },
    [addElement, design._id, uploadMultipleImages]
  );

  const handleAddText = useCallback(async () => {
    try {
      await addElement({
        designId: design._id,
        type: "text" as const,
        x: CANVAS_WIDTH / 2 - 100,
        y: CANVAS_HEIGHT / 2 - 20,
        width: 200,
        height: 40,
        text: "Text",
        fontSize: 24,
        fontFamily: "Arial",
        fill: "#ffffff",
        align: "left",
      });
      toast.success("Text added");
    } catch {
      toast.error("Failed to add text");
    }
  }, [addElement, design._id]);

  const handleDelete = useCallback(async () => {
    if (!selectedElementId) return;
    try {
      await deleteElement({ elementId: selectedElementId });
      clearSelection();
      toast.success("Element deleted");
    } catch {
      toast.error("Failed to delete element");
    }
  }, [deleteElement, selectedElementId, clearSelection]);

  const handleElementDragEnd = useCallback(
    async (id: ElementId, x: number, y: number) => {
      try {
        await updateElement({ elementId: id, x, y });
      } catch {
        toast.error("Failed to move element");
      }
    },
    [updateElement]
  );

  const handleElementTransform = useCallback(
    async (id: ElementId, attrs: { x: number; y: number; width: number; height: number; rotation: number }) => {
      try {
        await updateElement({
          elementId: id,
          x: attrs.x,
          y: attrs.y,
          width: attrs.width,
          height: attrs.height,
          rotation: attrs.rotation,
        });
      } catch {
        toast.error("Failed to transform element");
      }
    },
    [updateElement]
  );

  const handleTextChange = useCallback(
    async (id: ElementId, text: string) => {
      try {
        await updateElement({ elementId: id, text });
      } catch {
        toast.error("Failed to update text");
      }
    },
    [updateElement]
  );

  const handlePropertyUpdate = useCallback(
    async (id: ElementId, updates: Record<string, unknown>) => {
      try {
        await updateElement({ elementId: id, ...updates });
      } catch {
        toast.error("Failed to update element");
      }
    },
    [updateElement]
  );

  const handleDrop = useCallback(
    async (files: File[], x: number, y: number) => {
      try {
        const urls = await uploadMultipleImages(files);
        for (let i = 0; i < urls.length; i++) {
          await addElement({
            designId: design._id,
            type: "image" as const,
            x: x + i * 20,
            y: y + i * 20,
            width: 300,
            height: 300,
            imageUrl: urls[i],
          });
        }
        toast.success(`Added ${urls.length} image(s)`);
      } catch {
        toast.error("Failed to upload dropped images");
      }
    },
    [addElement, design._id, uploadMultipleImages]
  );

  const handleBringForward = useCallback(async () => {
    if (!selectedElementId) return;
    const sorted = [...design.elements].sort((a, b) => a.zIndex - b.zIndex);
    const idx = sorted.findIndex((el) => el._id === selectedElementId);
    if (idx < sorted.length - 1) {
      // Swap with next element
      const newOrder = [...sorted];
      [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
      await reorderElements({
        designId: design._id,
        elementIds: newOrder.map((el) => el._id),
      });
    }
  }, [selectedElementId, design.elements, design._id, reorderElements]);

  const handleSendBackward = useCallback(async () => {
    if (!selectedElementId) return;
    const sorted = [...design.elements].sort((a, b) => a.zIndex - b.zIndex);
    const idx = sorted.findIndex((el) => el._id === selectedElementId);
    if (idx > 0) {
      const newOrder = [...sorted];
      [newOrder[idx], newOrder[idx - 1]] = [newOrder[idx - 1], newOrder[idx]];
      await reorderElements({
        designId: design._id,
        elementIds: newOrder.map((el) => el._id),
      });
    }
  }, [selectedElementId, design.elements, design._id, reorderElements]);

  const handleSaveThumbnail = useCallback(async () => {
    const stage = stageRef.current;
    if (!stage) return;

    setIsSaving(true);
    try {
      const dataUrl = stage.toDataURL({ pixelRatio: 0.5 });
      // Convert to blob and upload
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `${design.name}-thumb.png`, { type: "image/png" });
      const url = await uploadImage(file);
      await updateDesign({ designId: design._id, thumbnailUrl: url });
      toast.success("Thumbnail saved");
    } catch {
      toast.error("Failed to save thumbnail");
    } finally {
      setIsSaving(false);
    }
  }, [design._id, design.name, updateDesign, uploadImage]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        // Don't delete if user is typing in an input
        if (
          e.target instanceof HTMLElement &&
          (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")
        ) {
          return;
        }
        handleDelete();
      }
      if (e.key === "Escape") {
        clearSelection();
      }
    },
    [handleDelete, clearSelection]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="relative flex-1 flex flex-col overflow-hidden">
      <FloatingToolbar
        hasSelection={!!selectedElementId}
        zoom={zoom}
        isSaving={isSaving}
        isUploading={isUploading}
        onAddImage={handleAddImage}
        onAddText={handleAddText}
        onDelete={handleDelete}
        onBringForward={handleBringForward}
        onSendBackward={handleSendBackward}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onResetZoom={resetZoom}
        onSave={handleSaveThumbnail}
      />

      {selectedElement && (
        <FloatingProperties
          element={selectedElement}
          onUpdate={handlePropertyUpdate}
        />
      )}

      <FreeformCanvas
        elements={design.elements}
        selectedElementId={selectedElementId}
        zoom={zoom}
        onSelectElement={selectElement}
        onElementDragEnd={handleElementDragEnd}
        onElementTransform={handleElementTransform}
        onTextChange={handleTextChange}
        onDrop={handleDrop}
        stageRef={stageRef}
      />
    </div>
  );
}
