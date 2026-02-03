import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS, TYPOGRAPHY, breathingGlow, pulse } from "../../utils/animations";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { DecisionTreeVisual } from "./DecisionTreeVisual";
import { MemoryAccessLog } from "./MemoryAccessLog";

type MemoryEntry = {
  key: string;
  value: string;
};

type ActionItem = {
  name: string;
  score: number;
  selected?: boolean;
  rejected?: boolean;
};

type AnalysisData = {
  boardAdvantage: string;
  threatLevel: string;
};

type ElizaAgentPanelProps = {
  frame?: number;
  status?: "ACTIVE" | "ANALYZING" | "DECIDING" | "IDLE";
  memories?: MemoryEntry[];
  analysis?: AnalysisData;
  thinkingProgress?: number;
  actions?: ActionItem[];
  decision?: string;
  showMemory?: boolean;
  showAnalysis?: boolean;
  showThinking?: boolean;
  showDecisions?: boolean;
  showFinalDecision?: boolean;
  memoryStartFrame?: number;
  analysisStartFrame?: number;
  thinkingStartFrame?: number;
  decisionsStartFrame?: number;
  finalDecisionStartFrame?: number;
};

// CRT scan lines effect component
const ScanLines: React.FC = () => {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: `repeating-linear-gradient(
          0deg,
          transparent,
          transparent 2px,
          rgba(0, 0, 0, 0.1) 2px,
          rgba(0, 0, 0, 0.1) 4px
        )`,
        pointerEvents: "none",
      }}
    />
  );
};

