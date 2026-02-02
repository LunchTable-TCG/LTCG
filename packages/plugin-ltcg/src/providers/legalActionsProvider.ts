/**
 * Legal Actions Provider (Enhanced)
 *
 * Provides list of actions the agent can currently take with strategic context:
 * - Available actions based on current phase
 * - Required parameters for each action
 * - Battle outcome predictions for attacks
 * - Lethal damage detection (marked as CRITICAL)
 * - Trap risk warnings
 * - Strategic priority and risk assessment
 */

import type { IAgentRuntime, Memory, Provider, ProviderResult, State } from "@elizaos/core";
import { logger } from "@elizaos/core";
import { LTCGApiClient } from "../client/LTCGApiClient";
import type { AvailableAction, GameStateResponse } from "../types/api";

// Strategic context types
type StrategicPriority = "critical" | "high" | "medium" | "low";
type RiskLevel = "safe" | "moderate" | "risky" | "dangerous";

interface BattleOutcome {
  damageToOpponent: number;
  damageToSelf: number;
  monsterDestroyed: "yours" | "theirs" | "both" | "neither";
  lethalDamage: boolean;
}

interface EnhancedAction extends AvailableAction {
  strategicContext?: {
    priority: StrategicPriority;
    reasoning: string;
    riskLevel: RiskLevel;
    warning?: string;
  };
  battleOutcome?: BattleOutcome;
}

export const legalActionsProvider: Provider = {
  name: "LTCG_LEGAL_ACTIONS",
  description:
    "Lists all legal actions with strategic context, battle outcomes, and lethal detection",

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

      // Fetch available actions AND game state for strategic analysis
      const [availableActions, gameState] = await Promise.all([
        client.getAvailableActions(gameId),
        client.getGameState(gameId),
      ]);

      if (availableActions.actions.length === 0) {
        return {
          text: "No actions currently available. It may not be your turn.",
          values: { actionCount: 0 },
          data: { actions: [] },
        };
      }

      // Enhance actions with strategic context
      const enhancedActions = enhanceActionsWithStrategy(availableActions.actions, gameState);

      // Sort by priority (critical first)
      const sortedActions = sortByPriority(enhancedActions);

      // Build human-readable text with strategic annotations
      const text = formatEnhancedActions(sortedActions, gameState);

      // Check for lethal options
      const hasLethal = sortedActions.some((a) => a.battleOutcome?.lethalDamage);
      const criticalActions = sortedActions.filter(
        (a) => a.strategicContext?.priority === "critical"
      );

      // Structured values for template substitution
      const values = {
        gameId: availableActions.gameId,
        phase: availableActions.phase,
        actionCount: availableActions.actions.length,
        hasLethal,
        criticalActionCount: criticalActions.length,
        canSummon: availableActions.actions.some((a) => a.type === "summon"),
        canSet: availableActions.actions.some((a) => a.type === "set"),
        canActivateSpell: availableActions.actions.some((a) => a.type === "activate_spell"),
        canActivateTrap: availableActions.actions.some((a) => a.type === "activate_trap"),
        canAttack: availableActions.actions.some((a) => a.type === "attack"),
        canChangePosition: availableActions.actions.some((a) => a.type === "change_position"),
        canEndTurn: availableActions.actions.some((a) => a.type === "end_turn"),
        opponentLP: gameState.opponentLifePoints,
        myLP: gameState.myLifePoints,
        opponentBackrowCount: gameState.opponentPlayer?.spellTrapZone?.length || 0,
      };

      // Structured data for programmatic access
      const data = {
        enhancedActions: sortedActions,
        actionsByType: groupActionsByType(sortedActions),
        gameState: {
          opponentLP: gameState.opponentLifePoints,
          myLP: gameState.myLifePoints,
          opponentBackrow: gameState.opponentPlayer?.spellTrapZone?.length || 0,
          opponentMonsters: gameState.opponentPlayer?.monsterZone?.length || 0,
        },
      };

      return { text, values, data };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error fetching available actions";

      logger.error({ error }, "Error fetching legal actions with strategy");

      return {
        text: `Error fetching available actions: ${errorMessage}`,
        values: { error: "FETCH_ERROR" },
        data: { errorDetails: error },
      };
    }
  },
};

