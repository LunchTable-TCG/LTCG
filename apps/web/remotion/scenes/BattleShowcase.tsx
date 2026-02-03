import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { COLORS, breathingGlow, ARCHETYPE_COLORS } from "../utils/animations";

// Battle configuration
const PLAYER_ARCHETYPE = "celestial_guardians";
const OPPONENT_ARCHETYPE = "abyssal_horrors";

export const BattleShowcase: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const playerColors = ARCHETYPE_COLORS[PLAYER_ARCHETYPE];
  const opponentColors = ARCHETYPE_COLORS[OPPONENT_ARCHETYPE];

  // Arena reveal
  const arenaReveal = spring({
    frame,
    fps,
    config: { damping: 25, stiffness: 50 },
  });

  // Card play animation (player card from hand to board)
  const cardPlayFrame = 30;
  const cardPlayProgress = spring({
    frame: frame - cardPlayFrame,
    fps,
    config: { damping: 15, stiffness: 80 },
  });

  // Attack animation (card moves toward opponent)
  const attackFrame = 90;
  const attackProgress = interpolate(
    frame,
    [attackFrame, attackFrame + 20, attackFrame + 30],
    [0, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Collision/impact effect
  const impactFrame = attackFrame + 20;
  const impactIntensity = interpolate(
    frame,
    [impactFrame - 2, impactFrame, impactFrame + 5, impactFrame + 15],
    [0, 1, 0.7, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Damage number popup
  const damagePopupDelay = impactFrame + 5;
  const damagePopupProgress = spring({
    frame: frame - damagePopupDelay,
    fps,
    config: { damping: 10, stiffness: 100 },
  });
  const damageOpacity = interpolate(
    frame,
    [damagePopupDelay, damagePopupDelay + 10, damagePopupDelay + 40, damagePopupDelay + 50],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Health bar animations
  const playerHealthStart = 100;
  const opponentHealthAfterHit = interpolate(
    frame,
    [impactFrame, impactFrame + 20],
    [100, 65],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Screen shake on impact
  const shakeX = impactIntensity * Math.sin(frame * 2) * 8;
  const shakeY = impactIntensity * Math.cos(frame * 3) * 5;

  // Background glow
  const bgGlow = breathingGlow(frame, 0.2, 0.4);

  return (
    <AbsoluteFill
      style={{
        background: COLORS.darkBg,
        transform: `translate(${shakeX}px, ${shakeY}px)`,
      }}
    >
      {/* Arena background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.5 + arenaReveal * 0.3,
        }}
      >
        <Img
          src={staticFile("assets/backgrounds/arena_grimoire.png")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${1 + (1 - arenaReveal) * 0.1})`,
          }}
        />
      </div>

      {/* Battle atmosphere */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(ellipse at 30% 70%, ${playerColors.glow} 0%, transparent 40%),
            radial-gradient(ellipse at 70% 30%, ${opponentColors.glow} 0%, transparent 40%)
          `,
          opacity: bgGlow * 0.4,
          filter: "blur(60px)",
        }}
      />

      {/* Health bars container */}
      <div
        style={{
          position: "absolute",
          top: 30,
          left: 60,
          right: 60,
          display: "flex",
          justifyContent: "space-between",
          opacity: arenaReveal,
        }}
      >
        {/* Player health */}
        <div style={{ width: 350 }}>
          <div
            style={{
              fontSize: 18,
              color: playerColors.primary,
              fontFamily: "serif",
              marginBottom: 8,
              textShadow: `0 0 10px ${playerColors.glow}`,
            }}
          >
            PLAYER
          </div>
          <div
            style={{
              height: 24,
              background: "rgba(0,0,0,0.6)",
              borderRadius: 12,
              border: `2px solid ${playerColors.primary}40`,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${playerHealthStart}%`,
                height: "100%",
                background: `linear-gradient(90deg, ${playerColors.primary}, ${playerColors.secondary})`,
                boxShadow: `inset 0 2px 4px rgba(255,255,255,0.3)`,
                transition: "width 0.3s ease",
              }}
            />
          </div>
          <div
            style={{
              fontSize: 14,
              color: "#fff",
              marginTop: 4,
              textShadow: "0 1px 3px rgba(0,0,0,0.8)",
            }}
          >
            {playerHealthStart}/100
          </div>
        </div>

        {/* Opponent health */}
        <div style={{ width: 350, textAlign: "right" }}>
          <div
            style={{
              fontSize: 18,
              color: opponentColors.primary,
              fontFamily: "serif",
              marginBottom: 8,
              textShadow: `0 0 10px ${opponentColors.glow}`,
            }}
          >
            OPPONENT
          </div>
          <div
            style={{
              height: 24,
              background: "rgba(0,0,0,0.6)",
              borderRadius: 12,
              border: `2px solid ${opponentColors.primary}40`,
              overflow: "hidden",
              direction: "rtl",
            }}
          >
            <div
              style={{
                width: `${opponentHealthAfterHit}%`,
                height: "100%",
                background: `linear-gradient(270deg, ${opponentColors.primary}, ${opponentColors.secondary})`,
                boxShadow: `inset 0 2px 4px rgba(255,255,255,0.3)`,
              }}
            />
          </div>
          <div
            style={{
              fontSize: 14,
              color: "#fff",
              marginTop: 4,
              textShadow: "0 1px 3px rgba(0,0,0,0.8)",
            }}
          >
            {Math.round(opponentHealthAfterHit)}/100
          </div>
        </div>
      </div>

      {/* Opponent card (top of battlefield) */}
      <div
        style={{
          position: "absolute",
          top: 150,
          left: "50%",
          transform: `translate(-50%, 0) scale(${arenaReveal})`,
        }}
      >
        <div
          style={{
            width: 180,
            height: 250,
            borderRadius: 16,
            background: "#1a1a2e",
            border: `4px solid ${opponentColors.primary}`,
            boxShadow: `0 0 30px ${opponentColors.glow}, 0 10px 30px rgba(0,0,0,0.5)`,
            overflow: "hidden",
            position: "relative",
            // Shake on hit
            transform: `translateX(${impactIntensity * 10}px)`,
          }}
        >
          <Img
            src={staticFile(`assets/story/${OPPONENT_ARCHETYPE}.png`)}
            style={{
              width: "100%",
              height: "80%",
              objectFit: "cover",
              objectPosition: "center top",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "12px",
              background: `linear-gradient(180deg, transparent, ${opponentColors.primary}40, #0a0a15)`,
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: "bold",
                color: "#fff",
                textAlign: "center",
                fontFamily: "serif",
              }}
            >
              Void Terror
            </div>
          </div>

          {/* Attack indicator */}
          <div
            style={{
              position: "absolute",
              bottom: 8,
              left: 12,
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "#ef4444",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: "bold",
              color: "#fff",
              boxShadow: "0 0 10px rgba(239, 68, 68, 0.6)",
            }}
          >
            5
          </div>
          <div
            style={{
              position: "absolute",
              bottom: 8,
              right: 12,
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "#3b82f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: "bold",
              color: "#fff",
              boxShadow: "0 0 10px rgba(59, 130, 246, 0.6)",
            }}
          >
            4
          </div>
        </div>
      </div>

      {/* Player card (bottom, animated from hand) */}
      <div
        style={{
          position: "absolute",
          bottom: interpolate(cardPlayProgress, [0, 1], [0, 160]),
          left: "50%",
          transform: `translate(-50%, ${interpolate(cardPlayProgress, [0, 1], [100, 0])}px)
                      scale(${interpolate(cardPlayProgress, [0, 0.5, 1], [0.7, 1.1, 1])})
                      translateY(${-attackProgress * 150}px)`,
          opacity: interpolate(cardPlayProgress, [0, 0.3], [0, 1]),
        }}
      >
        <div
          style={{
            width: 180,
            height: 250,
            borderRadius: 16,
            background: "#1a1a2e",
            border: `4px solid ${playerColors.primary}`,
            boxShadow: `0 0 30px ${playerColors.glow}, 0 10px 30px rgba(0,0,0,0.5)`,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <Img
            src={staticFile(`assets/story/${PLAYER_ARCHETYPE}.png`)}
            style={{
              width: "100%",
              height: "80%",
              objectFit: "cover",
              objectPosition: "center top",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "12px",
              background: `linear-gradient(180deg, transparent, ${playerColors.primary}40, #0a0a15)`,
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: "bold",
                color: "#fff",
                textAlign: "center",
                fontFamily: "serif",
              }}
            >
              Solar Knight
            </div>
          </div>

          {/* Attack/Health indicators */}
          <div
            style={{
              position: "absolute",
              bottom: 8,
              left: 12,
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "#ef4444",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: "bold",
              color: "#fff",
              boxShadow: "0 0 10px rgba(239, 68, 68, 0.6)",
            }}
          >
            7
          </div>
          <div
            style={{
              position: "absolute",
              bottom: 8,
              right: 12,
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "#3b82f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: "bold",
              color: "#fff",
              boxShadow: "0 0 10px rgba(59, 130, 246, 0.6)",
            }}
          >
            6
          </div>
        </div>
      </div>

      {/* Collision spark/explosion */}
      {impactIntensity > 0 && (
        <div
          style={{
            position: "absolute",
            top: "45%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          {/* Main explosion */}
          <div
            style={{
              width: 200 * impactIntensity,
              height: 200 * impactIntensity,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${COLORS.gold} 0%, ${playerColors.primary} 40%, transparent 70%)`,
              filter: "blur(10px)",
              opacity: impactIntensity,
            }}
          />

          {/* Spark lines */}
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: 80 * impactIntensity,
                height: 4,
                background: `linear-gradient(90deg, ${COLORS.gold}, transparent)`,
                transform: `translate(-50%, -50%) rotate(${i * 45}deg)`,
                opacity: impactIntensity,
              }}
            />
          ))}
        </div>
      )}

      {/* Damage number popup */}
      {frame >= damagePopupDelay && (
        <div
          style={{
            position: "absolute",
            top: 280,
            left: "50%",
            transform: `translate(-50%, ${-damagePopupProgress * 40}px) scale(${0.5 + damagePopupProgress * 0.5})`,
            opacity: damageOpacity,
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: "bold",
              color: "#ef4444",
              textShadow: `
                0 0 20px rgba(239, 68, 68, 0.8),
                0 4px 8px rgba(0,0,0,0.8),
                2px 2px 0 #000,
                -2px -2px 0 #000
              `,
              fontFamily: "sans-serif",
            }}
          >
            -35
          </div>
        </div>
      )}

      {/* White flash on impact */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "white",
          opacity: impactIntensity * 0.2,
          pointerEvents: "none",
        }}
      />

      {/* Battle title */}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          left: 0,
          right: 0,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 36,
            fontWeight: "bold",
            color: COLORS.gold,
            textShadow: `0 0 30px rgba(212, 175, 55, 0.8), 0 4px 12px rgba(0,0,0,0.8)`,
            fontFamily: "serif",
            letterSpacing: 4,
            opacity: arenaReveal,
          }}
        >
          TACTICAL COMBAT
        </div>
      </div>
    </AbsoluteFill>
  );
};
