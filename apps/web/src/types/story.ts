/**
 * Story mode types (chapters, stages, progression).
 *
 * This module defines types for the single-player story mode including:
 * - Story Chapters: Multi-stage narrative campaigns
 * - Story Stages: Individual battles within a chapter
 * - Progression: Star ratings and completion tracking
 * - Rewards: Gold, XP, gems, and card rewards
 */

import type { Id } from "@convex/_generated/dataModel";

/**
 * Story chapter data from Convex backend.
 *
 * Chapters are multi-stage campaigns with narrative context and progressive difficulty.
 *
 * Valid status values:
 * - `"locked"` - Player hasn't met level/prerequisite requirements
 * - `"available"` - Chapter can be started
 * - `"in_progress"` - At least one stage completed
 * - `"completed"` - All stages finished
 *
 * @example
 * ```typescript
 * const chapter: StoryChapter = {
 *   _id: "jsc8s9d0..." as Id<"storyChapters">,
 *   _creationTime: 1234567890,
 *   chapterId: "chapter_1",
 *   name: "The Beginning",
 *   description: "Start your journey as a card duelist",
 *   difficulty: "easy",
 *   requiredLevel: 1,
 *   opponentDeckId: "deck_tutorial",
 *   opponentName: "Tutorial Master",
 *   opponentLevel: 5,
 *   totalStages: 5,
 *   recommendedDeckArchetype: "Starter",
 *   storyText: "Welcome to the world of LTCG...",
 *   thumbnailUrl: "/story/chapter1.png",
 *   baseRewards: { gold: 500, xp: 200, gems: 10 },
 *   status: "available",
 *   stagesCompleted: 0,
 *   starsEarned: 0
 * };
 * ```
 *
 * @see StoryStage - For individual battle stages within a chapter
 * @see StoryChapterDetails - For expanded chapter data with stage list
 */
export type { AvailableChapter as StoryChapter } from "./generated";

/**
 * Extended story chapter data with full stage information.
 *
 * @example
 * ```typescript
 * const details: StoryChapterDetails = {
 *   _id: "jsc8s9d0..." as Id<"storyChapters">,
 *   _creationTime: 1234567890,
 *   chapterId: "chapter_1",
 *   name: "The Beginning",
 *   description: "Start your journey",
 *   difficulty: "easy",
 *   requiredLevel: 1,
 *   opponentDeckId: "deck_tutorial",
 *   opponentName: "Tutorial Master",
 *   opponentLevel: 5,
 *   totalStages: 5,
 *   baseRewards: { gold: 500, xp: 200 },
 *   status: "in_progress",
 *   stagesCompleted: 2,
 *   starsEarned: 5,
 *   stages: [stage1, stage2, stage3, stage4, stage5]
 * };
 * ```
 *
 * @see StoryChapter - For basic chapter data
 */
export interface StoryChapterDetails {
  /** Unique chapter ID */
  _id: Id<"storyChapters">;
  /** Timestamp when chapter was created */
  _creationTime: number;
  /** Chapter identifier string */
  chapterId: string;
  /** Chapter display name */
  name: string;
  /** Chapter description/summary */
  description: string;
  /** Difficulty rating (easy, medium, hard, expert) */
  difficulty: string;
  /** Minimum player level to unlock */
  requiredLevel: number;
  /** Opponent's deck template ID */
  opponentDeckId: string;
  /** Opponent character name */
  opponentName: string;
  /** Opponent's effective level */
  opponentLevel: number;
  /** Number of stages in this chapter */
  totalStages: number;
  /** Suggested deck archetype (optional) */
  recommendedDeckArchetype?: string;
  /** Narrative text for the chapter (optional) */
  storyText?: string;
  /** URL to chapter thumbnail image (optional) */
  thumbnailUrl?: string;
  /** Base rewards for chapter completion */
  baseRewards: {
    /** Gold currency awarded */
    gold: number;
    /** Experience points awarded */
    xp: number;
    /** Premium currency awarded (optional) */
    gems?: number;
  };
  /** Current chapter status */
  status: "locked" | "available" | "in_progress" | "completed";
  /** Number of stages completed */
  stagesCompleted: number;
  /** Total stars earned across all stages */
  starsEarned: number;
  /** Array of all stages in this chapter */
  stages: StoryStage[];
}

