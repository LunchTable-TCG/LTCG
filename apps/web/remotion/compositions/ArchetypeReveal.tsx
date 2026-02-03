import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Img,
  staticFile,
} from "remotion";

export type ArchetypeRevealProps = {
  archetype: string;
  name: string;
  tagline: string;
};

type ColorConfig = {
  primary: string;
  secondary: string;
  glow: string;
};

const DEFAULT_COLORS: ColorConfig = { primary: "#ff6b35", secondary: "#ff9a5c", glow: "#ff4500" };

const ARCHETYPE_COLORS: Record<string, ColorConfig> = {
  infernal_dragons: DEFAULT_COLORS,
  abyssal_horrors: { primary: "#8b5cf6", secondary: "#a78bfa", glow: "#7c3aed" },
  nature_spirits: { primary: "#22c55e", secondary: "#4ade80", glow: "#16a34a" },
  storm_elementals: { primary: "#3b82f6", secondary: "#60a5fa", glow: "#2563eb" },
  shadow_assassins: { primary: "#64748b", secondary: "#94a3b8", glow: "#475569" },
  celestial_guardians: { primary: "#fbbf24", secondary: "#fcd34d", glow: "#f59e0b" },
  undead_legion: { primary: "#10b981", secondary: "#34d399", glow: "#059669" },
  divine_knights: { primary: "#f59e0b", secondary: "#fbbf24", glow: "#d97706" },
  arcane_mages: { primary: "#ec4899", secondary: "#f472b6", glow: "#db2777" },
  mechanical_constructs: { primary: "#78716c", secondary: "#a8a29e", glow: "#57534e" },
};

function getColors(archetype: string): ColorConfig {
  return ARCHETYPE_COLORS[archetype] ?? DEFAULT_COLORS;
}

export function ArchetypeReveal({ archetype, name, tagline }: ArchetypeRevealProps) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const colors = getColors(archetype);

  // Animation phases
  const entranceProgress = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 80 },
  });

  const glowPulse = interpolate(
    frame,
    [60, 90, 120, 150],
    [0.5, 1, 0.7, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const textReveal = interpolate(
    frame,
    [40, 70],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const taglineReveal = interpolate(
    frame,
    [60, 90],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const exitFade = interpolate(
    frame,
    [durationInFrames - 30, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Image animation
  const imageScale = interpolate(entranceProgress, [0, 1], [1.3, 1]);
  const imageY = interpolate(entranceProgress, [0, 1], [80, 0]);
  const imageOpacity = interpolate(entranceProgress, [0, 0.5, 1], [0, 0.5, 1]);

  // Background rotation
  const bgRotation = interpolate(frame, [0, durationInFrames], [0, 15]);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, #0a0a0a 0%, ${colors.primary}10 50%, #0a0a0a 100%)`,
        opacity: exitFade,
      }}
    >
      {/* Animated background rays */}
      <div
        style={{
          position: "absolute",
          inset: -200,
          background: `
            conic-gradient(
              from ${bgRotation}deg at 50% 60%,
              transparent 0deg,
              ${colors.glow}08 30deg,
              transparent 60deg,
              ${colors.glow}08 90deg,
              transparent 120deg,
              ${colors.glow}08 150deg,
              transparent 180deg,
              ${colors.glow}08 210deg,
              transparent 240deg,
              ${colors.glow}08 270deg,
              transparent 300deg,
              ${colors.glow}08 330deg,
              transparent 360deg
            )
          `,
        }}
      />

      {/* Central glow */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "35%",
          width: 1000,
          height: 1000,
          transform: "translate(-50%, -50%)",
          background: `radial-gradient(circle, ${colors.glow}${Math.round(glowPulse * 50).toString(16).padStart(2, "0")} 0%, transparent 50%)`,
          filter: `blur(${80 + glowPulse * 40}px)`,
        }}
      />

      {/* Character image container */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "40%",
          width: 700,
          height: 700,
          transform: `translate(-50%, -50%) scale(${imageScale}) translateY(${imageY}px)`,
          opacity: imageOpacity,
        }}
      >
        {/* Character image */}
        <Img
          src={staticFile(`assets/story/${archetype}.png`)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            filter: `drop-shadow(0 0 ${30 * glowPulse}px ${colors.glow})`,
          }}
        />

        {/* Overlay glow on image */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(circle at 50% 30%, ${colors.glow}20 0%, transparent 60%)`,
            mixBlendMode: "overlay",
          }}
        />
      </div>

      {/* Decorative frame around character */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "40%",
          width: 600,
          height: 600,
          transform: "translate(-50%, -50%)",
          border: `2px solid ${colors.primary}30`,
          borderRadius: 20,
          opacity: entranceProgress * 0.5,
        }}
      />

      {/* Name reveal */}
      <div
        style={{
          position: "absolute",
          bottom: 180,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: textReveal,
          transform: `translateY(${(1 - textReveal) * 40}px)`,
        }}
      >
        <div
          style={{
            fontSize: 80,
            fontWeight: "bold",
            color: colors.primary,
            textShadow: `0 0 40px ${colors.glow}, 0 0 80px ${colors.glow}60, 0 4px 12px rgba(0,0,0,0.8)`,
            fontFamily: "serif",
            letterSpacing: 10,
            textTransform: "uppercase",
          }}
        >
          {name}
        </div>
      </div>

      {/* Tagline */}
      <div
        style={{
          position: "absolute",
          bottom: 110,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: taglineReveal,
          transform: `translateY(${(1 - taglineReveal) * 20}px)`,
        }}
      >
        <div
          style={{
            fontSize: 36,
            color: "#a89f94",
            fontFamily: "serif",
            fontStyle: "italic",
            letterSpacing: 3,
            textShadow: "0 2px 10px rgba(0,0,0,0.8)",
          }}
        >
          "{tagline}"
        </div>
      </div>

      {/* Logo */}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 22,
          color: "#d4af37",
          fontFamily: "serif",
          letterSpacing: 5,
          opacity: taglineReveal * 0.8,
          textShadow: "0 0 20px rgba(212, 175, 55, 0.5)",
        }}
      >
        LUNCHTABLE CHRONICLES
      </div>
    </AbsoluteFill>
  );
}
