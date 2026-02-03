import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { COLORS, breathingGlow } from "../utils/animations";

// Chapter nodes on the winding path
const CHAPTER_NODES = [
  { x: 20, y: 75, chapter: 1, name: "The Beginning" },
  { x: 35, y: 55, chapter: 2, name: "Dark Forest" },
  { x: 55, y: 45, chapter: 3, name: "Ancient Ruins" },
  { x: 70, y: 30, chapter: 4, name: "Mountain Pass" },
  { x: 85, y: 20, chapter: 5, name: "???" },
];

export const StoryPathPreview: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scene entrance
  const sceneEntrance = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 50 },
  });

  // Fog animation
  const fogOffset = interpolate(frame, [0, 90], [0, 50]);
  const fogOpacity = breathingGlow(frame, 0.15, 0.35);

  // Path draw animation (SVG stroke-dashoffset)
  const pathProgress = interpolate(frame, [10, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Boss silhouette reveal
  const bossReveal = interpolate(frame, [50, 80], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Text entrance
  const textOpacity = interpolate(frame, [5, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: COLORS.darkBg,
      }}
    >
      {/* Story background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.4 * sceneEntrance,
        }}
      >
        <Img
          src={staticFile("assets/backgrounds/story-bg.png")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </div>

      {/* Dark vignette overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(ellipse at 50% 50%, transparent 30%, ${COLORS.darkBg} 100%),
            linear-gradient(180deg, ${COLORS.darkBg}80 0%, transparent 30%, transparent 70%, ${COLORS.darkBg}90 100%)
          `,
        }}
      />

      {/* Atmospheric fog layer 1 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(ellipse at ${30 + fogOffset * 0.5}% 60%, rgba(100, 100, 120, ${fogOpacity}) 0%, transparent 50%),
            radial-gradient(ellipse at ${70 - fogOffset * 0.3}% 40%, rgba(80, 80, 100, ${fogOpacity * 0.7}) 0%, transparent 40%)
          `,
          filter: "blur(30px)",
        }}
      />

      {/* Winding path SVG */}
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="pathGradient" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={COLORS.gold} stopOpacity="0.8" />
            <stop offset="100%" stopColor={COLORS.gold} stopOpacity="0.3" />
          </linearGradient>
          <filter id="pathGlow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Main path */}
        <path
          d="M 200 800
             Q 400 700, 500 600
             Q 600 500, 800 480
             Q 1000 460, 1100 350
             Q 1200 240, 1400 200
             Q 1600 160, 1750 150"
          fill="none"
          stroke="url(#pathGradient)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray="2000"
          strokeDashoffset={2000 * (1 - pathProgress)}
          filter="url(#pathGlow)"
          opacity={sceneEntrance}
        />

        {/* Dotted trail effect */}
        <path
          d="M 200 800
             Q 400 700, 500 600
             Q 600 500, 800 480
             Q 1000 460, 1100 350
             Q 1200 240, 1400 200
             Q 1600 160, 1750 150"
          fill="none"
          stroke={COLORS.gold}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="10 20"
          strokeDashoffset={2000 * (1 - pathProgress)}
          opacity={sceneEntrance * 0.5}
        />
      </svg>

      {/* Chapter nodes */}
      {CHAPTER_NODES.map((node, index) => {
        const nodeDelay = 15 + index * 10;
        const nodeProgress = spring({
          frame: frame - nodeDelay,
          fps,
          config: { damping: 12, stiffness: 100 },
        });

        const nodeGlow = breathingGlow(frame - nodeDelay, 0.5, 1);
        const isLast = index === CHAPTER_NODES.length - 1;

        return (
          <div
            key={node.chapter}
            style={{
              position: "absolute",
              left: `${node.x}%`,
              top: `${node.y}%`,
              transform: `translate(-50%, -50%) scale(${nodeProgress})`,
            }}
          >
            {/* Node glow */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${isLast ? "#ff4444" : COLORS.gold}60 0%, transparent 70%)`,
                filter: "blur(15px)",
                opacity: nodeGlow * nodeProgress,
              }}
            />

            {/* Node circle */}
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: "50%",
                background: isLast
                  ? `radial-gradient(circle at 30% 30%, #666, #222)`
                  : `radial-gradient(circle at 30% 30%, ${COLORS.gold}, #8b6914)`,
                border: `4px solid ${isLast ? "#444" : COLORS.gold}`,
                boxShadow: isLast
                  ? "0 0 20px rgba(255, 68, 68, 0.4), inset 0 -5px 10px rgba(0,0,0,0.5)"
                  : `0 0 20px ${COLORS.gold}60, inset 0 -5px 10px rgba(0,0,0,0.3)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  fontSize: isLast ? 20 : 24,
                  fontWeight: "bold",
                  color: isLast ? "#888" : "#0a0a0a",
                  fontFamily: "serif",
                  textShadow: isLast ? "none" : "0 1px 2px rgba(255,255,255,0.3)",
                }}
              >
                {isLast ? "?" : node.chapter}
              </span>
            </div>

            {/* Chapter name label */}
            <div
              style={{
                position: "absolute",
                top: 60,
                left: "50%",
                transform: "translateX(-50%)",
                whiteSpace: "nowrap",
                fontSize: 14,
                fontWeight: "bold",
                color: isLast ? "#666" : COLORS.gold,
                textShadow: `0 0 10px ${isLast ? "rgba(100,100,100,0.5)" : COLORS.gold}60, 0 2px 4px rgba(0,0,0,0.8)`,
                fontFamily: "serif",
                letterSpacing: 1,
                opacity: nodeProgress,
              }}
            >
              {node.name}
            </div>
          </div>
        );
      })}

      {/* Boss silhouette at the end */}
      <div
        style={{
          position: "absolute",
          right: 60,
          top: 60,
          width: 250,
          height: 300,
          opacity: bossReveal * 0.7,
        }}
      >
        {/* Ominous glow behind boss */}
        <div
          style={{
            position: "absolute",
            inset: -40,
            background: `radial-gradient(ellipse at 50% 50%, rgba(255, 68, 68, ${breathingGlow(frame, 0.2, 0.4)}) 0%, transparent 60%)`,
            filter: "blur(30px)",
          }}
        />

        {/* Boss silhouette (using abyssal horrors as the mysterious boss) */}
        <div
          style={{
            width: "100%",
            height: "100%",
            position: "relative",
            filter: "brightness(0) saturate(0)",
            opacity: 0.8,
          }}
        >
          <Img
            src={staticFile("assets/story/abyssal_horrors.png")}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
            }}
          />
        </div>

        {/* Glowing eyes effect */}
        <div
          style={{
            position: "absolute",
            top: "25%",
            left: "40%",
            width: 12,
            height: 8,
            borderRadius: "50%",
            background: "#ff4444",
            boxShadow: `0 0 20px #ff4444, 0 0 40px #ff4444`,
            opacity: breathingGlow(frame, 0.6, 1) * bossReveal,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "25%",
            right: "40%",
            width: 12,
            height: 8,
            borderRadius: "50%",
            background: "#ff4444",
            boxShadow: `0 0 20px #ff4444, 0 0 40px #ff4444`,
            opacity: breathingGlow(frame, 0.6, 1) * bossReveal,
          }}
        />
      </div>

      {/* Fog layer 2 (foreground) */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "30%",
          background: `linear-gradient(180deg, transparent 0%, rgba(20, 20, 30, ${fogOpacity}) 100%)`,
          filter: "blur(20px)",
          transform: `translateX(${-fogOffset}px)`,
        }}
      />

      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 50,
          left: 80,
          opacity: textOpacity,
        }}
      >
        <div
          style={{
            fontSize: 52,
            fontWeight: "bold",
            color: COLORS.gold,
            textShadow: `0 0 40px rgba(212, 175, 55, 0.8), 0 4px 12px rgba(0,0,0,0.8)`,
            fontFamily: "serif",
            letterSpacing: 4,
          }}
        >
          EMBARK ON YOUR JOURNEY
        </div>
      </div>

      {/* Subtitle */}
      <div
        style={{
          position: "absolute",
          top: 120,
          left: 80,
          opacity: interpolate(frame, [20, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        <div
          style={{
            fontSize: 24,
            color: "#a89f94",
            textShadow: "0 2px 10px rgba(0,0,0,0.8)",
            fontFamily: "sans-serif",
          }}
        >
          Face legendary bosses and unlock your destiny
        </div>
      </div>

      {/* Logo watermark */}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          left: 80,
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