/**
 * Enhance actions with strategic context and battle outcomes
 */
function enhanceActionsWithStrategy(
  actions: AvailableAction[],
  gameState: GameStateResponse
): EnhancedAction[] {
  const opponentLP = gameState.opponentLifePoints;
  const _myLP = gameState.myLifePoints;
  const opponentBackrow = gameState.opponentPlayer?.spellTrapZone?.length || 0;
  const opponentMonsters = gameState.opponentPlayer?.monsterZone || [];
  const _myMonsters = gameState.hostPlayer?.monsterZone || [];

  return actions.map((action) => {
    const enhanced: EnhancedAction = { ...action };

    switch (action.type) {
      case "attack": {
        // Calculate attack opportunities and battle outcomes
        const attackers = (action.parameters?.attackers as any[]) || [];
        const canDirectAttack = action.parameters?.canDirectAttack as boolean;

        // Calculate total potential damage for direct attacks
        const totalAttackDamage = attackers.reduce((sum, a) => sum + (a.atk || 0), 0);
        const isLethal = canDirectAttack && totalAttackDamage >= opponentLP;

        if (isLethal) {
          enhanced.strategicContext = {
            priority: "critical",
            reasoning: `LETHAL DAMAGE AVAILABLE! Total ATK (${totalAttackDamage}) >= Opponent LP (${opponentLP})`,
            riskLevel: opponentBackrow > 0 ? "moderate" : "safe",
            warning:
              opponentBackrow > 0 ? `Opponent has ${opponentBackrow} backrow card(s)` : undefined,
          };
          enhanced.battleOutcome = {
            damageToOpponent: totalAttackDamage,
            damageToSelf: 0,
            monsterDestroyed: "neither",
            lethalDamage: true,
          };
        } else if (canDirectAttack) {
          enhanced.strategicContext = {
            priority: "high",
            reasoning: `Direct attack for ${totalAttackDamage} damage`,
            riskLevel: opponentBackrow >= 2 ? "risky" : opponentBackrow >= 1 ? "moderate" : "safe",
            warning:
              opponentBackrow >= 2
                ? `WARNING: ${opponentBackrow} backrow cards - high trap risk!`
                : undefined,
          };
        } else {
          // Attacking into monsters
          enhanced.strategicContext = {
            priority: "medium",
            reasoning: "Attack opponent monsters",
            riskLevel: opponentBackrow >= 2 ? "risky" : "moderate",
            warning:
              opponentBackrow >= 2
                ? `WARNING: ${opponentBackrow} backrow cards - possible traps!`
                : undefined,
          };
        }
        break;
      }

      case "summon": {
        const cards = (action.parameters?.availableCards as any[]) || [];
        const strongestCard = cards.reduce(
          (strongest, card) => ((card.atk || 0) > (strongest?.atk || 0) ? card : strongest),
          cards[0]
        );

        const canSummonStrong = strongestCard && (strongestCard.atk || 0) >= 1800;

        enhanced.strategicContext = {
          priority: canSummonStrong ? "high" : "medium",
          reasoning: canSummonStrong
            ? `Summon strong monster (${strongestCard?.name} - ${strongestCard?.atk} ATK)`
            : "Summon monster to establish board presence",
          riskLevel: "safe",
        };
        break;
      }

      case "activate_spell": {
        const cards = (action.parameters?.availableCards as any[]) || [];
        // Check if any spells are board wipes or removal
        const hasRemoval = cards.some(
          (c) =>
            c.description?.toLowerCase().includes("destroy") ||
            c.name?.toLowerCase().includes("hole") ||
            c.name?.toLowerCase().includes("destruction")
        );

        enhanced.strategicContext = {
          priority: hasRemoval && opponentMonsters.length > 0 ? "high" : "medium",
          reasoning: hasRemoval ? "Removal spell available" : "Spell cards available",
          riskLevel: "safe",
        };
        break;
      }

      case "activate_trap": {
        enhanced.strategicContext = {
          priority: "medium",
          reasoning: "Trap activation available",
          riskLevel: "safe",
        };
        break;
      }

      case "set": {
        enhanced.strategicContext = {
          priority: "low",
          reasoning: "Set cards for protection/future use",
          riskLevel: "safe",
        };
        break;
      }

      case "change_position": {
        enhanced.strategicContext = {
          priority: "low",
          reasoning: "Change monster position",
          riskLevel: "safe",
        };
        break;
      }

      case "end_turn": {
        // Check if ending turn is advisable
        const hasUnusedSummon = action.parameters?.normalSummonUsed === false;
        const hasCardsInHand = (gameState.hand?.length || 0) > 0;

        enhanced.strategicContext = {
          priority: "low",
          reasoning:
            hasUnusedSummon && hasCardsInHand
              ? "Consider using normal summon before ending turn"
              : "End turn",
          riskLevel: "safe",
          warning:
            hasUnusedSummon && hasCardsInHand
              ? "You haven't used your normal summon yet!"
              : undefined,
        };
        break;
      }

      default:
        enhanced.strategicContext = {
          priority: "medium",
          reasoning: action.description,
          riskLevel: "safe",
        };
    }

    return enhanced;
  });
}

