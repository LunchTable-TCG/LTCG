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

// Cards that will be added to deck slots
const DECK_CARDS = [
  { id: 1, archetype: "infernal_dragons", name: "Flame Drake", delay: 20 },
  { id: 2, archetype: "infernal_dragons", name: "Fire Bolt", delay: 40 },
  { id: 3, archetype: "celestial_guardians", name: "Divine Shield", delay: 60 },
  { id: 4, archetype: "infernal_dragons", name: "Inferno", delay: 80 },
  { id: 5, archetype: "celestial_guardians", name: "Holy Light", delay: 100 },
];

// Synergy connections between cards
const SYNERGY_LINES = [
  { from: 0, to: 1 }, // Fire synergy
  { from: 0, to: 3 }, // Dragon synergy
  { from: 2, to: 4 }, // Divine synergy
  { from: 1, to: 3 }, // Fire spell synergy
];

type DeckCardProps = {
  index: number;
  archetype: string;
  name: string;
  delay: number;
};

function DeckCard({ index, archetype, name, delay }: DeckCardProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const colors = ARCHETYPE_COLORS[archetype as keyof typeof ARCHETYPE_COLORS];

  // Card starts from left side and moves to its slot
  const entranceProgress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 12, stiffness: 80 },
  });

  // Starting position (left side, staggered vertically)
  const startX = -600;
  const startY = -200 + index * 100;

  // Target slot position (right side)
  const slotX = 480;
  const slotY = -180 + index * 90;

  const x = interpolate(entranceProgress, [0, 1], [startX, slotX]);
  const y = interpolate(entranceProgress, [0, 1], [startY, slotY]);
  const rotation = interpolate(entranceProgress, [0, 0.5, 1], [-15, 5, 0]);
  const scale = interpolate(entranceProgress, [0, 0.7, 1], [0.8, 1.1, 1]);

  const opacity = interpolate(
    frame,
    [delay, delay + 10],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  if (frame < delay - 5) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: 120,
        height: 170,
        transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${rotation}deg) scale(${scale})`,
        opacity,
      }}
    >
      {/* Card glow */}
      <div
        style={{
          position: "absolute",
          inset: -15,
          background: `radial-gradient(ellipse, ${colors?.glow || COLORS.gold}60 0%, transparent 70%)`,
          filter: "blur(10px)",
          opacity: entranceProgress,
        }}
      />

      {/* Card */}
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 10,
          background: `linear-gradient(135deg, #1a1a2e 0%, #0a0a15 100%)`,
          border: `2px solid ${colors?.primary || COLORS.gold}`,
          boxShadow: `0 0 15px ${colors?.glow || COLORS.gold}40, 0 8px 20px rgba(0,0,0,0.4)`,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Mini archetype image */}
        <div style={{ position: "absolute", inset: 0 }}>
          <Img
            src={staticFile(`assets/story/${archetype}.png`)}
            style={{
              width: "100%",
              height: "70%",
              objectFit: "cover",
              objectPosition: "center top",
              filter: "brightness(0.8)",
            }}
          />
        </div>

        {/* Card name */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "8px 6px",
            background: `linear-gradient(180deg, transparent 0%, ${colors?.primary || COLORS.gold}30 50%, #0a0a15 100%)`,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: "bold",
              color: "#fff",
              textAlign: "center",
              textShadow: "0 1px 3px rgba(0,0,0,0.8)",
              fontFamily: "sans-serif",
            }}
          >
            {name}
          </div>
        </div>
      </div>
    </div>
  );
}

