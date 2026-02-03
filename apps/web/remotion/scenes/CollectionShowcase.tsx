import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { COLORS, breathingGlow, ARCHETYPE_COLORS } from "../utils/animations";

// Card configurations for the 3x3 grid
const CARDS = [
  { id: 1, archetype: "infernal_dragons", delay: 0 },
  { id: 2, archetype: "celestial_guardians", delay: 3 },
  { id: 3, archetype: "abyssal_horrors", delay: 6 },
  { id: 4, archetype: "divine_knights", delay: 9 },
  { id: 5, archetype: "nature_spirits", delay: 12 },
  { id: 6, archetype: "mechanical_constructs", delay: 15 },
  { id: 7, archetype: "storm_elementals", delay: 18 },
  { id: 8, archetype: "arcane_mages", delay: 21 },
  { id: 9, archetype: "shadow_assassins", delay: 24 },
];

// Starting positions for cards (flying from various off-screen locations)
const START_POSITIONS = [
  { x: -400, y: -300, rotation: -45 },
  { x: 0, y: -500, rotation: 15 },
  { x: 400, y: -300, rotation: 45 },
  { x: -500, y: 0, rotation: -30 },
  { x: 0, y: 600, rotation: 0 },
  { x: 500, y: 0, rotation: 30 },
  { x: -400, y: 400, rotation: -60 },
  { x: 0, y: 600, rotation: -15 },
  { x: 400, y: 400, rotation: 60 },
];

type AnimatedCardProps = {
  index: number;
  archetype: string;
  delay: number;
  gridX: number;
  gridY: number;
};

function AnimatedCard({ index, archetype, delay, gridX, gridY }: AnimatedCardProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const startPos = START_POSITIONS[index % START_POSITIONS.length]!;
  const colors = ARCHETYPE_COLORS[archetype as keyof typeof ARCHETYPE_COLORS];

  // Spring animation for card entrance
  const entranceProgress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 14, stiffness: 80 },
  });

  // Calculate grid position (centered 3x3 grid)
  const cardWidth = 160;
  const cardHeight = 220;
  const gap = 20;
  const gridOffsetX = (gridX - 1) * (cardWidth + gap);
  const gridOffsetY = (gridY - 1) * (cardHeight + gap);

  // Interpolate from start to grid position
  const x = interpolate(entranceProgress, [0, 1], [startPos.x, gridOffsetX]);
  const y = interpolate(entranceProgress, [0, 1], [startPos.y, gridOffsetY]);
  const rotation = interpolate(entranceProgress, [0, 1], [startPos.rotation, 0]);
  const scale = interpolate(entranceProgress, [0, 0.5, 1], [0.3, 1.1, 1]);

  // Shimmer effect
  const shimmerOffset = interpolate(
    frame,
    [delay + 30, delay + 60],
    [-100, 200],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const shimmerOpacity = interpolate(
    frame,
    [delay + 30, delay + 45, delay + 60],
    [0, 0.6, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Glow intensity
  const glowIntensity = breathingGlow(frame - delay - 30, 0.3, 0.7);

  if (frame < delay - 5) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: cardWidth,
        height: cardHeight,
        transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${rotation}deg) scale(${scale})`,
      }}
    >
      {/* Card glow */}
      <div
        style={{
          position: "absolute",
          inset: -20,
          background: `radial-gradient(ellipse, ${colors?.glow || COLORS.gold}80 0%, transparent 70%)`,
          filter: "blur(15px)",
          opacity: glowIntensity * entranceProgress,
        }}
      />

      {/* Card container */}
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 12,
          overflow: "hidden",
          background: "#1a1a2e",
          border: `3px solid ${colors?.primary || COLORS.gold}`,
          boxShadow: `
            0 0 20px ${colors?.glow || COLORS.gold}60,
            0 10px 30px rgba(0,0,0,0.5)
          `,
          position: "relative",
        }}
      >
        {/* Card back image */}
        <Img
          src={staticFile("assets/cards/back_starter.png")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />

        {/* Color overlay based on archetype */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(135deg, ${colors?.primary || COLORS.gold}20 0%, transparent 50%, ${colors?.secondary || COLORS.gold}20 100%)`,
          }}
        />

        {/* Shimmer effect */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(105deg, transparent 40%, rgba(255,255,255,${shimmerOpacity}) 50%, transparent 60%)`,
            transform: `translateX(${shimmerOffset}%)`,
          }}
        />
      </div>
    </div>
  );
}

export const CollectionShowcase: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title entrance
  const titleProgress = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 60 },
  });

  // Text entrance (delayed)
  const textOpacity = interpolate(frame, [60, 90], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Background glow
  const bgGlow = breathingGlow(frame, 0.2, 0.4);

  return (
    <AbsoluteFill
      style={{
        background: COLORS.darkBg,
      }}
    >
      {/* Real screenshot background with Ken Burns effect */}
      <div
        style={{
          position: "absolute",
          inset: -30,
          opacity: 0.4,
          transform: `scale(${1 + frame * 0.0003})`,
        }}
      >
        <Img
          src={staticFile("assets/screenshots/ltcg-archetype-selection.png")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "blur(3px)",
          }}
        />
      </div>

      {/* Gradient overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(ellipse at 50% 50%, rgba(212, 175, 55, ${bgGlow * 0.15}) 0%, transparent 60%),
            linear-gradient(180deg, ${COLORS.darkBg}80 0%, transparent 30%, transparent 70%, ${COLORS.darkBg}80 100%)
          `,
        }}
      />

      {/* Animated card grid */}
      {CARDS.map((card, index) => (
        <AnimatedCard
          key={card.id}
          index={index}
          archetype={card.archetype}
          delay={card.delay}
          gridX={index % 3}
          gridY={Math.floor(index / 3)}
        />
      ))}

      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 50,
          left: 0,
          right: 0,
          textAlign: "center",
          transform: `translateY(${(1 - titleProgress) * 30}px)`,
          opacity: titleProgress,
        }}
      >
        <div
          style={{
            fontSize: 52,
            fontWeight: "bold",
            color: COLORS.gold,
            textShadow: `0 0 40px rgba(212, 175, 55, 0.8), 0 4px 12px rgba(0,0,0,0.8)`,
            fontFamily: "serif",
            letterSpacing: 4,
          }}
        >
          YOUR COLLECTION AWAITS
        </div>
      </div>

      {/* Subtitle */}
      <div
        style={{
          position: "absolute",
          bottom: 100,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: textOpacity,
        }}
      >
        <div
          style={{
            fontSize: 28,
            color: "#d4d4d4",
            textShadow: "0 2px 10px rgba(0,0,0,0.8)",
            fontFamily: "sans-serif",
          }}
        >
          Hundreds of cards to discover and master
        </div>
      </div>

      {/* Decorative corner ornaments */}
      <Img
        src={staticFile("assets/ui/corner_ornament.png")}
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          width: 80,
          height: 80,
          opacity: 0.6,
          filter: `drop-shadow(0 0 10px ${COLORS.gold})`,
        }}
      />
      <Img
        src={staticFile("assets/ui/corner_ornament.png")}
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          width: 80,
          height: 80,
          opacity: 0.6,
          transform: "scaleX(-1)",
          filter: `drop-shadow(0 0 10px ${COLORS.gold})`,
        }}
      />

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