// CRT flicker effect
const CRTFlicker: React.FC<{ frame: number; children: React.ReactNode }> = ({ frame, children }) => {
  const flickerOpacity = interpolate(
    Math.sin(frame * 0.3) + Math.sin(frame * 0.7) * 0.5,
    [-1.5, 1.5],
    [0.96, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div style={{ opacity: flickerOpacity }}>
      {children}
    </div>
  );
};

export const ElizaAgentPanel: React.FC<ElizaAgentPanelProps> = ({
  frame: frameProp,
  status = "ACTIVE",
  memories = [
    { key: "Player pattern", value: "aggressive_early" },
    { key: "Win rate vs pattern", value: "73%" },
  ],
  analysis = {
    boardAdvantage: "+2.4",
    threatLevel: "MODERATE",
  },
  thinkingProgress = 47,
  actions = [
    { name: "Summon Dragon", score: 8.2, selected: true },
    { name: "Cast Fireball", score: 7.1 },
    { name: "Defend", score: 4.3, rejected: true },
  ],
  decision = "SUMMON_DRAGON",
  showMemory = true,
  showAnalysis = true,
  showThinking = true,
  showDecisions = true,
  showFinalDecision = true,
  memoryStartFrame = 0,
  analysisStartFrame = 60,
  thinkingStartFrame = 100,
  decisionsStartFrame = 140,
  finalDecisionStartFrame = 200,
}) => {
  const currentFrame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const frame = frameProp ?? currentFrame;

  // Panel entrance animation
  const panelEntrance = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 60 },
  });

  // Glow effects
  const borderGlow = breathingGlow(frame, 0.3, 0.8);
  const statusPulse = pulse(frame, 45);

  // Status color
  const statusColor = {
    ACTIVE: COLORS.terminalGreen,
    ANALYZING: "#ffaa00",
    DECIDING: "#00aaff",
    IDLE: COLORS.terminalGreenDim,
  }[status];

  // Analysis section animation
  const analysisOpacity = interpolate(
    frame,
    [analysisStartFrame, analysisStartFrame + 20],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Thinking section animation
  const thinkingOpacity = interpolate(
    frame,
    [thinkingStartFrame, thinkingStartFrame + 15],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Decisions section animation
  const decisionsOpacity = interpolate(
    frame,
    [decisionsStartFrame, decisionsStartFrame + 15],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Final decision animation
  const finalDecisionOpacity = interpolate(
    frame,
    [finalDecisionStartFrame, finalDecisionStartFrame + 15],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const finalDecisionScale = spring({
    frame: Math.max(0, frame - finalDecisionStartFrame),
    fps,
    config: { damping: 10, stiffness: 100 },
  });

  // Threat level color
  const threatColor = {
    LOW: COLORS.terminalGreen,
    MODERATE: "#ffaa00",
    HIGH: "#ff4444",
    CRITICAL: "#ff0000",
  }[analysis.threatLevel] || COLORS.terminalGreen;

  return (
    <CRTFlicker frame={frame}>
      <div
        style={{
          position: "relative",
          background: COLORS.terminalBg,
          border: `2px solid ${COLORS.terminalGreen}`,
          borderRadius: 4,
          padding: 0,
          fontFamily: TYPOGRAPHY.mono,
          color: COLORS.terminalGreen,
          boxShadow: `
            0 0 ${10 + borderGlow * 20}px rgba(0, 255, 0, ${borderGlow * 0.3}),
            inset 0 0 ${50 + borderGlow * 30}px rgba(0, 255, 0, 0.02)
          `,
          overflow: "hidden",
          transform: `scale(${0.95 + panelEntrance * 0.05})`,
          opacity: panelEntrance,
        }}
      >
        {/* Scan lines overlay */}
        <ScanLines />

        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 16px",
            borderBottom: `1px solid ${COLORS.terminalGreen}40`,
            background: `linear-gradient(180deg, rgba(0, 255, 0, 0.05) 0%, transparent 100%)`,
          }}
        >
          <span style={{ fontWeight: "bold", letterSpacing: 2 }}>[ELIZA AGENT v1.0]</span>
          <span
            style={{
              color: statusColor,
              textShadow: `0 0 ${8 + statusPulse * 8}px ${statusColor}`,
            }}
          >
            STATUS: {status}
          </span>
        </div>

        {/* Content */}
        <div style={{ padding: 16 }}>
          {/* Memory Access Section */}
          {showMemory && (
            <div style={{ marginBottom: 20 }}>
              <MemoryAccessLog
                memories={memories}
                frame={frame}
                startFrame={memoryStartFrame}
              />
            </div>
          )}

          {/* Current Analysis Section */}
          {showAnalysis && (
            <div
              style={{
                marginBottom: 20,
                opacity: analysisOpacity,
              }}
            >
              <div style={{ color: COLORS.terminalGreenDim, marginBottom: 8 }}>
                CURRENT ANALYSIS
              </div>
              <div style={{ marginLeft: 16 }}>
                <div style={{ marginBottom: 4 }}>
                  Board advantage:{" "}
                  <span
                    style={{
                      color: parseFloat(analysis.boardAdvantage) >= 0 ? COLORS.terminalGreen : "#ff4444",
                    }}
                  >
                    {analysis.boardAdvantage}
                  </span>
                </div>
                <div>
                  Threat level:{" "}
                  <span style={{ color: threatColor }}>{analysis.threatLevel}</span>
                </div>
              </div>
            </div>
          )}

          {/* Thinking Progress Section */}
          {showThinking && (
            <div
              style={{
                marginBottom: 20,
                opacity: thinkingOpacity,
              }}
            >
              <ThinkingIndicator progress={thinkingProgress} frame={frame} />
            </div>
          )}

          {/* Decision Tree Section */}
          {showDecisions && (
            <div
              style={{
                marginBottom: 20,
                opacity: decisionsOpacity,
              }}
            >
              <DecisionTreeVisual
                actions={actions}
                frame={frame}
                startFrame={decisionsStartFrame}
              />
            </div>
          )}

          {/* Final Decision Section */}
          {showFinalDecision && (
            <div
              style={{
                opacity: finalDecisionOpacity,
                transform: `scale(${finalDecisionScale})`,
                transformOrigin: "left center",
              }}
            >
              <div
                style={{
                  padding: "8px 12px",
                  background: `linear-gradient(90deg, rgba(0, 255, 0, 0.1) 0%, transparent 100%)`,
                  borderLeft: `3px solid ${COLORS.terminalGreen}`,
                }}
              >
                <span style={{ color: COLORS.terminalGreenDim }}>DECISION: </span>
                <span
                  style={{
                    color: "#00ff88",
                    fontWeight: "bold",
                    textShadow: `0 0 10px rgba(0, 255, 136, 0.6)`,
                  }}
                >
                  Execute {decision}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom border glow */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 2,
            background: `linear-gradient(90deg,
              transparent 0%,
              ${COLORS.terminalGreen} 20%,
              ${COLORS.terminalGreen} 80%,
              transparent 100%
            )`,
            opacity: borderGlow,
          }}
        />
      </div>
    </CRTFlicker>
  );
};
