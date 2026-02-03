import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { COLORS, TYPOGRAPHY, generateParticles, pulse } from "../utils/animations";

const PROPS = [
  { id: "mana_crystal", name: "Mana Crystal", color: "#3b82f6" },
  { id: "ancient_key", name: "Ancient Key", color: "#d4af37" },
  { id: "scroll", name: "Scroll of Power", color: "#a855f7" },
] as const;

const DEFAULT_PROP = PROPS[0];
const PARTICLES = generateParticles(30, 456);
const FRAMES_PER_PROP = 50; // ~1.67 seconds per prop

export const PropsShowcase: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Determine which prop is currently showing
  const currentPropIndex = Math.min(
    Math.floor(frame / FRAMES_PER_PROP),
    PROPS.length - 1
  );
  const frameWithinProp = frame % FRAMES_PER_PROP;
  const currentProp = PROPS[currentPropIndex] ?? DEFAULT_PROP;

  // Title animation
  const titleOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const titleScale = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 60 },
  });

  // Prop entrance and exit animations
  const propEntrance = interpolate(frameWithinProp, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const propExit = interpolate(frameWithinProp, [FRAMES_PER_PROP - 10, FRAMES_PER_PROP], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const propOpacity = Math.min(propEntrance, propExit);

  // 3D rotation effect (rotateY animation)
  const rotateY = interpolate(frameWithinProp, [0, FRAMES_PER_PROP], [-30, 30], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Glow pulse effect
  const glowPulse = pulse(frame, 30, 0.5);

  // Prop scale entrance
  const propScale = spring({
    frame: frameWithinProp,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  return (
    <AbsoluteFill style={{ background: COLORS.darkBg }}>
      {/* Subtle particle effects in background */}
      {PARTICLES.map((particle, index) => {
        const floatOffset = Math.sin((frame + particle.delay) * 0.05 * particle.speed) * 10;
        const particleOpacity = interpolate(
          (frame + particle.delay) % 90,
          [0, 30, 60, 90],
          [0, 0.6, 0.6, 0],
          { extrapolateRight: "clamp" }
        );

        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: particle.size * 0.5,
              height: particle.size * 0.5,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${currentProp.color}80 0%, transparent 70%)`,
              opacity: particleOpacity * 0.5,
              transform: `translateY(${floatOffset}px)`,
            }}
          />
        );
      })}

      {/* Central glow based on current prop color */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 800,
          height: 800,
          transform: "translate(-50%, -50%)",
          background: `radial-gradient(circle, ${currentProp.color}30 0%, transparent 50%)`,
          filter: "blur(80px)",
          opacity: 0.5 + glowPulse * 0.5,
        }}
      />

      {/* Title: "POWERFUL ARTIFACTS" */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: titleOpacity,
          transform: `scale(${titleScale})`,
        }}
      >
        <div
          style={{
            fontSize: 56,
            fontWeight: "bold",
            color: "#d4af37",
            fontFamily: TYPOGRAPHY.serif,
            letterSpacing: 8,
            textShadow: "0 0 40px rgba(212, 175, 55, 0.6), 0 4px 12px rgba(0,0,0,0.8)",
            textTransform: "uppercase",
          }}
        >
          POWERFUL ARTIFACTS
        </div>
      </div>

      {/* Current prop display */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          opacity: propOpacity,
        }}
      >
        {/* Glow ring around prop */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 350,
            height: 350,
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            border: `3px solid ${currentProp.color}40`,
            boxShadow: `
              0 0 ${30 + glowPulse * 30}px ${currentProp.color}60,
              inset 0 0 ${20 + glowPulse * 20}px ${currentProp.color}30
            `,
          }}
        />

        {/* Prop image with 3D rotation */}
        <div
          style={{
            perspective: 1000,
          }}
        >
          <Img
            src={staticFile(`assets/props/${currentProp.id}.png`)}
            style={{
              width: 300,
              height: 300,
              objectFit: "contain",
              transform: `scale(${propScale}) rotateY(${rotateY}deg)`,
              filter: `drop-shadow(0 0 ${30 + glowPulse * 20}px ${currentProp.color})`,
            }}
          />
        </div>
      </div>

      {/* Prop name */}
      <div
        style={{
          position: "absolute",
          bottom: 150,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: propOpacity,
        }}
      >
        <div
          style={{
            fontSize: 36,
            fontWeight: "bold",
            color: currentProp.color,
            fontFamily: TYPOGRAPHY.serif,
            letterSpacing: 4,
            textShadow: `0 0 30px ${currentProp.color}, 0 2px 8px rgba(0,0,0,0.8)`,
            textTransform: "uppercase",
          }}
        >
          {currentProp.name}
        </div>
      </div>

      {/* Progress indicators */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 16,
        }}
      >
        {PROPS.map((prop, index) => (
          <div
            key={prop.id}
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: index === currentPropIndex ? prop.color : "#444",
              boxShadow: index === currentPropIndex ? `0 0 15px ${prop.color}` : "none",
              transition: "all 0.3s ease",
            }}
          />
        ))}
      </div>

      {/* Vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at 50% 50%, transparent 40%, rgba(0,0,0,0.6) 100%)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
