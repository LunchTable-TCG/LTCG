import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Img,
  staticFile,
} from "remotion";

type Card = {
  name: string;
  archetype: string;
  rarity: "common" | "rare" | "epic" | "legendary";
};

export type CardShowcaseProps = {
  cards: Card[];
};

type ColorConfig = { primary: string; glow: string };

const DEFAULT_CARD_COLORS: ColorConfig = { primary: "#d4af37", glow: "rgba(212, 175, 55, 0.6)" };

const ARCHETYPE_COLORS: Record<string, ColorConfig> = {
  infernal_dragons: { primary: "#ef4444", glow: "rgba(239, 68, 68, 0.6)" },
  celestial_guardians: { primary: "#fbbf24", glow: "rgba(251, 191, 36, 0.6)" },
  abyssal_horrors: { primary: "#8b5cf6", glow: "rgba(139, 92, 246, 0.6)" },
  nature_spirits: { primary: "#22c55e", glow: "rgba(34, 197, 94, 0.6)" },
  storm_elementals: { primary: "#3b82f6", glow: "rgba(59, 130, 246, 0.6)" },
  arcane_mages: { primary: "#ec4899", glow: "rgba(236, 72, 153, 0.6)" },
};

function getCardColors(archetype: string): ColorConfig {
  return ARCHETYPE_COLORS[archetype] ?? DEFAULT_CARD_COLORS;
}

const RARITY_COLORS: Record<string, string> = {
  common: "#9ca3af",
  rare: "#3b82f6",
  epic: "#a855f7",
  legendary: "#fbbf24",
};

function AnimatedCard({
  card,
  index,
  totalCards,
}: {
  card: Card;
  index: number;
  totalCards: number;
}) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const cardDuration = Math.floor(durationInFrames / totalCards);
  const cardStartFrame = index * cardDuration;
  const localFrame = frame - cardStartFrame;

  // Card entrance animation
  const entranceProgress = spring({
    frame: Math.max(0, localFrame),
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  // Card scale pulse
  const scalePulse = interpolate(
    localFrame,
    [30, 50, 70],
    [1, 1.05, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Glow intensity
  const glowIntensity = interpolate(
    localFrame,
    [0, 30, 60, cardDuration],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Exit animation
  const exitProgress = interpolate(
    localFrame,
    [cardDuration - 30, cardDuration],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const colors = getCardColors(card.archetype);
  const rarityColor = RARITY_COLORS[card.rarity];

  const translateY = interpolate(entranceProgress, [0, 1], [150, 0]);
  const opacity = interpolate(entranceProgress, [0, 1], [0, 1]) * (1 - exitProgress);
  const scale = entranceProgress * scalePulse * (1 - exitProgress * 0.3);
  const rotation = interpolate(localFrame, [0, cardDuration], [-3, 3]) * (1 - exitProgress);

  if (localFrame < -10 || localFrame > cardDuration + 30) return null;

  return (
    <div
      style={{
        position: "absolute",
        width: 380,
        height: 540,
        transform: `translateY(${translateY}px) scale(${scale}) rotate(${rotation}deg)`,
        opacity,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Card glow effect */}
      <div
        style={{
          position: "absolute",
          inset: -60,
          background: `radial-gradient(circle, ${colors.glow} 0%, transparent 60%)`,
          borderRadius: 30,
          filter: `blur(${30 + glowIntensity * 40}px)`,
          opacity: glowIntensity,
        }}
      />

      {/* Card container */}
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 20,
          border: `4px solid ${rarityColor}`,
          boxShadow: `0 0 ${40 * glowIntensity}px ${colors.glow}, 0 20px 40px rgba(0,0,0,0.5)`,
          overflow: "hidden",
          position: "relative",
          background: "#0a0a0a",
        }}
      >
        {/* Archetype character image */}
        <div style={{ position: "absolute", inset: 0 }}>
          <Img
            src={staticFile(`assets/story/${card.archetype}.png`)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: `brightness(0.9) saturate(1.2)`,
            }}
          />
          {/* Gradient overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(180deg, transparent 40%, ${colors.primary}40 70%, #0a0a0a 100%)`,
            }}
          />
        </div>

        {/* Rarity indicator */}
        <div
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            padding: "6px 16px",
            background: rarityColor,
            borderRadius: 20,
            fontSize: 14,
            fontWeight: "bold",
            color: card.rarity === "legendary" ? "#0a0a0a" : "#fff",
            textTransform: "uppercase",
            letterSpacing: 1,
            boxShadow: `0 0 20px ${rarityColor}80`,
          }}
        >
          {card.rarity}
        </div>

        {/* Card name area */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "30px 24px",
            background: "linear-gradient(180deg, transparent 0%, #0a0a0a 40%)",
          }}
        >
          <div
            style={{
              fontSize: 32,
              fontWeight: "bold",
              color: "#fff",
              textAlign: "center",
              textShadow: `0 0 20px ${colors.glow}, 0 2px 10px rgba(0,0,0,0.8)`,
              fontFamily: "serif",
              letterSpacing: 2,
            }}
          >
            {card.name}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CardShowcase({ cards }: CardShowcaseProps) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Background animation
  const bgRotation = interpolate(frame, [0, durationInFrames], [0, 360]);

  const glowPulse = interpolate(
    frame,
    [0, 60, 120, 180, 240, 300],
    [0.5, 1, 0.6, 1, 0.7, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, #0a0a0a 0%, #1a1510 50%, #0a0a0a 100%)",
      }}
    >
      {/* Animated background pattern */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(circle at 30% 30%, rgba(212, 175, 55, ${glowPulse * 0.15}) 0%, transparent 50%),
            radial-gradient(circle at 70% 70%, rgba(212, 175, 55, ${glowPulse * 0.15}) 0%, transparent 50%)
          `,
          transform: `rotate(${bgRotation * 0.1}deg)`,
        }}
      />

      {/* Particle effects */}
      {[...Array(15)].map((_, i) => {
        const particleY = interpolate(
          frame + i * 15,
          [0, durationInFrames],
          [110, -10],
          { extrapolateLeft: "extend", extrapolateRight: "extend" }
        ) % 120;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${(i * 7) % 100}%`,
              top: `${particleY}%`,
              width: 3 + (i % 3) * 2,
              height: 3 + (i % 3) * 2,
              background: "#d4af37",
              borderRadius: "50%",
              opacity: 0.2 + (i % 5) * 0.08,
              filter: "blur(1px)",
            }}
          />
        );
      })}

      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 50,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 56,
          fontWeight: "bold",
          color: "#d4af37",
          textShadow: "0 0 40px rgba(212, 175, 55, 0.6), 0 4px 12px rgba(0,0,0,0.8)",
          fontFamily: "serif",
          letterSpacing: 6,
        }}
      >
        LEGENDARY CARDS
      </div>

      {/* Cards container */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {cards.map((card, index) => (
          <AnimatedCard
            key={card.name}
            card={card}
            index={index}
            totalCards={cards.length}
          />
        ))}
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
          letterSpacing: 4,
          opacity: 0.8,
          textShadow: "0 0 20px rgba(212, 175, 55, 0.5)",
        }}
      >
        LUNCHTABLE CHRONICLES
      </div>
    </AbsoluteFill>
  );
}
