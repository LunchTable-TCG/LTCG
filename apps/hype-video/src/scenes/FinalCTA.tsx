import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig, staticFile } from "remotion";

export const FinalCTA = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Gentle spring animation for CTA
  const ctaSpring = spring({
    frame,
    fps,
    config: {
      damping: 200, // Much smoother
      stiffness: 80,
    },
  });

  // Slow, subtle pulse
  const pulse = Math.sin(frame * 0.08) * 0.3 + 0.7;

  // Logo slow entrance
  const logoOpacity = interpolate(frame, [0, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const logoScale = interpolate(ctaSpring, [0, 1], [0.9, 1]);

  // Main text slow entrance
  const mainTextOpacity = interpolate(frame, [40, 80], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const mainTextY = interpolate(frame, [40, 80], [40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Button slow entrance
  const buttonOpacity = interpolate(frame, [100, 140], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const buttonScale = interpolate(
    spring({
      frame: Math.max(0, frame - 100),
      fps,
      config: {
        damping: 150,
        stiffness: 100,
      },
    }),
    [0, 1],
    [0.8, 1]
  );

  // Gentle button pulse
  const buttonPulse = interpolate(
    Math.sin((frame - 140) * 0.1),
    [-1, 1],
    [1, 1.03],
    {
      extrapolateLeft: "clamp",
    }
  );

  // Website slow entrance
  const websiteOpacity = interpolate(frame, [180, 220], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at center,
          rgba(26, 26, 46, ${0.9 + pulse * 0.05}) 0%,
          rgba(10, 10, 10, ${0.95 + pulse * 0.03}) 100%)`,
      }}
    >
      {/* Subtle animated background glow */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          background: `radial-gradient(circle at 50% 50%,
            rgba(255, 215, 0, ${pulse * 0.08}) 0%,
            transparent 60%)`,
          filter: "blur(120px)",
        }}
      />

      {/* Slow particles */}
      {[...Array(15)].map((_, i) => {
        const particleFrame = (frame + i * 12) % 300;
        const x = 10 + (i * 6.5) % 85;
        const y = interpolate(particleFrame, [0, 300], [0, 100]);
        const particleOpacity = interpolate(
          particleFrame,
          [0, 60, 240, 300],
          [0, 0.4, 0.4, 0]
        );

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: `${y}%`,
              width: "3px",
              height: "3px",
              borderRadius: "50%",
              background: "#ffd700",
              opacity: particleOpacity,
              boxShadow: "0 0 8px #ffd700",
            }}
          />
        );
      })}

      {/* Content container */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: "60px",
        }}
      >
        {/* Logo */}
        <div
          style={{
            opacity: logoOpacity,
            transform: `scale(${logoScale})`,
            filter: `drop-shadow(0 0 ${pulse * 30 + 15}px rgba(255, 215, 0, 0.5))`,
          }}
        >
          <Img
            src={staticFile("assets/logo-main.png")}
            style={{
              width: "400px",
              height: "auto",
            }}
          />
        </div>

        {/* Main CTA text */}
        <div
          style={{
            opacity: mainTextOpacity,
            transform: `translateY(${mainTextY}px)`,
          }}
        >
          <div
            style={{
              fontSize: "64px",
              fontWeight: "bold",
              color: "#ffffff",
              textAlign: "center",
              textShadow: "0 4px 20px rgba(0, 0, 0, 0.8)",
              lineHeight: "1.2",
            }}
          >
            YOUR LEGEND
            <br />
            <span
              style={{
                color: "#ffd700",
                textShadow: "0 0 30px rgba(255, 215, 0, 0.6)",
              }}
            >
              AWAITS
            </span>
          </div>
        </div>

        {/* CTA Button */}
        <div
          style={{
            opacity: buttonOpacity,
            transform: `scale(${buttonScale * buttonPulse})`,
          }}
        >
          <div
            style={{
              padding: "25px 80px",
              background: "linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)",
              borderRadius: "15px",
              boxShadow: `0 10px 40px rgba(255, 215, 0, ${0.3 + pulse * 0.2}),
                         inset 0 -4px 8px rgba(0, 0, 0, 0.2)`,
              border: "3px solid #fff",
            }}
          >
            <div
              style={{
                fontSize: "48px",
                fontWeight: "bold",
                color: "#1a1a2e",
                textAlign: "center",
                letterSpacing: "0.05em",
              }}
            >
              PLAY NOW
            </div>
          </div>
        </div>

        {/* Website */}
        <div
          style={{
            opacity: websiteOpacity,
          }}
        >
          <div
            style={{
              fontSize: "32px",
              color: "#ffffff",
              textAlign: "center",
              textShadow: "0 2px 10px rgba(0, 0, 0, 0.8)",
            }}
          >
            ltcg.gg
          </div>
        </div>
      </div>

      {/* Subtle frame decoration */}
      <div
        style={{
          position: "absolute",
          inset: "40px",
          border: "2px solid rgba(255, 215, 0, 0.2)",
          borderRadius: "20px",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