/**
 * Individual battle stage within a story chapter.
 *
 * Stages can be replayed for better star ratings and additional rewards.
 *
 * Valid status values:
 * - `"locked"` - Previous stage not completed
 * - `"available"` - Stage can be played
 * - `"completed"` - Stage finished with 1-2 stars
 * - `"starred"` - Stage finished with 3 stars (perfect)
 *
 * @example
 * ```typescript
 * const stage: StoryStage = {
 *   _id: "jss9t0e1..." as Id<"storyStages">,
 *   _creationTime: 1234567890,
 *   stageNumber: 1,
 *   name: "First Duel",
 *   description: "Learn the basics of combat",
 *   opponentDeckId: "deck_tutorial_1",
 *   opponentName: "Training Bot",
 *   opponentLevel: 3,
 *   starRequirements: {
 *     winCondition: "Win the duel",
 *     twoStar: "Win without losing more than 2000 LP",
 *     threeStar: "Win in under 10 turns"
 *   },
 *   rewards: { gold: 100, xp: 50 },
 *   firstClearBonus: 50,
 *   status: "completed",
 *   starsEarned: 2,
 *   bestScore: 8500,
 *   timesCompleted: 3,
 *   firstClearClaimed: true,
 *   lastCompletedAt: 1234567890
 * };
 * ```
 *
 * @see StoryChapter - For parent chapter information
 */
export interface StoryStage {
  /** Unique stage ID */
  _id: Id<"storyStages">;
  /** Timestamp when stage was created */
  _creationTime: number;
  /** Stage number within the chapter (1-indexed) */
  stageNumber: number;
  /** Stage display name */
  name: string;
  /** Stage description/objective */
  description: string;
  /** Opponent's deck template ID */
  opponentDeckId: string;
  /** Opponent character name */
  opponentName: string;
  /** Opponent's effective level */
  opponentLevel: number;
  /** Requirements for earning 1, 2, and 3 stars */
  starRequirements: {
    /** Condition for earning 1 star (basic win) */
    winCondition: string;
    /** Condition for earning 2 stars */
    twoStar: string;
    /** Condition for earning 3 stars (perfect) */
    threeStar: string;
  };
  /** Rewards for completing the stage */
  rewards: {
    /** Gold currency awarded */
    gold: number;
    /** Experience points awarded */
    xp: number;
    /** Premium currency awarded (optional) */
    gems?: number;
  };
  /** Bonus gold for first completion */
  firstClearBonus: number;
  /** Current stage status */
  status: "locked" | "available" | "completed" | "starred";
  /** Number of stars earned (0-3) */
  starsEarned: number;
  /** Highest score achieved (optional) */
  bestScore?: number;
  /** Number of times stage has been completed */
  timesCompleted: number;
  /** Whether first clear bonus has been claimed */
  firstClearClaimed: boolean;
  /** Timestamp of last completion (optional) */
  lastCompletedAt?: number;
}

/**
 * Result of completing a story chapter or stage battle.
 *
 * @example
 * ```typescript
 * const result: CompleteChapterResult = {
 *   won: true,
 *   rewards: {
 *     gold: 500,
 *     xp: 200,
 *     cards: [
 *       {
 *         cardDefinitionId: "jc8s9d0..." as Id<"cardDefinitions">,
 *         name: "Reward Dragon",
 *         rarity: "rare"
 *       }
 *     ]
 *   },
 *   starsEarned: 3
 * };
 * ```
 */
export interface CompleteChapterResult {
  /** Whether the player won the battle */
  won: boolean;
  /** Rewards earned from the battle */
  rewards: {
    /** Gold currency awarded */
    gold: number;
    /** Experience points awarded */
    xp: number;
    /** Card names from chapter rewards (string array) */
    cards: string[];
  };
  /** Number of stars earned (0-3) */
  starsEarned: number;
  /** Level up information if player leveled up */
  levelUp: {
    /** New level achieved */
    newLevel: number;
    /** Previous level */
    oldLevel: number;
  } | null;
  /** New badges earned from this completion */
  newBadges: Array<{
    /** Badge identifier */
    badgeId: string;
    /** Display name for the badge */
    displayName: string;
    /** Badge description */
    description: string;
  }>;
  /** Actual cards received with full details */
  cardsReceived: Array<{
    /** Card definition ID */
    cardDefinitionId: Id<"cardDefinitions">;
    /** Card name */
    name: string;
    /** Card rarity tier */
    rarity: string;
    /** Card archetype */
    archetype: string;
    /** Card type (creature, spell, trap) */
    cardType: string;
    /** Attack value for creatures */
    attack?: number;
    /** Defense value for creatures */
    defense?: number;
    /** Mana cost */
    cost: number;
    /** Card image URL */
    imageUrl?: string;
  }>;
}
