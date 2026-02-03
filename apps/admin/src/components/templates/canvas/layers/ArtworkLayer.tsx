"use client";

/**
 * Artwork Layer
 *
 * Renders the card artwork preview area with optional clipping.
 */

import { Group, Image, Layer, Rect, Text } from "react-konva";
import useImage from "use-image";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../types";

interface ArtworkBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ArtworkLayerProps {
  /** Artwork bounds (percentage-based) */
  artworkBounds: ArtworkBounds;
  /** Preview artwork URL */
  artworkUrl?: string;
  /** Show artwork bounds indicator */
  showBounds: boolean;
}

/** Convert percentage to pixels */
function toPixels(percent: number, dimension: "width" | "height") {
  const base = dimension === "width" ? CANVAS_WIDTH : CANVAS_HEIGHT;
  return (percent / 100) * base;
}

export function ArtworkLayer({ artworkBounds, artworkUrl, showBounds }: ArtworkLayerProps) {
  // Load artwork image
  const [artworkImage, status] = useImage(artworkUrl ?? "", "anonymous");

  // Convert bounds to pixels
  const x = toPixels(artworkBounds.x, "width");
  const y = toPixels(artworkBounds.y, "height");
  const width = toPixels(artworkBounds.width, "width");
  const height = toPixels(artworkBounds.height, "height");

  return (
    <Layer name="artwork-layer">
      {/* Clipping group for artwork */}
      <Group
        clipFunc={(ctx) => {
          ctx.rect(x, y, width, height);
        }}
      >
        {/* Artwork placeholder */}
        {(!artworkImage || status === "loading") && (
          <>
            <Rect x={x} y={y} width={width} height={height} fill="#2a2a4a" />
            <Text
              x={x}
              y={y + height / 2 - 10}
              width={width}
              height={20}
              text="Artwork Area"
              fill="#666"
              fontSize={16}
              align="center"
              verticalAlign="middle"
            />
          </>
        )}

        {/* Artwork image */}
        {artworkImage && status === "loaded" && (
          <Image image={artworkImage} x={x} y={y} width={width} height={height} />
        )}
      </Group>

      {/* Bounds indicator */}
      {showBounds && (
        <Rect
          x={x}
          y={y}
          width={width}
          height={height}
          stroke="#f59e0b"
          strokeWidth={2}
          dash={[8, 4]}
          fill="transparent"
        />
      )}
    </Layer>
  );
}
