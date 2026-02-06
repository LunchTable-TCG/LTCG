import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig, staticFile } from "remotion";

export const OpeningScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Gentle spring animation for logo entrance
  const logoSpring = spring({
    frame,
    fps,
    config: {
      damping: 200, // More damping = less bounce
      stiffness: 100, // Less stiffness = slower, smoother
      mass: 1,
    },
  });

  // Slow opacity fade in
  const opacity = interpolate(frame, [0, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Gentle scale animation
  const scale = interpolate(logoSpring, [0, 1], [0.85, 1]);

  // Slow, gentle glow pulse
  const glowIntensity = interpolate(
    frame,
    [120, 180, 240],
    [0, 1, 0.5],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  return (
    <AbsoluteFill
      style={{
        background: "radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a0a 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Subtle glow effect */}
      <div
        style={{
          position: "absolute",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(255, 215, 0, ${glowIntensity * 0.2}) 0%, transparent 70%)`,
          filter: "blur(80px)",
          transform: `scale(${1 + glowIntensity * 0.1})`,
          transition: "all 0.3s ease-out",
        }}
      />

      {/* Logo */}
      <div
        style={{
          opacity,
          transform: `scale(${scale})`,
          filter: `drop-shadow(0 0 ${glowIntensity * 20}px rgba(255, 215, 0, 0.6))`,
          transition: "filter 0.3s ease-out",
        }}
      >
        <Img
          src={staticFile("assets/logo-main.png")}
          style={{
            width: "500px",
            height: "auto",
          }}
        />
      </div>

      {/* Text subtitle */}
      <div
        style={{
          position: "absolute",
          bottom: "25%",
          opacity: interpolate(frame, [120, 180], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          transform: `translateY(${interpolate(frame, [120, 180], [30, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}px)`,
        }}
      >
        <div
          style={{
            fontSize: "48px",
            fontWeight: "bold",
            color: "#ffd700",
            textAlign: "center",
            textShadow: "0 0 20px rgba(255, 215, 0, 0.4)",
            letterSpacing: "0.15em",
          }}
        >
          THE CARD GAME
        </div>
      </div>
    </AbsoluteFill>
  );
};
