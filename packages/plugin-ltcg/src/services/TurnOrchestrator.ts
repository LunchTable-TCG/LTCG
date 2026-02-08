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

// Action types the orchestrator can choose
export type OrchestratorAction =
  | "SUMMON_MONSTER"
  | "SET_CARD"
  | "ACTIVATE_SPELL"
  | "ACTIVATE_TRAP"
  | "ATTACK"
  | "CHANGE_POSITION"
  | "FLIP_SUMMON"
  | "END_TURN"
  | "CHAIN_RESPONSE"
  | "PASS_CHAIN";

interface ActionDecision {
  action: OrchestratorAction;
  reasoning: string;
  parameters?: Record<string, unknown>;
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
}

export class TurnOrchestrator extends Service {
  static serviceType = SERVICE_TYPES.ORCHESTRATOR;

  // Note: runtime is inherited from Service base class as protected
  private client: LTCGApiClient | null = null;
  private isExecutingTurn = false;
  private maxActionsPerTurn = 20; // Safety limit

  // Decision history tracking for panels
  private decisionHistory: Map<string, Decision[]> = new Map();
  private readonly maxHistoryPerGame = 100;

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
      logger.info("Turn orchestrator initialized with API client");
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

    while (actionCount < this.maxActionsPerTurn) {
      actionCount++;

      // Get current game context
      const context = await this.gatherTurnContext(gameId);

      if (!context) {
        logger.error("Failed to gather turn context");
        break;
      }

      // Check if it's still our turn
      if (context.gameState.currentTurn !== "host") {
        logger.info("No longer our turn, ending turn execution");
        break;
      }

      // Check if game ended
      if (context.gameState.status === "completed") {
        logger.info("Game completed during turn");
        break;
      }

      // Ask LLM what action to take
      const decision = await this.decideAction(context);

      if (!decision) {
        logger.error("LLM failed to decide action, ending turn");
        await this.executeEndTurn(gameId);
        break;
      }

      logger.info(
        { action: decision.action, reasoning: decision.reasoning },
        `🤖 LLM decided: ${decision.action}`
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
        logger.warn({ action: decision.action }, "Action failed, will try again");
        // Don't break - let the LLM try a different action
      }

      // Small delay to avoid hammering the API
      await this.sleep(500);
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
        this.client.getGameHistory(gameId).catch(() => [] as GameEvent[]),
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
        const lvl = card.cost ?? card.level ?? 4;
        if (lvl >= 7) {
          lines.push("   ⚠️ Requires 2 tributes to summon");
        } else if (lvl >= 5) {
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

    // Determine opponent player ID (the one who isn't the host)
    const myPlayerId = gameState.hostPlayer?.playerId;

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
  private async decideAction(context: TurnContext): Promise<ActionDecision | null> {
    const prompt = this.buildDecisionPrompt(context);
    const { gameState } = context;
    const startTime = Date.now();

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
      const response = await this.runtime.useModel(ModelType.TEXT_LARGE, {
        prompt,
        temperature: 0.7,
        maxTokens: 500,
      });

      const decision = this.parseActionDecision(response);
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

## YOUR TASK
Choose the BEST action to take right now. PRIORITY ORDER:

1. **LETHAL CHECK** - If "LETHAL AVAILABLE" appears above, ATTACK to win immediately!
2. **SURVIVE** - If "DANGER: Opponent has lethal", summon defender or remove threats
3. **DEVELOP** - If safe, summon strongest monster in attack position
4. **SET PROTECTION** - Set traps/spells if board is established
5. **END TURN** - Only if no better options or conserving resources

IMPORTANT:
- If you see "LETHAL AVAILABLE", execute attacks in sequence to WIN THE GAME
- Check backrow warnings before attacking - traps may interrupt lethal
- Always prioritize winning over building board

Respond in this exact JSON format:
{
  "action": "ACTION_NAME",
  "reasoning": "Brief explanation of why this is the best play",
  "parameters": { "cardId": "card_id_here" }
}

Valid actions: SUMMON_MONSTER, SET_CARD, ACTIVATE_SPELL, ACTIVATE_TRAP, ATTACK, CHANGE_POSITION, FLIP_SUMMON, END_TURN

IMPORTANT: Use the cardId values shown in brackets (e.g., [cardId: abc123]) for your parameters.

Choose wisely!`;
  }

  /**
   * Format available actions for the prompt
   */
  private formatAvailableActions(context: TurnContext): string {
    const { gameState } = context;
    const lines: string[] = [];

    // Check what can be done based on game state
    const hasNormalSummoned = gameState.hasNormalSummoned;
    const phase = gameState.phase;

    if (!hasNormalSummoned && (phase === "main1" || phase === "main2")) {
      lines.push("• SUMMON_MONSTER - Normal summon a monster from your hand (use cardId)");
    }

    if (phase === "main1" || phase === "main2") {
      lines.push("• SET_CARD - Set a monster, spell, or trap face-down (use cardId)");
      lines.push("• ACTIVATE_SPELL - Activate a spell card (use cardId)");
      lines.push("• FLIP_SUMMON - Flip summon a face-down defense monster (use cardId)");
      lines.push(
        "• CHANGE_POSITION - Change a monster from ATK to DEF or vice versa (use cardId)"
      );
    }

    if (phase === "battle") {
      const attackers = (gameState.myBoard ?? []).filter(
        (m: BoardCard) => m.position === 1 && !m.hasAttacked
      );
      if (attackers.length > 0) {
        lines.push(
          `• ATTACK - Attack with your monsters (${attackers.length} can attack, use attackerCardId)`
        );
      }
    }

    lines.push("• END_TURN - End your turn and pass to opponent");

    return lines.join("\n");
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

      const validActions: OrchestratorAction[] = [
        "SUMMON_MONSTER",
        "SET_CARD",
        "ACTIVATE_SPELL",
        "ACTIVATE_TRAP",
        "ATTACK",
        "CHANGE_POSITION",
        "FLIP_SUMMON",
        "END_TURN",
        "CHAIN_RESPONSE",
        "PASS_CHAIN",
      ];

      const action = parsed.action?.toUpperCase() as OrchestratorAction;
      if (!validActions.includes(action)) {
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

    if (monsters.length === 0) {
      logger.info("No monsters in hand to summon");
      return false;
    }

    // LLM may provide cardId (new) or handIndex (legacy)
    const requestedCardId = decision.parameters?.cardId as string | undefined;
    const handIndex = decision.parameters?.handIndex as number | undefined;
    let selectedCard: CardInHand | undefined;

    if (requestedCardId) {
      selectedCard = monsters.find((c: CardInHand) => c._id === requestedCardId);
    }
    if (!selectedCard && handIndex !== undefined) {
      selectedCard = hand.find(
        (c: CardInHand) =>
          c.handIndex === handIndex && (c.cardType === "creature" || c.type === "creature")
      );
    }
    if (!selectedCard) {
      selectedCard = monsters[0];
    }

    if (!selectedCard?._id) {
      logger.error("No valid monster to summon");
      return false;
    }

    const position = (decision.parameters?.position as "attack" | "defense") ?? "attack";

    try {
      await this.client?.summon({
        gameId,
        cardId: selectedCard._id,
        position,
      });

      logger.info({ cardName: selectedCard?.name, position, cardId: selectedCard._id }, "Summoned monster");
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

    const requestedCardId = decision.parameters?.cardId as string | undefined;
    let card: CardInHand | undefined;
    if (requestedCardId) {
      card = hand.find((c: CardInHand) => c._id === requestedCardId);
    }
    if (!card) {
      const handIdx = decision.parameters?.handIndex as number | undefined;
      if (handIdx !== undefined) {
        card = hand.find((c: CardInHand) => c.handIndex === handIdx);
      }
    }
    if (!card) {
      const spellTraps = hand.filter((c: CardInHand) => c.cardType !== "creature");
      card = spellTraps[0] ?? hand[0];
    }
    if (!card?._id) {
      logger.error("No valid card to set");
      return false;
    }

    try {
      await this.client?.setCard({
        gameId,
        cardId: card._id,
      });

      logger.info({ cardName: card?.name }, "Set card");
      return true;
    } catch (error) {
      logger.error({ error }, "Failed to set card");
      return false;
    }
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
    const spells = hand.filter((c: CardInHand) => c.cardType === "spell");

    const requestedCardId = decision.parameters?.cardId as string | undefined;

    if (requestedCardId) {
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
    const myMonsters = context.gameState.myBoard ?? [];
    const oppMonsters = context.gameState.opponentBoard ?? [];

    const attackers = myMonsters.filter(
      (m: BoardCard) => m.position === 1 && !m.hasAttacked
    );

    if (attackers.length === 0) return false;

    // Use attackerCardId from decision or pick first available attacker
    let attackerCardId = decision.parameters?.attackerCardId as string | undefined;
    if (!attackerCardId) {
      attackerCardId = (decision.parameters?.cardId as string) ?? attackers[0]?._id;
    }

    const attacker = myMonsters.find((m: BoardCard) => m._id === attackerCardId);

    if (!attackerCardId) {
      logger.error("No valid attacker available");
      return false;
    }

    // Choose target - direct attack if no opponents, otherwise from decision or attack weakest
    let targetCardId = decision.parameters?.targetCardId as string | undefined;

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
      }
    }

    try {
      await this.client?.attack({
        gameId,
        attackerCardId: attackerCardId!,
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

      // Ask LLM if we should chain
      const prompt = `An opponent's effect is resolving. You can chain with:
${chainableSpells.map((c: CardInHand) => `- ${c.name} (Spell) [cardId: ${c._id}]`).join("\n")}
${setTraps.map((c) => `- ${c.name} (Trap) [cardId: ${c.cardId}]`).join("\n")}

Should you chain? Consider the strategic value.
Respond with JSON: {"chain": true/false, "cardId": "card_id"}`;

      const response = await this.runtime.useModel(ModelType.TEXT_SMALL, {
        prompt,
        temperature: 0.3,
        maxTokens: 100,
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
