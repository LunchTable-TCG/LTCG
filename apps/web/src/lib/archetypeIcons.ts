/**
 * Archetype Icon Mappings
 *
 * Maps archetype identifiers to their brand icon assets.
 * Icons are located in /public/brand/icons/archetypes/
 */

export type ArchetypeId =
  | "infernal_dragons"
  | "abyssal_horrors"
  | "abyssal_depths"
  | "arcane_mages"
  | "celestial_guardians"
  | "divine_knights"
  | "mechanical_constructs"
  | "nature_spirits"
  | "shadow_assassins"
  | "storm_elementals"
  | "undead_legion"
  | "iron_legion"
  | "necro_empire"
  // Legacy archetypes
  | "fire"
  | "water"
  | "earth"
  | "wind"
  | "neutral";

/**
 * Get the icon path for a given archetype
 * @param archetype - The archetype identifier
 * @returns Path to the archetype icon, or a fallback icon if not found
 */
export function getArchetypeIcon(archetype: string): string {
  // Normalize archetype name
  const normalizedArchetype = archetype.toLowerCase().replace(/\s+/g, "_");

  // Map legacy element names to their archetype icons
  const legacyMappings: Record<string, string> = {
    fire: "infernal_dragons",
    water: "abyssal_depths",
    earth: "nature_spirits",
    wind: "storm_elementals",
    neutral: "celestial_guardians",
  };

  const archetypeKey = legacyMappings[normalizedArchetype] || normalizedArchetype;

  // Available archetype icons
  const availableIcons: Set<string> = new Set([
    "infernal_dragons",
    "abyssal_horrors",
    "arcane_mages",
    "celestial_guardians",
    "divine_knights",
    "mechanical_constructs",
    "nature_spirits",
    "shadow_assassins",
    "storm_elementals",
    "undead_legion",
  ]);

  if (availableIcons.has(archetypeKey)) {
    return `/brand/icons/archetypes/${archetypeKey}.png`;
  }

  // Fallback to celestial_guardians for unknown archetypes
  return "/brand/icons/archetypes/celestial_guardians.png";
}

/**
 * Get all available archetype icons
 * @returns Array of archetype identifiers and their icon paths
 */
export function getAllArchetypeIcons(): Array<{ id: string; path: string; name: string }> {
  const archetypes = [
    { id: "infernal_dragons", name: "Infernal Dragons" },
    { id: "abyssal_horrors", name: "Abyssal Horrors" },
    { id: "arcane_mages", name: "Arcane Mages" },
    { id: "celestial_guardians", name: "Celestial Guardians" },
    { id: "divine_knights", name: "Divine Knights" },
    { id: "mechanical_constructs", name: "Mechanical Constructs" },
    { id: "nature_spirits", name: "Nature Spirits" },
    { id: "shadow_assassins", name: "Shadow Assassins" },
    { id: "storm_elementals", name: "Storm Elementals" },
    { id: "undead_legion", name: "Undead Legion" },
  ];

  return archetypes.map((archetype) => ({
    ...archetype,
    path: `/brand/icons/archetypes/${archetype.id}.png`,
  }));
}

/**
 * Format archetype name for display
 * @param archetype - The archetype identifier
 * @returns Human-readable archetype name
 */
export function formatArchetypeName(archetype: string): string {
  return archetype
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
