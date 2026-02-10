/**
 * Turn Orchestrator
 *
 * The autonomous gameplay brain. When it's the agent's turn, this orchestrator:
 * 1. Gathers comprehensive game context from all providers
 * 2. Asks the LLM to decide which action to take
 * 3. Executes the chosen action
 * 4. Repeats until END_TURN is chosen or an error occurs
 *
 * This enables fully autonomous gameplay without human intervention.
 */

import { type IAgentRuntime, ModelType, Service, logger } from "@elizaos/core";
import { LTCGApiClient } from "../client/LTCGApiClient";
import { LTCGEventType, emitLTCGEvent } from "../events/types";
import type { Decision } from "../frontend/types/panel";
import type {
  AvailableActionsResponse,
  BoardCard,
  CardInHand,
  GameEvent,
  GameStateResponse,
} from "../types/api";
import {
  calculateDamageRange,
  estimateWinProbability,
  turnsToLethal,
} from "../utils/probabilityCalculator";
import { SERVICE_TYPES } from "./types";

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveDecisionModelType(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "large" || normalized === "text_large") {
    return ModelType.TEXT_LARGE;
  }
  return ModelType.TEXT_SMALL;
}

function resolveMonsterLevel(card: CardInHand): number {
  const level =
    typeof card.cost === "number"
      ? card.cost
      : typeof card.level === "number"
        ? card.level
        : 0;
  return Number.isFinite(level) ? level : 0;
}

function resolveTributeRequirement(card: CardInHand): number {
  const level = resolveMonsterLevel(card);
  if (level >= 7) {
    return 2;
  }
  if (level >= 5) {
    return 1;
  }
  return 0;
}

// Action types the orchestrator can choose
export type OrchestratorAction =
  | "SUMMON_MONSTER"
  | "SET_CARD"
  | "ACTIVATE_SPELL"
  | "ACTIVATE_TRAP"
  | "ATTACK"
  | "ENTER_BATTLE_PHASE"
  | "ENTER_MAIN_PHASE_2"
  | "CHANGE_POSITION"
  | "FLIP_SUMMON"
  | "END_TURN"
  | "CHAIN_RESPONSE"
  | "PASS_CHAIN";

interface ActionDecision {
  action: OrchestratorAction;
  reasoning: string;
  parameters?: Record<string, unknown>;
  source?: "heuristic" | "llm" | "fallback";
}

interface FailedAction {
  action: string;
  reason: string;
}

interface TurnContext {
  gameState: GameStateResponse;
  availableActions: AvailableActionsResponse;
  hand: string;
  boardAnalysis: string;
  strategy: string;
  recentOpponentActions: string;
  phase: string;
  turnNumber: number;
  lifePoints: { agent: number; opponent: number };
  failedActions: FailedAction[];
}

export class TurnOrchestrator extends Service {
  static serviceType = SERVICE_TYPES.ORCHESTRATOR;

  // Note: runtime is inherited from Service base class as protected
  private client: LTCGApiClient | null = null;
  private isExecutingTurn = false;
  private maxActionsPerTurn = 16; // Safety limit
  private readonly maxConsecutiveFailures = 2;
  private readonly actionLoopDelayMs = parsePositiveInt(
    process.env.LTCG_ACTION_LOOP_DELAY_MS,
    1500
  );
  private readonly minLlmDecisionIntervalMs = parsePositiveInt(
    process.env.LTCG_MIN_LLM_DECISION_INTERVAL_MS,
    4000
  );
  private readonly maxLlmDecisionsPerTurn = parsePositiveInt(
    process.env.LTCG_MAX_LLM_DECISIONS_PER_TURN,
    2
  );
  private readonly decisionModelType = resolveDecisionModelType(process.env.LTCG_ORCHESTRATOR_MODEL);
  private readonly llmChainDecisionsEnabled = process.env.LTCG_LLM_CHAIN_DECISIONS === "true";
  private lastLlmDecisionAt = 0;

  // Decision history tracking for panels
  private decisionHistory: Map<string, Decision[]> = new Map();
  private readonly maxHistoryPerGame = 100;
  private readonly validActions: Set<OrchestratorAction> = new Set([
    "SUMMON_MONSTER",
    "SET_CARD",
    "ACTIVATE_SPELL",
    "ACTIVATE_TRAP",
    "ATTACK",
    "ENTER_BATTLE_PHASE",
    "ENTER_MAIN_PHASE_2",
    "CHANGE_POSITION",
    "FLIP_SUMMON",
    "END_TURN",
    "CHAIN_RESPONSE",
    "PASS_CHAIN",
  ]);

  capabilityDescription = "Orchestrates autonomous turn-by-turn gameplay decisions";

  static async start(runtime: IAgentRuntime): Promise<Service> {
    logger.info("*** Starting LTCG Turn Orchestrator ***");

    const service = new TurnOrchestrator(runtime);

    // Initialize API client (read from process.env set by plugin init)
    const apiKey = process.env.LTCG_API_KEY;
    const apiUrl = process.env.LTCG_API_URL;

    if (apiKey && apiUrl) {
      service.client = new LTCGApiClient({
        apiKey,
        baseUrl: apiUrl,
        debug: process.env.LTCG_DEBUG_MODE === "true",
      });
      try {
        const profile = await service.client.getAgentProfile();
        logger.info(
          { agentId: profile.agentId, name: profile.name },
          "Turn orchestrator initialized with verified API client"
        );
      } catch (error) {
        logger.error(
          { error: error instanceof Error ? error.message : String(error) },
          "LTCG API key validation failed; turn orchestrator disabled"
        );
        service.client = null;
      }
    } else {
      logger.warn("API credentials not configured - orchestrator cannot execute actions");
    }

    return service;
  }

  static async stop(runtime: IAgentRuntime): Promise<void> {
    logger.info("*** Stopping LTCG Turn Orchestrator ***");
    const service = runtime.getService(
      TurnOrchestrator.serviceType
    ) as unknown as TurnOrchestrator | null;
    if (service) {
      service.isExecutingTurn = false;
    }
  }

  async stop(): Promise<void> {
    this.isExecutingTurn = false;
    this.client = null;
    // Clear decision history to prevent memory leaks
    this.decisionHistory.clear();
  }

  // ============================================================================
  // Public API - Called by polling service or webhooks
  // ============================================================================

  /**
   * Handle turn started event - begin autonomous turn execution
   */
  async onTurnStarted(gameId: string, phase: string, turnNumber: number): Promise<void> {
    if (this.isExecutingTurn) {
      logger.debug("Already executing a turn, skipping");
      return;
    }

    if (!this.client) {
      logger.error("Cannot execute turn - API client not initialized");
      return;
    }

    this.isExecutingTurn = true;

    logger.info({ gameId, phase, turnNumber }, "🎮 Starting autonomous turn execution");

    try {
      await this.executeTurn(gameId);
    } catch (error) {
      logger.error({ error, gameId }, "Error during autonomous turn execution");
    } finally {
      this.isExecutingTurn = false;
    }
  }

  /**
   * Handle chain waiting event - decide whether to chain or pass
   */
  async onChainWaiting(gameId: string, timeoutMs: number): Promise<void> {
    if (!this.client) {
      logger.error("Cannot respond to chain - API client not initialized");
      return;
    }

    logger.info({ gameId, timeoutMs }, "⛓️ Chain waiting - deciding response");

    try {
      await this.executeChainResponse(gameId, timeoutMs);
    } catch (error) {
      logger.error({ error, gameId }, "Error during chain response");
    }
  }

  /**
   * Get decision history for a game (for panel display)
   */
  public getDecisionHistory(gameId: string, limit = 20): Decision[] {
    const history = this.decisionHistory.get(gameId) ?? [];
    return history.slice(-limit);
  }

  // ============================================================================
  // Turn Execution Loop
  // ============================================================================

  /**
   * Main turn execution loop
   */
  private async executeTurn(gameId: string): Promise<void> {
    let actionCount = 0;
    const failedActions: FailedAction[] = [];
    let consecutiveFailures = 0;
    let llmDecisionsThisTurn = 0;

    while (actionCount < this.maxActionsPerTurn) {
      actionCount++;

      // Get current game context
      const context = await this.gatherTurnContext(gameId);

      if (!context) {
        logger.error("Failed to gather turn context");
        break;
      }

      // Pass accumulated failed actions to LLM so it knows what already failed
      context.failedActions = failedActions;

      // Check if it's still our turn (use isMyTurn which works for both host and opponent roles)
      if (!context.gameState.isMyTurn) {
        logger.info("No longer our turn, ending turn execution");
        break;
      }

      // Check if game ended
      if (context.gameState.status === "completed") {
        logger.info("Game completed during turn");
        break;
      }

      // If server says no actions available (other than END_TURN), just end turn
      const serverActions = context.availableActions?.actions ?? [];
      const nonEndActions = serverActions.filter(
        (a) => this.normalizeActionName(a.action) !== "END_TURN"
      );
      if (nonEndActions.length === 0) {
        logger.info("Server reports no actions available, ending turn");
        await this.executeEndTurn(gameId);
        break;
      }

      const allowLlm = llmDecisionsThisTurn < this.maxLlmDecisionsPerTurn;
      const decision = await this.decideAction(context, allowLlm);

      if (!decision) {
        logger.error("LLM failed to decide action, ending turn");
        await this.executeEndTurn(gameId);
        break;
      }

      if (decision.source === "llm") {
        llmDecisionsThisTurn++;
      }

      logger.info(
        {
          action: decision.action,
          reasoning: decision.reasoning,
          source: decision.source ?? "unknown",
          llmDecisionsThisTurn,
          maxLlmDecisionsPerTurn: this.maxLlmDecisionsPerTurn,
        },
        `🤖 Decision selected: ${decision.action}`
      );

      // Emit action decided event
      await emitLTCGEvent(this.runtime, LTCGEventType.ACTION_DECIDED, {
        gameId,
        action: decision.action,
        reasoning: decision.reasoning,
        turnNumber: context.turnNumber,
        phase: context.phase,
      });

      // Execute the chosen action
      if (decision.action === "END_TURN") {
        await this.executeEndTurn(gameId);
        break;
      }

      const success = await this.executeAction(gameId, decision, context);

      if (!success) {
        consecutiveFailures++;
        failedActions.push({
          action: decision.action,
          reason: `${decision.action} with card ${decision.parameters?.cardId ?? "unknown"} failed`,
        });
        logger.warn(
          { action: decision.action, consecutiveFailures, totalFailed: failedActions.length },
          "Action failed, tracking for LLM context"
        );

        // If 3+ consecutive failures, force end turn to avoid infinite loop
        if (consecutiveFailures >= this.maxConsecutiveFailures) {
          logger.warn(
            { consecutiveFailures, threshold: this.maxConsecutiveFailures },
            "Consecutive failure threshold reached, forcing end turn"
          );
          await this.executeEndTurn(gameId);
          break;
        }
      } else {
        consecutiveFailures = 0; // Reset on success
      }

      // Small delay to avoid hammering the API
      await this.sleep(this.actionLoopDelayMs);
    }

    if (actionCount >= this.maxActionsPerTurn) {
      logger.warn("Hit max actions per turn limit, forcing end turn");
      await this.executeEndTurn(gameId);
    }

    logger.info({ gameId, actionCount }, "✅ Turn execution complete");

    // Emit turn completed event
    await emitLTCGEvent(this.runtime, LTCGEventType.TURN_COMPLETED, {
      gameId,
      actionCount,
      turnNumber: 0, // Turn number not tracked at this level
    });
  }

