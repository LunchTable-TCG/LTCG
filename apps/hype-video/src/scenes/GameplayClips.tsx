import { AbsoluteFill, interpolate, Sequence, useCurrentFrame, Video, staticFile } from "remotion";

const ClipOverlay = ({ text, delay }: { text: string; delay: number }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(
    frame,
    [delay, delay + 30, delay + 150, delay + 180], // Slower fade in/out
    [0, 1, 1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  const y = interpolate(
    frame,
    [delay, delay + 30],
    [30, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  return (
    <div
      style={{
        position: "absolute",
        bottom: "120px",
        left: "50%",
        transform: `translate(-50%, ${y}px)`,
        opacity,
        padding: "20px 60px",
        background: "linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.8), transparent)",
        borderTop: "2px solid #ffd700",
        borderBottom: "2px solid #ffd700",
      }}
    >
      <div
        style={{
          fontSize: "48px",
          fontWeight: "bold",
          color: "#ffd700",
          textAlign: "center",
          textShadow: "0 0 20px rgba(255, 215, 0, 0.8), 0 4px 8px rgba(0, 0, 0, 0.8)",
          letterSpacing: "0.1em",
        }}
      >
        {text}
      </div>
    </div>
  );
};

export const GameplayClips = () => {
  // Vignette intensity
  const vignetteOpacity = 0.3;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      {/* Epic trailer - first 220 frames (doubled for 60fps) */}
      <Sequence from={0} durationInFrames={220}>
        <AbsoluteFill>
          <Video
            src={staticFile("videos/epic-trailer.mp4")}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            volume={0.6} // Lower volume
          />
          <ClipOverlay text="EPIC BATTLES" delay={20} />
        </AbsoluteFill>
      </Sequence>

      {/* Card showcase - next 220 frames */}
      <Sequence from={220} durationInFrames={220}>
        <AbsoluteFill>
          <Video
            src={staticFile("videos/card-showcase.mp4")}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            volume={0.6}
          />
          <ClipOverlay text="STRATEGIC DEPTH" delay={20} />
        </AbsoluteFill>
      </Sequence>

      {/* Infernal dragons reveal - last 220 frames */}
      <Sequence from={440} durationInFrames={220}>
        <AbsoluteFill>
          <Video
            src={staticFile("videos/infernal-dragons-reveal.mp4")}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            volume={0.6}
          />
          <ClipOverlay text="LEGENDARY POWERS" delay={20} />
        </AbsoluteFill>
      </Sequence>

      {/* Subtle vignette overlay */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          background: "radial-gradient(ellipse at center, transparent 30%, rgba(0, 0, 0, 0.7) 100%)",
          opacity: vignetteOpacity,
          pointerEvents: "none",
        }}
      />

      {/* Subtle corner decorations */}
      <div
        style={{
          position: "absolute",
          top: "40px",
          left: "40px",
          width: "100px",
          height: "100px",
          borderTop: "3px solid #ffd700",
          borderLeft: "3px solid #ffd700",
          opacity: 0.4,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "40px",
          right: "40px",
          width: "100px",
          height: "100px",
          borderTop: "3px solid #ffd700",
          borderRight: "3px solid #ffd700",
          opacity: 0.4,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "40px",
          left: "40px",
          width: "100px",
          height: "100px",
          borderBottom: "3px solid #ffd700",
          borderLeft: "3px solid #ffd700",
          opacity: 0.4,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "40px",
          right: "40px",
          width: "100px",
          height: "100px",
          borderBottom: "3px solid #ffd700",
          borderRight: "3px solid #ffd700",
          opacity: 0.4,
        }}
      />
    </AbsoluteFill>
  );
};
