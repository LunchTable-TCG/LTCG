import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Img,
  staticFile,
} from "remotion";
import {
  generateParticles,
  easing,
  COLORS,
  TYPOGRAPHY,
  pulse,
} from "../utils/animations";
import { ParticleSystem } from "../components/effects/ParticleSystem";

// Pre-generate particles for performance
const CONFETTI_PARTICLES = generateParticles(50, 777);
const COIN_PARTICLES = generateParticles(20, 888);
const FRAGMENT_PARTICLES = generateParticles(12, 999);

const GOLD = COLORS.gold;
const VICTORY_GREEN = "#22c55e";

// Screen shake helper
function getScreenShake(frame: number, startFrame: number, duration: number, intensity: number) {
  if (frame < startFrame || frame > startFrame + duration) {
    return { x: 0, y: 0 };
  }

  const progress = (frame - startFrame) / duration;
  const decay = 1 - easing.easeOutCubic(progress);
  const seed = frame * 16807;

  return {
    x: Math.sin(seed) * intensity * decay,
    y: Math.cos(seed * 1.3) * intensity * decay,
  };
}

// Shockwave ring component
function ShockwaveRing({
  startFrame,
  duration,
  color,
  maxSize,
}: {
  startFrame: number;
  duration: number;
  color: string;
  maxSize: number;
}) {
  const frame = useCurrentFrame();
  const localFrame = frame - startFrame;

  if (localFrame < 0 || localFrame > duration) return null;

  const progress = localFrame / duration;
  const size = interpolate(progress, [0, 1], [0, maxSize]);
  const opacity = interpolate(progress, [0, 0.3, 1], [1, 0.6, 0], {
    extrapolateRight: "clamp",
  });
  const strokeWidth = interpolate(progress, [0, 1], [20, 2]);

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: size,
        height: size,
        transform: "translate(-50%, -50%)",
        borderRadius: "50%",
        border: `${strokeWidth}px solid ${color}`,
        opacity,
        boxShadow: `0 0 ${20 + progress * 30}px ${color}, inset 0 0 ${10 + progress * 20}px ${color}40`,
      }}
    />
  );
}