  // ============================================================================
  // Context Gathering
  // ============================================================================

  /**
   * Gather comprehensive turn context from game state and providers
   */
  private async gatherTurnContext(gameId: string): Promise<TurnContext | null> {
    if (!this.client) return null;

    try {
      // Fetch game state, available actions, and history in parallel
      const [gameState, availableActions, gameHistory] = await Promise.all([
        this.client.getGameState(gameId),
        this.client.getAvailableActions(gameId),
        this.client.getGameHistory(gameId).then(h => Array.isArray(h) ? h : []).catch(() => [] as GameEvent[]),
      ]);

      // Build context strings
      const hand = this.formatHand(gameState);
      const boardAnalysis = this.formatBoardAnalysis(gameState);
      const strategy = this.analyzeStrategy(gameState);
      const recentOpponentActions = this.formatRecentOpponentActions(gameHistory, gameState);

      return {
        gameState,
        availableActions,
        hand,
        boardAnalysis,
        strategy,
        recentOpponentActions,
        phase: gameState.phase,
        turnNumber: gameState.turnNumber,
        lifePoints: {
          agent: gameState.myLifePoints ?? 8000,
          opponent: gameState.opponentLifePoints ?? 8000,
        },
        failedActions: [],
      };
    } catch (error) {
      logger.error({ error, gameId }, "Failed to gather turn context");
      return null;
    }
  }

  /**
   * Format hand information for LLM with card effects
   */
  private formatHand(state: GameStateResponse): string {
    const hand = state.hand ?? [];
    if (hand.length === 0) return "Your hand is empty.";

    const cards = hand.map((card: CardInHand, idx: number) => {
      const cardType = card.cardType || card.type;
      const lines: string[] = [];

      if (cardType === "creature") {
        const atk = card.attack ?? card.atk ?? "?";
        const def = card.defense ?? card.def ?? "?";
        const level = card.cost ?? card.level ?? "?";
        lines.push(
          `${idx}. **${card.name}** (Monster, ATK:${atk}/DEF:${def}, Level:${level}) [cardId: ${card._id}]`
        );

        // Add tribute requirement hint
        const tributeRequirement = resolveTributeRequirement(card);
        if (tributeRequirement >= 2) {
          lines.push("   ⚠️ Requires 2 tributes to summon");
        } else if (tributeRequirement === 1) {
          lines.push("   ⚠️ Requires 1 tribute to summon");
        }
      } else if (cardType === "spell") {
        lines.push(`${idx}. **${card.name}** (Spell) [cardId: ${card._id}]`);
      } else if (cardType === "trap") {
        lines.push(`${idx}. **${card.name}** (Trap) [cardId: ${card._id}]`);
      } else {
        lines.push(`${idx}. **${card.name}** (${cardType}) [cardId: ${card._id}]`);
      }

      // Add effect description if available
      if (card.description) {
        const shortDesc =
          card.description.length > 100
            ? `${card.description.substring(0, 100)}...`
            : card.description;
        lines.push(`   Effect: ${shortDesc}`);
      }

      // Add ability summary if available
      if (card.abilities && card.abilities.length > 0) {
        const abilityNames = card.abilities
          .map((a: Record<string, unknown>) => a.type || a.name || "Special")
          .slice(0, 2)
          .join(", ");
        lines.push(`   Abilities: ${abilityNames}`);
      }

      return lines.join("\n");
    });

    return `Your hand (${hand.length} cards):\n${cards.join("\n")}`;
  }

  /**
   * Format board analysis for LLM with graveyard visibility
   */
  private formatBoardAnalysis(state: GameStateResponse): string {
    const lines: string[] = [];

    // Agent's field
    const agentMonsters = state.myBoard ?? [];
    const agentSpellTraps = state.hostPlayer?.spellTrapZone ?? [];
    const agentGraveyard = state.hostPlayer?.graveyard ?? [];
    const agentBanished = state.hostPlayer?.banished ?? [];

    lines.push("=== YOUR FIELD ===");
    if (agentMonsters.length === 0) {
      lines.push("Monster Zones: Empty");
    } else {
      lines.push("Monsters:");
      agentMonsters.forEach((m: BoardCard, i: number) => {
        if (m.isFaceDown) {
          lines.push(`  ${i}. ${m.name ?? "Unknown"} - Face-down DEF [cardId: ${m._id}]`);
        } else {
          const pos = m.position === 1 ? "ATK" : "DEF";
          const atk = m.currentAttack ?? m.attack ?? "?";
          const def = m.currentDefense ?? m.defense ?? "?";
          lines.push(`  ${i}. ${m.name ?? "Unknown"} - ${pos} ${atk}/${def} [cardId: ${m._id}]`);
        }
      });
    }

    if (agentSpellTraps.length > 0) {
      lines.push("Spell/Trap:");
      agentSpellTraps.forEach((st, i) => {
        const faceStatus = st.faceUp ? "(Active)" : "(Set)";
        lines.push(`  ${i}. ${st.name ?? "Unknown"} ${faceStatus} [cardId: ${st.cardId}]`);
      });
    }

    // Your graveyard - shows what resources you've used/lost
    if (agentGraveyard.length > 0) {
      lines.push("Your Graveyard:");
      const graveyardSummary = this.summarizeGraveyard(agentGraveyard);
      lines.push(`  ${graveyardSummary}`);
    }

    // Your banished pile
    if (agentBanished.length > 0) {
      lines.push(`Banished: ${agentBanished.map((c) => c.name).join(", ")}`);
    }

    // Opponent's field
    const oppMonsters = state.opponentBoard ?? [];
    const oppSpellTraps = state.opponentPlayer?.spellTrapZone ?? [];
    const oppGraveyard = state.opponentPlayer?.graveyard ?? [];
    const oppBanished = state.opponentPlayer?.banished ?? [];

    lines.push("\n=== OPPONENT FIELD ===");
    if (oppMonsters.length === 0) {
      lines.push("Monster Zones: Empty");
    } else {
      lines.push("Monsters:");
      oppMonsters.forEach((m: BoardCard, i: number) => {
        if (m.isFaceDown) {
          lines.push(`  ${i}. Face-down Defense Position [cardId: ${m._id}]`);
        } else {
          const pos = m.position === 1 ? "ATK" : "DEF";
          const atk = m.currentAttack ?? m.attack ?? "?";
          const def = m.currentDefense ?? m.defense ?? "?";
          lines.push(`  ${i}. ${m.name ?? "Unknown"} - ${pos} ${atk}/${def} [cardId: ${m._id}]`);
        }
      });
    }

    if (oppSpellTraps.length > 0) {
      lines.push(`Spell/Trap: ${oppSpellTraps.length} card(s) set`);
    }

    // Opponent's graveyard - reveals what they've played/lost (strategic intel)
    if (oppGraveyard.length > 0) {
      lines.push("Opponent Graveyard (cards used/destroyed):");
      const graveyardSummary = this.summarizeGraveyard(oppGraveyard);
      lines.push(`  ${graveyardSummary}`);
    }

    // Opponent banished
    if (oppBanished.length > 0) {
      lines.push(`Opponent Banished: ${oppBanished.map((c) => c.name).join(", ")}`);
    }

    return lines.join("\n");
  }

  /**
   * Summarize graveyard contents by type for readability
   */
  private summarizeGraveyard(
    graveyard: Array<{ cardId: string; name: string; type: string }>
  ): string {
    const monsters = graveyard.filter((c) => c.type === "creature");
    const spells = graveyard.filter((c) => c.type === "spell");
    const traps = graveyard.filter((c) => c.type === "trap");

    const parts: string[] = [];

    if (monsters.length > 0) {
      const monsterNames = monsters.map((c) => c.name).slice(0, 5);
      const suffix = monsters.length > 5 ? ` +${monsters.length - 5} more` : "";
      parts.push(`Monsters: ${monsterNames.join(", ")}${suffix}`);
    }

    if (spells.length > 0) {
      const spellNames = spells.map((c) => c.name).slice(0, 3);
      const suffix = spells.length > 3 ? ` +${spells.length - 3} more` : "";
      parts.push(`Spells: ${spellNames.join(", ")}${suffix}`);
    }

    if (traps.length > 0) {
      const trapNames = traps.map((c) => c.name).slice(0, 3);
      const suffix = traps.length > 3 ? ` +${traps.length - 3} more` : "";
      parts.push(`Traps: ${trapNames.join(", ")}${suffix}`);
    }

    return parts.length > 0 ? parts.join(" | ") : "Empty";
  }

