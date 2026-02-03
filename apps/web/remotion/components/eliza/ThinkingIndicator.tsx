import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS, TYPOGRAPHY, breathingGlow } from "../../utils/animations";

type ThinkingIndicatorProps = {
  progress: number; // 0-100
  frame?: number;
  width?: number;
};

export const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({
  progress,
  frame: frameProp,
  width = 30,
}) => {
  const currentFrame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const frame = frameProp ?? currentFrame;

  // Animated progress value with spring
  const animatedProgress = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 80 },
    from: 0,
    to: progress,
  });

  // Build ASCII progress bar
  const barWidth = width - 2; // Account for brackets
  const filledCount = Math.floor((animatedProgress / 100) * barWidth);
  const emptyCount = barWidth - filledCount - 1; // -1 for the arrow head

  const filled = "=".repeat(Math.max(0, filledCount));
  const arrow = filledCount < barWidth ? ">" : "=";
  const empty = ".".repeat(Math.max(0, emptyCount));
  const progressBar = `[${filled}${arrow}${empty}]`;

  // Pulsing glow effect
  const glowIntensity = breathingGlow(frame, 0.5, 1);
  const glowColor = `rgba(0, 255, 0, ${glowIntensity * 0.6})`;

  // Percentage display with counting animation
  const displayedPercent = Math.floor(animatedProgress);

  // Flickering effect for text
  const flicker = interpolate(
    Math.sin(frame * 0.5),
    [-1, 1],
    [0.85, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div
      style={{
        fontFamily: TYPOGRAPHY.mono,
        fontSize: 14,
        color: COLORS.terminalGreen,
        display: "flex",
        alignItems: "center",
        gap: 12,
        opacity: flicker,
      }}
    >
      <span style={{ color: COLORS.terminalGreenDim }}>THINKING...</span>
      <span
        style={{
          textShadow: `0 0 8px ${glowColor}`,
          letterSpacing: 1,
        }}
      >
        {progressBar}
      </span>
      <span
        style={{
          minWidth: 40,
          textAlign: "right",
          textShadow: `0 0 10px ${glowColor}`,
        }}
      >
        {displayedPercent}%
      </span>
    </div>
  );
};
