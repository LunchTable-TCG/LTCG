import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import {
  ARCHETYPE_COLORS,
  ARCHETYPE_CLASHES,
  COLORS,
  breathingGlow,
  type ArchetypeId,
} from "../utils/animations";

const CLASH_DURATION = 96; // frames per clash (ENTER_FRAMES + HOLD_FRAMES + exit = 30 + 36 + 30)
const ENTER_FRAMES = 30;
const HOLD_FRAMES = 36;

type ClashProps = {
  leftArchetype: ArchetypeId;
  rightArchetype: ArchetypeId;
  clashIndex: number;
};

function ArchetypeClash({ leftArchetype, rightArchetype, clashIndex }: ClashProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const clashStartFrame = clashIndex * CLASH_DURATION;
  const localFrame = frame - clashStartFrame;

  // Skip rendering if not in this clash's time window
  if (localFrame < -10 || localFrame > CLASH_DURATION + 10) return null;

  const leftColors = ARCHETYPE_COLORS[leftArchetype];
  const rightColors = ARCHETYPE_COLORS[rightArchetype];

  // Enter phase (0-30)
  const enterProgress = spring({
    frame: Math.max(0, localFrame),
    fps,
    config: { damping: 15, stiffness: 80 },
  });

  // Exit phase (66-96)
  const exitProgress = interpolate(
    localFrame,
    [ENTER_FRAMES + HOLD_FRAMES, CLASH_DURATION],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // VS flash timing (at the moment they "clash" - frame 30)
  const vsFlash = interpolate(
    localFrame,
    [ENTER_FRAMES - 5, ENTER_FRAMES, ENTER_FRAMES + 10, ENTER_FRAMES + 30],
    [0, 1, 0.8, 0.5],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Lightning effect intensity
  const lightningIntensity = interpolate(
    localFrame,
    [ENTER_FRAMES - 2, ENTER_FRAMES, ENTER_FRAMES + 3, ENTER_FRAMES + 8],
    [0, 1, 0.6, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Character positions
  const leftX = interpolate(enterProgress, [0, 1], [-400, 0]) - exitProgress * 400;
  const rightX = interpolate(enterProgress, [0, 1], [400, 0]) + exitProgress * 400;

  // Opacity
  const opacity = enterProgress * (1 - exitProgress);

  // Breathing glow for held state
  const holdGlow = breathingGlow(localFrame - ENTER_FRAMES, 0.6, 1);

  // Background flash with combined colors
  const bgFlashOpacity = interpolate(
    localFrame,
    [ENTER_FRAMES - 3, ENTER_FRAMES, ENTER_FRAMES + 5],
    [0, 0.3, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ opacity }}>
      {/* Background flash */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(90deg, ${leftColors.primary}40 0%, ${rightColors.primary}40 100%)`,
          opacity: bgFlashOpacity,
        }}
      />

      {/* Left archetype glow */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "50%",
          height: "100%",
          background: `radial-gradient(ellipse at 30% 50%, ${leftColors.glow} 0%, transparent 70%)`,
          opacity: holdGlow * 0.5,
          filter: "blur(40px)",
        }}
      />

      {/* Right archetype glow */}
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          width: "50%",
          height: "100%",
          background: `radial-gradient(ellipse at 70% 50%, ${rightColors.glow} 0%, transparent 70%)`,
          opacity: holdGlow * 0.5,
          filter: "blur(40px)",
        }}
      />

      {/* Left character */}
      <div
        style={{
          position: "absolute",
          left: 80,
          top: "50%",
          transform: `translate(${leftX}px, -50%)`,
          width: 450,
          height: 600,
        }}
      >
        <Img
          src={staticFile(`assets/story/${leftArchetype}.png`)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            filter: `drop-shadow(0 0 40px ${leftColors.primary})`,
          }}
        />

        {/* Left name plate */}
        <div
          style={{
            position: "absolute",
            bottom: -20,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "12px 32px",
            background: `linear-gradient(90deg, transparent, ${leftColors.primary}40, transparent)`,
            borderRadius: 8,
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: "bold",
              color: leftColors.primary,
              textShadow: `0 0 20px ${leftColors.glow}, 0 2px 4px rgba(0,0,0,0.8)`,
              fontFamily: "serif",
              letterSpacing: 3,
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            {leftColors.name}
          </div>
        </div>
      </div>

      {/* Right character */}
      <div
        style={{
          position: "absolute",
          right: 80,
          top: "50%",
          transform: `translate(${rightX}px, -50%) scaleX(-1)`,
          width: 450,
          height: 600,
        }}
      >
        <Img
          src={staticFile(`assets/story/${rightArchetype}.png`)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            filter: `drop-shadow(0 0 40px ${rightColors.primary})`,
            transform: "scaleX(-1)", // Flip back for proper orientation
          }}
        />

        {/* Right name plate */}
        <div
          style={{
            position: "absolute",
            bottom: -20,
            left: "50%",
            transform: "translateX(-50%) scaleX(-1)",
            padding: "12px 32px",
            background: `linear-gradient(90deg, transparent, ${rightColors.primary}40, transparent)`,
            borderRadius: 8,
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: "bold",
              color: rightColors.primary,
              textShadow: `0 0 20px ${rightColors.glow}, 0 2px 4px rgba(0,0,0,0.8)`,
              fontFamily: "serif",
              letterSpacing: 3,
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            {rightColors.name}
          </div>
        </div>
      </div>

      {/* VS lightning effect in center */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        {/* Lightning bolts */}
        {lightningIntensity > 0 && (
          <>
            <svg
              width="200"
              height="300"
              viewBox="0 0 200 300"
              style={{
                position: "absolute",
                left: -100,
                top: -150,
                opacity: lightningIntensity,
                filter: `drop-shadow(0 0 20px ${COLORS.gold})`,
              }}
            >
              <path
                d="M100 0 L80 120 L120 100 L70 180 L130 150 L60 300"
                fill="none"
                stroke={COLORS.gold}
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M100 0 L80 120 L120 100 L70 180 L130 150 L60 300"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <svg
              width="200"
              height="300"
              viewBox="0 0 200 300"
              style={{
                position: "absolute",
                left: -100,
                top: -150,
                opacity: lightningIntensity * 0.7,
                filter: `drop-shadow(0 0 20px ${COLORS.gold})`,
                transform: "scaleX(-1) rotate(15deg)",
              }}
            >
              <path
                d="M100 20 L120 100 L80 90 L130 200 L70 170 L140 280"
                fill="none"
                stroke={COLORS.gold}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </>
        )}

        {/* VS text */}
        <div
          style={{
            fontSize: 120,
            fontWeight: "bold",
            color: COLORS.gold,
            textShadow: `
              0 0 ${60 * vsFlash}px ${COLORS.gold},
              0 0 ${100 * vsFlash}px rgba(255, 255, 255, 0.5),
              0 4px 12px rgba(0,0,0,0.8)
            `,
            fontFamily: "serif",
            letterSpacing: 8,
            opacity: vsFlash,
            transform: `scale(${0.8 + vsFlash * 0.2})`,
          }}
        >
          VS
        </div>
      </div>

      {/* Screen shake flash */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "white",
          opacity: lightningIntensity * 0.15,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
}

export const DualArchetypeClash: React.FC = () => {
  const frame = useCurrentFrame();

  // Overall fade in/out
  const fadeIn = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [460, 480], [1, 0], { extrapolateLeft: "clamp" });
  const opacity = fadeIn * fadeOut;

  return (
    <AbsoluteFill
      style={{
        background: COLORS.darkBg,
        opacity,
      }}
    >
      {/* Animated background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(ellipse at 50% 50%, rgba(30, 30, 40, 1) 0%, ${COLORS.darkBg} 100%)
          `,
        }}
      />

      {/* Render all clashes */}
      {ARCHETYPE_CLASHES.map(([left, right], index) => (
        <ArchetypeClash
          key={`${left}-${right}`}
          leftArchetype={left}
          rightArchetype={right}
          clashIndex={index}
        />
      ))}

      {/* Top title */}
      <div
        style={{
          position: "absolute",
          top: 40,
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
            textShadow: `0 0 30px rgba(212, 175, 55, 0.6), 0 4px 12px rgba(0,0,0,0.8)`,
            fontFamily: "serif",
            letterSpacing: 6,
            textTransform: "uppercase",
          }}
        >
          10 Unique Archetypes
        </div>
      </div>

      {/* Logo watermark */}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 18,
          color: `${COLORS.gold}80`,
          fontFamily: "serif",
          letterSpacing: 4,
        }}
      >
        LUNCHTABLE CHRONICLES
      </div>
    </AbsoluteFill>
  );
};
