import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Img,
  staticFile,
} from "remotion";
import { COLORS, TYPOGRAPHY, pulse } from "../utils/animations";
import { ElizaAgentPanel } from "../components/eliza";

/**
 * ElizaAgentScene - AI Agent reveal scene (300 frames = 10s @ 30fps)
 *
 * Timeline:
 * - Frame 0-60: Panel fades in with glitch effect
 * - Frame 60-120: Memory access logs type out
 * - Frame 120-200: Thinking indicator animates
 * - Frame 200-260: Decision tree evaluates options
 * - Frame 260-300: Decision made, highlight
 */

// Glitch effect component
const GlitchEffect: React.FC<{ frame: number; intensity: number; children: React.ReactNode }> = ({
  frame,
  intensity,
  children,
}) => {
  // Generate pseudo-random glitch based on frame
  const seed = Math.sin(frame * 0.5) * 10000;
  const glitchX = (seed % 10 - 5) * intensity;
  const glitchY = ((seed * 1.5) % 6 - 3) * intensity;

  // RGB split effect
  const rgbOffset = intensity * 3;

  // Occasional full glitch frames
  const isGlitchFrame = frame % 17 === 0 || frame % 23 === 0;
  const glitchOpacity = isGlitchFrame ? 0.7 + Math.random() * 0.3 : 1;

  return (
    <div
      style={{
        position: "relative",
        transform: `translate(${glitchX}px, ${glitchY}px)`,
        opacity: glitchOpacity,
      }}
    >
      {/* Red channel offset */}
      {intensity > 0.1 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: `translateX(${-rgbOffset}px)`,
            opacity: 0.3,
            filter: "url(#redChannel)",
            mixBlendMode: "screen",
          }}
        >
          {children}
        </div>
      )}
      {/* Blue channel offset */}
      {intensity > 0.1 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: `translateX(${rgbOffset}px)`,
            opacity: 0.3,
            filter: "url(#blueChannel)",
            mixBlendMode: "screen",
          }}
        >
          {children}
        </div>
      )}
      {/* Main content */}
      {children}
    </div>
  );
};

// Digital noise background
const DigitalNoise: React.FC<{ frame: number; opacity: number }> = ({ frame, opacity }) => {
  // Generate noise pattern based on frame
  const noiseElements: React.ReactNode[] = [];

  for (let i = 0; i < 50; i++) {
    const x = ((frame * 7 + i * 31) % 100);
    const y = ((frame * 11 + i * 17) % 100);
    const size = ((frame + i) % 3) + 1;

    noiseElements.push(
      <div
        key={i}
        style={{
          position: "absolute",
          left: `${x}%`,
          top: `${y}%`,
          width: size,
          height: size,
          background: COLORS.terminalGreen,
          opacity: 0.1 + (i % 5) * 0.05,
        }}
      />
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity,
        overflow: "hidden",
      }}
    >
      {noiseElements}
    </div>
  );
};