// Card fragment component for shatter effect
function CardFragment({
  index,
  startFrame,
}: {
  index: number;
  startFrame: number;
}) {
  const frame = useCurrentFrame();
  const localFrame = frame - startFrame;
  const particle = FRAGMENT_PARTICLES[index];

  if (!particle || localFrame < 0 || localFrame > 60) return null;

  const angle = (index / FRAGMENT_PARTICLES.length) * Math.PI * 2;
  const velocity = 8 + particle.speed * 10;
  const gravity = 0.3;

  const x = Math.cos(angle) * velocity * localFrame;
  const y = Math.sin(angle) * velocity * localFrame + gravity * localFrame * localFrame;
  const rotation = localFrame * (10 + particle.speed * 20) * (index % 2 === 0 ? 1 : -1);
  const opacity = interpolate(localFrame, [0, 10, 40, 60], [1, 1, 0.5, 0], {
    extrapolateRight: "clamp",
  });

  const width = 30 + particle.size * 8;
  const height = 40 + particle.size * 10;

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "40%",
        width,
        height,
        background: `linear-gradient(${45 + index * 30}deg, #1a1a2e 0%, #2d2d4a 50%, #1a1a2e 100%)`,
        border: "1px solid rgba(139, 92, 246, 0.5)",
        borderRadius: 4,
        transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${rotation}deg)`,
        opacity,
        boxShadow: "0 0 10px rgba(139, 92, 246, 0.3)",
      }}
    />
  );
}

// Floating number popup
function FloatingNumber({
  text,
  startFrame,
  color,
  offsetX,
  delay,
  size,
}: {
  text: string;
  startFrame: number;
  color: string;
  offsetX: number;
  delay: number;
  size?: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localFrame = frame - startFrame - delay;

  if (localFrame < 0 || localFrame > 50) return null;

  const entrySpring = spring({
    frame: localFrame,
    fps,
    config: { damping: 12, stiffness: 150 },
  });

  const scale = interpolate(entrySpring, [0, 1], [0.3, 1]);
  const y = interpolate(localFrame, [0, 50], [0, -80]);
  const opacity = interpolate(localFrame, [0, 10, 35, 50], [0, 1, 1, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        left: `calc(50% + ${offsetX}px)`,
        top: "55%",
        transform: `translate(-50%, ${y}px) scale(${scale})`,
        fontSize: size ?? 36,
        fontWeight: "bold",
        color,
        fontFamily: TYPOGRAPHY.sans,
        textShadow: `0 0 20px ${color}, 0 2px 10px rgba(0,0,0,0.8)`,
        opacity,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );
}

// Confetti particle
function ConfettiParticle({
  index,
  startFrame,
}: {
  index: number;
  startFrame: number;
}) {
  const frame = useCurrentFrame();
  const localFrame = frame - startFrame;
  const particle = CONFETTI_PARTICLES[index];

  if (!particle || localFrame < particle.delay || localFrame > 90) return null;

  const adjustedFrame = localFrame - particle.delay;
  const colors = ["#fbbf24", "#ef4444", "#3b82f6", "#22c55e", "#a855f7", "#ec4899"];
  const color = colors[index % colors.length];

  const x = particle.x;
  const startY = -10;
  const y = startY + adjustedFrame * particle.speed * 2.5;
  const rotation = adjustedFrame * (5 + particle.speed * 3) * (index % 2 === 0 ? 1 : -1);
  const wobble = Math.sin(adjustedFrame * 0.2 + particle.delay) * 10;
  const opacity = interpolate(adjustedFrame, [0, 5, 50, 70], [0, 1, 1, 0], {
    extrapolateRight: "clamp",
  });

  const isRectangle = index % 3 === 0;

  return (
    <div
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        width: isRectangle ? particle.size * 3 : particle.size * 2,
        height: isRectangle ? particle.size : particle.size * 2,
        background: color,
        borderRadius: isRectangle ? 2 : "50%",
        transform: `translate(-50%, -50%) rotate(${rotation}deg) translateX(${wobble}px)`,
        opacity,
        boxShadow: `0 0 ${particle.size}px ${color}60`,
      }}
    />
  );
}

// Coin/gem rain particle
function CoinParticle({
  index,
  startFrame,
}: {
  index: number;
  startFrame: number;
}) {
  const frame = useCurrentFrame();
  const localFrame = frame - startFrame;
  const particle = COIN_PARTICLES[index];

  if (!particle || localFrame < particle.delay || localFrame > 80) return null;

  const adjustedFrame = localFrame - particle.delay;
  const x = 20 + particle.x * 0.6;
  const y = -5 + adjustedFrame * particle.speed * 2;
  const rotation = adjustedFrame * 8;
  const shimmer = pulse(adjustedFrame + particle.delay, 15, 0.3) + 0.7;
  const opacity = interpolate(adjustedFrame, [0, 5, 50, 70], [0, 1, 1, 0], {
    extrapolateRight: "clamp",
  });

  const isGem = index % 3 === 0;

  return (
    <div
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        width: isGem ? 16 : 20,
        height: isGem ? 20 : 20,
        background: isGem
          ? "linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #15803d 100%)"
          : `linear-gradient(135deg, ${GOLD} 0%, #f4e4a5 30%, ${GOLD} 60%, #b8962e 100%)`,
        borderRadius: isGem ? "20% 80% 20% 80%" : "50%",
        transform: `translate(-50%, -50%) rotate(${rotation}deg) scale(${shimmer})`,
        opacity,
        boxShadow: isGem
          ? "0 0 10px rgba(34, 197, 94, 0.6)"
          : `0 0 10px ${GOLD}80`,
        border: isGem ? "1px solid #4ade80" : "2px solid #f4e4a5",
      }}
    />
  );
}

