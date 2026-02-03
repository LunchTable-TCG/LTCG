import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Img,
  staticFile,
  Sequence,
} from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";

type SceneProps = {
  title: string;
  description: string;
  color: string;
  backgroundImage: string;
  characterImage?: string;
};

function Scene({ title, description, color, backgroundImage, characterImage }: SceneProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 80 },
  });

  const glowPulse = interpolate(
    frame,
    [30, 60, 90, 120],
    [0.6, 1, 0.8, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const textEntrance = interpolate(
    frame,
    [20, 50],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ background: "#0a0a0a" }}>
      {/* Background image */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.4,
        }}
      >
        <Img
          src={staticFile(backgroundImage)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${1 + entrance * 0.05})`,
          }}
        />
      </div>

      {/* Background gradient overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(135deg, #0a0a0a 0%, ${color}15 50%, #0a0a0a 100%)`,
        }}
      />

      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 50% 50%, ${color}20 0%, transparent 60%)`,
          filter: "blur(100px)",
          opacity: glowPulse,
        }}
      />

      {/* Character image if provided */}
      {characterImage && (
        <div
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            width: "45%",
            height: "90%",
            opacity: entrance,
            transform: `translateX(${(1 - entrance) * 100}px)`,
          }}
        >
          <Img
            src={staticFile(characterImage)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              objectPosition: "bottom right",
              filter: `drop-shadow(0 0 30px ${color})`,
            }}
          />
        </div>
      )}

      {/* Content */}
      <div
        style={{
          position: "absolute",
          left: 80,
          top: "50%",
          transform: "translateY(-50%)",
          maxWidth: characterImage ? "50%" : "70%",
          opacity: textEntrance,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontSize: 72,
            fontWeight: "bold",
            color,
            textShadow: `0 0 40px ${color}, 0 4px 12px rgba(0,0,0,0.8)`,
            fontFamily: "serif",
            letterSpacing: 4,
            textTransform: "uppercase",
            marginBottom: 24,
            transform: `translateY(${(1 - textEntrance) * 30}px)`,
          }}
        >
          {title}
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 32,
            color: "#d4d4d4",
            maxWidth: 700,
            lineHeight: 1.5,
            fontFamily: "sans-serif",
            textShadow: "0 2px 10px rgba(0,0,0,0.8)",
            transform: `translateY(${(1 - textEntrance) * 20}px)`,
          }}
        >
          {description}
        </div>
      </div>

      {/* Logo watermark */}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          left: 80,
          fontSize: 20,
          color: "#d4af3780",
          fontFamily: "serif",
          letterSpacing: 4,
        }}
      >
        LUNCHTABLE CHRONICLES
      </div>
    </AbsoluteFill>
  );
}

function IntroScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 60 },
  });

  const titleOpacity = interpolate(
    frame,
    [0, 40],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const glowPulse = interpolate(
    frame,
    [40, 70, 100, 130],
    [0.5, 1, 0.7, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        background: "#0a0a0a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "45%",
          width: 800,
          height: 800,
          transform: "translate(-50%, -50%)",
          background: `radial-gradient(circle, rgba(212, 175, 55, ${glowPulse * 0.3}) 0%, transparent 60%)`,
          filter: "blur(80px)",
        }}
      />

      {/* Logo */}
      <Sequence from={0} premountFor={30}>
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "40%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <Img
            src={staticFile("assets/logo-main.png")}
            style={{
              width: 500,
              height: 500,
              objectFit: "contain",
              transform: `scale(${logoScale})`,
              opacity: titleOpacity,
              filter: `drop-shadow(0 0 ${40 * glowPulse}px rgba(212, 175, 55, 0.6))`,
            }}
          />
        </div>
      </Sequence>

      {/* Tagline */}
      <div
        style={{
          transform: `scale(${logoScale})`,
          opacity: titleOpacity,
          marginTop: 320,
        }}
      >
        <div
          style={{
            fontSize: 32,
            color: "#d4af37",
            textAlign: "center",
            fontFamily: "serif",
            letterSpacing: 6,
            textShadow: "0 0 30px rgba(212, 175, 55, 0.5)",
          }}
        >
          BUILD YOUR LEGEND
        </div>
      </div>
    </AbsoluteFill>
  );
}

function OutroScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  const glowPulse = interpolate(
    frame,
    [30, 60, 90, 120],
    [0.7, 1, 0.8, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(180deg, #0a0a0a 0%, #1a1510 50%, #0a0a0a 100%)",
        opacity: entrance,
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 600,
          height: 600,
          transform: "translate(-50%, -50%)",
          background: `radial-gradient(circle, rgba(212, 175, 55, ${glowPulse * 0.3}) 0%, transparent 60%)`,
          filter: "blur(60px)",
        }}
      />

      <div
        style={{
          fontSize: 64,
          fontWeight: "bold",
          color: "#d4af37",
          textShadow: `0 0 40px rgba(212, 175, 55, ${glowPulse * 0.8})`,
          fontFamily: "serif",
          marginBottom: 40,
          letterSpacing: 4,
        }}
      >
        PLAY FREE NOW
      </div>
      <div
        style={{
          padding: "20px 60px",
          background: "linear-gradient(180deg, #d4af37 0%, #b8962c 100%)",
          borderRadius: 16,
          fontSize: 28,
          fontWeight: "bold",
          color: "#0a0a0a",
          boxShadow: `0 0 40px rgba(212, 175, 55, ${glowPulse * 0.6})`,
          letterSpacing: 2,
        }}
      >
        lunchtablechronicles.com
      </div>
    </AbsoluteFill>
  );
}

export function GameTrailer() {
  const SCENE_DURATION = 150; // 5 seconds at 30fps
  const TRANSITION_DURATION = 20;

  return (
    <AbsoluteFill style={{ background: "#0a0a0a" }}>
      <TransitionSeries>
        {/* Intro - Logo reveal */}
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATION}>
          <IntroScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
        />

        {/* Scene 1 - Strategic Combat */}
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATION}>
          <Scene
            title="Strategic Combat"
            description="Deploy monsters, cast devastating spells, and outmaneuver your opponents in tactical turn-based battles."
            color="#ef4444"
            backgroundImage="assets/backgrounds/game_arena_background.png"
            characterImage="assets/story/infernal_dragons.png"
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
        />

        {/* Scene 2 - Build Your Deck */}
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATION}>
          <Scene
            title="Build Your Deck"
            description="Collect hundreds of cards across 10 unique archetypes. Find synergies and craft the perfect strategy."
            color="#3b82f6"
            backgroundImage="assets/backgrounds/decks-bg.png"
            characterImage="assets/story/arcane_mages.png"
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-left" })}
          timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
        />

        {/* Scene 3 - Epic Story */}
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATION}>
          <Scene
            title="Epic Campaign"
            description="Battle through an immersive story. Face challenging AI opponents and unlock exclusive rewards."
            color="#22c55e"
            backgroundImage="assets/backgrounds/story-bg.png"
            characterImage="assets/story/celestial_guardians.png"
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
        />

        {/* Scene 4 - Competitive Play */}
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATION}>
          <Scene
            title="Rise to Glory"
            description="Climb the ranked ladder. Compete in seasonal tournaments and prove yourself as the ultimate champion."
            color="#fbbf24"
            backgroundImage="assets/backgrounds/collection-bg.png"
            characterImage="assets/story/divine_knights.png"
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
        />

        {/* Outro - Call to Action */}
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATION}>
          <OutroScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
}