  /**
   * Format recent opponent actions for context
   * Shows what opponent did on their last turn(s) to help predict their strategy
   */
  private formatRecentOpponentActions(history: GameEvent[], gameState: GameStateResponse): string {
    if (history.length === 0) {
      return "No opponent actions recorded yet.";
    }

    // Determine our player ID from normalized API fields.
    // During our turn this should always be present and stable.
    const myPlayerId =
      gameState.myPlayerId ??
      (gameState.isMyTurn ? gameState.currentTurnPlayer : undefined) ??
      gameState.hostPlayer?.playerId;
    if (!myPlayerId) {
      return "No recent opponent actions.";
    }

    // Filter opponent events from last 2 turns
    const currentTurn = gameState.turnNumber;
    const recentOpponentEvents = history
      .filter((e) => e.playerId !== myPlayerId)
      .filter((e) => e.turnNumber >= currentTurn - 2)
      .slice(-10); // Last 10 opponent events max

    if (recentOpponentEvents.length === 0) {
      return "No recent opponent actions.";
    }

    const lines: string[] = ["Recent Opponent Actions:"];

    // Group by turn
    const eventsByTurn = new Map<number, GameEvent[]>();
    for (const event of recentOpponentEvents) {
      const turnEvents = eventsByTurn.get(event.turnNumber) ?? [];
      turnEvents.push(event);
      eventsByTurn.set(event.turnNumber, turnEvents);
    }

    // Format events by turn
    for (const [turn, events] of eventsByTurn) {
      const turnLabel = turn === currentTurn - 1 ? "Last Turn" : `Turn ${turn}`;
      lines.push(`  ${turnLabel}:`);

      for (const event of events) {
        const formattedEvent = this.formatGameEvent(event);
        if (formattedEvent) {
          lines.push(`    - ${formattedEvent}`);
        }
      }
    }

    return lines.join("\n");
  }

  /**
   * Format a single game event for display
   */
  private formatGameEvent(event: GameEvent): string | null {
    const cardName = event.metadata?.cardName as string | undefined;

    switch (event.eventType) {
      case "summon":
        return `Summoned ${cardName ?? "a monster"}`;
      case "spell_activation":
        return `Activated ${cardName ?? "a spell/trap"}`;
      case "attack": {
        const damage = event.metadata?.damage as number | undefined;
        const target = event.metadata?.targetName as string | undefined;
        if (damage) {
          return `Attacked ${target ? target : "directly"} for ${damage} damage`;
        }
        return `Attacked ${target ?? ""}`;
      }
      case "damage": {
        const amount = event.metadata?.amount as number | undefined;
        return amount ? `Dealt ${amount} damage` : null;
      }
      case "draw":
        return "Drew a card";
      case "turn_end":
        return null; // Skip turn end events
      default:
        return event.description || null;
    }
  }

  /**
   * Analyze strategic situation with win probability and lethal detection
   */
  private analyzeStrategy(state: GameStateResponse): string {
    const agentLP = state.myLifePoints ?? 8000;
    const oppLP = state.opponentLifePoints ?? 8000;
    const agentMonsters = state.myBoard ?? [];
    const oppMonsters = state.opponentBoard ?? [];
    const myBoard = state.myBoard ?? [];
    const oppBoard = state.opponentBoard ?? [];

    const lines: string[] = [];

    // Win probability estimation
    try {
      const winProb = estimateWinProbability(state);
      const probPercent = Math.round(winProb.probability * 100);
      if (probPercent >= 70) {
        lines.push(`🟢 Win Probability: ${probPercent}% (${winProb.confidence}) - FAVORABLE`);
      } else if (probPercent >= 40) {
        lines.push(`🟡 Win Probability: ${probPercent}% (${winProb.confidence}) - EVEN`);
      } else {
        lines.push(`🔴 Win Probability: ${probPercent}% (${winProb.confidence}) - UNFAVORABLE`);
      }
      lines.push(`   Factors: ${winProb.reasoning}`);
    } catch {
      // Fallback if estimation fails
    }

    // Life point advantage
    if (agentLP > oppLP) {
      lines.push(`✓ Life point advantage: ${agentLP} vs ${oppLP}`);
    } else if (agentLP < oppLP) {
      lines.push(`⚠ Life point disadvantage: ${agentLP} vs ${oppLP}`);
    } else {
      lines.push(`○ Life points even: ${agentLP}`);
    }

    // Lethal detection using damage range calculator
    try {
      const damageRange = calculateDamageRange(myBoard, oppBoard, oppLP);

      if (damageRange.lethal) {
        lines.push(
          `🎯 **LETHAL AVAILABLE** - Max damage: ${damageRange.maximum} (Overkill: ${damageRange.overkill})`
        );
        lines.push("   >>> PRIORITIZE EXECUTING LETHAL SEQUENCE <<<");
      } else if (damageRange.maximum > 0) {
        const needed = oppLP - damageRange.maximum;
        lines.push(`⚔️ Damage potential: ${damageRange.minimum}-${damageRange.maximum}`);
        lines.push(`   Need ${needed} more damage for lethal`);

        // Check turns to lethal
        const lethalInfo = turnsToLethal(state);
        if (lethalInfo) {
          lines.push(`   Estimated: ${lethalInfo.path}`);
        }
      }
    } catch {
      // Fallback to basic calculation
      const agentAttackMonsters = agentMonsters.filter(
        (m: BoardCard) => m.position === 1 && !m.isFaceDown
      );
      const totalAttack = agentAttackMonsters.reduce(
        (sum: number, m: BoardCard) => sum + (m.attack ?? 0),
        0
      );

      if (totalAttack >= oppLP && oppMonsters.length === 0) {
        lines.push("🎯 LETHAL: Can attack directly for game!");
      } else if (totalAttack >= oppLP) {
        lines.push("🎯 Potential lethal if opponent monsters cleared");
      }
    }

    // Threat assessment from opponent
    const oppAttackMonsters = oppMonsters.filter(
      (m: BoardCard) => m.position === 1 && !m.isFaceDown
    );
    if (oppAttackMonsters.length > 0) {
      const maxOppAtk = Math.max(...oppAttackMonsters.map((m: BoardCard) => m.attack ?? 0));
      const oppTotalAtk = oppAttackMonsters.reduce(
        (sum: number, m: BoardCard) => sum + (m.attack ?? 0),
        0
      );
      lines.push(
        `⚔️ Opponent threats: ${oppAttackMonsters.length} attacker(s), strongest: ${maxOppAtk} ATK`
      );

      if (oppTotalAtk >= agentLP && agentMonsters.length === 0) {
        lines.push(`⚠️ **DANGER**: Opponent has lethal if we don't defend!`);
      }
    }

    // Backrow warning
    const oppBackrow = state.opponentPlayer?.spellTrapZone?.length ?? 0;
    if (oppBackrow >= 2) {
      lines.push(`⚠️ Opponent has ${oppBackrow} backrow - possible traps!`);
    }

    // Hand advantage
    const handSize = state.hand?.length ?? 0;
    const oppDeckCount = state.opponentDeckCount ?? 0;
    lines.push(`📝 Hand: ${handSize} cards, Opponent deck: ${oppDeckCount} cards`);

    // === OPPONENT PLAYSTYLE INFERENCE ===
    const oppPlaystyle = this.inferOpponentPlaystyle(state);
    if (oppPlaystyle.playstyle !== "unknown") {
      lines.push("");
      lines.push(`## OPPONENT PROFILE: ${oppPlaystyle.playstyle.toUpperCase()}`);
      lines.push(`   ${oppPlaystyle.insight}`);
      if (oppPlaystyle.recommendation) {
        lines.push(`   Recommendation: ${oppPlaystyle.recommendation}`);
      }
    }

    // === CONSEQUENCE PREDICTIONS ===
    lines.push("");
    lines.push("## IF-THEN CONSEQUENCES");

    // Battle consequence predictions
    const myAttackers = agentMonsters.filter(
      (m: BoardCard) => m.position === 1 && !m.hasAttacked && !m.isFaceDown
    );

    if (myAttackers.length > 0 && oppMonsters.length > 0) {
      lines.push("Attack Outcomes:");
      for (const attacker of myAttackers.slice(0, 3)) {
        // Limit to 3 for brevity
        const myAtk = attacker.attack ?? 0;
        for (const defender of oppMonsters.slice(0, 2)) {
          // Limit defenders analyzed
          if (defender.isFaceDown) {
            lines.push(`  → ${attacker.name} (${myAtk}) vs Face-down: RISKY - unknown DEF`);
          } else {
            const defValue =
              defender.position === 1 ? (defender.attack ?? 0) : (defender.defense ?? 0);
            const diff = myAtk - defValue;
            if (diff > 0) {
              if (defender.position === 1) {
                lines.push(
                  `  → ${attacker.name} (${myAtk}) vs ${defender.name} (${defValue} ATK): WIN, deal ${diff} damage`
                );
              } else {
                lines.push(
                  `  → ${attacker.name} (${myAtk}) vs ${defender.name} (${defValue} DEF): DESTROY defender, no damage`
                );
              }
            } else if (diff === 0) {
              lines.push(
                `  → ${attacker.name} (${myAtk}) vs ${defender.name} (${defValue}): MUTUAL DESTRUCTION`
              );
            } else {
              const dmgToMe = Math.abs(diff);
              lines.push(
                `  → ${attacker.name} (${myAtk}) vs ${defender.name} (${defValue}): LOSE ${attacker.name}, take ${dmgToMe} damage`
              );
            }
          }
        }
      }
    } else if (myAttackers.length > 0 && oppMonsters.length === 0) {
      lines.push("Attack Outcomes:");
      lines.push("  → Direct attack available! All attackers can hit opponent LP directly.");
    }

    // Trap risk assessment
    if (oppBackrow > 0) {
      const trapRisk = oppBackrow >= 3 ? "HIGH" : oppBackrow >= 2 ? "MEDIUM" : "LOW";
      lines.push(`Trap Risk: ${trapRisk}`);
      if (oppBackrow >= 2) {
        lines.push("  → IF you attack: Opponent may activate trap to negate/destroy");
        lines.push("  → IF you summon: Watch for Trap Hole or similar summon responses");
      }
    }

    // End turn consequences
    if (agentMonsters.length === 0 && oppAttackMonsters.length > 0) {
      const potentialDamage = oppAttackMonsters.reduce(
        (sum: number, m: BoardCard) => sum + (m.attack ?? 0),
        0
      );
      lines.push(
        `End Turn Risk: IF you end turn with no defenders, opponent can deal ${potentialDamage} damage!`
      );
    }

    return lines.join("\n");
  }

