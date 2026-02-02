/**
 * Story Mode Action
 *
 * Start an instant AI battle without waiting for matchmaking.
 * Supports quick play (random stage) and specific chapter/stage selection.
 */

import type {
  Action,
  ActionResult,
  Content,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "@elizaos/core";
import { logger } from "@elizaos/core";
import { LTCGApiClient } from "../client/LTCGApiClient";

export const storyModeAction: Action = {
  name: "STORY_MODE",
  similes: ["PLAY_STORY", "QUICK_PLAY", "PLAY_AI", "PRACTICE", "PVE", "SINGLE_PLAYER"],
  description: "Start an instant AI battle in story mode without waiting for matchmaking",

  validate: async (runtime: IAgentRuntime, message: Memory, state: State): Promise<boolean> => {
    try {
      // Check if already in a game
      const currentGameId = state.values.LTCG_CURRENT_GAME_ID;
      if (currentGameId) {
        logger.debug("Agent already in a game");
        return false;
      }

      // Check if already in a lobby
      const currentLobbyId = state.values.LTCG_CURRENT_LOBBY_ID;
      if (currentLobbyId) {
        logger.debug("Agent already in a lobby");
        return false;
      }

      // Check API credentials
      const apiKey = runtime.getSetting("LTCG_API_KEY") as string;
      const apiUrl = runtime.getSetting("LTCG_API_URL") as string;

      if (!apiKey || !apiUrl) {
        logger.warn("LTCG API credentials not configured");
        return false;
      }

      return true;
    } catch (error) {
      logger.error({ error }, "Error validating story mode action");
      return false;
    }
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: any,
    callback: HandlerCallback
  ): Promise<ActionResult> => {
    try {
      logger.info("Handling STORY_MODE action");

      // Get API credentials
      const apiKey = runtime.getSetting("LTCG_API_KEY") as string;
      const apiUrl = runtime.getSetting("LTCG_API_URL") as string;

      if (!apiKey || !apiUrl) {
        throw new Error("LTCG API credentials not configured");
      }

      // Create API client
      const client = new LTCGApiClient({
        apiKey,
        baseUrl: apiUrl,
      });

      // Parse message for difficulty preference
      const messageText = message.content.text?.toLowerCase() || "";
      let difficulty: "easy" | "medium" | "hard" | "boss" | undefined;

      if (messageText.includes("easy")) {
        difficulty = "easy";
      } else if (messageText.includes("hard")) {
        difficulty = "hard";
      } else if (messageText.includes("boss")) {
        difficulty = "boss";
      } else if (messageText.includes("medium") || messageText.includes("normal")) {
        difficulty = "medium";
      }

      // Check if specific chapter is requested
      const chapterMatch = messageText.match(/chapter\s*(\d+)[-\s]*(\d+)?/i);
      const stageMatch = messageText.match(/stage\s*(\d+)/i);

      let result;

      if (chapterMatch) {
        // Start specific chapter/stage
        const actNum = Number.parseInt(chapterMatch[1], 10);
        const chapNum = chapterMatch[2] ? Number.parseInt(chapterMatch[2], 10) : 1;
        const chapterId = `${actNum}-${chapNum}`;
        const stageNumber = stageMatch ? Number.parseInt(stageMatch[1], 10) : undefined;

        logger.info({ chapterId, stageNumber }, "Starting specific story battle");
        result = await client.startStoryBattle(chapterId, stageNumber);
      } else {
        // Quick play - random available stage
        logger.info({ difficulty }, "Starting quick play story battle");
        result = await client.quickPlayStory(difficulty);
      }

      // Store game ID in runtime state
      state.values.LTCG_CURRENT_GAME_ID = result.gameId;
      state.values.LTCG_CURRENT_LOBBY_ID = result.lobbyId;
      state.values.LTCG_STORY_STAGE_ID = result.stageId;
      state.values.LTCG_IS_STORY_MODE = true;

      // Build response text
      let responseText = `Started story battle!\n`;
      responseText += `Chapter: ${result.chapter}\n`;
      responseText += `Stage: ${result.stage.name} (#${result.stage.number})\n`;
      responseText += `AI Opponent: ${result.aiOpponent}\n`;
      responseText += `Difficulty: ${result.difficulty}\n`;
      responseText += `Rewards: ${result.rewards.gold} gold, ${result.rewards.xp} XP`;
      if (result.rewards.firstClearBonus > 0) {
        responseText += ` (+${result.rewards.firstClearBonus} first clear bonus)`;
      }
      responseText += `\n\n${result.message}`;

      await callback({
        text: responseText,
        actions: ["STORY_MODE"],
        source: message.content.source,
        thought: `Started story battle against ${result.aiOpponent} on ${result.difficulty} difficulty. Ready to play!`,
      } as Content);

      return {
        success: true,
        text: "Story battle started successfully",
        values: {
          gameId: result.gameId,
          lobbyId: result.lobbyId,
          stageId: result.stageId,
          chapter: result.chapter,
          stage: result.stage,
          aiOpponent: result.aiOpponent,
          difficulty: result.difficulty,
          rewards: result.rewards,
        },
        data: {
          actionName: "STORY_MODE",
          gameId: result.gameId,
          lobbyId: result.lobbyId,
          stageId: result.stageId,
          isStoryMode: true,
        },
      };
    } catch (error) {
      logger.error({ error }, "Error in STORY_MODE action");

      await callback({
        text: `Failed to start story battle: ${error instanceof Error ? error.message : String(error)}`,
        error: true,
        thought: "Story battle start failed due to API error or missing deck",
      } as Content);

      return {
        success: false,
        text: "Failed to start story battle",
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: "{{name1}}",
        content: {
          text: "Play story mode",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "Started story battle!\nChapter: Fire Dragon Trials\nStage: First Flame (#1)\nAI Opponent: AI - Fire Dragon Trials\nDifficulty: easy\nRewards: 100 gold, 50 XP (+200 first clear bonus)\n\nStory battle started! You go first.",
          actions: ["STORY_MODE"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "Start a practice game against AI",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "Started story battle!\nChapter: Water Temple\nStage: Tidal Wave (#3)\nAI Opponent: AI - Water Temple\nDifficulty: medium\nRewards: 150 gold, 75 XP\n\nStory battle started! You go first.",
          actions: ["STORY_MODE"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "Play story chapter 1-2 stage 5",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "Started story battle!\nChapter: Earth Stronghold\nStage: Stone Guardian (#5)\nAI Opponent: AI - Earth Stronghold\nDifficulty: hard\nRewards: 200 gold, 100 XP\n\nStory battle started! You go first.",
          actions: ["STORY_MODE"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "Quick play on hard difficulty",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "Started story battle!\nChapter: Wind Valley\nStage: Storm Caller (#7)\nAI Opponent: AI - Wind Valley\nDifficulty: hard\nRewards: 250 gold, 125 XP\n\nStory battle started! You go first.",
          actions: ["STORY_MODE"],
        },
      },
    ],
  ],
};
