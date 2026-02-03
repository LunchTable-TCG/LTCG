import { interpolate, spring as remotionSpring } from "remotion";

// ============================================================================
// TIMING CONSTANTS
// ============================================================================

export const FPS = 30;
export const TOTAL_DURATION = 2700; // 90 seconds @ 30fps

// Scene frame ranges
export const SCENE_TIMING = {
  // ACT I: THE WORLD (0-810)
  logoReveal: { start: 0, duration: 150 }, // 5s
  worldAwakening: { start: 150, duration: 180 }, // 6s
  archetypeMontage: { start: 330, duration: 480 }, // 16s (5 clashes × 96 frames each)

  // ACT II: THE CHALLENGE (810-1890)
  collection: { start: 810, duration: 150 }, // 5s
  deckBuilding: { start: 960, duration: 180 }, // 6s
  battlePreview: { start: 1140, duration: 210 }, // 7s
  aiAgentReveal: { start: 1350, duration: 300 }, // 10s - KEY FEATURE
  propsShowcase: { start: 1650, duration: 150 }, // 5s
  storyTease: { start: 1800, duration: 90 }, // 3s

  // ACT III: THE CLASH (1890-2700)
  epicBattle: { start: 1890, duration: 450 }, // 15s
  victoryMoment: { start: 2340, duration: 150 }, // 5s
  featureFlash: { start: 2490, duration: 90 }, // 3s
  grandOutro: { start: 2580, duration: 120 }, // 4s
} as const;

// Transition duration (overlap between scenes)
export const TRANSITION_FRAMES = 20;

// ============================================================================
// SPRING CONFIGURATIONS
// ============================================================================

export const SPRING_CONFIGS = {
  // Gentle entrance - slow, smooth, minimal bounce
  gentle: { damping: 20, stiffness: 60 },

  // Standard entrance - balanced feel
  standard: { damping: 15, stiffness: 80 },

  // Snappy - quick response, minimal overshoot
  snappy: { damping: 12, stiffness: 100 },

  // Bouncy - playful, visible overshoot
  bouncy: { damping: 8, stiffness: 120 },

  // Heavy - slow, weighty feel
  heavy: { damping: 25, stiffness: 40 },

  // Elastic - lots of bounce
  elastic: { damping: 5, stiffness: 150 },
} as const;

// ============================================================================
// ARCHETYPE COLORS
// ============================================================================

export const ARCHETYPE_COLORS = {
  infernal_dragons: {
    primary: "#ff4444",
    secondary: "#ff8800",
    glow: "rgba(255, 68, 68, 0.6)",
    name: "Infernal Dragons",
  },
  celestial_guardians: {
    primary: "#ffd700",
    secondary: "#fff4b3",
    glow: "rgba(255, 215, 0, 0.6)",
    name: "Celestial Guardians",
  },
  abyssal_horrors: {
    primary: "#8b00ff",
    secondary: "#4a0080",
    glow: "rgba(139, 0, 255, 0.6)",
    name: "Abyssal Horrors",
  },
  divine_knights: {
    primary: "#ffffff",
    secondary: "#c9b037",
    glow: "rgba(255, 255, 255, 0.6)",
    name: "Divine Knights",
  },
  nature_spirits: {
    primary: "#22c55e",
    secondary: "#15803d",
    glow: "rgba(34, 197, 94, 0.6)",
    name: "Nature Spirits",
  },
  mechanical_constructs: {
    primary: "#64748b",
    secondary: "#94a3b8",
    glow: "rgba(100, 116, 139, 0.6)",
    name: "Mechanical Constructs",
  },
  storm_elementals: {
    primary: "#3b82f6",
    secondary: "#60a5fa",
    glow: "rgba(59, 130, 246, 0.6)",
    name: "Storm Elementals",
  },
  shadow_assassins: {
    primary: "#1e1e2e",
    secondary: "#6366f1",
    glow: "rgba(99, 102, 241, 0.6)",
    name: "Shadow Assassins",
  },
  arcane_mages: {
    primary: "#a855f7",
    secondary: "#c084fc",
    glow: "rgba(168, 85, 247, 0.6)",
    name: "Arcane Mages",
  },
  undead_legion: {
    primary: "#84cc16",
    secondary: "#365314",
    glow: "rgba(132, 204, 22, 0.6)",
    name: "Undead Legion",
  },
} as const;

export type ArchetypeId = keyof typeof ARCHETYPE_COLORS;

// Archetype clash pairings for the montage
export const ARCHETYPE_CLASHES: [ArchetypeId, ArchetypeId][] = [
  ["infernal_dragons", "celestial_guardians"], // Fire vs Light
  ["abyssal_horrors", "divine_knights"], // Dark vs Honor
  ["nature_spirits", "mechanical_constructs"], // Life vs Machine
  ["storm_elementals", "shadow_assassins"], // Thunder vs Stealth
  ["arcane_mages", "undead_legion"], // Mystery vs Death
];

