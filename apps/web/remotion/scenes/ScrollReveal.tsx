import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { COLORS, generateParticles, breathingGlow } from "../utils/animations";

// Generate dust particles
const dustParticles = generateParticles(30, 123);

// Region markers for the world map
const REGION_MARKERS = [
  { x: 25, y: 35, name: "Dragon Peaks", color: "#ff4444" },
  { x: 70, y: 25, name: "Celestial Citadel", color: "#ffd700" },
  { x: 45, y: 55, name: "Abyssal Depths", color: "#8b00ff" },
  { x: 20, y: 70, name: "Verdant Wilds", color: "#22c55e" },
  { x: 75, y: 65, name: "Storm Isles", color: "#3b82f6" },
];

export const ScrollReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scroll unroll animation - starts from center, expands outward
  const unrollProgress = spring({
    frame,
    fps,
    config: { damping: 25, stiffness: 40 },
    durationInFrames: 90,
  });

  // Clip path for scroll reveal effect (expands from center horizontally)
  const clipLeft = interpolate(unrollProgress, [0, 1], [50, 0]);
  const clipRight = interpolate(unrollProgress, [0, 1], [50, 100]);

  // Map reveal starts after scroll is mostly unrolled
  const mapOpacity = interpolate(frame, [60, 90], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Golden glow effect
  const glowIntensity = breathingGlow(frame, 0.3, 0.7);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, #1a1510 0%, ${COLORS.darkBg} 50%, #1a1510 100%)`,
      }}
    >
      {/* Ambient background glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 50% 50%, rgba(212, 175, 55, ${glowIntensity * 0.2}) 0%, transparent 60%)`,
          filter: "blur(60px)",
        }}
      />

      {/* Dust particles */}
      {dustParticles.map((particle, i) => {
        const particleDelay = particle.delay;
        const adjustedFrame = Math.max(0, frame - particleDelay);
        const floatY = Math.sin((adjustedFrame * particle.speed * 0.05) + i) * 20;
        const floatX = Math.cos((adjustedFrame * particle.speed * 0.03) + i * 0.5) * 10;

        const particleOpacity = interpolate(
          frame,
          [particleDelay, particleDelay + 30],
          [0, 0.15 + (i % 4) * 0.05],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: particle.size,
              height: particle.size,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${COLORS.gold} 0%, rgba(212, 175, 55, 0.3) 100%)`,
              opacity: particleOpacity,
              transform: `translate(${floatX}px, ${floatY}px)`,
              filter: "blur(1px)",
            }}
          />
        );
      })}

      {/* Parchment/Map background - revealed underneath scroll */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: "80%",
          height: "70%",
          opacity: mapOpacity,
        }}
      >
        <Img
          src={staticFile("assets/textures/parchment.png")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: 20,
            filter: "sepia(0.3) brightness(0.9)",
          }}
        />

        {/* Map overlay gradient */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `
              radial-gradient(circle at 50% 50%, transparent 30%, rgba(10, 10, 10, 0.4) 100%),
              linear-gradient(180deg, rgba(212, 175, 55, 0.1) 0%, transparent 50%, rgba(212, 175, 55, 0.1) 100%)
            `,
            borderRadius: 20,
          }}
        />

        {/* Region markers */}
        {REGION_MARKERS.map((marker, index) => {
          // Staggered marker reveal
          const markerStartFrame = 90 + index * 15;
          const markerProgress = spring({
            frame: frame - markerStartFrame,
            fps,
            config: { damping: 12, stiffness: 100 },
          });

          const markerOpacity = interpolate(
            frame,
            [markerStartFrame, markerStartFrame + 10],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );

          const markerGlow = breathingGlow(frame - index * 10, 0.5, 1);

          return (
            <div
              key={marker.name}
              style={{
                position: "absolute",
                left: `${marker.x}%`,
                top: `${marker.y}%`,
                transform: `translate(-50%, -50%) scale(${markerProgress})`,
                opacity: markerOpacity,
              }}
            >
              {/* Marker glow */}
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  width: 60,
                  height: 60,
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${marker.color}60 0%, transparent 70%)`,
                  filter: "blur(10px)",
                  opacity: markerGlow,
                }}
              />

              {/* Marker dot */}
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: `radial-gradient(circle at 30% 30%, ${marker.color}, ${marker.color}aa)`,
                  border: `3px solid ${COLORS.gold}`,
                  boxShadow: `0 0 20px ${marker.color}80, inset 0 -3px 6px rgba(0,0,0,0.3)`,
                }}
              />

              {/* Marker label */}
              <div
                style={{
                  position: "absolute",
                  top: 28,
                  left: "50%",
                  transform: "translateX(-50%)",
                  whiteSpace: "nowrap",
                  fontSize: 14,
                  fontWeight: "bold",
                  color: COLORS.gold,
                  textShadow: `0 0 10px ${marker.color}, 0 2px 4px rgba(0,0,0,0.8)`,
                  fontFamily: "serif",
                  letterSpacing: 1,
                }}
              >
                {marker.name}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scroll image with unroll clip effect */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: "85%",
          height: "75%",
          clipPath: `inset(0 ${100 - clipRight}% 0 ${clipLeft}%)`,
        }}
      >
        <Img
          src={staticFile("assets/props/scroll.png")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            filter: `drop-shadow(0 0 30px rgba(212, 175, 55, ${glowIntensity}))`,
          }}
        />
      </div>

      {/* Scroll edge decorations (left and right rollers) */}
      <div
        style={{
          position: "absolute",
          left: `${7.5 + (clipLeft * 0.7)}%`,
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: 40,
          height: "65%",
          background: `linear-gradient(90deg, #8b6914 0%, ${COLORS.gold} 30%, #8b6914 100%)`,
          borderRadius: 20,
          boxShadow: `0 0 20px rgba(139, 105, 20, 0.6), inset 0 0 10px rgba(255, 255, 255, 0.2)`,
          opacity: interpolate(unrollProgress, [0, 0.8, 1], [1, 1, 0]),
        }}
      />
      <div
        style={{
          position: "absolute",
          right: `${7.5 + ((100 - clipRight) * 0.7)}%`,
          top: "50%",
          transform: "translate(50%, -50%)",
          width: 40,
          height: "65%",
          background: `linear-gradient(90deg, #8b6914 0%, ${COLORS.gold} 70%, #8b6914 100%)`,
          borderRadius: 20,
          boxShadow: `0 0 20px rgba(139, 105, 20, 0.6), inset 0 0 10px rgba(255, 255, 255, 0.2)`,
          opacity: interpolate(unrollProgress, [0, 0.8, 1], [1, 1, 0]),
        }}
      />

      {/* Title text */}
      <div
        style={{
          position: "absolute",
          top: 50,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        <div
          style={{
            fontSize: 48,
            fontWeight: "bold",
            color: COLORS.gold,
            textShadow: `0 0 30px rgba(212, 175, 55, 0.8), 0 4px 12px rgba(0,0,0,0.8)`,
            fontFamily: "serif",
            letterSpacing: 6,
          }}
        >
          EXPLORE THE REALM
        </div>
      </div>

      {/* Logo watermark */}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 18,
          color: `${COLORS.gold}80`,
          fontFamily: "serif",
          letterSpacing: 4,
        }}
      >
        LUNCHTABLE CHRONICLES
      </div>
    </AbsoluteFill>
  );
};
