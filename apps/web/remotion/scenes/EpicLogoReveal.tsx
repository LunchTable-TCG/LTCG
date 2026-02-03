import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import {
  COLORS,
  TYPOGRAPHY,
  generateParticles,
  getParticlePosition,
} from "../utils/animations";

const PARTICLES = generateParticles(60, 123);
const GOLD = "#d4af37";

export const EpicLogoReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Particles converge to center by frame 90
  const convergenceFrame = 90;
  const targetX = 50;
  const targetY = 45;

  // Logo animation - fades in at frame 60, scales up with spring
  const logoOpacity = interpolate(frame, [60, 90], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const logoScale = spring({
    frame: Math.max(0, frame - 60),
    fps,
    config: { damping: 12, stiffness: 80 },
  });

  // Glow pulse effect
  const glowPulse = interpolate(
    frame,
    [60, 90, 120, 150],
    [0.3, 1, 0.7, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Text "BUILD YOUR LEGEND" appears at frame 100 with staggered letter reveal
  const text = "BUILD YOUR LEGEND";
  const textStartFrame = 100;
  const lettersPerFrame = 0.4;

  const getLetterOpacity = (letterIndex: number) => {
    const letterFrame = textStartFrame + letterIndex / lettersPerFrame;
    return interpolate(frame, [letterFrame, letterFrame + 8], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  };

  const getLetterTransform = (letterIndex: number) => {
    const letterFrame = textStartFrame + letterIndex / lettersPerFrame;
    const translateY = interpolate(frame, [letterFrame, letterFrame + 8], [20, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return `translateY(${translateY}px)`;
  };

  return (
    <AbsoluteFill style={{ background: COLORS.darkBg }}>
      {/* Background radial glow */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "45%",
          width: 1000,
          height: 1000,
          transform: "translate(-50%, -50%)",
          background: `radial-gradient(circle, ${GOLD}${Math.round(glowPulse * 40).toString(16).padStart(2, "0")} 0%, transparent 50%)`,
          filter: "blur(100px)",
        }}
      />

      {/* Golden particles */}
      {PARTICLES.map((particle, index) => {
        const pos = getParticlePosition(
          particle,
          frame,
          targetX,
          targetY,
          convergenceFrame
        );

        // Fade out particles as logo fades in
        const particleOpacity = interpolate(
          frame,
          [0, 30, 70, 100],
          [0, 1, 1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );

        // Delayed entry based on particle delay
        const delayedOpacity = interpolate(
          frame,
          [particle.delay, particle.delay + 15],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );

        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              width: particle.size,
              height: particle.size,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${GOLD} 0%, ${GOLD}80 50%, transparent 100%)`,
              boxShadow: `0 0 ${particle.size * 2}px ${GOLD}`,
              opacity: particleOpacity * delayedOpacity,
              transform: "translate(-50%, -50%)",
            }}
          />
        );
      })}

      {/* Main Logo */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "40%",
          transform: "translate(-50%, -50%)",
          opacity: logoOpacity,
        }}
      >
        <Img
          src={staticFile("assets/logo-main.png")}
          style={{
            width: 500,
            height: 500,
            objectFit: "contain",
            transform: `scale(${logoScale})`,
            filter: `drop-shadow(0 0 ${50 * glowPulse}px ${GOLD})`,
          }}
        />
      </div>

      {/* "BUILD YOUR LEGEND" text with staggered letter reveal */}
      <div
        style={{
          position: "absolute",
          bottom: 200,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 4,
        }}
      >
        {text.split("").map((letter, index) => (
          <span
            key={index}
            style={{
              fontSize: 48,
              fontWeight: "bold",
              color: GOLD,
              fontFamily: TYPOGRAPHY.serif,
              letterSpacing: 8,
              textShadow: `0 0 30px ${GOLD}, 0 0 60px ${GOLD}60`,
              opacity: getLetterOpacity(index),
              transform: getLetterTransform(index),
              display: "inline-block",
              minWidth: letter === " " ? 24 : undefined,
            }}
          >
            {letter}
          </span>
        ))}
      </div>

      {/* Subtle vignette */}
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
