// Story Mode Constants
// Archetypes, XP progression, retry limits, and reward multipliers

// Primary archetypes that have cards in the database
// Story chapters cycle through these 4 archetypes
export const ARCHETYPES = {
  INFERNAL_DRAGONS: "infernal_dragons",
  ABYSSAL_DEPTHS: "abyssal_depths",
  IRON_LEGION: "iron_legion",
  NECRO_EMPIRE: "necro_empire",
} as const;

export type ArchetypeKey = (typeof ARCHETYPES)[keyof typeof ARCHETYPES];

// XP required to reach each level (exponential curve)
// Formula: baseXP * (level^1.5) with some rounding
export const XP_PER_LEVEL: readonly number[] = [
  0, // Level 1
  100, // Level 2
  250, // Level 3
  450, // Level 4
  700, // Level 5
  1000, // Level 6
  1350, // Level 7
  1750, // Level 8
  2200, // Level 9
  2700, // Level 10
  3250, // Level 11
  3850, // Level 12
  4500, // Level 13
  5200, // Level 14
  5950, // Level 15
  6750, // Level 16
  7600, // Level 17
  8500, // Level 18
  9450, // Level 19
  10450, // Level 20
  11500, // Level 21
  12600, // Level 22
  13750, // Level 23
  14950, // Level 24
  16200, // Level 25
  17500, // Level 26
  18850, // Level 27
  20250, // Level 28
  21700, // Level 29
  23200, // Level 30
  24750, // Level 31
  26350, // Level 32
  28000, // Level 33
  29700, // Level 34
  31450, // Level 35
  33250, // Level 36
  35100, // Level 37
  37000, // Level 38
  38950, // Level 39
  40950, // Level 40
  43000, // Level 41
  45100, // Level 42
  47250, // Level 43
  49450, // Level 44
  51700, // Level 45
  54000, // Level 46
  56350, // Level 47
  58750, // Level 48
  61200, // Level 49
  63700, // Level 50
  66250, // Level 51
  68850, // Level 52
  71500, // Level 53
  74200, // Level 54
  76950, // Level 55
  79750, // Level 56
  82600, // Level 57
  85500, // Level 58
  88450, // Level 59
  91450, // Level 60
  94500, // Level 61
  97600, // Level 62
  100750, // Level 63
  103950, // Level 64
  107200, // Level 65
  110500, // Level 66
  113850, // Level 67
  117250, // Level 68
  120700, // Level 69
  124200, // Level 70
  127750, // Level 71
  131350, // Level 72
  135000, // Level 73
  138700, // Level 74
  142450, // Level 75
  146250, // Level 76
  150100, // Level 77
  154000, // Level 78
  157950, // Level 79
  161950, // Level 80
  166000, // Level 81
  170100, // Level 82
  174250, // Level 83
  178450, // Level 84
  182700, // Level 85
  187000, // Level 86
  191350, // Level 87
  195750, // Level 88
  200200, // Level 89
  204700, // Level 90
  209250, // Level 91
  213850, // Level 92
  218500, // Level 93
  223200, // Level 94
  227950, // Level 95
  232750, // Level 96
  237600, // Level 97
  242500, // Level 98
  247450, // Level 99
  252450, // Level 100
] as const;

// Retry limits per difficulty mode
export const RETRY_LIMITS = {
  normal: -1, // Unlimited retries
  hard: 3, // 3 retries per day
  legendary: 1, // 1 retry per week
} as const;

// Reward multipliers by difficulty
export const REWARD_MULTIPLIERS = {
  normal: 1,
  hard: 2,
  legendary: 3,
} as const;

// Star rating bonus multipliers
export const STAR_BONUS = {
  gold: 0.1, // 10% bonus per star for gold
  xp: 0.2, // 20% bonus per star for XP
} as const;

// Difficulty unlock requirements
export const DIFFICULTY_UNLOCK_LEVELS = {
  normal: 1, // Available from start
  hard: 5, // Unlocks at level 5
  legendary: 15, // Unlocks at level 15
} as const;

// Level milestone badges
export const LEVEL_MILESTONES = [
  {
    level: 10,
    badgeId: "milestone_novice",
    displayName: "Novice",
    description: "Reached level 10",
  },
  { level: 25, badgeId: "milestone_adept", displayName: "Adept", description: "Reached level 25" },
  {
    level: 50,
    badgeId: "milestone_master",
    displayName: "Master",
    description: "Reached level 50",
  },
  {
    level: 75,
    badgeId: "milestone_expert",
    displayName: "Expert",
    description: "Reached level 75",
  },
  {
    level: 100,
    badgeId: "milestone_legend",
    displayName: "Legend",
    description: "Reached level 100",
  },
] as const;

// Act definitions
// 3-act structure cycling through 4 archetypes with increasing difficulty
export const ACTS = {
  1: { name: "The Four Factions", theme: "Master each faction's unique power", chapterCount: 4 },
  2: { name: "Rising Challenges", theme: "Face advanced versions of each faction", chapterCount: 4 },
  3: { name: "The Final Challenge", theme: "Unite all powers and face the ultimate enemy", chapterCount: 2 },
} as const;
