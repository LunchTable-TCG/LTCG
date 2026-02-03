"use client";

/**
 * Background Layer
 *
 * Renders the card frame background image based on rarity.
 */

import { Layer, Image, Rect } from "react-konva";
import useImage from "use-image";
import { CANVAS_WIDTH, CANVAS_HEIGHT, type Rarity } from "../../types";

interface BackgroundLayerProps {
  /** Frame images keyed by rarity */
  frameImages: {
    common?: string;
    uncommon?: string;
    rare?: string;
    epic?: string;
    legendary?: string;
  };
  /** Fallback frame URL */
  defaultFrameUrl?: string;
  /** Currently selected rarity for preview */
  previewRarity: Rarity;
}

export function BackgroundLayer({
  frameImages,
  defaultFrameUrl,
  previewRarity,
}: BackgroundLayerProps) {
  // Get frame URL for current rarity
  const frameUrl = frameImages[previewRarity] ?? defaultFrameUrl;

  // Load frame image
  const [frameImage, status] = useImage(frameUrl ?? "", "anonymous");

  return (
    <Layer name="background-layer">
      {/* Base background color */}
      <Rect
        x={0}
        y={0}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        fill="#1a1a2e"
      />

      {/* Frame image */}
      {frameImage && status === "loaded" ? (
        <Image
          image={frameImage}
          x={0}
          y={0}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
        />
      ) : (
        // Placeholder frame while loading or if no image
        <Rect
          x={0}
          y={0}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          fill="transparent"
          stroke="#333"
          strokeWidth={2}
        />
      )}
    </Layer>
  );
}