export const ElizaAgentScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // === TIMELINE CALCULATIONS ===

  // Phase 1: Panel entrance with glitch (0-60)
  const entranceProgress = interpolate(frame, [0, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const glitchIntensity = interpolate(frame, [0, 30, 60], [1, 0.5, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Phase visibility flags based on timeline
  const showMemory = frame >= 60;
  const showAnalysis = frame >= 100;
  const showThinking = frame >= 120;
  const showDecisions = frame >= 160;
  const showFinalDecision = frame >= 260;

  // Thinking progress animation (120-200)
  const thinkingProgress = interpolate(frame, [120, 200], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Status based on phase
  let status: "IDLE" | "ACTIVE" | "ANALYZING" | "DECIDING" = "IDLE";
  if (frame < 60) status = "IDLE";
  else if (frame < 120) status = "ACTIVE";
  else if (frame < 200) status = "ANALYZING";
  else status = "DECIDING";

  // Background pulse effect
  const bgPulse = pulse(frame, 120);
  const bgGlow = interpolate(bgPulse, [0, 1], [0.02, 0.05]);

  // Title animation
  const titleOpacity = interpolate(frame, [20, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const titleY = spring({
    frame: Math.max(0, frame - 20),
    fps,
    config: { damping: 15, stiffness: 80 },
  });

  // Scene-wide vignette
  const vignetteOpacity = interpolate(frame, [0, 60, 240, 300], [0.8, 0.4, 0.4, 0.6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: COLORS.darkBg }}>
      {/* Real ElizaOS screenshot background */}
      <div
        style={{
          position: "absolute",
          inset: -20,
          opacity: interpolate(entranceProgress, [0, 1], [0, 0.25]),
          transform: `scale(${1 + frame * 0.0001})`,
        }}
      >
        <Img
          src={staticFile("assets/screenshots/elizaos-agent-create.png")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "blur(4px) brightness(0.6)",
          }}
        />
      </div>

      {/* SVG filters for glitch effect */}
      <svg style={{ position: "absolute", width: 0, height: 0 }}>
        <defs>
          <filter id="redChannel">
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
            />
          </filter>
          <filter id="blueChannel">
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
            />
          </filter>
        </defs>
      </svg>

      {/* Background gradient */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 50% 50%,
            rgba(0, 255, 0, ${bgGlow}) 0%,
            transparent 50%
          )`,
        }}
      />

      {/* Digital noise background */}
      <DigitalNoise frame={frame} opacity={0.3} />

      {/* Grid lines background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(0, 255, 0, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 0, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
          opacity: entranceProgress * 0.5,
        }}
      />

      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: titleOpacity,
          transform: `translateY(${(1 - titleY) * 30}px)`,
        }}
      >
        <div
          style={{
            fontFamily: TYPOGRAPHY.mono,
            fontSize: 48,
            fontWeight: "bold",
            color: COLORS.terminalGreen,
            letterSpacing: 8,
            textShadow: `
              0 0 20px rgba(0, 255, 0, 0.8),
              0 0 40px rgba(0, 255, 0, 0.4)
            `,
          }}
        >
          AI OPPONENT
        </div>
        <div
          style={{
            fontFamily: TYPOGRAPHY.mono,
            fontSize: 18,
            color: COLORS.terminalGreenDim,
            letterSpacing: 4,
            marginTop: 8,
          }}
        >
          POWERED BY ELIZA FRAMEWORK
        </div>
      </div>

      {/* Main Panel Container */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -45%)",
          width: 600,
          opacity: entranceProgress,
        }}
      >
        <GlitchEffect frame={frame} intensity={glitchIntensity}>
          <ElizaAgentPanel
            frame={frame}
            status={status}
            showMemory={showMemory}
            showAnalysis={showAnalysis}
            showThinking={showThinking}
            showDecisions={showDecisions}
            showFinalDecision={showFinalDecision}
            thinkingProgress={thinkingProgress}
            memoryStartFrame={60}
            analysisStartFrame={100}
            thinkingStartFrame={120}
            decisionsStartFrame={160}
            finalDecisionStartFrame={260}
            memories={[
              { key: "Player pattern", value: "aggressive_early" },
              { key: "Win rate vs pattern", value: "73%" },
              { key: "Preferred element", value: "fire" },
            ]}
            analysis={{
              boardAdvantage: "+2.4",
              threatLevel: "MODERATE",
            }}
            actions={[
              { name: "Summon Dragon", score: 8.2, selected: true },
              { name: "Cast Fireball", score: 7.1 },
              { name: "Defend", score: 4.3, rejected: true },
            ]}
            decision="SUMMON_DRAGON"
          />
        </GlitchEffect>
      </div>

      {/* Decorative corner brackets */}
      {["top-left", "top-right", "bottom-left", "bottom-right"].map((corner) => {
        const isTop = corner.includes("top");
        const isLeft = corner.includes("left");

        return (
          <div
            key={corner}
            style={{
              position: "absolute",
              [isTop ? "top" : "bottom"]: 40,
              [isLeft ? "left" : "right"]: 40,
              width: 40,
              height: 40,
              borderColor: COLORS.terminalGreen,
              borderStyle: "solid",
              borderWidth: 0,
              [isTop ? "borderTopWidth" : "borderBottomWidth"]: 2,
              [isLeft ? "borderLeftWidth" : "borderRightWidth"]: 2,
              opacity: entranceProgress * 0.5,
            }}
          />
        );
      })}

      {/* Vignette overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at 50% 50%, transparent 30%, rgba(0, 0, 0, 0.8) 100%)",
          opacity: vignetteOpacity,
          pointerEvents: "none",
        }}
      />

      {/* Scan line animation moving down */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: `${(frame * 2) % 120}%`,
          height: 4,
          background: `linear-gradient(180deg,
            transparent 0%,
            rgba(0, 255, 0, 0.1) 50%,
            transparent 100%
          )`,
          transform: "translateY(-50%)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
