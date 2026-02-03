import { useCurrentFrame, interpolate } from "remotion";
import { generateParticles, easing, COLORS } from "../../utils/animations";

export interface ParticleSystemProps {
  count?: number;
  color?: string;
  mode: "scatter" | "converge" | "float" | "explode";
  targetX?: number; // percentage (0-100)
  targetY?: number;
  convergenceFrame?: number;
  seed?: number;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  delay: number;
  speed: number;
}

function getParticlePositionForMode(
  particle: Particle,
  frame: number,
  mode: ParticleSystemProps["mode"],
  targetX: number,
  targetY: number,
  convergenceFrame: number
): { x: number; y: number; opacity: number; scale: number } {
  const adjustedFrame = Math.max(0, frame - particle.delay);

  switch (mode) {
    case "scatter": {
      // Particles drift outward from center
      const centerX = 50;
      const centerY = 50;
      const angle = Math.atan2(particle.y - centerY, particle.x - centerX);
      const distance = adjustedFrame * particle.speed * 0.5;
      const startX = centerX + (particle.x - centerX) * 0.3;
      const startY = centerY + (particle.y - centerY) * 0.3;

      return {
        x: startX + Math.cos(angle) * distance,
        y: startY + Math.sin(angle) * distance,
        opacity: interpolate(adjustedFrame, [0, 10, 60, 80], [0, 1, 1, 0], {
          extrapolateRight: "clamp",
          extrapolateLeft: "clamp",
        }),
        scale: 1,
      };
    }

    case "converge": {
      // Particles move toward target point
      const progress = Math.min(1, adjustedFrame / convergenceFrame);
      const easedProgress = easing.easeInOutCubic(progress);

      return {
        x: particle.x + (targetX - particle.x) * easedProgress,
        y: particle.y + (targetY - particle.y) * easedProgress,
        opacity: interpolate(
          progress,
          [0, 0.2, 0.8, 1],
          [0, 1, 1, 0],
          { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
        ),
        scale: interpolate(progress, [0.8, 1], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
      };
    }

    case "float": {
      // Gentle floating upward with slight horizontal sway
      const floatY = particle.y - adjustedFrame * particle.speed * 0.3;
      const swayX = Math.sin(adjustedFrame * 0.05 + particle.delay) * 3;

      return {
        x: particle.x + swayX,
        y: floatY % 120 > 100 ? floatY % 120 : floatY,
        opacity: interpolate(
          floatY % 120,
          [-10, 10, 80, 110],
          [0, 1, 1, 0],
          { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
        ),
        scale: 1,
      };
    }

    case "explode": {
      // Burst outward from center
      const centerX = targetX;
      const centerY = targetY;
      const angle = Math.atan2(particle.y - 50, particle.x - 50);
      const velocity = particle.speed * 2;
      const deceleration = 0.98;
      const effectiveDistance =
        velocity * (1 - Math.pow(deceleration, adjustedFrame)) / (1 - deceleration);

      return {
        x: centerX + Math.cos(angle) * effectiveDistance * 2,
        y: centerY + Math.sin(angle) * effectiveDistance * 2,
        opacity: interpolate(adjustedFrame, [0, 5, 30, 50], [0, 1, 0.8, 0], {
          extrapolateRight: "clamp",
          extrapolateLeft: "clamp",
        }),
        scale: interpolate(adjustedFrame, [0, 10, 50], [0.5, 1.5, 0.3], {
          extrapolateRight: "clamp",
          extrapolateLeft: "clamp",
        }),
      };
    }

    default:
      return { x: particle.x, y: particle.y, opacity: 1, scale: 1 };
  }
}

export const ParticleSystem: React.FC<ParticleSystemProps> = ({
  count = 40,
  color = COLORS.gold,
  mode,
  targetX = 50,
  targetY = 50,
  convergenceFrame = 60,
  seed = 42,
}) => {
  const frame = useCurrentFrame();
  const particles = generateParticles(count, seed);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {particles.map((particle, index) => {
        const pos = getParticlePositionForMode(
          particle,
          frame,
          mode,
          targetX,
          targetY,
          convergenceFrame
        );

        if (pos.opacity <= 0) return null;

        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              width: particle.size * pos.scale,
              height: particle.size * pos.scale,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${color} 0%, ${color}80 50%, transparent 100%)`,
              boxShadow: `0 0 ${particle.size * 2}px ${color}, 0 0 ${particle.size * 4}px ${color}60`,
              opacity: pos.opacity,
              transform: "translate(-50%, -50%)",
            }}
          />
        );
      })}
    </div>
  );
};