// ============================================================================
// ANIMATION HELPERS
// ============================================================================

/**
 * Creates a spring animation value
 */
export function createSpring(
  frame: number,
  fps: number,
  config: keyof typeof SPRING_CONFIGS = "standard",
  delay = 0
) {
  return remotionSpring({
    frame: frame - delay,
    fps,
    config: SPRING_CONFIGS[config],
    durationInFrames: 60,
  });
}

/**
 * Creates a staggered entrance animation for multiple items
 */
export function staggeredEntrance(
  frame: number,
  index: number,
  staggerFrames = 5
) {
  const delay = index * staggerFrames;
  const adjustedFrame = Math.max(0, frame - delay);
  return {
    opacity: interpolate(adjustedFrame, [0, 15], [0, 1], {
      extrapolateRight: "clamp",
    }),
    translateY: interpolate(adjustedFrame, [0, 20], [30, 0], {
      extrapolateRight: "clamp",
    }),
  };
}

/**
 * Creates a pulse effect (0-1-0 cycle)
 */
export function pulse(frame: number, cycleFrames = 60, intensity = 1) {
  const cycle = frame % cycleFrames;
  const normalized = cycle / cycleFrames;
  return Math.sin(normalized * Math.PI * 2) * 0.5 * intensity + 0.5;
}

/**
 * Creates a breathing glow effect
 */
export function breathingGlow(frame: number, minOpacity = 0.4, maxOpacity = 1) {
  const pulseValue = pulse(frame, 90);
  return minOpacity + pulseValue * (maxOpacity - minOpacity);
}

/**
 * Creates typewriter text effect - returns number of characters to show
 */
export function typewriter(
  frame: number,
  text: string,
  startFrame: number,
  charsPerFrame = 0.5
) {
  const elapsed = Math.max(0, frame - startFrame);
  const chars = Math.floor(elapsed * charsPerFrame);
  return text.slice(0, Math.min(chars, text.length));
}

/**
 * Creates a fade in/out based on frame position within a duration
 */
export function fadeInOut(
  frame: number,
  duration: number,
  fadeInFrames = 20,
  fadeOutFrames = 20
) {
  const fadeIn = interpolate(frame, [0, fadeInFrames], [0, 1], {
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(
    frame,
    [duration - fadeOutFrames, duration],
    [1, 0],
    {
      extrapolateLeft: "clamp",
    }
  );
  return Math.min(fadeIn, fadeOut);
}

/**
 * Easing functions
 */
export const easing = {
  easeInOut: (t: number) => t * t * (3 - 2 * t),
  easeIn: (t: number) => t * t,
  easeOut: (t: number) => t * (2 - t),
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  bounce: (t: number) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

// ============================================================================
// VISUAL CONSTANTS
// ============================================================================

export const COLORS = {
  // Backgrounds
  darkBg: "#0a0a0a",
  terminalBg: "#0a1a0a",
  panelBg: "#1a1a2e",

  // Accent colors
  gold: "#d4af37",
  goldLight: "#f4e4a5",
  terminalGreen: "#00ff00",
  terminalGreenDim: "#00aa00",

  // Text
  textPrimary: "#ffffff",
  textSecondary: "#a89f94",
  textMuted: "#666666",
} as const;

export const TYPOGRAPHY = {
  // Font families
  serif: '"Cinzel", "Playfair Display", Georgia, serif',
  mono: '"JetBrains Mono", "Fira Code", Consolas, monospace',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
} as const;

// ============================================================================
// PARTICLE HELPERS
// ============================================================================

/**
 * Generates deterministic random positions for particles
 */
export function generateParticles(
  count: number,
  seed = 42
): Array<{ x: number; y: number; size: number; delay: number; speed: number }> {
  const particles = [];
  // Simple seeded random
  let s = seed;
  const random = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };

  for (let i = 0; i < count; i++) {
    particles.push({
      x: random() * 100, // percentage
      y: random() * 100,
      size: 2 + random() * 6,
      delay: random() * 60,
      speed: 0.5 + random() * 1.5,
    });
  }
  return particles;
}

/**
 * Calculate particle position at a given frame
 */
export function getParticlePosition(
  particle: { x: number; y: number; speed: number; delay: number },
  frame: number,
  targetX: number,
  targetY: number,
  convergenceFrame: number
) {
  const adjustedFrame = Math.max(0, frame - particle.delay);
  const progress = Math.min(1, adjustedFrame / convergenceFrame);
  const eased = easing.easeInOutCubic(progress);

  return {
    x: particle.x + (targetX - particle.x) * eased,
    y: particle.y + (targetY - particle.y) * eased,
  };
}