// Achievement badge component
function AchievementBadge({ startFrame }: { startFrame: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localFrame = frame - startFrame;

  if (localFrame < 0) return null;

  const entrySpring = spring({
    frame: localFrame,
    fps,
    config: { damping: 10, stiffness: 80 },
  });

  const scale = entrySpring;
  const rotation = interpolate(entrySpring, [0, 1], [-180, 0]);
  const glowIntensity = pulse(localFrame, 30, 0.4) + 0.6;

  return (
    <div
      style={{
        position: "absolute",
        right: 100,
        top: "35%",
        transform: `scale(${scale}) rotate(${rotation}deg)`,
      }}
    >
      {/* Badge glow */}
      <div
        style={{
          position: "absolute",
          inset: -20,
          background: `radial-gradient(circle, ${GOLD}60 0%, transparent 70%)`,
          filter: `blur(${15 * glowIntensity}px)`,
        }}
      />

      {/* Badge body */}
      <div
        style={{
          width: 100,
          height: 120,
          background: `linear-gradient(180deg, ${GOLD} 0%, #b8962e 100%)`,
          clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 0 ${30 * glowIntensity}px ${GOLD}80`,
        }}
      >
        <div
          style={{
            fontSize: 40,
            color: "#0a0a0a",
          }}
        >
          ★
        </div>
      </div>

      {/* Badge text */}
      <div
        style={{
          position: "absolute",
          top: "110%",
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: 14,
          fontWeight: "bold",
          color: GOLD,
          fontFamily: TYPOGRAPHY.sans,
          textTransform: "uppercase",
          letterSpacing: 2,
          whiteSpace: "nowrap",
          textShadow: `0 0 10px ${GOLD}`,
        }}
      >
        First Victory
      </div>
    </div>
  );
}

// Card reward preview
function CardRewardPreview({ startFrame }: { startFrame: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localFrame = frame - startFrame;

  if (localFrame < 0) return null;

  const slideIn = spring({
    frame: localFrame,
    fps,
    config: { damping: 15, stiffness: 60 },
  });

  const x = interpolate(slideIn, [0, 1], [200, 0]);
  const glowPulse = pulse(localFrame, 40, 0.3) + 0.7;

  return (
    <div
      style={{
        position: "absolute",
        left: 80,
        top: "30%",
        transform: `translateX(${-x}px)`,
        opacity: slideIn,
      }}
    >
      {/* Card glow */}
      <div
        style={{
          position: "absolute",
          inset: -30,
          background: `radial-gradient(circle, rgba(251, 191, 36, ${glowPulse * 0.4}) 0%, transparent 60%)`,
          filter: "blur(20px)",
        }}
      />

      {/* Mini card */}
      <div
        style={{
          width: 120,
          height: 170,
          borderRadius: 12,
          border: "3px solid #fbbf24",
          background: "linear-gradient(180deg, #1a1a2e 0%, #0a0a0a 100%)",
          boxShadow: `0 0 ${20 * glowPulse}px rgba(251, 191, 36, 0.5), 0 10px 30px rgba(0,0,0,0.5)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: "#fbbf24",
            fontWeight: "bold",
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 8,
          }}
        >
          Reward
        </div>
        <div
          style={{
            fontSize: 32,
            color: "#fff",
          }}
        >
          🃏
        </div>
        <div
          style={{
            fontSize: 11,
            color: "#a89f94",
            marginTop: 8,
          }}
        >
          New Card!
        </div>
      </div>
    </div>
  );
}

// Winning card with glory effect
function WinningCard({ startFrame }: { startFrame: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localFrame = frame - startFrame;

  if (localFrame < 0) return null;

  const entrySpring = spring({
    frame: localFrame,
    fps,
    config: { damping: 12, stiffness: 80 },
  });

  const scale = interpolate(entrySpring, [0, 1], [0.5, 1]);
  const glowIntensity = pulse(localFrame, 45, 0.4) + 0.6;
  const rotation = interpolate(localFrame, [0, 30], [5, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "45%",
        transform: `translate(-50%, -50%) scale(${scale}) rotate(${rotation}deg)`,
      }}
    >
      {/* Intense glow */}
      <div
        style={{
          position: "absolute",
          inset: -80,
          background: `radial-gradient(circle, ${GOLD}80 0%, ${GOLD}40 30%, transparent 60%)`,
          filter: `blur(${40 * glowIntensity}px)`,
        }}
      />

      {/* Rays of light */}
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 4,
            height: 300,
            background: `linear-gradient(180deg, ${GOLD}60 0%, transparent 100%)`,
            transformOrigin: "top center",
            transform: `translateX(-50%) rotate(${i * 45 + localFrame * 0.5}deg)`,
            opacity: 0.3 * glowIntensity,
          }}
        />
      ))}

      {/* Card */}
      <div
        style={{
          width: 240,
          height: 340,
          borderRadius: 16,
          border: `4px solid ${GOLD}`,
          background: "linear-gradient(180deg, #1a1a2e 0%, #0a0a0a 100%)",
          boxShadow: `
            0 0 ${60 * glowIntensity}px ${GOLD}80,
            0 0 ${100 * glowIntensity}px ${GOLD}40,
            0 20px 50px rgba(0,0,0,0.6)
          `,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Card art placeholder */}
        <Img
          src={staticFile("assets/story/celestial_guardians.png")}
          style={{
            width: "100%",
            height: "70%",
            objectFit: "cover",
            filter: `brightness(${0.9 + glowIntensity * 0.2}) saturate(1.3)`,
          }}
        />

        {/* Gradient overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(180deg, transparent 50%, ${GOLD}20 80%, #0a0a0a 100%)`,
          }}
        />

        {/* Card name */}
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: 0,
            right: 0,
            textAlign: "center",
            fontSize: 20,
            fontWeight: "bold",
            color: "#fff",
            fontFamily: TYPOGRAPHY.serif,
            textShadow: `0 0 20px ${GOLD}, 0 2px 8px rgba(0,0,0,0.8)`,
            letterSpacing: 2,
          }}
        >
          CHAMPION
        </div>
      </div>
    </div>
  );
}

