import { useCurrentFrame, interpolate } from "remotion";

export interface ScanLinesProps {
  opacity?: number;
  spacing?: number;
  animated?: boolean;
  color?: string;
  vignette?: boolean;
  vignetteIntensity?: number;
}

export const ScanLines: React.FC<ScanLinesProps> = ({
  opacity = 0.1,
  spacing = 4,
  animated = false,
  color = "rgba(0, 0, 0, 1)",
  vignette = true,
  vignetteIntensity = 0.4,
}) => {
  const frame = useCurrentFrame();

  // Downward scroll animation - creates moving scan line effect
  const scrollOffset = animated ? (frame * 2) % spacing : 0;

  // Subtle flicker effect for CRT authenticity
  const flickerOpacity = animated
    ? opacity * interpolate(
        Math.sin(frame * 0.5) + Math.sin(frame * 0.3),
        [-2, 2],
        [0.9, 1.1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      )
    : opacity;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {/* Scan lines using CSS gradient for performance */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `repeating-linear-gradient(
            0deg,
            transparent 0px,
            transparent ${spacing - 1}px,
            ${color.replace("1)", `${flickerOpacity})`)} ${spacing - 1}px,
            ${color.replace("1)", `${flickerOpacity})`)} ${spacing}px
          )`,
          transform: `translateY(${scrollOffset}px)`,
        }}
      />

      {/* Horizontal line highlight (like CRT phosphor glow) */}
      {animated && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: `${((frame * 3) % 120) - 10}%`,
            height: 2,
            background: `linear-gradient(
              90deg,
              transparent 0%,
              rgba(255, 255, 255, ${opacity * 0.3}) 20%,
              rgba(255, 255, 255, ${opacity * 0.5}) 50%,
              rgba(255, 255, 255, ${opacity * 0.3}) 80%,
              transparent 100%
            )`,
            filter: "blur(1px)",
          }}
        />
      )}

      {/* Vignette darkening at edges */}
      {vignette && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(
              ellipse 80% 80% at 50% 50%,
              transparent 0%,
              transparent 50%,
              rgba(0, 0, 0, ${vignetteIntensity * 0.3}) 70%,
              rgba(0, 0, 0, ${vignetteIntensity * 0.6}) 85%,
              rgba(0, 0, 0, ${vignetteIntensity}) 100%
            )`,
          }}
        />
      )}

      {/* Corner darkening for CRT curvature simulation */}
      {vignette && (
        <>
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "15%",
              height: "15%",
              background: `radial-gradient(
                circle at 0% 0%,
                rgba(0, 0, 0, ${vignetteIntensity * 0.5}) 0%,
                transparent 70%
              )`,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "15%",
              height: "15%",
              background: `radial-gradient(
                circle at 100% 0%,
                rgba(0, 0, 0, ${vignetteIntensity * 0.5}) 0%,
                transparent 70%
              )`,
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: "15%",
              height: "15%",
              background: `radial-gradient(
                circle at 0% 100%,
                rgba(0, 0, 0, ${vignetteIntensity * 0.5}) 0%,
                transparent 70%
              )`,
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: "15%",
              height: "15%",
              background: `radial-gradient(
                circle at 100% 100%,
                rgba(0, 0, 0, ${vignetteIntensity * 0.5}) 0%,
                transparent 70%
              )`,
            }}
          />
        </>
      )}

      {/* Subtle color fringing at edges */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          boxShadow: `
            inset 2px 0 3px rgba(255, 0, 0, ${opacity * 0.1}),
            inset -2px 0 3px rgba(0, 100, 255, ${opacity * 0.1})
          `,
        }}
      />
    </div>
  );
};
