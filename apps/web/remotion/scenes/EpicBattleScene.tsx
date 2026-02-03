import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import {
  COLORS,
  TYPOGRAPHY,
  ARCHETYPE_COLORS,
  pulse,
} from "../utils/animations";
import { ElizaAgentPanel } from "../components/eliza";

/**
 * EpicBattleScene - Split-screen battle with AI overlay (450 frames = 15s @ 30fps)
 *
 * Timeline:
 * - Frame 0-100: Arena setup, AI analyzing
 * - Frame 100-250: Card exchanges, AI reacting
 * - Frame 250-400: Climactic moment, AI making crucial decision
 * - Frame 400-450: Resolution
 */

// Animated card component for battle
const BattleCard: React.FC<{
  frame: number;
  fps: number;
  name: string;
  archetype: keyof typeof ARCHETYPE_COLORS;
  startFrame: number;
  position: { x: number; y: number };
  targetPosition?: { x: number; y: number };
  moveFrame?: number;
  attackFrame?: number;
  scale?: number;
}> = ({
  frame,
  fps,
  name,
  archetype,
  startFrame,
  position,
  targetPosition,
  moveFrame,
  attackFrame,
  scale = 1,
}) => {
  const colors = ARCHETYPE_COLORS[archetype];

  // Entry animation
  const entryProgress = spring({
    frame: Math.max(0, frame - startFrame),
    fps,
    config: { damping: 12, stiffness: 80 },
  });

  // Movement animation
  let currentX = position.x;
  let currentY = position.y;

  if (targetPosition && moveFrame && frame >= moveFrame) {
    const moveProgress = spring({
      frame: Math.max(0, frame - moveFrame),
      fps,
      config: { damping: 15, stiffness: 100 },
    });
    currentX = position.x + (targetPosition.x - position.x) * moveProgress;
    currentY = position.y + (targetPosition.y - position.y) * moveProgress;
  }

  // Attack animation (shake + glow)
  let attackShake = 0;
  let attackGlow = 0;
  if (attackFrame && frame >= attackFrame && frame <= attackFrame + 30) {
    const attackProgress = (frame - attackFrame) / 30;
    attackShake = Math.sin(attackProgress * Math.PI * 8) * (1 - attackProgress) * 10;
    attackGlow = Math.sin(attackProgress * Math.PI) * 2;
  }

  const cardOpacity = interpolate(
    frame,
    [startFrame, startFrame + 15],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div
      style={{
        position: "absolute",
        left: currentX,
        top: currentY,
        width: 120 * scale,
        height: 170 * scale,
        background: `linear-gradient(135deg, ${colors.primary}20 0%, ${colors.secondary}10 100%)`,
        border: `2px solid ${colors.primary}`,
        borderRadius: 8,
        opacity: cardOpacity * entryProgress,
        transform: `translateX(${attackShake}px) scale(${0.8 + entryProgress * 0.2})`,
        boxShadow: `
          0 0 ${20 + attackGlow * 30}px ${colors.glow},
          inset 0 0 30px ${colors.glow}
        `,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 8,
      }}
    >
      {/* Card art placeholder */}
      <div
        style={{
          width: "80%",
          height: "60%",
          background: `linear-gradient(180deg, ${colors.primary}40 0%, ${colors.secondary}20 100%)`,
          borderRadius: 4,
          marginBottom: 8,
        }}
      />
      {/* Card name */}
      <div
        style={{
          fontFamily: TYPOGRAPHY.serif,
          fontSize: 10 * scale,
          color: colors.primary,
          textAlign: "center",
          textShadow: `0 0 10px ${colors.glow}`,
        }}
      >
        {name}
      </div>
    </div>
  );
};

