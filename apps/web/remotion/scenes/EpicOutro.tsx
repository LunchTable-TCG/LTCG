import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { COLORS, TYPOGRAPHY, ARCHETYPE_COLORS, pulse } from "../utils/animations";

const ARCHETYPES = Object.keys(ARCHETYPE_COLORS) as Array<keyof typeof ARCHETYPE_COLORS>;
const GOLD = "#d4af37";

export const EpicOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo entrance
  const logoOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const logoScale = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 60 },
  });

  // CTA button pulse effect
  const ctaPulse = pulse(frame, 45, 0.3);
  const ctaOpacity = interpolate(frame, [60, 90], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Website text fade in
  const websiteOpacity = interpolate(frame, [80, 100], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Calculate archetype positions in a semi-circle
  const getArchetypePosition = (index: number, total: number) => {
    const arcSpan = Math.PI * 0.8; // 80% of a semicircle
    const startAngle = Math.PI + (Math.PI - arcSpan) / 2;
    const angle = startAngle + (index / (total - 1)) * arcSpan;
    const radius = 380;
    const centerX = 960;
    const centerY = 620;

    return {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius * 0.6,
    };
  };

  // Staggered entrance for archetypes (5 frame delay each)
  const getArchetypeAnimation = (index: number) => {
    const delay = index * 5;
    const opacity = interpolate(frame, [delay, delay + 20], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const scale = interpolate(frame, [delay, delay + 15], [0.5, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return { opacity, scale };
  };

  return (
    <AbsoluteFill style={{ background: COLORS.darkBg }}>
      {/* Golden radial glow background */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 1400,
          height: 1400,
          transform: "translate(-50%, -50%)",
          background: `radial-gradient(circle, ${GOLD}20 0%, ${GOLD}08 30%, transparent 60%)`,
          filter: "blur(60px)",
        }}
      />

      {/* Secondary ambient glow */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: 0,
          width: "100%",
          height: "50%",
          transform: "translateX(-50%)",
          background: `linear-gradient(to top, ${GOLD}15 0%, transparent 100%)`,
        }}
      />

      {/* Logo centered above archetypes */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 80,
          transform: "translateX(-50%)",
          opacity: logoOpacity,
        }}
      >
        <Img
          src={staticFile("assets/logo-main.png")}
          style={{
            width: 300,
            height: 300,
            objectFit: "contain",
            transform: `scale(${logoScale})`,
            filter: `drop-shadow(0 0 40px ${GOLD}80)`,
          }}
        />
      </div>

      {/* Archetypes in semi-circle */}
      {ARCHETYPES.map((archetype, index) => {
        const pos = getArchetypePosition(index, ARCHETYPES.length);
        const anim = getArchetypeAnimation(index);
        const colors = ARCHETYPE_COLORS[archetype];

        return (
          <div
            key={archetype}
            style={{
              position: "absolute",
              left: pos.x,
              top: pos.y,
              transform: `translate(-50%, -50%) scale(${anim.scale})`,
              opacity: anim.opacity,
            }}
          >
            {/* Glow behind each archetype */}
            <div
              style={{
                position: "absolute",
                inset: -20,
                background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
                filter: "blur(20px)",
                opacity: 0.6,
              }}
            />
            <Img
              src={staticFile(`assets/story/${archetype}.png`)}
              style={{
                width: 120,
                height: 120,
                objectFit: "contain",
                filter: `drop-shadow(0 0 15px ${colors.primary})`,
              }}
            />
          </div>
        );
      })}

      {/* "PLAY NOW" CTA button with pulse */}
      <div
        style={{
          position: "absolute",
          bottom: 140,
          left: "50%",
          transform: "translateX(-50%)",
          opacity: ctaOpacity,
        }}
      >
        <div
          style={{
            padding: "24px 80px",
            background: `linear-gradient(180deg, ${GOLD} 0%, #b8962c 100%)`,
            borderRadius: 16,
            fontSize: 36,
            fontWeight: "bold",
            color: COLORS.darkBg,
            fontFamily: TYPOGRAPHY.serif,
            letterSpacing: 6,
            textTransform: "uppercase",
            boxShadow: `0 0 ${40 + ctaPulse * 30}px ${GOLD}${Math.round((0.5 + ctaPulse * 0.5) * 255).toString(16).padStart(2, "0")}`,
            transform: `scale(${1 + ctaPulse * 0.05})`,
          }}
        >
          PLAY NOW
        </div>
      </div>

      {/* Website URL */}
      <div
        style={{
          position: "absolute",
          bottom: 60,
          left: "50%",
          transform: "translateX(-50%)",
          opacity: websiteOpacity,
        }}
      >
        <div
          style={{
            fontSize: 24,
            color: GOLD,
            fontFamily: TYPOGRAPHY.sans,
            letterSpacing: 4,
            textShadow: `0 0 20px ${GOLD}60`,
          }}
        >
          www.ltcg.game
        </div>
      </div>

      {/* Vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at 50% 50%, transparent 50%, rgba(0,0,0,0.5) 100%)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