/**
 * Sort actions by strategic priority
 */
function sortByPriority(actions: EnhancedAction[]): EnhancedAction[] {
  const priorityOrder: Record<StrategicPriority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  return [...actions].sort((a, b) => {
    const aPriority = a.strategicContext?.priority || "medium";
    const bPriority = b.strategicContext?.priority || "medium";
    return priorityOrder[aPriority] - priorityOrder[bPriority];
  });
}

/**
 * Format enhanced actions with strategic annotations
 */
function formatEnhancedActions(actions: EnhancedAction[], gameState: GameStateResponse): string {
  const lines: string[] = [];

  // Header with game context
  lines.push("# Available Actions (Strategically Ordered)\n");
  lines.push(`Your LP: ${gameState.myLifePoints} | Opponent LP: ${gameState.opponentLifePoints}`);
  const backrowCount = gameState.opponentPlayer?.spellTrapZone?.length || 0;
  if (backrowCount > 0) {
    lines.push(`⚠️ Opponent has ${backrowCount} backrow card(s) - watch for traps!\n`);
  }

  // Check for lethal
  const lethalActions = actions.filter((a) => a.battleOutcome?.lethalDamage);
  if (lethalActions.length > 0) {
    lines.push("🎯 **LETHAL DETECTED - YOU CAN WIN THIS TURN!**\n");
  }

  // Group by priority
  const criticalActions = actions.filter((a) => a.strategicContext?.priority === "critical");
  const highActions = actions.filter((a) => a.strategicContext?.priority === "high");
  const mediumActions = actions.filter((a) => a.strategicContext?.priority === "medium");
  const lowActions = actions.filter((a) => a.strategicContext?.priority === "low");

  if (criticalActions.length > 0) {
    lines.push("## CRITICAL PRIORITY (Do These First!)");
    criticalActions.forEach((action) => lines.push(formatEnhancedAction(action)));
    lines.push("");
  }

  if (highActions.length > 0) {
    lines.push("## HIGH PRIORITY");
    highActions.forEach((action) => lines.push(formatEnhancedAction(action)));
    lines.push("");
  }

  if (mediumActions.length > 0) {
    lines.push("## MEDIUM PRIORITY");
    mediumActions.forEach((action) => lines.push(formatEnhancedAction(action)));
    lines.push("");
  }

  if (lowActions.length > 0) {
    lines.push("## LOW PRIORITY");
    lowActions.forEach((action) => lines.push(formatEnhancedAction(action)));
  }

  return lines.join("\n");
}