// Health bar component
const HealthBar: React.FC<{
  frame: number;
  fps: number;
  current: number;
  max: number;
  isEnemy?: boolean;
  damageFrame?: number;
  damageAmount?: number;
}> = ({ frame, fps, current, max, isEnemy = false, damageFrame, damageAmount = 0 }) => {
  // Calculate displayed health with damage animation
  let displayedHealth = current;
  if (damageFrame && frame >= damageFrame) {
    const damageProgress = spring({
      frame: Math.max(0, frame - damageFrame),
      fps,
      config: { damping: 20, stiffness: 60 },
    });
    displayedHealth = current + damageAmount - damageAmount * damageProgress;
  }

  const healthPercent = (displayedHealth / max) * 100;

  // Shake on damage
  let shake = 0;
  if (damageFrame && frame >= damageFrame && frame <= damageFrame + 20) {
    const shakeProgress = (frame - damageFrame) / 20;
    shake = Math.sin(shakeProgress * Math.PI * 6) * (1 - shakeProgress) * 8;
  }

  const barColor = healthPercent > 50
    ? "#22c55e"
    : healthPercent > 25
    ? "#fbbf24"
    : "#ef4444";

  return (
    <div
      style={{
        width: "100%",
        transform: `translateX(${shake}px)`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 4,
          fontFamily: TYPOGRAPHY.mono,
          fontSize: 14,
          color: isEnemy ? "#ef4444" : "#22c55e",
        }}
      >
        <span>{isEnemy ? "ENEMY" : "PLAYER"}</span>
        <span>{Math.floor(displayedHealth)}/{max}</span>
      </div>
      <div
        style={{
          width: "100%",
          height: 12,
          background: "rgba(255, 255, 255, 0.1)",
          borderRadius: 6,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${healthPercent}%`,
            height: "100%",
            background: `linear-gradient(90deg, ${barColor} 0%, ${barColor}80 100%)`,
            boxShadow: `0 0 10px ${barColor}`,
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
};

// Combat effect overlay
const CombatEffect: React.FC<{
  frame: number;
  triggerFrame: number;
  position: { x: number; y: number };
  type: "attack" | "spell" | "defend";
}> = ({ frame, triggerFrame, position, type }) => {
  if (frame < triggerFrame || frame > triggerFrame + 30) return null;

  const progress = (frame - triggerFrame) / 30;
  const opacity = Math.sin(progress * Math.PI);
  const scale = 0.5 + progress * 1.5;

  const colors = {
    attack: "#ef4444",
    spell: "#a855f7",
    defend: "#3b82f6",
  };

  return (
    <div
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        width: 100,
        height: 100,
        transform: `translate(-50%, -50%) scale(${scale})`,
        opacity,
        pointerEvents: "none",
      }}
    >
      {/* Impact burst */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle, ${colors[type]} 0%, transparent 70%)`,
          borderRadius: "50%",
        }}
      />
      {/* Particle lines */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <div
          key={angle}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 4,
            height: 30 * scale,
            background: `linear-gradient(180deg, ${colors[type]} 0%, transparent 100%)`,
            transform: `translate(-50%, -100%) rotate(${angle}deg)`,
            transformOrigin: "bottom center",
          }}
        />
      ))}
    </div>
  );
};

