/**
 * Archetype theme definitions for visual styling
 *
 * Maps archetype identifiers to their visual properties (gradients, icons, colors).
 * These are used by story chapter cards and other UI components to provide
 * consistent archetype-based theming.
 */

export interface ArchetypeTheme {
  /** Tailwind gradient classes (e.g., "from-red-500 to-orange-500") */
  gradient: string;
  /** Emoji or icon character */
  icon: string;
  /** Primary color name for Tailwind classes */
  color: string;
  /** Border/accent color class */
  borderColor: string;
  /** Glow/shadow color for effects */
  glowColor: string;
}

/**
 * Theme configurations for each archetype
 *
 * Used by StoryChapterCard and other components to derive visual styling
 * from the archetype field returned by the database.
 */
export const ARCHETYPE_THEMES: Record<string, ArchetypeTheme> = {
  // Fire/Dragon archetypes
  infernal_dragons: {
    gradient: "from-red-600 via-orange-500 to-yellow-500",
    icon: "🔥",
    color: "red",
    borderColor: "border-red-500/50",
    glowColor: "shadow-red-500/30",
  },

  // Water/Ocean archetypes
  abyssal_horrors: {
    gradient: "from-blue-900 via-blue-600 to-cyan-500",
    icon: "🌊",
    color: "blue",
    borderColor: "border-blue-500/50",
    glowColor: "shadow-blue-500/30",
  },

  // Nature/Forest archetypes
  nature_spirits: {
    gradient: "from-green-700 via-emerald-500 to-lime-400",
    icon: "🌿",
    color: "green",
    borderColor: "border-green-500/50",
    glowColor: "shadow-green-500/30",
  },

  // Storm/Lightning archetypes
  storm_elementals: {
    gradient: "from-purple-600 via-indigo-500 to-sky-400",
    icon: "⚡",
    color: "purple",
    borderColor: "border-purple-500/50",
    glowColor: "shadow-purple-500/30",
  },

  // Shadow/Dark archetypes
  shadow_assassins: {
    gradient: "from-gray-900 via-slate-700 to-gray-600",
    icon: "🗡️",
    color: "gray",
    borderColor: "border-gray-500/50",
    glowColor: "shadow-gray-500/30",
  },

  // Light/Holy archetypes
  celestial_guardians: {
    gradient: "from-yellow-400 via-amber-300 to-white",
    icon: "✨",
    color: "yellow",
    borderColor: "border-yellow-400/50",
    glowColor: "shadow-yellow-400/30",
  },

  // Undead/Death archetypes
  undead_legion: {
    gradient: "from-gray-800 via-purple-900 to-green-800",
    icon: "💀",
    color: "purple",
    borderColor: "border-purple-700/50",
    glowColor: "shadow-purple-700/30",
  },

  // Divine/Knight archetypes
  divine_knights: {
    gradient: "from-amber-500 via-yellow-400 to-orange-400",
    icon: "⚔️",
    color: "amber",
    borderColor: "border-amber-500/50",
    glowColor: "shadow-amber-500/30",
  },

  // Arcane/Magic archetypes
  arcane_mages: {
    gradient: "from-violet-600 via-fuchsia-500 to-pink-500",
    icon: "🔮",
    color: "violet",
    borderColor: "border-violet-500/50",
    glowColor: "shadow-violet-500/30",
  },

  // Mechanical/Tech archetypes
  mechanical_constructs: {
    gradient: "from-slate-600 via-zinc-500 to-amber-600",
    icon: "⚙️",
    color: "zinc",
    borderColor: "border-zinc-500/50",
    glowColor: "shadow-zinc-500/30",
  },
};

/**
 * Default theme for unknown archetypes
 */
export const DEFAULT_ARCHETYPE_THEME: ArchetypeTheme = {
  gradient: "from-purple-600 via-indigo-500 to-blue-500",
  icon: "🎴",
  color: "purple",
  borderColor: "border-purple-500/50",
  glowColor: "shadow-purple-500/30",
};

/**
 * Get the theme for a given archetype
 *
 * @param archetype - The archetype identifier (e.g., "infernal_dragons")
 * @returns The theme object with gradient, icon, color, borderColor, and glowColor
 *
 * @example
 * ```tsx
 * const theme = getArchetypeTheme(chapter.archetype);
 * <div className={`bg-gradient-to-r ${theme.gradient}`}>
 *   <span>{theme.icon}</span>
 * </div>
 * ```
 */
export function getArchetypeTheme(archetype: string | undefined): ArchetypeTheme {
  if (!archetype) return DEFAULT_ARCHETYPE_THEME;
  return ARCHETYPE_THEMES[archetype] ?? DEFAULT_ARCHETYPE_THEME;
}

/**
 * Get Tailwind text color class for an archetype
 *
 * @param archetype - The archetype identifier
 * @returns Tailwind text color class (e.g., "text-red-400")
 */
export function getArchetypeTextColor(archetype: string | undefined): string {
  const theme = getArchetypeTheme(archetype);
  return `text-${theme.color}-400`;
}

/**
 * Get Tailwind background color class for an archetype
 *
 * @param archetype - The archetype identifier
 * @returns Tailwind background color class (e.g., "bg-red-500/20")
 */
export function getArchetypeBgColor(archetype: string | undefined): string {
  const theme = getArchetypeTheme(archetype);
  return `bg-${theme.color}-500/20`;
}