/**
 * Format a single enhanced action
 */
function formatEnhancedAction(action: EnhancedAction): string {
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
  const lines: string[] = [];

  // Action header with priority indicator
  const priorityEmoji =
    action.strategicContext?.priority === "critical"
      ? "🔴"
      : action.strategicContext?.priority === "high"
        ? "🟠"
        : action.strategicContext?.priority === "medium"
          ? "🟡"
          : "⚪";

  lines.push(`${priorityEmoji} **${actionName}**`);

  // Strategic reasoning
  if (action.strategicContext?.reasoning) {
    lines.push(`   Strategy: ${action.strategicContext.reasoning}`);
  }

  // Risk level
  if (action.strategicContext?.riskLevel && action.strategicContext.riskLevel !== "safe") {
    const riskEmoji =
      action.strategicContext.riskLevel === "dangerous"
        ? "🚨"
        : action.strategicContext.riskLevel === "risky"
          ? "⚠️"
          : "⚡";
    lines.push(`   ${riskEmoji} Risk: ${action.strategicContext.riskLevel.toUpperCase()}`);
  }

  // Warning
  if (action.strategicContext?.warning) {
    lines.push(`   ⚠️ ${action.strategicContext.warning}`);
  }

  // Battle outcome for attacks
  if (action.battleOutcome) {
    const outcome = action.battleOutcome;
    if (outcome.lethalDamage) {
      lines.push(`   🎯 **WIN THE GAME** - ${outcome.damageToOpponent} lethal damage!`);
    } else {
      lines.push(
        `   Damage: ${outcome.damageToOpponent} to opponent, ${outcome.damageToSelf} to you`
      );
    }
  }

  // Original parameters
  if (action.parameters) {
    if (action.type === "summon") {
      const cards = action.parameters.availableCards as any[];
      if (cards && cards.length > 0) {
        lines.push("   Cards:");
        cards.forEach((card: any) => {
          const tributeText =
            card.level > 6 ? " (2 tributes)" : card.level >= 5 ? " (1 tribute)" : "";
          lines.push(
            `     - ${card.name} (Lv${card.level}, ${card.atk} ATK)${tributeText} [handIndex: ${card.handIndex}]`
          );
        });
      }
    } else if (action.type === "attack") {
      const attackers = action.parameters.attackers as any[];
      if (attackers && attackers.length > 0) {
        lines.push("   Attackers:");
        attackers.forEach((attacker: any) => {
          lines.push(
            `     - ${attacker.name} (${attacker.atk} ATK) [boardIndex: ${attacker.boardIndex}]`
          );
        });
      }
      if (action.parameters.canDirectAttack) {
        lines.push("   ✅ Direct attack available (no targetBoardIndex needed)");
      }
    } else if (action.type === "activate_spell" || action.type === "activate_trap") {
      const cards = action.parameters.availableCards as any[];
      if (cards && cards.length > 0) {
        lines.push("   Cards:");
        cards.forEach((card: any) => {
          lines.push(
            `     - ${card.name} [handIndex: ${card.handIndex ?? "N/A"}, boardIndex: ${card.boardIndex ?? "N/A"}]`
          );
        });
      }
    }
  }

  return lines.join("\n");
}

/**
 * Group actions by type for easy access
 */
function groupActionsByType(actions: EnhancedAction[]): Record<string, EnhancedAction[]> {
  const grouped: Record<string, EnhancedAction[]> = {};

  actions.forEach((action) => {
    if (!grouped[action.type]) {
      grouped[action.type] = [];
    }
    grouped[action.type]?.push(action);
  });

  return grouped;
}