  /**
   * Infer opponent's playstyle from current game state
   * Simplified version of opponentModelingProvider logic
   */
  private inferOpponentPlaystyle(state: GameStateResponse): {
    playstyle: "aggressive" | "defensive" | "control" | "balanced" | "unknown";
    insight: string;
    recommendation?: string;
  } {
    const oppMonsters = state.opponentBoard ?? [];
    const oppBackrow = state.opponentPlayer?.spellTrapZone?.length ?? 0;
    const oppGraveyard = state.opponentPlayer?.graveyard ?? [];

    // Count attack vs defense position monsters
    const attackPosCount = oppMonsters.filter(
      (m: BoardCard) => m.position === 1 && !m.isFaceDown
    ).length;
    const defensePosCount = oppMonsters.filter(
      (m: BoardCard) => m.position === 2 || m.isFaceDown
    ).length;

    // Count monsters vs spells in graveyard (reveals playstyle)
    const monstersInGrave = oppGraveyard.filter((c) => c.type === "creature").length;
    const spellsInGrave = oppGraveyard.filter(
      (c) => c.type === "spell" || c.type === "trap"
    ).length;

    // Determine playstyle
    if (attackPosCount >= 2 && oppBackrow <= 1 && monstersInGrave > spellsInGrave) {
      return {
        playstyle: "aggressive",
        insight: "Opponent favors attack position, minimal backrow protection",
        recommendation: "They may overextend - consider defensive plays and counterattacks",
      };
    }

    if (defensePosCount >= 2 || oppBackrow >= 3) {
      return {
        playstyle: "defensive",
        insight: "Opponent is turtling with defenders and/or heavy backrow",
        recommendation: "Bait traps before committing big plays, or build overwhelming board",
      };
    }

    if (oppBackrow >= 2 && spellsInGrave > monstersInGrave) {
      return {
        playstyle: "control",
        insight: "Opponent relies on spells/traps to control the game",
        recommendation: "Play around removal, don't commit everything to one play",
      };
    }

    if (oppMonsters.length > 0 || oppBackrow > 0) {
      return {
        playstyle: "balanced",
        insight: "Opponent plays a balanced strategy",
        recommendation: "Adapt to their threats and maintain board presence",
      };
    }

    return {
      playstyle: "unknown",
      insight: "Not enough information to determine playstyle",
    };
  }

  // ============================================================================
  // LLM Decision Making
  // ============================================================================

  /**
   * Get the agent's display name from process.env
   */
  private getAgentName(): string {
    return process.env.LTCG_AGENT_NAME || this.runtime.character?.name || "AI Agent";
  }

  /**
   * Emit an agent event to the game stream for UI visibility
   */
  private async emitAgentEvent(
    gameId: string,
    lobbyId: string,
    turnNumber: number,
    eventType: "agent_thinking" | "agent_decided" | "agent_error",
    description: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    if (!this.client) return;

    try {
      await this.client.emitAgentEvent({
        gameId,
        lobbyId,
        turnNumber,
        eventType,
        agentName: this.getAgentName(),
        description,
        metadata,
      });
    } catch (error) {
      // Non-critical - log but don't fail the turn
      logger.debug({ error }, "Failed to emit agent event (non-critical)");
    }
  }

  /**
   * Ask LLM to decide which action to take
   */
  private async decideAction(context: TurnContext, allowLlm = true): Promise<ActionDecision | null> {
    const { gameState } = context;
    const startTime = Date.now();
    const legalActionSet = this.getLegalActions(context);
    const legalActions = Array.from(legalActionSet);

    logger.debug(
      {
        gameId: gameState.gameId,
        turnNumber: context.turnNumber,
        phase: context.phase,
        legalActions,
        serverActions: (context.availableActions?.actions ?? []).map((a) => a.action),
        handCount: gameState.hand?.length ?? 0,
        myBoardCount: gameState.myBoard?.length ?? 0,
        opponentBoardCount: gameState.opponentBoard?.length ?? 0,
      },
      "Turn context snapshot for LLM"
    );

    const heuristicDecision = this.getHeuristicDecision(context, legalActionSet);
    if (heuristicDecision) {
      heuristicDecision.source = "heuristic";
      const executionTimeMs = Date.now() - startTime;
      await this.emitAgentEvent(
        gameState.gameId,
        gameState.lobbyId,
        context.turnNumber,
        "agent_decided",
        `${this.getAgentName()} chose: ${heuristicDecision.action}`,
        {
          action: heuristicDecision.action,
          reasoning: heuristicDecision.reasoning.substring(0, 150),
          executionTimeMs,
          source: "rule_based",
        }
      );
      return heuristicDecision;
    }

    if (!allowLlm) {
      const fallbackDecision = this.getNoLlmFallbackDecision(context, legalActionSet);
      if (fallbackDecision) {
        fallbackDecision.source = "fallback";
      }
      return fallbackDecision;
    }

    const prompt = this.buildDecisionPrompt(context);

    // Emit thinking event - visible to spectators and opponent
    await this.emitAgentEvent(
      gameState.gameId,
      gameState.lobbyId,
      context.turnNumber,
      "agent_thinking",
      `${this.getAgentName()} is analyzing the board...`,
      {
        phase: context.phase,
        cardsConsidered: (gameState.hand ?? []).slice(0, 3).map((c) => c.name),
      }
    );

    try {
      const now = Date.now();
      const waitMs = this.minLlmDecisionIntervalMs - (now - this.lastLlmDecisionAt);
      if (waitMs > 0) {
        await this.sleep(waitMs);
      }

      this.lastLlmDecisionAt = Date.now();

      const response = await this.runtime.useModel(this.decisionModelType, {
        prompt: `SYSTEM: You are a JSON-only game AI. You MUST respond with a single JSON object and nothing else. No markdown, no code fences, no explanation outside the JSON.\n\n${prompt}`,
        temperature: 0.2,
        maxTokens: 220,
        responseFormat: { type: "json_object" },
      });

      const parsedDecision = this.parseActionDecision(response);
      const decision: ActionDecision = parsedDecision
        ? this.ensureDecisionIsLegal(parsedDecision, context)
        : { action: "END_TURN" as const, reasoning: "Could not parse model decision", source: "llm" };
      decision.source = "llm";
      const executionTimeMs = Date.now() - startTime;

      // Emit decided event with reasoning
      if (decision) {
        await this.emitAgentEvent(
          gameState.gameId,
          gameState.lobbyId,
          context.turnNumber,
          "agent_decided",
          `${this.getAgentName()} chose: ${decision.action}`,
          {
            action: decision.action,
            reasoning: decision.reasoning.substring(0, 150),
            executionTimeMs,
            source: "llm",
          }
        );
      }

      return decision;
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;

      // Emit error event
      await this.emitAgentEvent(
        gameState.gameId,
        gameState.lobbyId,
        context.turnNumber,
        "agent_error",
        `${this.getAgentName()} encountered an error`,
        {
          error: error instanceof Error ? error.message : "Unknown error",
          executionTimeMs,
        }
      );

      logger.error({ error }, "Failed to get LLM decision");
      return null;
    }
  }

  /**
   * Build comprehensive decision prompt
   */
  private buildDecisionPrompt(context: TurnContext): string {
    const { phase, turnNumber, lifePoints, hand, boardAnalysis, strategy, recentOpponentActions } =
      context;

    const availableActionsText = this.formatAvailableActions(context);

    return `You are playing a trading card game. It's your turn.

## GAME STATE
Turn: ${turnNumber}
Phase: ${phase}
Your Life Points: ${lifePoints.agent}
Opponent Life Points: ${lifePoints.opponent}

## YOUR HAND
${hand}

## BOARD STATE
${boardAnalysis}

## OPPONENT ACTIVITY
${recentOpponentActions}

## STRATEGIC ANALYSIS
${strategy}

## AVAILABLE ACTIONS
${availableActionsText}

## RULES
- The "AVAILABLE ACTIONS" list is authoritative. Never choose an action that is not listed there.
- In main1, if ATTACK is not available but ENTER_BATTLE_PHASE is available, choose ENTER_BATTLE_PHASE first.
- You cannot attack on turn 1 (first turn battle restriction).
- You can only NORMAL SUMMON once per turn. If you already summoned, do NOT try again.
- ATTACK is how you win! If you have monsters in attack position, attack the opponent.
- Turn flow: summon/set (main1) → ATTACK → set more (main2) → END_TURN.

## YOUR TASK
Choose the BEST action. PRIORITY ORDER:

1. **LETHAL** - If "LETHAL AVAILABLE" appears, ATTACK to win NOW!
2. **ATTACK** - If you have monsters in attack position, ATTACK the opponent's monsters or directly!
3. **SUMMON** - If you haven't summoned this turn, summon your strongest available monster.
4. **SPELLS** - Activate beneficial spells to boost your monsters or damage opponent.
5. **SET** - Set traps/spells face-down for protection.
6. **END_TURN** - When you've summoned + attacked + no more useful actions.

CRITICAL: After summoning a monster, your next action should be ATTACK (not another summon).
If ATTACK is in the available actions list, USE IT before ending your turn.

Respond in this exact JSON format:
{
  "action": "ACTION_NAME",
  "reasoning": "Brief explanation",
  "parameters": { "cardId": "card_id_here" }
}

For ATTACK, use: { "attackerCardId": "your_monster_id", "targetCardId": "opponent_monster_id" }
For direct attack (no opponent monsters): { "attackerCardId": "your_monster_id" }

Valid actions: SUMMON_MONSTER, SET_CARD, ACTIVATE_SPELL, ACTIVATE_TRAP, ATTACK, ENTER_BATTLE_PHASE, ENTER_MAIN_PHASE_2, CHANGE_POSITION, FLIP_SUMMON, END_TURN

Use the cardId values shown in brackets (e.g., [cardId: abc123]) for your parameters.`;
  }

