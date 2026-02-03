import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS, TYPOGRAPHY, typewriter } from "../../utils/animations";

type ActionItem = {
  name: string;
  score: number;
  selected?: boolean;
  rejected?: boolean;
};

type DecisionTreeVisualProps = {
  actions: ActionItem[];
  frame?: number;
  startFrame?: number;
  staggerDelay?: number;
};

export const DecisionTreeVisual: React.FC<DecisionTreeVisualProps> = ({
  actions,
  frame: frameProp,
  startFrame = 0,
  staggerDelay = 20,
}) => {
  const currentFrame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const frame = frameProp ?? currentFrame;

  return (
    <div
      style={{
        fontFamily: TYPOGRAPHY.mono,
        fontSize: 14,
      }}
    >
      <div
        style={{
          color: COLORS.terminalGreenDim,
          marginBottom: 8,
          opacity: interpolate(frame, [startFrame, startFrame + 15], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        EVALUATING ACTIONS:
      </div>

      {actions.map((action, index) => {
        const itemStartFrame = startFrame + 15 + index * staggerDelay;

        // Typewriter effect for action name
        const displayedName = typewriter(frame, action.name, itemStartFrame, 1.5);

        // Score counting animation
        const scoreProgress = interpolate(
          frame,
          [itemStartFrame + action.name.length / 1.5, itemStartFrame + action.name.length / 1.5 + 20],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );

        const displayedScore = (action.score * scoreProgress).toFixed(1);

        // Item entrance opacity
        const itemOpacity = interpolate(
          frame,
          [itemStartFrame, itemStartFrame + 10],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );

        // Selection/rejection indicator animation
        const indicatorFrame = itemStartFrame + action.name.length / 1.5 + 25;
        const indicatorOpacity = interpolate(
          frame,
          [indicatorFrame, indicatorFrame + 10],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );

        // Selection highlight glow
        const selectionGlow = action.selected
          ? spring({
              frame: Math.max(0, frame - indicatorFrame),
              fps,
              config: { damping: 10, stiffness: 100 },
            })
          : 0;

        // Color based on state
        let textColor: string = COLORS.terminalGreen;
        let indicator = "";

        if (action.selected) {
          textColor = "#00ff88";
          indicator = " \u2605"; // Star
        } else if (action.rejected) {
          textColor = COLORS.terminalGreenDim;
          indicator = " \u2717"; // X mark
        }

        return (
          <div
            key={action.name}
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: 6,
              opacity: itemOpacity,
              color: textColor,
              textShadow: action.selected
                ? `0 0 ${10 + selectionGlow * 15}px rgba(0, 255, 136, ${0.4 + selectionGlow * 0.4})`
                : undefined,
              transform: action.selected ? `scale(${1 + selectionGlow * 0.02})` : undefined,
              transformOrigin: "left center",
            }}
          >
            <span style={{ color: COLORS.terminalGreenDim, marginRight: 8 }}>{">"}</span>
            <span style={{ minWidth: 180 }}>{displayedName}</span>
            <span style={{ color: COLORS.terminalGreenDim, marginRight: 4 }}>[Score:</span>
            <span style={{ minWidth: 35 }}>{displayedScore}</span>
            <span style={{ color: COLORS.terminalGreenDim }}>]</span>
            <span
              style={{
                opacity: indicatorOpacity,
                marginLeft: 8,
                color: action.selected ? "#ffdd00" : "#ff4444",
              }}
            >
              {indicator}
            </span>
          </div>
        );
      })}
    </div>
  );
};
