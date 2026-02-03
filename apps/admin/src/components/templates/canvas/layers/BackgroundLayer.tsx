"use client";

/**
 * Background Layer
 *
 * Renders the card frame background image based on rarity.
 * Supports two modes:
 * - "frame_artwork": Traditional mode with separate frame image
 * - "full_card_image": Card's image is the complete background
 */

import { Layer, Image, Rect } from "react-konva";
import useImage from "use-image";
import { CANVAS_WIDTH, CANVAS_HEIGHT, type Rarity, type TemplateMode } from "../../types";

interface BackgroundLayerProps {
  /** Template rendering mode */
  mode?: TemplateMode;
  /** Frame images keyed by rarity (used in frame_artwork mode) */
  frameImages: {
    common?: string;
    uncommon?: string;
    rare?: string;
    epic?: string;
    legendary?: string;
  };
  /** Fallback frame URL (used in frame_artwork mode) */
  defaultFrameUrl?: string;
  /** Full card image URL (used in full_card_image mode) */
  cardImageUrl?: string;
  /** Currently selected rarity for preview */
  previewRarity: Rarity;
}

export function BackgroundLayer({
  mode = "frame_artwork",
  frameImages,
  defaultFrameUrl,
  cardImageUrl,
  previewRarity,
}: BackgroundLayerProps) {
  // Determine which image to use based on mode
  const imageUrl = mode === "full_card_image"
    ? cardImageUrl
    : (frameImages[previewRarity] ?? defaultFrameUrl);

  // Load the image
  const [backgroundImage, status] = useImage(imageUrl ?? "", "anonymous");

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

      {/* Background image (frame or full card) */}
      {backgroundImage && status === "loaded" ? (
        <Image
          image={backgroundImage}
          x={0}
          y={0}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
        />
      ) : (
        // Placeholder while loading or if no image
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