  /**
   * Format available actions for the prompt using server-provided actions
   */
  private formatAvailableActions(context: TurnContext): string {
    const lines: string[] = [];
    const serverActions = context.availableActions?.actions ?? [];
    const cardLookup = this.buildCardLookup(context.gameState);
    const legalActions = this.getLegalActions(context);

    const seen = new Set<OrchestratorAction>();
    for (const serverAction of serverActions) {
      const normalized = this.normalizeActionName(serverAction.action);
      if (!normalized || seen.has(normalized) || !legalActions.has(normalized)) continue;

      seen.add(normalized);
      const cardInfo = this.formatAvailableCardHints(serverAction.availableCards, cardLookup);
      const phaseInfo =
        normalized === "ENTER_BATTLE_PHASE" && typeof serverAction.attackableMonsters === "number"
          ? ` [${serverAction.attackableMonsters} attacker(s) ready]`
          : "";
      const parameterInfo =
        serverAction.parameters && Object.keys(serverAction.parameters).length > 0
          ? ` [params: ${Object.keys(serverAction.parameters).slice(0, 4).join(", ")}]`
          : "";
      lines.push(`• ${normalized} - ${this.describeAction(normalized)}${cardInfo}${phaseInfo}`);
      if (parameterInfo) {
        lines[lines.length - 1] += parameterInfo;
      }
    }

    if (!seen.has("END_TURN")) {
      lines.push("• END_TURN - End your turn and pass to opponent");
    }

    if (lines.length === 0) {
      lines.push("• END_TURN - No legal actions detected, end turn");
    }

    // Add failed actions warning if any
    if (context.failedActions.length > 0) {
      lines.push("");
      lines.push("⚠️ ALREADY FAILED THIS TURN (do NOT retry these):");
      for (const failed of context.failedActions) {
        lines.push(`  ✗ ${failed.reason}`);
      }
      lines.push("Choose a DIFFERENT action or END_TURN.");
    }

    return lines.join("\n");
  }

  private buildCardLookup(gameState: GameStateResponse): Map<string, string> {
    const lookup = new Map<string, string>();

    for (const card of gameState.hand ?? []) {
      if (card?._id) {
        lookup.set(card._id, `${card.name} (hand) [cardId: ${card._id}]`);
      }
    }

    for (const card of gameState.myBoard ?? []) {
      if (card?._id) {
        lookup.set(card._id, `${card.name ?? "Unknown"} (your field) [cardId: ${card._id}]`);
      }
    }

    for (const card of gameState.opponentBoard ?? []) {
      if (card?._id) {
        lookup.set(card._id, `${card.name ?? "Unknown"} (opponent field) [cardId: ${card._id}]`);
      }
    }

    return lookup;
  }

  private formatAvailableCardHints(
    availableCards: string[] | undefined,
    cardLookup: Map<string, string>
  ): string {
    if (!availableCards || availableCards.length === 0) {
      return "";
    }

    const preview = availableCards
      .slice(0, 4)
      .map((cardId) => cardLookup.get(cardId) ?? `Unknown [cardId: ${cardId}]`);
    const suffix = availableCards.length > 4 ? ` +${availableCards.length - 4} more` : "";
    return ` [eligible: ${preview.join("; ")}${suffix}]`;
  }