function SynergyLine({ fromIndex, toIndex }: { fromIndex: number; toIndex: number }) {
  const frame = useCurrentFrame();

  const fromCard = DECK_CARDS[fromIndex];
  const toCard = DECK_CARDS[toIndex];
  if (!fromCard || !toCard) return null;

  // Synergy lines appear after both cards are placed
  const fromDelay = fromCard.delay;
  const toDelay = toCard.delay;
  const lineDelay = Math.max(fromDelay, toDelay) + 20;

  const lineOpacity = interpolate(
    frame,
    [lineDelay, lineDelay + 15],
    [0, 0.8],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const linePulse = breathingGlow(frame - lineDelay, 0.4, 1);

  // Calculate line positions
  const slotX = 480;
  const fromY = -180 + fromIndex * 90;
  const toY = -180 + toIndex * 90;

  if (frame < lineDelay) return null;

  const fromArchetype = fromCard.archetype;
  const fromColors = ARCHETYPE_COLORS[fromArchetype as keyof typeof ARCHETYPE_COLORS];

  return (
    <svg
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: 400,
        height: 500,
        transform: "translate(-50%, -50%)",
        overflow: "visible",
        pointerEvents: "none",
      }}
    >
      <defs>
        <linearGradient id={`synergy-${fromIndex}-${toIndex}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={fromColors?.primary || COLORS.gold} stopOpacity={linePulse} />
          <stop offset="100%" stopColor={fromColors?.secondary || COLORS.gold} stopOpacity={linePulse * 0.5} />
        </linearGradient>
      </defs>
      <line
        x1={slotX - 80}
        y1={fromY + 250 + 45}
        x2={slotX - 80}
        y2={toY + 250 + 45}
        stroke={`url(#synergy-${fromIndex}-${toIndex})`}
        strokeWidth={3}
        strokeLinecap="round"
        opacity={lineOpacity}
        filter={`drop-shadow(0 0 8px ${fromColors?.glow || COLORS.gold})`}
      />
    </svg>
  );
}

export const DeckBuilderShowcase: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title entrance
  const titleProgress = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 60 },
  });

  // Background glow
  const bgGlow = breathingGlow(frame, 0.15, 0.3);

  // Deck slots visibility
  const slotsOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: COLORS.darkBg,
      }}
    >
      {/* Background image */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.35,
        }}
      >
        <Img
          src={staticFile("assets/backgrounds/decks-bg.png")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </div>

      {/* Gradient overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(ellipse at 70% 50%, rgba(212, 175, 55, ${bgGlow * 0.2}) 0%, transparent 50%),
            linear-gradient(90deg, transparent 50%, ${COLORS.darkBg}95 100%)
          `,
        }}
      />

      {/* Deck slots panel */}
      <div
        style={{
          position: "absolute",
          right: 60,
          top: "50%",
          transform: "translateY(-50%)",
          width: 200,
          height: 520,
          opacity: slotsOpacity,
        }}
      >
        {/* Panel background */}
        <Img
          src={staticFile("assets/ui/panel_grimoire.png")}
          style={{
            position: "absolute",
            inset: -20,
            width: "calc(100% + 40px)",
            height: "calc(100% + 40px)",
            objectFit: "fill",
            opacity: 0.8,
          }}
        />

        {/* Slot indicators */}
        {[0, 1, 2, 3, 4].map((slotIndex) => (
          <div
            key={slotIndex}
            style={{
              position: "absolute",
              left: 40,
              top: 30 + slotIndex * 95,
              width: 120,
              height: 80,
              border: `2px dashed ${COLORS.gold}40`,
              borderRadius: 8,
              background: `rgba(212, 175, 55, 0.05)`,
            }}
          />
        ))}

        {/* Panel title */}
        <div
          style={{
            position: "absolute",
            top: -15,
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: 16,
            fontWeight: "bold",
            color: COLORS.gold,
            textShadow: `0 0 10px ${COLORS.gold}80`,
            fontFamily: "serif",
            letterSpacing: 2,
            whiteSpace: "nowrap",
          }}
        >
          DECK SLOTS
        </div>
      </div>

      {/* Synergy lines */}
      {SYNERGY_LINES.map((line, index) => (
        <SynergyLine key={index} fromIndex={line.from} toIndex={line.to} />
      ))}

      {/* Animated cards */}
      {DECK_CARDS.map((card, index) => (
        <DeckCard
          key={card.id}
          index={index}
          archetype={card.archetype}
          name={card.name}
          delay={card.delay}
        />
      ))}

      {/* Ancient key accent */}
      <div
        style={{
          position: "absolute",
          left: 80,
          bottom: 100,
          opacity: interpolate(frame, [80, 110], [0, 0.7], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        <Img
          src={staticFile("assets/props/ancient_key.png")}
          style={{
            width: 100,
            height: 100,
            objectFit: "contain",
            filter: `drop-shadow(0 0 20px ${COLORS.gold})`,
            transform: `rotate(${interpolate(frame, [80, 180], [-10, 10])}deg)`,
          }}
        />
      </div>

      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 50,
          left: 80,
          transform: `translateY(${(1 - titleProgress) * 30}px)`,
          opacity: titleProgress,
        }}
      >
        <div
          style={{
            fontSize: 56,
            fontWeight: "bold",
            color: COLORS.gold,
            textShadow: `0 0 40px rgba(212, 175, 55, 0.8), 0 4px 12px rgba(0,0,0,0.8)`,
            fontFamily: "serif",
            letterSpacing: 4,
          }}
        >
          BUILD YOUR STRATEGY
        </div>
      </div>

      {/* Subtitle */}
      <div
        style={{
          position: "absolute",
          top: 130,
          left: 80,
          opacity: interpolate(frame, [30, 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        <div
          style={{
            fontSize: 24,
            color: "#d4d4d4",
            textShadow: "0 2px 10px rgba(0,0,0,0.8)",
            fontFamily: "sans-serif",
            maxWidth: 500,
          }}
        >
          Combine archetypes and discover powerful synergies
        </div>
      </div>

      {/* Logo watermark */}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          left: 80,
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