export const VictoryMoment: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Screen shake for impact
  const shake = getScreenShake(frame, 0, 30, 15);

  // White flash at start
  const flashOpacity = interpolate(frame, [0, 5, 15], [1, 0.8, 0], {
    extrapolateRight: "clamp",
  });

  // Victory text animation (frame 30-60)
  const victoryTextStart = 30;
  const victorySpring = spring({
    frame: Math.max(0, frame - victoryTextStart),
    fps,
    config: { damping: 8, stiffness: 100 },
  });

  const victoryScale = interpolate(victorySpring, [0, 1], [3, 1]);
  const victoryOpacity = interpolate(
    frame,
    [victoryTextStart, victoryTextStart + 10],
    [0, 1],
    { extrapolateRight: "clamp" }
  );

  // Golden haze fade at end (frame 120-150)
  const hazeOpacity = interpolate(frame, [120, 150], [0, 0.7], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Background pulse
  const bgPulse = pulse(frame, 60, 0.2) + 0.3;

  return (
    <AbsoluteFill
      style={{
        background: COLORS.darkBg,
        transform: `translate(${shake.x}px, ${shake.y}px)`,
      }}
    >
      {/* Background radial glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 50% 45%, ${GOLD}${Math.round(bgPulse * 30).toString(16).padStart(2, "0")} 0%, transparent 50%)`,
        }}
      />

      {/* Card fragments (shatter effect) */}
      {FRAGMENT_PARTICLES.map((_, index) => (
        <CardFragment key={index} index={index} startFrame={0} />
      ))}

      {/* Shockwave rings */}
      <ShockwaveRing startFrame={0} duration={40} color={GOLD} maxSize={800} />
      <ShockwaveRing startFrame={5} duration={35} color={`${GOLD}80`} maxSize={600} />
      <ShockwaveRing startFrame={10} duration={30} color={`${GOLD}60`} maxSize={500} />

      {/* Explosion particles at impact */}
      <ParticleSystem
        mode="explode"
        count={30}
        color={GOLD}
        targetX={50}
        targetY={40}
        seed={111}
      />

      {/* VICTORY text */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "20%",
          transform: `translate(-50%, -50%) scale(${victoryScale})`,
          opacity: victoryOpacity,
        }}
      >
        <div
          style={{
            fontSize: 120,
            fontWeight: "bold",
            color: GOLD,
            fontFamily: TYPOGRAPHY.serif,
            letterSpacing: 20,
            textShadow: `
              0 0 40px ${GOLD},
              0 0 80px ${GOLD}80,
              0 8px 30px rgba(0,0,0,0.8)
            `,
          }}
        >
          VICTORY
        </div>
      </div>

      {/* Confetti rain */}
      {CONFETTI_PARTICLES.map((_, index) => (
        <ConfettiParticle key={index} index={index} startFrame={60} />
      ))}

      {/* Coin/gem rain */}
      {COIN_PARTICLES.map((_, index) => (
        <CoinParticle key={index} index={index} startFrame={65} />
      ))}

      {/* Floating reward numbers */}
      <FloatingNumber
        text="+500 XP"
        startFrame={70}
        color={VICTORY_GREEN}
        offsetX={-150}
        delay={0}
        size={40}
      />
      <FloatingNumber
        text="+100 Gold"
        startFrame={70}
        color={GOLD}
        offsetX={150}
        delay={10}
        size={40}
      />
      <FloatingNumber
        text="+1 Win Streak"
        startFrame={70}
        color="#3b82f6"
        offsetX={0}
        delay={20}
        size={32}
      />

      {/* Card reward preview */}
      <CardRewardPreview startFrame={75} />

      {/* Achievement badge */}
      <AchievementBadge startFrame={85} />

      {/* Winning card glory pose */}
      <WinningCard startFrame={120} />

      {/* Float particles during glory */}
      {frame >= 120 && (
        <ParticleSystem
          mode="float"
          count={25}
          color={GOLD}
          seed={222}
        />
      )}

      {/* White flash overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "#fff",
          opacity: flashOpacity,
          pointerEvents: "none",
        }}
      />

      {/* Golden haze fade out */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 50% 50%, ${GOLD}90 0%, ${GOLD}60 50%, ${GOLD}40 100%)`,
          opacity: hazeOpacity,
          pointerEvents: "none",
        }}
      />

      {/* Vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at 50% 50%, transparent 40%, rgba(0,0,0,0.5) 100%)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