  /**
   * Parse LLM response into action decision
   */
  private parseActionDecision(response: string): ActionDecision | null {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.warn("No JSON found in LLM response");
        return { action: "END_TURN", reasoning: "Failed to parse response" };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const action = this.normalizeActionName(parsed.action);
      if (!action || !this.validActions.has(action)) {
        logger.warn({ action }, "Invalid action from LLM");
        return { action: "END_TURN", reasoning: "Invalid action chosen" };
      }

      return {
        action,
        reasoning: parsed.reasoning ?? "No reasoning provided",
        parameters: parsed.parameters,
      };
    } catch (error) {
      logger.error(
        { error, response: response.substring(0, 200) },
        "Failed to parse action decision"
      );
      return { action: "END_TURN", reasoning: "Failed to parse response" };
    }
  }

  private normalizeActionName(action: unknown): OrchestratorAction | null {
    if (typeof action !== "string" || action.trim().length === 0) {
      return null;
    }

    const normalized = action.trim().toUpperCase().replace(/[\s-]+/g, "_");

    switch (normalized) {
      case "SUMMON":
      case "NORMAL_SUMMON":
      case "SUMMON_MONSTER":
        return "SUMMON_MONSTER";
      case "SET":
      case "SET_MONSTER":
      case "SET_SPELL_TRAP":
      case "SET_CARD":
        return "SET_CARD";
      case "ACTIVATE_SPELL":
        return "ACTIVATE_SPELL";
      case "ACTIVATE_TRAP":
        return "ACTIVATE_TRAP";
      case "ATTACK":
      case "DECLARE_ATTACK":
        return "ATTACK";
      case "ENTER_BATTLE":
      case "ENTER_BATTLE_PHASE":
        return "ENTER_BATTLE_PHASE";
      case "ENTER_MAIN2":
      case "ENTER_MAIN_2":
      case "ENTER_MAIN_PHASE2":
      case "ENTER_MAIN_PHASE_2":
        return "ENTER_MAIN_PHASE_2";
      case "CHANGE_POSITION":
        return "CHANGE_POSITION";
      case "FLIP_SUMMON":
        return "FLIP_SUMMON";
      case "END_TURN":
        return "END_TURN";
      case "CHAIN_RESPONSE":
        return "CHAIN_RESPONSE";
      case "PASS_CHAIN":
        return "PASS_CHAIN";
      default:
        return null;
    }
  }

  private getLegalActions(context: TurnContext): Set<OrchestratorAction> {
    const legal = new Set<OrchestratorAction>();

    for (const action of context.availableActions?.actions ?? []) {
      const normalized = this.normalizeActionName(action.action);
      if (normalized) {
        legal.add(normalized);
      }
    }

    // First-turn battle restriction is enforced server-side but not always reflected in available-actions.
    if (context.turnNumber <= 1) {
      legal.delete("ATTACK");
      legal.delete("ENTER_BATTLE_PHASE");
    }

    return legal;
  }

  private getHeuristicDecision(
    context: TurnContext,
    legalActions: Set<OrchestratorAction>
  ): ActionDecision | null {
    const failedThisTurn = new Set(context.failedActions.map((failed) => failed.action));
    const canTry = (action: OrchestratorAction) =>
      legalActions.has(action) && !failedThisTurn.has(action);

    if (legalActions.size === 0) {
      return {
        action: "END_TURN",
        reasoning: "No legal actions available",
      };
    }

    if (legalActions.size === 1 && legalActions.has("END_TURN")) {
      return {
        action: "END_TURN",
        reasoning: "Only END_TURN is legal",
      };
    }

    if (context.phase === "main1") {
      if (canTry("ACTIVATE_SPELL")) {
        const spellCardId = this.selectActivateSpellCardId(context);
        if (spellCardId) {
          return {
            action: "ACTIVATE_SPELL",
            reasoning: "Using deterministic spell activation in main phase 1",
            parameters: { cardId: spellCardId },
          };
        }
      }

      const attackersReady = (context.gameState.myBoard ?? []).some(
        (m: BoardCard) => !m.isFaceDown && m.position === 1 && !m.hasAttacked
      );
      if (attackersReady && canTry("ENTER_BATTLE_PHASE")) {
        return {
          action: "ENTER_BATTLE_PHASE",
          reasoning: "Attacker available, entering battle phase deterministically",
        };
      }

      if (canTry("SUMMON_MONSTER")) {
        const summonCardId = this.selectSummonCardId(context);
        if (summonCardId) {
          return {
            action: "SUMMON_MONSTER",
            reasoning: "Using deterministic summon fallback in main phase 1",
            parameters: { cardId: summonCardId, position: "attack" },
          };
        }
      }

      if (canTry("SET_CARD")) {
        const setCardId = this.selectSetCardId(context);
        if (setCardId) {
          return {
            action: "SET_CARD",
            reasoning: "Setting a legal defensive card in main phase 1",
            parameters: { cardId: setCardId },
          };
        }
      }
    }

    if (context.phase === "battle") {
      if (canTry("ATTACK")) {
        const attackParams = this.selectAttackParameters(context.gameState);
        if (attackParams) {
          return {
            action: "ATTACK",
            reasoning: "Battle phase with legal attacker available",
            parameters: attackParams,
          };
        }
      }

      if (canTry("ENTER_MAIN_PHASE_2")) {
        return {
          action: "ENTER_MAIN_PHASE_2",
          reasoning: "No safe attacks available, advancing to main phase 2",
        };
      }

      if (canTry("END_TURN")) {
        return {
          action: "END_TURN",
          reasoning: "No deterministic battle attack available",
        };
      }
    }

    if (context.phase === "main2") {
      if (canTry("ACTIVATE_SPELL")) {
        const spellCardId = this.selectActivateSpellCardId(context);
        if (spellCardId) {
          return {
            action: "ACTIVATE_SPELL",
            reasoning: "Using deterministic spell activation in main phase 2",
            parameters: { cardId: spellCardId },
          };
        }
      }

      if (canTry("SET_CARD")) {
        const setCardId = this.selectSetCardId(context);
        if (setCardId) {
          return {
            action: "SET_CARD",
            reasoning: "Using deterministic set fallback in main phase 2",
            parameters: { cardId: setCardId },
          };
        }
      }

      if (canTry("END_TURN")) {
        return {
          action: "END_TURN",
          reasoning: "Main phase 2 fallback complete, ending turn",
        };
      }
    }

    if (
      legalActions.has("END_TURN") &&
      !legalActions.has("ATTACK") &&
      !legalActions.has("SUMMON_MONSTER") &&
      !legalActions.has("SET_CARD") &&
      !legalActions.has("ACTIVATE_SPELL") &&
      !legalActions.has("ACTIVATE_TRAP") &&
      !legalActions.has("CHAIN_RESPONSE")
    ) {
      return {
        action: "END_TURN",
        reasoning: "No high-value deterministic actions available",
      };
    }

    return null;
  }

  private getNoLlmFallbackDecision(
    context: TurnContext,
    legalActions: Set<OrchestratorAction>
  ): ActionDecision {
    const failedThisTurn = new Set(context.failedActions.map((failed) => failed.action));
    const canTry = (action: OrchestratorAction) =>
      legalActions.has(action) && !failedThisTurn.has(action);

    if (context.phase === "battle" && canTry("ENTER_MAIN_PHASE_2")) {
      return {
        action: "ENTER_MAIN_PHASE_2",
        reasoning: "LLM budget reached, advancing out of battle phase",
      };
    }

    if (canTry("ATTACK")) {
      const attackParams = this.selectAttackParameters(context.gameState);
      if (attackParams) {
        return {
          action: "ATTACK",
          reasoning: "LLM budget reached, using deterministic attack fallback",
          parameters: attackParams,
        };
      }
    }

    if (canTry("ENTER_BATTLE_PHASE")) {
      return {
        action: "ENTER_BATTLE_PHASE",
        reasoning: "LLM budget reached, entering battle phase deterministically",
      };
    }

    if (canTry("SUMMON_MONSTER")) {
      const summonCardId = this.selectSummonCardId(context);
      if (summonCardId) {
        return {
          action: "SUMMON_MONSTER",
          reasoning: "LLM budget reached, summoning strongest legal monster",
          parameters: { cardId: summonCardId, position: "attack" },
        };
      }
    }

    if (canTry("ACTIVATE_SPELL")) {
      const spellCardId = this.selectActivateSpellCardId(context);
      if (spellCardId) {
        return {
          action: "ACTIVATE_SPELL",
          reasoning: "LLM budget reached, activating first legal spell",
          parameters: { cardId: spellCardId },
        };
      }
    }

    if (canTry("SET_CARD")) {
      const setCardId = this.selectSetCardId(context);
      if (setCardId) {
        return {
          action: "SET_CARD",
          reasoning: "LLM budget reached, setting best available card",
          parameters: { cardId: setCardId },
        };
      }
    }

    if (canTry("END_TURN")) {
      return {
        action: "END_TURN",
        reasoning: "LLM budget reached and no deterministic high-value action remains",
      };
    }

    const fallback =
      Array.from(legalActions).find((action) => action !== "CHAIN_RESPONSE" && action !== "PASS_CHAIN") ??
      "END_TURN";
    return {
      action: fallback,
      reasoning: "LLM budget reached, using legal fallback action",
    };
  }

  private selectAttackParameters(
    gameState: GameStateResponse
  ): { attackerCardId: string; targetCardId?: string } | null {
    const attackers = (gameState.myBoard ?? []).filter(
      (m: BoardCard) => !m.isFaceDown && m.position === 1 && !m.hasAttacked
    );
    if (attackers.length === 0) {
      return null;
    }

    const attacker = attackers.reduce((best, card) => {
      const bestAtk = best.currentAttack ?? best.attack ?? 0;
      const cardAtk = card.currentAttack ?? card.attack ?? 0;
      return cardAtk > bestAtk ? card : best;
    }, attackers[0]);

    if (!attacker?._id) {
      return null;
    }

    const opponents = gameState.opponentBoard ?? [];
    if (opponents.length === 0) {
      return { attackerCardId: attacker._id };
    }

    const faceUp = opponents.filter((m: BoardCard) => !m.isFaceDown);
    const targetPool = faceUp.length > 0 ? faceUp : opponents;
    const target = targetPool.reduce((weakest, card) => {
      const weakestVal =
        weakest.position === 1 ? (weakest.currentAttack ?? weakest.attack ?? 0) : (weakest.currentDefense ?? weakest.defense ?? 0);
      const cardVal =
        card.position === 1 ? (card.currentAttack ?? card.attack ?? 0) : (card.currentDefense ?? card.defense ?? 0);
      return cardVal < weakestVal ? card : weakest;
    }, targetPool[0]);

    return target?._id
      ? { attackerCardId: attacker._id, targetCardId: target._id }
      : { attackerCardId: attacker._id };
  }

  private selectSummonCardId(context: TurnContext): string | null {
    const summonAction = this.getServerAction(context, "SUMMON_MONSTER");
    const legalCardIds = new Set(summonAction?.availableCards ?? []);
    const monsters = (context.gameState.hand ?? []).filter((c: CardInHand) => c.cardType === "creature");
    const summonable =
      legalCardIds.size > 0
        ? monsters.filter((c: CardInHand) => legalCardIds.has(c._id))
        : monsters;
    if (summonable.length === 0) {
      return null;
    }

    const ranked = [...summonable].sort((a, b) => {
      const tributeDiff = resolveTributeRequirement(a) - resolveTributeRequirement(b);
      if (tributeDiff !== 0) {
        return tributeDiff;
      }

      const atkA = a.attack ?? a.atk ?? 0;
      const atkB = b.attack ?? b.atk ?? 0;
      return atkB - atkA;
    });

    return ranked[0]?._id ?? null;
  }

  private selectSetCardId(context: TurnContext): string | null {
    const setAction = this.getServerAction(context, "SET_CARD");
    const legalCardIds = new Set(setAction?.availableCards ?? []);
    const hand = context.gameState.hand ?? [];
    const candidates =
      legalCardIds.size > 0
        ? hand.filter((c: CardInHand) => legalCardIds.has(c._id))
        : hand;
    if (candidates.length === 0) {
      return null;
    }

    // Prefer spell/traps for deterministic, low-risk sets.
    const spellTrap = candidates.find((c: CardInHand) => c.cardType !== "creature");
    if (spellTrap?._id) {
      return spellTrap._id;
    }

    // If the server explicitly provided legal cards, trust it and choose the
    // lowest-tribute monster to avoid invalid tribute-required sets.
    if (legalCardIds.size > 0) {
      const monsters = candidates.filter((c: CardInHand) => c.cardType === "creature");
      const ranked = [...monsters].sort((a, b) => {
        const tributeDiff = resolveTributeRequirement(a) - resolveTributeRequirement(b);
        if (tributeDiff !== 0) {
          return tributeDiff;
        }
        const atkA = a.attack ?? a.atk ?? 0;
        const atkB = b.attack ?? b.atk ?? 0;
        return atkB - atkA;
      });
      return ranked[0]?._id ?? null;
    }

    // When server doesn't provide availableCards for SET_CARD, avoid blind
    // high-level monster sets that commonly fail due to tribute requirements.
    const lowTributeMonsters = candidates.filter(
      (c: CardInHand) => c.cardType === "creature" && resolveTributeRequirement(c) === 0
    );
    return lowTributeMonsters[0]?._id ?? null;
  }

  private selectActivateSpellCardId(context: TurnContext): string | null {
    const spellAction = this.getServerAction(context, "ACTIVATE_SPELL");
    const legalCardIds = new Set(spellAction?.availableCards ?? []);
    const hand = context.gameState.hand ?? [];
    const spells =
      legalCardIds.size > 0
        ? hand.filter((c: CardInHand) => c.cardType === "spell" && legalCardIds.has(c._id))
        : hand.filter((c: CardInHand) => c.cardType === "spell");
    return spells[0]?._id ?? null;
  }

  private describeAction(action: OrchestratorAction): string {
    switch (action) {
      case "SUMMON_MONSTER":
        return "Normal summon a monster from hand (use cardId)";
      case "SET_CARD":
        return "Set a monster/spell/trap face-down (use cardId)";
      case "ACTIVATE_SPELL":
        return "Activate a spell card (use cardId)";
      case "ACTIVATE_TRAP":
        return "Activate a trap card (use cardId)";
      case "ATTACK":
        return "Declare attack (use attackerCardId and optional targetCardId)";
      case "ENTER_BATTLE_PHASE":
        return "Move from main phase into battle phase";
      case "ENTER_MAIN_PHASE_2":
        return "Move from battle phase into main phase 2";
      case "CHANGE_POSITION":
        return "Change a monster between attack/defense";
      case "FLIP_SUMMON":
        return "Flip summon a face-down monster";
      case "END_TURN":
        return "End turn and pass to opponent";
      case "CHAIN_RESPONSE":
        return "Respond to a chain with an effect";
      case "PASS_CHAIN":
        return "Pass chain response";
      default:
        return "Take a legal game action";
    }
  }

  private ensureDecisionIsLegal(decision: ActionDecision, context: TurnContext): ActionDecision {
    const legal = this.getLegalActions(context);
    if (legal.size === 0) {
      return {
        action: "END_TURN",
        reasoning: `${decision.reasoning} (server reported no legal actions, ending turn)`,
      };
    }

    if (legal.has(decision.action)) {
      return decision;
    }

    // Common invalid pattern in main1: model picks ATTACK before entering battle phase.
    if (decision.action === "ATTACK" && legal.has("ENTER_BATTLE_PHASE")) {
      return {
        action: "ENTER_BATTLE_PHASE",
        reasoning: `${decision.reasoning} (attack not legal yet, entering battle phase first)`,
      };
    }

    const fallbackPriority: OrchestratorAction[] = [
      "ATTACK",
      "ENTER_BATTLE_PHASE",
      "SUMMON_MONSTER",
      "ACTIVATE_SPELL",
      "SET_CARD",
      "CHANGE_POSITION",
      "FLIP_SUMMON",
      "ENTER_MAIN_PHASE_2",
      "END_TURN",
    ];

    const fallback =
      fallbackPriority.find((action) => legal.has(action)) ??
      (context.availableActions?.actions ?? [])
        .map((a) => this.normalizeActionName(a.action))
        .find((a): a is OrchestratorAction => a !== null) ??
      "END_TURN";

    logger.warn(
      { requested: decision.action, fallback, legal: Array.from(legal) },
      "LLM selected action not in server legal action list"
    );

    return {
      action: fallback,
      reasoning: `${decision.reasoning} (requested action was illegal, using ${fallback})`,
    };
  }

  private getServerAction(
    context: TurnContext,
    action: OrchestratorAction
  ): AvailableActionsResponse["actions"][number] | undefined {
    return (context.availableActions?.actions ?? []).find(
      (a) => this.normalizeActionName(a.action) === action
    );
  }

  // ============================================================================
  // Action Execution
  // ============================================================================

  /**
   * Execute the chosen action
   */
  private async executeAction(
    gameId: string,
    decision: ActionDecision,
    context: TurnContext
  ): Promise<boolean> {
    if (!this.client) return false;

    const startTime = Date.now();
    let success = false;

    try {
      switch (decision.action) {
        case "SUMMON_MONSTER":
          success = await this.executeSummon(gameId, decision, context);
          break;

        case "SET_CARD":
          success = await this.executeSetCard(gameId, decision, context);
          break;

        case "ACTIVATE_SPELL":
          success = await this.executeActivateSpell(gameId, decision, context);
          break;

        case "ATTACK":
          success = await this.executeAttack(gameId, decision, context);
          break;

        case "ENTER_BATTLE_PHASE":
          success = await this.executeEnterBattlePhase(gameId);
          break;

        case "ENTER_MAIN_PHASE_2":
          success = await this.executeEnterMainPhase2(gameId);
          break;

        case "CHANGE_POSITION":
          success = await this.executeChangePosition(gameId, decision, context);
          break;

        case "FLIP_SUMMON":
          success = await this.executeFlipSummon(gameId, decision, context);
          break;

        case "END_TURN":
          success = await this.executeEndTurn(gameId);
          break;

        default:
          logger.warn({ action: decision.action }, "Unhandled action type");
          success = false;
      }

      return success;
    } catch (error) {
      logger.error({ error, action: decision.action }, "Action execution failed");
      return false;
    } finally {
      // Record decision for panel display
      const endTime = Date.now();
      this.recordDecision(gameId, decision, context, success, startTime, endTime);

      // Emit action executed event
      await emitLTCGEvent(this.runtime, LTCGEventType.ACTION_EXECUTED, {
        gameId,
        action: decision.action,
        success,
        executionTimeMs: endTime - startTime,
      });
    }
  }

  /**
   * Record a decision for history tracking (in-memory + persistent)
   */
  private recordDecision(
    gameId: string,
    decision: ActionDecision,
    context: TurnContext,
    success: boolean,
    startTime: number,
    endTime: number
  ): void {
    const executionTimeMs = endTime - startTime;
    const result = success ? "success" : "failed";

    const decisionRecord: Decision = {
      id: `${gameId}-${Date.now()}`,
      timestamp: startTime,
      turnNumber: context.turnNumber,
      phase: context.phase,
      action: decision.action,
      reasoning: decision.reasoning,
      parameters: decision.parameters ?? {},
      result,
      executionTimeMs,
    };

    // Store in memory for immediate access by panels
    if (!this.decisionHistory.has(gameId)) {
      this.decisionHistory.set(gameId, []);
    }

    const history = this.decisionHistory.get(gameId);
    if (!history) {
      throw new Error(`Decision history for game ${gameId} not found after initialization`);
    }
    history.push(decisionRecord);

    // Trim in-memory history to max
    if (history.length > this.maxHistoryPerGame) {
      history.shift();
    }

    // Persist to Convex asynchronously (fire-and-forget)
    this.persistDecision({
      gameId,
      turnNumber: context.turnNumber,
      phase: context.phase,
      action: decision.action,
      reasoning: decision.reasoning,
      parameters: decision.parameters,
      executionTimeMs,
      result,
    }).catch((error) => {
      logger.warn({ error }, "Failed to persist decision to Convex");
    });

    logger.debug(
      { action: decision.action, success, executionTime: executionTimeMs },
      "Recorded decision"
    );
  }

  /**
   * Persist a decision to Convex for long-term storage
   */
  private async persistDecision(decision: {
    gameId: string;
    turnNumber: number;
    phase: string;
    action: string;
    reasoning: string;
    parameters?: Record<string, unknown>;
    executionTimeMs: number;
    result: string;
  }): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      // Use the LTCGApiClient to save the decision
      await this.client.saveDecision(decision);
    } catch (error) {
      // Log but don't throw - persistence is best-effort
      logger.debug({ error }, "Decision persistence failed (non-critical)");
    }
  }

  /**
   * Execute summon
   */
  private async executeSummon(
    gameId: string,
    decision: ActionDecision,
    context: TurnContext
  ): Promise<boolean> {
    const hand = context.gameState.hand ?? [];
    const monsters = hand.filter((c: CardInHand) => c.cardType === "creature");
    const summonAction = this.getServerAction(context, "SUMMON_MONSTER");
    const legalCardIds = new Set(summonAction?.availableCards ?? []);
    const summonableMonsters =
      legalCardIds.size > 0
        ? monsters.filter((c: CardInHand) => legalCardIds.has(c._id))
        : monsters;

    if (summonableMonsters.length === 0) {
      logger.info("No monsters in hand to summon");
      return false;
    }

    // LLM may provide cardId (new) or handIndex (legacy)
    const requestedCardId = decision.parameters?.cardId as string | undefined;
    const handIndex = decision.parameters?.handIndex as number | undefined;
    let selectedCard: CardInHand | undefined;

    if (requestedCardId) {
      selectedCard = summonableMonsters.find((c: CardInHand) => c._id === requestedCardId);
    }
    if (!selectedCard && handIndex !== undefined) {
      selectedCard = summonableMonsters.find(
        (c: CardInHand) =>
          c.handIndex === handIndex && (c.cardType === "creature" || c.type === "creature")
      );
    }
    if (!selectedCard) {
      selectedCard = summonableMonsters.reduce((best, card) => {
        const bestAtk = best.attack ?? best.atk ?? 0;
        const cardAtk = card.attack ?? card.atk ?? 0;
        return cardAtk > bestAtk ? card : best;
      }, summonableMonsters[0]);
    }

    if (!selectedCard?._id) {
      logger.error("No valid monster to summon");
      return false;
    }

    const position = (decision.parameters?.position as "attack" | "defense") ?? "attack";
    const requiredTributes = resolveTributeRequirement(selectedCard);
    let tributeCardIds = Array.isArray(decision.parameters?.tributeCardIds)
      ? (decision.parameters?.tributeCardIds as string[])
      : undefined;

    if (requiredTributes > 0 && (!tributeCardIds || tributeCardIds.length < requiredTributes)) {
      tributeCardIds = this.selectTributeCardIds(context.gameState, requiredTributes);
    }

    if (requiredTributes > 0 && (!tributeCardIds || tributeCardIds.length < requiredTributes)) {
      logger.info(
        { cardId: selectedCard._id, cardName: selectedCard.name, requiredTributes },
        "Skipping summon due to insufficient tributes"
      );
      return false;
    }

    try {
      await this.client?.summon({
        gameId,
        cardId: selectedCard._id,
        position,
        tributeCardIds,
      });

      logger.info(
        { cardName: selectedCard?.name, position, cardId: selectedCard._id },
        "Summoned monster"
      );
      return true;
    } catch (error) {
      logger.error({ error, cardId: selectedCard._id }, "Failed to execute summon");
      return false;
    }
  }

  /**
   * Execute set card
   */
  private async executeSetCard(
    gameId: string,
    decision: ActionDecision,
    context: TurnContext
  ): Promise<boolean> {
    const hand = context.gameState.hand ?? [];
    if (hand.length === 0) return false;
    const setAction = this.getServerAction(context, "SET_CARD");
    const legalCardIds = new Set(setAction?.availableCards ?? []);

    const requestedCardId = decision.parameters?.cardId as string | undefined;
    let card: CardInHand | undefined;
    if (requestedCardId && (legalCardIds.size === 0 || legalCardIds.has(requestedCardId))) {
      card = hand.find((c: CardInHand) => c._id === requestedCardId);
    }
    if (!card) {
      const handIdx = decision.parameters?.handIndex as number | undefined;
      if (handIdx !== undefined) {
        card = hand.find(
          (c: CardInHand) =>
            c.handIndex === handIdx && (legalCardIds.size === 0 || legalCardIds.has(c._id))
        );
      }
    }
    if (!card) {
      const candidates =
        legalCardIds.size > 0
          ? hand.filter((c: CardInHand) => legalCardIds.has(c._id))
          : hand;
      const spellTraps = candidates.filter((c: CardInHand) => c.cardType !== "creature");
      card = spellTraps[0] ?? candidates[0];
    }
    if (!card?._id) {
      logger.error("No valid card to set");
      return false;
    }

    const requiredTributes = card.cardType === "creature" ? resolveTributeRequirement(card) : 0;
    let tributeCardIds = Array.isArray(decision.parameters?.tributeCardIds)
      ? (decision.parameters?.tributeCardIds as string[])
      : undefined;
    if (requiredTributes > 0 && (!tributeCardIds || tributeCardIds.length < requiredTributes)) {
      tributeCardIds = this.selectTributeCardIds(context.gameState, requiredTributes);
    }
    if (requiredTributes > 0 && (!tributeCardIds || tributeCardIds.length < requiredTributes)) {
      logger.info(
        { cardId: card._id, cardName: card.name, requiredTributes },
        "Skipping set-card due to insufficient tributes"
      );
      return false;
    }

    try {
      if (card.cardType === "creature") {
        await this.client?.setCard({
          gameId,
          cardId: card._id,
          tributeCardIds,
        });
      } else {
        // Spell/trap cards use a different endpoint
        await this.client?.setSpellTrapCard({
          gameId,
          cardId: card._id,
        });
      }

      logger.info({ cardName: card?.name, cardType: card.cardType }, "Set card");
      return true;
    } catch (error) {
      logger.error({ error }, "Failed to set card");
      return false;
    }
  }

  private selectTributeCardIds(
    gameState: GameStateResponse,
    requiredTributes: number
  ): string[] | undefined {
    if (requiredTributes <= 0) {
      return undefined;
    }

    const availableTributes = (gameState.myBoard ?? [])
      .filter((card) => !!card._id && !card.isFaceDown)
      .map((card) => card._id)
      .filter((cardId): cardId is string => typeof cardId === "string" && cardId.length > 0);

    if (availableTributes.length < requiredTributes) {
      return undefined;
    }

    return availableTributes.slice(0, requiredTributes);
  }

  /**
   * Execute activate spell
   */
  private async executeActivateSpell(
    gameId: string,
    decision: ActionDecision,
    context: TurnContext
  ): Promise<boolean> {
    const hand = context.gameState.hand ?? [];
    const activateSpellAction = this.getServerAction(context, "ACTIVATE_SPELL");
    const legalCardIds = new Set(activateSpellAction?.availableCards ?? []);
    const spells = hand.filter(
      (c: CardInHand) =>
        c.cardType === "spell" && (legalCardIds.size === 0 || legalCardIds.has(c._id))
    );

    const requestedCardId = decision.parameters?.cardId as string | undefined;

    if (requestedCardId && (legalCardIds.size === 0 || legalCardIds.has(requestedCardId))) {
      try {
        await this.client?.activateSpell({ gameId, cardId: requestedCardId });
        logger.info({ cardId: requestedCardId }, "Activated spell");
        return true;
      } catch (error) {
        logger.error({ error }, "Failed to activate spell");
        return false;
      }
    }

    // Legacy fallback: find by handIndex
    const handIdx = decision.parameters?.handIndex as number | undefined;
    let spell: CardInHand | undefined;
    if (handIdx !== undefined) {
      spell = hand.find(
        (c: CardInHand) =>
          c.handIndex === handIdx && (c.cardType === "spell" || c.type === "spell")
      );
    }
    if (!spell) {
      spell = spells[0];
    }
    if (!spell?._id) return false;

    try {
      await this.client?.activateSpell({ gameId, cardId: spell._id });
      logger.info({ cardName: spell.name }, "Activated spell");
      return true;
    } catch (error) {
      logger.error({ error }, "Failed to activate spell");
      return false;
    }
  }

  /**
   * Execute attack
   */
  private async executeAttack(
    gameId: string,
    decision: ActionDecision,
    context: TurnContext
  ): Promise<boolean> {
    if (!this.getLegalActions(context).has("ATTACK")) {
      logger.warn({ phase: context.phase }, "ATTACK requested but not legal in current phase");
      return false;
    }

    const myMonsters = context.gameState.myBoard ?? [];
    const oppMonsters = context.gameState.opponentBoard ?? [];

    const attackers = myMonsters.filter(
      (m: BoardCard) => !m.isFaceDown && m.position === 1 && !m.hasAttacked
    );

    if (attackers.length === 0) return false;

    // Use attackerCardId from decision or pick first available attacker
    let attackerCardId = decision.parameters?.attackerCardId as string | undefined;
    if (!attackerCardId || !attackers.some((m: BoardCard) => m._id === attackerCardId)) {
      attackerCardId = (decision.parameters?.cardId as string) ?? attackers[0]?._id;
    }

    const attacker = myMonsters.find((m: BoardCard) => m._id === attackerCardId);

    if (!attackerCardId) {
      logger.error("No valid attacker available");
      return false;
    }

    // Choose target - direct attack if no opponents, otherwise from decision or attack weakest
    let targetCardId = decision.parameters?.targetCardId as string | undefined;
    if (targetCardId && !oppMonsters.some((m: BoardCard) => m._id === targetCardId)) {
      targetCardId = undefined;
    }

    if (!targetCardId && oppMonsters.length > 0) {
      const faceUpOpp = oppMonsters.filter((m: BoardCard) => !m.isFaceDown);
      if (faceUpOpp.length > 0) {
        const weakest = faceUpOpp.reduce((min: BoardCard, m: BoardCard) =>
          (m.position === 1 ? (m.attack ?? 0) : (m.defense ?? 0)) <
          (min.position === 1 ? (min.attack ?? 0) : (min.defense ?? 0))
            ? m
            : min
        );
        targetCardId = weakest._id;
      } else {
        // All monsters are face-down; still need a legal target when monsters exist.
        targetCardId = oppMonsters[0]?._id;
      }
    }

    try {
      await this.client?.attack({
        gameId,
        attackerCardId,
        targetCardId,
      });

      logger.info(
        { attacker: attacker?.name, target: targetCardId ? "monster" : "direct" },
        "Executed attack"
      );
      return true;
    } catch (error) {
      logger.error({ error }, "Failed to execute attack");
      return false;
    }
  }

  /**
   * Execute enter battle phase
   */
  private async executeEnterBattlePhase(gameId: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      await this.client.enterBattlePhase(gameId);
      logger.info({ gameId }, "Entered battle phase");
      return true;
    } catch (error) {
      logger.error({ error, gameId }, "Failed to enter battle phase");
      return false;
    }
  }

  /**
   * Execute enter main phase 2
   */
  private async executeEnterMainPhase2(gameId: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      await this.client.enterMainPhase2(gameId);
      logger.info({ gameId }, "Entered main phase 2");
      return true;
    } catch (error) {
      logger.error({ error, gameId }, "Failed to enter main phase 2");
      return false;
    }
  }

  /**
   * Execute change position
   */
  private async executeChangePosition(
    gameId: string,
    decision: ActionDecision,
    context: TurnContext
  ): Promise<boolean> {
    const myMonsters = context.gameState.myBoard ?? [];
    const changeable = myMonsters.filter(
      (m: BoardCard) => !m.hasChangedPosition && !m.hasAttacked
    );

    if (changeable.length === 0) return false;

    let cardId = decision.parameters?.cardId as string | undefined;
    if (!cardId) {
      cardId = changeable[0]?._id;
    }

    if (!cardId) {
      logger.error("No valid monster to change position");
      return false;
    }

    const monster = myMonsters.find((m: BoardCard) => m._id === cardId);
    const newPosition = monster?.position === 1 ? "defense" : "attack";

    try {
      await this.client?.changePosition({
        gameId,
        cardId,
      });

      logger.info({ monster: monster?.name, newPosition }, "Changed position");
      return true;
    } catch (error) {
      logger.error({ error }, "Failed to change position");
      return false;
    }
  }

  /**
   * Execute flip summon
   */
  private async executeFlipSummon(
    gameId: string,
    decision: ActionDecision,
    context: TurnContext
  ): Promise<boolean> {
    const myMonsters = context.gameState.myBoard ?? [];
    const faceDown = myMonsters.filter((m: BoardCard) => m.isFaceDown === true);

    if (faceDown.length === 0) return false;

    let cardId = decision.parameters?.cardId as string | undefined;
    if (!cardId) {
      cardId = faceDown[0]?._id;
    }

    if (!cardId) {
      logger.error("No valid face-down monster to flip summon");
      return false;
    }

    const monster = myMonsters.find((m: BoardCard) => m._id === cardId);

    try {
      await this.client?.flipSummon({
        gameId,
        cardId,
        newPosition: "attack",
      });

      logger.info({ monster: monster?.name }, "Flip summoned");
      return true;
    } catch (error) {
      logger.error({ error }, "Failed to flip summon");
      return false;
    }
  }

  /**
   * Execute end turn
   */
  private async executeEndTurn(gameId: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      await this.client.endTurn({ gameId });
      logger.info({ gameId }, "Ended turn");
      return true;
    } catch (error) {
      logger.error({ error }, "Failed to end turn");
      return false;
    }
  }

  // ============================================================================
  // Chain Response
  // ============================================================================

  /**
   * Handle chain response decision
   */
  private async executeChainResponse(gameId: string, _timeoutMs: number): Promise<void> {
    if (!this.client) return;

    try {
      const gameState = await this.client.getGameState(gameId);

      // Check if we have any cards that can chain
      const hand = gameState.hand ?? [];
      const chainableSpells = hand.filter((c: CardInHand) => c.cardType === "spell");

      const setTraps =
        gameState.hostPlayer?.spellTrapZone?.filter(
          (c) => !c.faceUp && c.type === "trap"
        ) ?? [];

      const hasChainOption = chainableSpells.length > 0 || setTraps.length > 0;

      if (!hasChainOption) {
        // No chain options, pass
        await this.client.chainResponse({ gameId, pass: true });
        logger.info("Passed chain (no options)");
        return;
      }

      if (!this.llmChainDecisionsEnabled) {
        await this.client.chainResponse({ gameId, pass: true });
        logger.info("Passed chain (LLM chain decisions disabled)");
        return;
      }

      // Ask LLM if we should chain
      const prompt = `An opponent's effect is resolving. You can chain with:
${chainableSpells.map((c: CardInHand) => `- ${c.name} (Spell) [cardId: ${c._id}]`).join("\n")}
${setTraps.map((c) => `- ${c.name} (Trap) [cardId: ${c.cardId}]`).join("\n")}

Should you chain? Consider the strategic value.
Respond with JSON: {"chain": true/false, "cardId": "card_id"}`;

      const now = Date.now();
      const waitMs = this.minLlmDecisionIntervalMs - (now - this.lastLlmDecisionAt);
      if (waitMs > 0) {
        await this.sleep(waitMs);
      }
      this.lastLlmDecisionAt = Date.now();

      const response = await this.runtime.useModel(this.decisionModelType, {
        prompt: `SYSTEM: You are a JSON-only game AI. Respond with a single JSON object only.\n\n${prompt}`,
        temperature: 0.3,
        maxTokens: 100,
        responseFormat: { type: "json_object" },
      });

      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.chain) {
            await this.client.chainResponse({
              gameId,
              pass: false,
              cardId: parsed.cardId,
            });
            logger.info("Activated chain");
            return;
          }
        }
      } catch {
        // Parse failed, pass
      }

      await this.client.chainResponse({ gameId, pass: true });
      logger.info("Passed chain");
    } catch (error) {
      logger.error({ error }, "Chain response failed");
    }
  }

  // ============================================================================
  // Utility
  // ============================================================================

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
