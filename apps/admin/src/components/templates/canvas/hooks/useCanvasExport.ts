/**
 * Canvas Export Hook
 *
 * Provides functionality to export the Konva canvas to various formats.
 */

import type { Stage } from "konva/lib/Stage";
import { useCallback, useRef } from "react";
import type { CanvasMimeType, ExportFormat, ExportOptions } from "../../types";
import { getCanvasMimeType } from "../../types";

interface UseCanvasExportResult {
  /** Reference to attach to the Konva Stage */
  stageRef: React.RefObject<Stage | null>;
  /** Export canvas to data URL */
  exportToDataURL: (options?: Partial<ExportOptions>) => string | null;
  /** Export canvas to Blob */
  exportToBlob: (options?: Partial<ExportOptions>) => Promise<Blob | null>;
  /** Download canvas as image file */
  downloadImage: (filename: string, options?: Partial<ExportOptions>) => void;
}

const DEFAULT_OPTIONS: ExportOptions = {
  format: "png",
  quality: 0.92,
  pixelRatio: 2, // 2x for retina displays
};

export function useCanvasExport(): UseCanvasExportResult {
  const stageRef = useRef<Stage | null>(null);

  const getMimeType = (format: ExportFormat): CanvasMimeType => {
    return getCanvasMimeType(format);
  };

  const exportToDataURL = useCallback((options?: Partial<ExportOptions>) => {
    const stage = stageRef.current;
    if (!stage) return null;

    const opts = { ...DEFAULT_OPTIONS, ...options };
    const mimeType = getMimeType(opts.format);

    // Hide selection layer before export
    const selectionLayer = stage.findOne(".selection-layer");
    const wasVisible = selectionLayer?.visible();
    selectionLayer?.visible(false);

    try {
      const dataURL = stage.toDataURL({
        mimeType,
        quality: opts.format === "jpeg" ? opts.quality : undefined,
        pixelRatio: opts.pixelRatio,
        width: opts.width,
        height: opts.height,
      });
      return dataURL;
    } finally {
      // Restore selection layer visibility
      if (wasVisible) {
        selectionLayer?.visible(true);
      }
    }
  }, []);

  const exportToBlob = useCallback(
    async (options?: Partial<ExportOptions>): Promise<Blob | null> => {
      const stage = stageRef.current;
      if (!stage) return null;

      const opts = { ...DEFAULT_OPTIONS, ...options };
      const mimeType = getMimeType(opts.format);

      // Hide selection layer before export
      const selectionLayer = stage.findOne(".selection-layer");
      const wasVisible = selectionLayer?.visible();
      selectionLayer?.visible(false);

      return new Promise((resolve) => {
        stage.toBlob({
          mimeType,
          quality: opts.format === "jpeg" ? opts.quality : undefined,
          pixelRatio: opts.pixelRatio,
          width: opts.width,
          height: opts.height,
          callback: (blob) => {
            // Restore selection layer visibility
            if (wasVisible) {
              selectionLayer?.visible(true);
            }
            resolve(blob);
          },
        });
      });
    },
    []
  );

  const downloadImage = useCallback(
    (filename: string, options?: Partial<ExportOptions>) => {
      const dataURL = exportToDataURL(options);
      if (!dataURL) return;

      const opts = { ...DEFAULT_OPTIONS, ...options };
      const extension = opts.format === "jpeg" ? "jpg" : "png";
      const finalFilename = filename.includes(".") ? filename : `${filename}.${extension}`;

      const link = document.createElement("a");
      link.download = finalFilename;
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    [exportToDataURL]
  );

  return {
    stageRef,
    exportToDataURL,
    exportToBlob,
    downloadImage,
  };
}
