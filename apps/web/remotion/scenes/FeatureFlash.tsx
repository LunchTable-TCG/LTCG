import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Img,
  staticFile,
} from "remotion";
import { COLORS, TYPOGRAPHY } from "../utils/animations";

const FEATURES = [
  { text: "RANKED BATTLES", color: "#ef4444", screenshot: "ltcg-game-modes.png" },
  { text: "DECK BUILDING", color: "#fbbf24", screenshot: "ltcg-archetype-selection.png" },
  { text: "STORY MODE", color: "#22c55e", screenshot: "ltcg-archetypes.png" },
  { text: "JOIN NOW", color: "#3b82f6", screenshot: "ltcg-hero.png" },
] as const;

const DEFAULT_FEATURE = FEATURES[0];
const FRAMES_PER_FEATURE = 22; // ~0.73 seconds each for 90 total frames

export const FeatureFlash: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Determine which feature is currently showing
  const currentFeatureIndex = Math.min(
    Math.floor(frame / FRAMES_PER_FEATURE),
    FEATURES.length - 1
  );
  const frameWithinFeature = frame % FRAMES_PER_FEATURE;
  const currentFeature = FEATURES[currentFeatureIndex] ?? DEFAULT_FEATURE;

  // Glitch effect on transition (first 3 frames of each feature)
  const isGlitching = frameWithinFeature < 3;
  const glitchOffset = isGlitching
    ? Math.sin(frame * 50) * 10 + Math.cos(frame * 30) * 5
    : 0;
  const glitchOpacity = isGlitching ? 0.7 + Math.random() * 0.3 : 1;

  // Fast zoom/scale animation
  const scaleEntrance = spring({
    frame: frameWithinFeature,
    fps,
    config: { damping: 8, stiffness: 150 },
  });

  const scale = interpolate(scaleEntrance, [0, 1], [2.5, 1]);

  // Opacity for entrance and exit
  const entranceOpacity = interpolate(frameWithinFeature, [0, 5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const exitOpacity = interpolate(
    frameWithinFeature,
    [FRAMES_PER_FEATURE - 5, FRAMES_PER_FEATURE],
    [1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  const textOpacity = Math.min(entranceOpacity, exitOpacity) * glitchOpacity;

  // Slide direction alternates
  const slideDirection = currentFeatureIndex % 2 === 0 ? 1 : -1;
  const slideEntrance = interpolate(frameWithinFeature, [0, 8], [100 * slideDirection, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const slideExit = interpolate(
    frameWithinFeature,
    [FRAMES_PER_FEATURE - 5, FRAMES_PER_FEATURE],
    [0, -100 * slideDirection],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  const slideX = frameWithinFeature < FRAMES_PER_FEATURE - 5 ? slideEntrance : slideExit;

  // Background flash on transition
  const bgFlash = interpolate(frameWithinFeature, [0, 3, 8], [0.3, 0.1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Ken Burns effect - slow zoom on background
  const bgScale = interpolate(frameWithinFeature, [0, FRAMES_PER_FEATURE], [1.05, 1.15]);
  const bgX = interpolate(frameWithinFeature, [0, FRAMES_PER_FEATURE], [0, currentFeatureIndex % 2 === 0 ? -20 : 20]);

  return (
    <AbsoluteFill style={{ background: COLORS.darkBg }}>
      {/* Screenshot background with Ken Burns effect */}
      <div
        style={{
          position: "absolute",
          inset: -50,
          transform: `scale(${bgScale}) translateX(${bgX}px)`,
          filter: "brightness(0.3) blur(2px)",
        }}
      >
        <Img
          src={staticFile(`assets/screenshots/${currentFeature.screenshot}`)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </div>

      {/* Background color flash */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: currentFeature.color,
          opacity: bgFlash,
        }}
      />

      {/* Radial glow */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 1000,
          height: 1000,
          transform: "translate(-50%, -50%)",
          background: `radial-gradient(circle, ${currentFeature.color}40 0%, transparent 50%)`,
          filter: "blur(60px)",
          opacity: textOpacity,
        }}
      />

      {/* Horizontal accent lines */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "50%",
          height: 2,
          background: `linear-gradient(90deg, transparent 0%, ${currentFeature.color}60 50%, transparent 100%)`,
          transform: `translateY(-80px) scaleX(${scaleEntrance})`,
          opacity: textOpacity,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "50%",
          height: 2,
          background: `linear-gradient(90deg, transparent 0%, ${currentFeature.color}60 50%, transparent 100%)`,
          transform: `translateY(80px) scaleX(${scaleEntrance})`,
          opacity: textOpacity,
        }}
      />

      {/* Main feature text */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: `translate(-50%, -50%) translateX(${slideX + glitchOffset}px) scale(${scale})`,
          opacity: textOpacity,
        }}
      >
        <div
          style={{
            fontSize: 100,
            fontWeight: "bold",
            color: currentFeature.color,
            fontFamily: TYPOGRAPHY.serif,
            letterSpacing: 12,
            textTransform: "uppercase",
            textShadow: `
              0 0 60px ${currentFeature.color},
              0 0 120px ${currentFeature.color}80,
              0 4px 20px rgba(0,0,0,0.9)
            `,
            whiteSpace: "nowrap",
          }}
        >
          {currentFeature.text}
        </div>
      </div>

      {/* Glitch overlay lines */}
      {isGlitching && (
        <>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: `${45 + Math.random() * 10}%`,
              height: 3,
              background: currentFeature.color,
              opacity: 0.8,
              transform: `translateX(${Math.random() * 20 - 10}px)`,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: `${50 + Math.random() * 10}%`,
              height: 2,
              background: "#ffffff",
              opacity: 0.5,
              transform: `translateX(${Math.random() * 20 - 10}px)`,
            }}
          />
        </>
      )}

      {/* Progress bar at bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 60,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 8,
        }}
      >
        {FEATURES.map((feature, index) => {
          const isActive = index === currentFeatureIndex;
          const isPast = index < currentFeatureIndex;
          const fillProgress = isActive
            ? interpolate(frameWithinFeature, [0, FRAMES_PER_FEATURE], [0, 100])
            : isPast
              ? 100
              : 0;

          return (
            <div
              key={feature.text}
              style={{
                width: 60,
                height: 4,
                background: "#333",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${fillProgress}%`,
                  height: "100%",
                  background: feature.color,
                  boxShadow: isActive ? `0 0 10px ${feature.color}` : "none",
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Corner accents */}
      <div
        style={{
          position: "absolute",
          top: 40,
          left: 40,
          width: 60,
          height: 60,
          borderTop: `3px solid ${currentFeature.color}60`,
          borderLeft: `3px solid ${currentFeature.color}60`,
          opacity: textOpacity,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 40,
          right: 40,
          width: 60,
          height: 60,
          borderTop: `3px solid ${currentFeature.color}60`,
          borderRight: `3px solid ${currentFeature.color}60`,
          opacity: textOpacity,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 100,
          left: 40,
          width: 60,
          height: 60,
          borderBottom: `3px solid ${currentFeature.color}60`,
          borderLeft: `3px solid ${currentFeature.color}60`,
          opacity: textOpacity,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 100,
          right: 40,
          width: 60,
          height: 60,
          borderBottom: `3px solid ${currentFeature.color}60`,
          borderRight: `3px solid ${currentFeature.color}60`,
          opacity: textOpacity,
        }}
      />

      {/* Vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at 50% 50%, transparent 30%, rgba(0,0,0,0.7) 100%)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