export const EpicBattleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // === PHASE CALCULATIONS ===

  // Phase 1: Setup (0-100)
  const setupProgress = interpolate(frame, [0, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Phase 2: Battle (100-250)
  const battlePhase = frame >= 100 && frame < 250;

  // Phase 3: Climax (250-400)
  const climaxPhase = frame >= 250 && frame < 400;

  // Phase 4: Resolution (400-450)
  const resolutionPhase = frame >= 400;

  // AI Status based on phase
  let aiStatus: "IDLE" | "ACTIVE" | "ANALYZING" | "DECIDING" = "ACTIVE";
  if (frame < 50) aiStatus = "IDLE";
  else if (frame < 100) aiStatus = "ACTIVE";
  else if (frame < 250) aiStatus = "ANALYZING";
  else aiStatus = "DECIDING";

  // Health values with damage events
  const playerHealth = frame >= 180 ? 75 : frame >= 320 ? 50 : 100;
  const enemyHealth = frame >= 150 ? 80 : frame >= 280 ? 40 : frame >= 380 ? 0 : 100;

  // AI thinking progress
  const thinkingProgress = frame < 100
    ? 0
    : frame < 250
    ? interpolate(frame, [100, 250], [0, 80], { extrapolateRight: "clamp" })
    : interpolate(frame, [250, 350], [80, 100], { extrapolateRight: "clamp" });

  // AI actions based on battle phase
  const getAIActions = () => {
    if (frame < 250) {
      return [
        { name: "Analyze Board", score: 7.5 },
        { name: "Counter Play", score: 6.8 },
        { name: "Wait", score: 5.2 },
      ];
    }
    return [
      { name: "Dragon Strike", score: 9.4, selected: true },
      { name: "Defensive Wall", score: 6.1 },
      { name: "Retreat", score: 2.3, rejected: true },
    ];
  };

  // Split screen divider position
  const dividerX = interpolate(frame, [0, 60], [100, 60], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Background pulse
  const bgPulse = pulse(frame, 90);

  // Climax screen shake
  let screenShake = { x: 0, y: 0 };
  if (frame >= 280 && frame <= 320) {
    const shakeIntensity = interpolate(frame, [280, 300, 320], [0, 1, 0]);
    screenShake = {
      x: Math.sin(frame * 2.5) * shakeIntensity * 15,
      y: Math.cos(frame * 3.1) * shakeIntensity * 10,
    };
  }

  // Victory/defeat flash
  const victoryFlash = resolutionPhase
    ? interpolate(frame, [400, 420, 450], [0, 0.8, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  return (
    <AbsoluteFill
      style={{
        background: COLORS.darkBg,
        transform: `translate(${screenShake.x}px, ${screenShake.y}px)`,
      }}
    >
      {/* Background arena gradient */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 30% 50%,
            rgba(139, 0, 255, ${0.1 + bgPulse * 0.05}) 0%,
            transparent 50%
          )`,
        }}
      />

      {/* === LEFT SIDE: BATTLE ARENA (60%) === */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: `${dividerX}%`,
          height: "100%",
          overflow: "hidden",
        }}
      >
        {/* Arena background */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(180deg,
              rgba(10, 10, 20, 0.95) 0%,
              rgba(20, 15, 30, 0.9) 50%,
              rgba(10, 10, 20, 0.95) 100%
            )`,
          }}
        />

        {/* Arena floor perspective grid */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "40%",
            background: `
              linear-gradient(rgba(139, 0, 255, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(139, 0, 255, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
            transform: "perspective(500px) rotateX(60deg)",
            transformOrigin: "bottom center",
            opacity: setupProgress * 0.6,
          }}
        />

        {/* Health bars */}
        <div
          style={{
            position: "absolute",
            top: 40,
            left: 40,
            right: 40,
            display: "flex",
            flexDirection: "column",
            gap: 20,
            opacity: setupProgress,
          }}
        >
          <HealthBar
            frame={frame}
            fps={fps}
            current={enemyHealth}
            max={100}
            isEnemy
            damageFrame={frame >= 150 && frame < 180 ? 150 : frame >= 280 ? 280 : undefined}
            damageAmount={frame >= 280 ? 40 : 20}
          />
          <HealthBar
            frame={frame}
            fps={fps}
            current={playerHealth}
            max={100}
            damageFrame={frame >= 180 && frame < 280 ? 180 : undefined}
            damageAmount={25}
          />
        </div>

        {/* Enemy cards */}
        <BattleCard
          frame={frame}
          fps={fps}
          name="Abyssal Horror"
          archetype="abyssal_horrors"
          startFrame={30}
          position={{ x: 200, y: 200 }}
          targetPosition={{ x: 300, y: 350 }}
          moveFrame={150}
          attackFrame={180}
          scale={1.2}
        />

        <BattleCard
          frame={frame}
          fps={fps}
          name="Shadow Fiend"
          archetype="shadow_assassins"
          startFrame={45}
          position={{ x: 350, y: 180 }}
          scale={1}
        />

        {/* Player cards */}
        <BattleCard
          frame={frame}
          fps={fps}
          name="Infernal Dragon"
          archetype="infernal_dragons"
          startFrame={60}
          position={{ x: 250, y: 500 }}
          targetPosition={{ x: 280, y: 320 }}
          moveFrame={280}
          attackFrame={300}
          scale={1.3}
        />

        <BattleCard
          frame={frame}
          fps={fps}
          name="Flame Guardian"
          archetype="infernal_dragons"
          startFrame={75}
          position={{ x: 400, y: 520 }}
          scale={1}
        />

        {/* Combat effects */}
        <CombatEffect
          frame={frame}
          triggerFrame={180}
          position={{ x: 350, y: 450 }}
          type="attack"
        />
        <CombatEffect
          frame={frame}
          triggerFrame={300}
          position={{ x: 300, y: 280 }}
          type="spell"
        />

        {/* Battle phase indicator */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            left: 40,
            fontFamily: TYPOGRAPHY.mono,
            fontSize: 16,
            color: COLORS.gold,
            opacity: setupProgress,
          }}
        >
          {frame < 100 && "PREPARING..."}
          {battlePhase && "BATTLE IN PROGRESS"}
          {climaxPhase && "CRITICAL MOMENT"}
          {resolutionPhase && (
            <span style={{ color: "#22c55e" }}>VICTORY!</span>
          )}
        </div>

        {/* Turn indicator */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            fontFamily: TYPOGRAPHY.serif,
            fontSize: 24,
            color: frame < 200 ? "#ef4444" : COLORS.gold,
            textShadow: `0 0 20px ${frame < 200 ? "rgba(239, 68, 68, 0.6)" : "rgba(212, 175, 55, 0.6)"}`,
            opacity: interpolate(frame, [100, 120, 180, 200, 250, 270], [0, 1, 1, 0, 0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          {frame < 200 ? "ENEMY TURN" : "YOUR TURN"}
        </div>
      </div>

      {/* === DIVIDER === */}
      <div
        style={{
          position: "absolute",
          left: `${dividerX}%`,
          top: 0,
          width: 4,
          height: "100%",
          background: `linear-gradient(180deg,
            transparent 0%,
            ${COLORS.terminalGreen} 20%,
            ${COLORS.terminalGreen} 80%,
            transparent 100%
          )`,
          boxShadow: `0 0 20px ${COLORS.terminalGreen}`,
          transform: "translateX(-50%)",
          opacity: setupProgress,
        }}
      />

      {/* === RIGHT SIDE: AI PANEL (40%) === */}
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          width: `${100 - dividerX}%`,
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          background: `linear-gradient(270deg,
            ${COLORS.terminalBg} 0%,
            rgba(10, 26, 10, 0.8) 100%
          )`,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 500,
            opacity: setupProgress,
          }}
        >
          <ElizaAgentPanel
            frame={frame}
            status={aiStatus}
            showMemory={frame >= 30}
            showAnalysis={frame >= 60}
            showThinking={frame >= 100}
            showDecisions={frame >= 200}
            showFinalDecision={frame >= 350}
            thinkingProgress={thinkingProgress}
            memoryStartFrame={30}
            analysisStartFrame={60}
            thinkingStartFrame={100}
            decisionsStartFrame={200}
            finalDecisionStartFrame={350}
            memories={[
              { key: "Threat assessment", value: "HIGH" },
              { key: "Board state", value: "disadvantaged" },
              { key: "Lethal available", value: frame >= 250 ? "YES" : "calculating..." },
            ]}
            analysis={{
              boardAdvantage: frame >= 250 ? "+4.2" : "-1.8",
              threatLevel: frame >= 250 ? "LOW" : "HIGH",
            }}
            actions={getAIActions()}
            decision="DRAGON_STRIKE"
          />
        </div>
      </div>

      {/* Victory flash overlay */}
      {victoryFlash > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(circle at 30% 50%,
              rgba(255, 215, 0, ${victoryFlash}) 0%,
              transparent 70%
            )`,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Resolution text */}
      {resolutionPhase && (
        <div
          style={{
            position: "absolute",
            left: "30%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            opacity: interpolate(frame, [410, 430], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          <div
            style={{
              fontFamily: TYPOGRAPHY.serif,
              fontSize: 72,
              fontWeight: "bold",
              color: COLORS.gold,
              textShadow: `
                0 0 40px rgba(212, 175, 55, 0.8),
                0 4px 20px rgba(0, 0, 0, 0.5)
              `,
              letterSpacing: 8,
            }}
          >
            VICTORY
          </div>
        </div>
      )}

      {/* Vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at 50% 50%, transparent 40%, rgba(0, 0, 0, 0.6) 100%)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
