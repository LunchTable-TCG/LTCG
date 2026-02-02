/**
 * Legal Actions Provider
 *
 * Provides list of actions the agent can currently take:
 * - Available actions based on current phase
 * - Required parameters for each action
 * - Restrictions (e.g., "Already summoned this turn")
 */

import type { IAgentRuntime, Memory, Provider, ProviderResult, State } from "@elizaos/core";
import { LTCGApiClient } from "../client/LTCGApiClient";
import type { AvailableAction, AvailableActionsResponse } from "../types/api";

export const legalActionsProvider: Provider = {
  name: "LTCG_LEGAL_ACTIONS",
  description: "Lists all legal actions currently available to the agent",

  async get(runtime: IAgentRuntime, message: Memory, _state: State): Promise<ProviderResult> {
    try {
      // Get game ID from message content
      const gameId = (message.content as any)?.gameId;

      if (!gameId) {
        return {
          text: "No game ID provided in message context.",
          values: { error: "NO_GAME_ID" },
          data: {},
        };
      }

      // Get API credentials from runtime settings
      const apiKey = runtime.getSetting("LTCG_API_KEY");
      const apiUrl = runtime.getSetting("LTCG_API_URL");

      if (!apiKey || !apiUrl) {
        return {
          text: "LTCG API credentials not configured. Please set LTCG_API_KEY and LTCG_API_URL.",
          values: { error: "MISSING_CONFIG" },
          data: {},
        };
      }

      // Create API client
      const client = new LTCGApiClient({
        apiKey: apiKey as string,
        baseUrl: apiUrl as string,
      });

      // Fetch available actions
      const availableActions: AvailableActionsResponse = await client.getAvailableActions(gameId);

      if (availableActions.actions.length === 0) {
        return {
          text: "No actions currently available. It may not be your turn.",
          values: { actionCount: 0 },
          data: { actions: [] },
        };
      }

      // Build human-readable text
      const text = formatAvailableActions(availableActions);

      // Structured values for template substitution
      const values = {
        gameId: availableActions.gameId,
        phase: availableActions.phase,
        actionCount: availableActions.actions.length,
        canSummon: availableActions.actions.some((a) => a.type === "summon"),
        canSet: availableActions.actions.some((a) => a.type === "set"),
        canActivateSpell: availableActions.actions.some((a) => a.type === "activate_spell"),
        canActivateTrap: availableActions.actions.some((a) => a.type === "activate_trap"),
        canAttack: availableActions.actions.some((a) => a.type === "attack"),
        canChangePosition: availableActions.actions.some((a) => a.type === "change_position"),
        canEndTurn: availableActions.actions.some((a) => a.type === "end_turn"),
      };

      // Structured data for programmatic access
      const data = {
        availableActions: availableActions.actions,
        actionsByType: groupActionsByType(availableActions.actions),
      };

      return { text, values, data };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error fetching available actions";

      return {
        text: `Error fetching available actions: ${errorMessage}`,
        values: { error: "FETCH_ERROR" },
        data: { errorDetails: error },
      };
    }
  },
};

/**
 * Format available actions as human-readable text
 */
function formatAvailableActions(response: AvailableActionsResponse): string {
  let text = `Available Actions:\n`;

  response.actions.forEach((action) => {
    text += formatAction(action);
  });

  return text;
}

/**
 * Format a single action
 */
function formatAction(action: AvailableAction): string {
  const actionNameMap: Record<string, string> = {
    summon: "SUMMON_MONSTER",
    set: "SET_CARD",
    activate_spell: "ACTIVATE_SPELL",
    activate_trap: "ACTIVATE_TRAP",
    attack: "ATTACK",
    change_position: "CHANGE_POSITION",
    end_turn: "END_TURN",
    chain_response: "CHAIN_RESPONSE",
  };

  const actionName = actionNameMap[action.type] || action.type.toUpperCase();
  let text = `- ${actionName}: ${action.description}\n`;

  // Format parameters if available
  if (action.parameters) {
    if (action.type === "summon") {
      const cards = action.parameters['availableCards'] as any[];
      if (cards && cards.length > 0) {
        text += `  * Available cards:\n`;
        cards.forEach((card: any) => {
          const tributeText =
            card.level > 6
              ? " (requires 2 tributes)"
              : card.level >= 5
                ? " (requires 1 tribute)"
                : "";
          text += `    - ${card.name} (Level ${card.level}, ${card.atk} ATK)${tributeText}\n`;
        });
      }

      if (action.parameters['normalSummonUsed'] === true) {
        text += `  * Note: Normal summon already used this turn\n`;
      } else if (action.parameters['normalSummonUsed'] === false) {
        text += `  * Note: Normal summon available\n`;
      }
    } else if (action.type === "set") {
      const cards = action.parameters['availableCards'] as any[];
      if (cards && cards.length > 0) {
        text += `  * Can set:\n`;
        cards.forEach((card: any) => {
          text += `    - ${card.name} (${card.type})\n`;
        });
      }
    } else if (action.type === "activate_spell" || action.type === "activate_trap") {
      const cards = action.parameters['availableCards'] as any[];
      if (cards && cards.length > 0) {
        text += `  * Can activate:\n`;
        cards.forEach((card: any) => {
          text += `    - ${card.name}\n`;
        });
      }
    } else if (action.type === "attack") {
      const attackers = action.parameters['attackers'] as any[];
      if (attackers && attackers.length > 0) {
        text += `  * Attackers:\n`;
        attackers.forEach((attacker: any) => {
          text += `    - ${attacker.name} (${attacker.atk} ATK)\n`;
        });
      }

      if (action.parameters['canDirectAttack']) {
        text += `  * Direct attack available\n`;
      }
    } else if (action.type === "change_position") {
      const monsters = action.parameters['monsters'] as any[];
      if (monsters && monsters.length > 0) {
        text += `  * Can change position:\n`;
        monsters.forEach((monster: any) => {
          text += `    - ${monster.name} (${monster.currentPosition} -> ${monster.newPosition})\n`;
        });
      }

      if (action.parameters['alreadyChanged']) {
        text += `  * Note: Some monsters already changed position this turn\n`;
      }
    }
  }

  return text;
}

/**
 * Group actions by type for easy access
 */
function groupActionsByType(actions: AvailableAction[]): Record<string, AvailableAction[]> {
  const grouped: Record<string, AvailableAction[]> = {};

  actions.forEach((action) => {
    if (!grouped[action.type]) {
      grouped[action.type] = [];
    }
    grouped[action.type]?.push(action);
  });

  return grouped;
}
