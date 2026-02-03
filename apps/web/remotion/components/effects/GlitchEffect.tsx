import { useCurrentFrame } from "remotion";

export interface GlitchEffectProps {
  intensity?: number; // 0-1
  active?: boolean;
  children: React.ReactNode;
  seed?: number;
}

// Seeded random number generator for deterministic results
function createSeededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export const GlitchEffect: React.FC<GlitchEffectProps> = ({
  intensity = 0.5,
  active = true,
  children,
  seed = 42,
}) => {
  const frame = useCurrentFrame();

  if (!active || intensity <= 0) {
    return <>{children}</>;
  }

  // Create deterministic random values for this frame
  const random = createSeededRandom(seed + frame);

  // RGB split offset - varies with intensity
  const rgbOffset = intensity * 8;
  const redOffsetX = (random() - 0.5) * rgbOffset;
  const redOffsetY = (random() - 0.5) * rgbOffset * 0.5;
  const blueOffsetX = (random() - 0.5) * rgbOffset;
  const blueOffsetY = (random() - 0.5) * rgbOffset * 0.5;

  // Horizontal slice displacement
  const sliceCount = Math.floor(3 + random() * 5);
  const slices = Array.from({ length: sliceCount }, () => ({
    top: random() * 100,
    height: 2 + random() * 8,
    offset: (random() - 0.5) * 20 * intensity,
  }));

  // Flickering opacity
  const flicker = random() > 0.9 - intensity * 0.3 ? 0.7 + random() * 0.3 : 1;

  // Noise blocks
  const noiseBlocks = Array.from({ length: Math.floor(intensity * 6) }, () => ({
    left: random() * 100,
    top: random() * 100,
    width: 5 + random() * 30,
    height: 2 + random() * 10,
    opacity: random() * 0.5 * intensity,
  }));

  // Occasional scan line burst
  const scanBurst = random() > 0.85;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Base layer with flicker */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: flicker,
        }}
      >
        {children}
      </div>

      {/* Red channel offset */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `translate(${redOffsetX}px, ${redOffsetY}px)`,
          mixBlendMode: "screen",
          opacity: 0.3 * intensity,
          filter: "url(#redChannel)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(255, 0, 0, 0.3)",
            mixBlendMode: "multiply",
          }}
        >
          {children}
        </div>
      </div>

      {/* Blue channel offset */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `translate(${blueOffsetX}px, ${blueOffsetY}px)`,
          mixBlendMode: "screen",
          opacity: 0.3 * intensity,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(0, 100, 255, 0.3)",
            mixBlendMode: "multiply",
          }}
        >
          {children}
        </div>
      </div>

      {/* Horizontal slice displacement */}
      {slices.map((slice, index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: `${slice.top}%`,
            height: `${slice.height}%`,
            transform: `translateX(${slice.offset}px)`,
            overflow: "hidden",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: `-${slice.top}%`,
              height: "10000%",
            }}
          >
            {children}
          </div>
        </div>
      ))}

      {/* Noise blocks */}
      {noiseBlocks.map((block, index) => (
        <div
          key={`noise-${index}`}
          style={{
            position: "absolute",
            left: `${block.left}%`,
            top: `${block.top}%`,
            width: `${block.width}%`,
            height: `${block.height}px`,
            background: `linear-gradient(90deg,
              transparent 0%,
              rgba(255,255,255,${block.opacity}) 20%,
              rgba(0,255,255,${block.opacity}) 40%,
              rgba(255,0,255,${block.opacity}) 60%,
              rgba(255,255,255,${block.opacity}) 80%,
              transparent 100%)`,
            pointerEvents: "none",
          }}
        />
      ))}

      {/* Scan line burst effect */}
      {scanBurst && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `repeating-linear-gradient(
              0deg,
              transparent 0px,
              transparent 2px,
              rgba(255,255,255,${0.1 * intensity}) 2px,
              rgba(255,255,255,${0.1 * intensity}) 4px
            )`,
            pointerEvents: "none",
            animation: "none",
          }}
        />
      )}

      {/* Overall color aberration overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(
            ${random() * 360}deg,
            rgba(255,0,0,${0.02 * intensity}) 0%,
            transparent 30%,
            transparent 70%,
            rgba(0,0,255,${0.02 * intensity}) 100%
          )`,
          pointerEvents: "none",
          mixBlendMode: "overlay",
        }}
      />
    </div>
  );
};
