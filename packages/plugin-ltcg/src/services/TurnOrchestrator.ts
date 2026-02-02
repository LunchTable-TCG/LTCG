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

import {
  Service,
  type IAgentRuntime,
  logger,
  ModelType,
} from '@elizaos/core';
import { LTCGApiClient } from '../client/LTCGApiClient';
import type {
  GameStateResponse,
  AvailableActionsResponse,
  CardInHand,
  MonsterCard,
  SpellTrapCard,
} from '../types/api';
import type { Decision } from '../frontend/types/panel';
import { SERVICE_TYPES } from './types';

// Action types the orchestrator can choose
export type OrchestratorAction =
  | 'SUMMON_MONSTER'
  | 'SET_CARD'
  | 'ACTIVATE_SPELL'
  | 'ACTIVATE_TRAP'
  | 'ATTACK'
  | 'CHANGE_POSITION'
  | 'FLIP_SUMMON'
  | 'END_TURN'
  | 'CHAIN_RESPONSE'
  | 'PASS_CHAIN';

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
  phase: string;
  turnNumber: number;
  lifePoints: { agent: number; opponent: number };
}

export class TurnOrchestrator extends Service {
  static serviceType = SERVICE_TYPES.ORCHESTRATOR;

  private runtime: IAgentRuntime;
  private client: LTCGApiClient | null = null;
  private isExecutingTurn = false;
  private currentGameId: string | null = null;
  private maxActionsPerTurn = 20; // Safety limit

  // Decision history tracking for panels
  private decisionHistory: Map<string, Decision[]> = new Map();
  private readonly maxHistoryPerGame = 100;

  capabilityDescription = 'Orchestrates autonomous turn-by-turn gameplay decisions';

  constructor(runtime: IAgentRuntime) {
    super(runtime);
    this.runtime = runtime;
  }

  static async start(runtime: IAgentRuntime): Promise<TurnOrchestrator> {
    logger.info('*** Starting LTCG Turn Orchestrator ***');

    const service = new TurnOrchestrator(runtime);

    // Initialize API client
    const apiKey = runtime.getSetting('LTCG_API_KEY') as string;
    const apiUrl = runtime.getSetting('LTCG_API_URL') as string;

    if (apiKey && apiUrl) {
      service.client = new LTCGApiClient({
        apiKey,
        baseUrl: apiUrl,
        debug: runtime.getSetting('LTCG_DEBUG_MODE') === 'true',
      });
      logger.info('Turn orchestrator initialized with API client');
    } else {
      logger.warn('API credentials not configured - orchestrator cannot execute actions');
    }

    return service;
  }

  static async stop(runtime: IAgentRuntime): Promise<void> {
    logger.info('*** Stopping LTCG Turn Orchestrator ***');
    const service = runtime.getService(TurnOrchestrator.serviceType) as TurnOrchestrator;
    if (service) {
      service.isExecutingTurn = false;
    }
  }

  async stop(): Promise<void> {
    this.isExecutingTurn = false;
    this.client = null;
  }

  // ============================================================================
  // Public API - Called by polling service or webhooks
  // ============================================================================

  /**
   * Handle turn started event - begin autonomous turn execution
   */
  async onTurnStarted(gameId: string, phase: string, turnNumber: number): Promise<void> {
    if (this.isExecutingTurn) {
      logger.debug('Already executing a turn, skipping');
      return;
    }

    if (!this.client) {
      logger.error('Cannot execute turn - API client not initialized');
      return;
    }

    this.currentGameId = gameId;
    this.isExecutingTurn = true;

    logger.info({ gameId, phase, turnNumber }, '🎮 Starting autonomous turn execution');

    try {
      await this.executeTurn(gameId);
    } catch (error) {
      logger.error({ error, gameId }, 'Error during autonomous turn execution');
    } finally {
      this.isExecutingTurn = false;
    }
  }

  /**
   * Handle chain waiting event - decide whether to chain or pass
   */
  async onChainWaiting(gameId: string, timeoutMs: number): Promise<void> {
    if (!this.client) {
      logger.error('Cannot respond to chain - API client not initialized');
      return;
    }

    logger.info({ gameId, timeoutMs }, '⛓️ Chain waiting - deciding response');

    try {
      await this.executeChainResponse(gameId, timeoutMs);
    } catch (error) {
      logger.error({ error, gameId }, 'Error during chain response');
    }
  }

  /**
   * Get decision history for a game (for panel display)
   */
  public getDecisionHistory(gameId: string, limit: number = 20): Decision[] {
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
        logger.error('Failed to gather turn context');
        break;
      }

      // Check if it's still our turn
      if (context.gameState.currentTurn !== 'host') {
        logger.info('No longer our turn, ending turn execution');
        break;
      }

      // Check if game ended
      if (context.gameState.status === 'completed') {
        logger.info('Game completed during turn');
        break;
      }

      // Ask LLM what action to take
      const decision = await this.decideAction(context);

      if (!decision) {
        logger.error('LLM failed to decide action, ending turn');
        await this.executeEndTurn(gameId);
        break;
      }

      logger.info(
        { action: decision.action, reasoning: decision.reasoning },
        `🤖 LLM decided: ${decision.action}`
      );

      // Execute the chosen action
      if (decision.action === 'END_TURN') {
        await this.executeEndTurn(gameId);
        break;
      }

      const success = await this.executeAction(gameId, decision, context);

      if (!success) {
        logger.warn({ action: decision.action }, 'Action failed, will try again');
        // Don't break - let the LLM try a different action
      }

      // Small delay to avoid hammering the API
      await this.sleep(500);
    }

    if (actionCount >= this.maxActionsPerTurn) {
      logger.warn('Hit max actions per turn limit, forcing end turn');
      await this.executeEndTurn(gameId);
    }

    logger.info({ gameId, actionCount }, '✅ Turn execution complete');
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
      // Fetch game state and available actions in parallel
      const [gameState, availableActions] = await Promise.all([
        this.client.getGameState(gameId),
        this.client.getAvailableActions(gameId),
      ]);

      // Build context strings
      const hand = this.formatHand(gameState);
      const boardAnalysis = this.formatBoardAnalysis(gameState);
      const strategy = this.analyzeStrategy(gameState);

      return {
        gameState,
        availableActions,
        hand,
        boardAnalysis,
        strategy,
        phase: gameState.phase,
        turnNumber: gameState.turnNumber,
        lifePoints: {
          agent: gameState.hostPlayer?.lifePoints ?? 8000,
          opponent: gameState.opponentPlayer?.lifePoints ?? 8000,
        },
      };
    } catch (error) {
      logger.error({ error, gameId }, 'Failed to gather turn context');
      return null;
    }
  }

  /**
   * Format hand information for LLM
   */
  private formatHand(state: GameStateResponse): string {
    const hand = state.hand ?? [];
    if (hand.length === 0) return 'Your hand is empty.';

    const cards = hand.map((card: CardInHand, idx: number) => {
      const cardType = card.type;
      if (cardType === 'creature') {
        return `${idx}. ${card.name} (Monster, ATK:${card.atk ?? '?'}/DEF:${card.def ?? '?'}, Level:${card.level ?? '?'}) [handIndex: ${card.handIndex}]`;
      } else if (cardType === 'spell') {
        return `${idx}. ${card.name} (Spell) [handIndex: ${card.handIndex}]`;
      } else if (cardType === 'trap') {
        return `${idx}. ${card.name} (Trap) [handIndex: ${card.handIndex}]`;
      }
      return `${idx}. ${card.name} (${cardType}) [handIndex: ${card.handIndex}]`;
    });

    return `Your hand (${hand.length} cards):\n${cards.join('\n')}`;
  }

  /**
   * Format board analysis for LLM
   */
  private formatBoardAnalysis(state: GameStateResponse): string {
    const lines: string[] = [];

    // Agent's field
    const agentMonsters = state.hostPlayer?.monsterZone ?? [];
    const agentSpellTraps = state.hostPlayer?.spellTrapZone ?? [];

    lines.push('=== YOUR FIELD ===');
    if (agentMonsters.length === 0) {
      lines.push('Monster Zones: Empty');
    } else {
      lines.push('Monsters:');
      agentMonsters.forEach((m: MonsterCard, i: number) => {
        const pos = m.position === 'attack' ? 'ATK' : m.position === 'defense' ? 'DEF' : 'Face-down DEF';
        const faceDown = m.position === 'facedown' ? ' (Face-down)' : '';
        lines.push(`  ${i}. ${m.name ?? 'Unknown'} - ${pos} ${m.atk ?? '?'}/${m.def ?? '?'}${faceDown} [boardIndex: ${m.boardIndex}]`);
      });
    }

    if (agentSpellTraps.length > 0) {
      lines.push('Spell/Trap:');
      agentSpellTraps.forEach((st: SpellTrapCard, i: number) => {
        const faceStatus = st.faceUp ? '(Active)' : '(Set)';
        lines.push(`  ${i}. ${st.name ?? 'Unknown'} ${faceStatus} [boardIndex: ${st.boardIndex}]`);
      });
    }

    // Opponent's field
    const oppMonsters = state.opponentPlayer?.monsterZone ?? [];
    const oppSpellTraps = state.opponentPlayer?.spellTrapZone ?? [];

    lines.push('\n=== OPPONENT FIELD ===');
    if (oppMonsters.length === 0) {
      lines.push('Monster Zones: Empty');
    } else {
      lines.push('Monsters:');
      oppMonsters.forEach((m: MonsterCard, i: number) => {
        if (m.position === 'facedown' || !m.faceUp) {
          lines.push(`  ${i}. Face-down Defense Position [boardIndex: ${m.boardIndex}]`);
        } else {
          const pos = m.position === 'attack' ? 'ATK' : 'DEF';
          lines.push(`  ${i}. ${m.name ?? 'Unknown'} - ${pos} ${m.atk ?? '?'}/${m.def ?? '?'} [boardIndex: ${m.boardIndex}]`);
        }
      });
    }

    if (oppSpellTraps.length > 0) {
      lines.push(`Spell/Trap: ${oppSpellTraps.length} card(s) set`);
    }

    return lines.join('\n');
  }

  /**
   * Analyze strategic situation
   */
  private analyzeStrategy(state: GameStateResponse): string {
    const agentLP = state.hostPlayer?.lifePoints ?? 8000;
    const oppLP = state.opponentPlayer?.lifePoints ?? 8000;
    const agentMonsters = state.hostPlayer?.monsterZone ?? [];
    const oppMonsters = state.opponentPlayer?.monsterZone ?? [];

    const lines: string[] = [];

    // Life point advantage
    if (agentLP > oppLP) {
      lines.push(`✓ Life point advantage: ${agentLP} vs ${oppLP}`);
    } else if (agentLP < oppLP) {
      lines.push(`⚠ Life point disadvantage: ${agentLP} vs ${oppLP}`);
    } else {
      lines.push(`○ Life points even: ${agentLP}`);
    }

    // Board presence
    const agentAttackMonsters = agentMonsters.filter(
      (m: MonsterCard) => m.position === 'attack' && m.faceUp !== false
    );
    const totalAttack = agentAttackMonsters.reduce((sum: number, m: MonsterCard) => sum + (m.atk ?? 0), 0);

    if (totalAttack >= oppLP && oppMonsters.length === 0) {
      lines.push('🎯 LETHAL: Can attack directly for game!');
    } else if (totalAttack >= oppLP) {
      lines.push('🎯 Potential lethal if opponent monsters cleared');
    }

    // Threat assessment
    const oppAttackMonsters = oppMonsters.filter(
      (m: MonsterCard) => m.position === 'attack' && m.faceUp !== false
    );
    if (oppAttackMonsters.length > 0) {
      const maxOppAtk = Math.max(...oppAttackMonsters.map((m: MonsterCard) => m.atk ?? 0));
      lines.push(`⚔️ Opponent's strongest attacker: ${maxOppAtk} ATK`);
    }

    // Hand advantage
    const handSize = state.hand?.length ?? 0;
    const oppDeckCount = state.opponentPlayer?.deckCount ?? 0;
    lines.push(`📝 Hand: ${handSize} cards, Opponent deck: ${oppDeckCount} cards`);

    return lines.join('\n');
  }

  // ============================================================================
  // LLM Decision Making
  // ============================================================================

  /**
   * Ask LLM to decide which action to take
   */
  private async decideAction(context: TurnContext): Promise<ActionDecision | null> {
    const prompt = this.buildDecisionPrompt(context);

    try {
      const response = await this.runtime.useModel(ModelType.TEXT_LARGE, {
        prompt,
        temperature: 0.7,
        maxTokens: 500,
      });

      return this.parseActionDecision(response);
    } catch (error) {
      logger.error({ error }, 'Failed to get LLM decision');
      return null;
    }
  }

  /**
   * Build comprehensive decision prompt
   */
  private buildDecisionPrompt(context: TurnContext): string {
    const { phase, turnNumber, lifePoints, hand, boardAnalysis, strategy, gameState } = context;

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

## STRATEGIC ANALYSIS
${strategy}

## AVAILABLE ACTIONS
${availableActionsText}

## YOUR TASK
Choose the BEST action to take right now. Consider:
1. Can you win this turn? If yes, go for lethal damage
2. Can you establish board presence? Summon strong monsters
3. Should you set traps/spells for protection?
4. Is it better to end your turn and wait?

Respond in this exact JSON format:
{
  "action": "ACTION_NAME",
  "reasoning": "Brief explanation of why this is the best play",
  "parameters": { "handIndex": 0, "boardIndex": 0 }
}

Valid actions: SUMMON_MONSTER, SET_CARD, ACTIVATE_SPELL, ACTIVATE_TRAP, ATTACK, CHANGE_POSITION, FLIP_SUMMON, END_TURN

IMPORTANT: Use the handIndex or boardIndex values shown in brackets (e.g., [handIndex: 0]) for your parameters.

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

    if (!hasNormalSummoned && (phase === 'main1' || phase === 'main2')) {
      lines.push('• SUMMON_MONSTER - Normal summon a monster from your hand (use handIndex)');
    }

    if (phase === 'main1' || phase === 'main2') {
      lines.push('• SET_CARD - Set a monster, spell, or trap face-down (use handIndex)');
      lines.push('• ACTIVATE_SPELL - Activate a spell card (use handIndex or boardIndex)');
      lines.push('• FLIP_SUMMON - Flip summon a face-down defense monster (use boardIndex)');
      lines.push('• CHANGE_POSITION - Change a monster from ATK to DEF or vice versa (use boardIndex)');
    }

    if (phase === 'battle') {
      const attackers = gameState.hostPlayer?.monsterZone?.filter(
        (m: MonsterCard) => m.position === 'attack' && m.canAttack
      ) ?? [];
      if (attackers.length > 0) {
        lines.push(`• ATTACK - Attack with your monsters (${attackers.length} can attack, use attackerBoardIndex)`);
      }
    }

    lines.push('• END_TURN - End your turn and pass to opponent');

    return lines.join('\n');
  }

  /**
   * Parse LLM response into action decision
   */
  private parseActionDecision(response: string): ActionDecision | null {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.warn('No JSON found in LLM response');
        return { action: 'END_TURN', reasoning: 'Failed to parse response' };
      }

      const parsed = JSON.parse(jsonMatch[0]);

      const validActions: OrchestratorAction[] = [
        'SUMMON_MONSTER',
        'SET_CARD',
        'ACTIVATE_SPELL',
        'ACTIVATE_TRAP',
        'ATTACK',
        'CHANGE_POSITION',
        'FLIP_SUMMON',
        'END_TURN',
        'CHAIN_RESPONSE',
        'PASS_CHAIN',
      ];

      const action = parsed.action?.toUpperCase() as OrchestratorAction;
      if (!validActions.includes(action)) {
        logger.warn({ action }, 'Invalid action from LLM');
        return { action: 'END_TURN', reasoning: 'Invalid action chosen' };
      }

      return {
        action,
        reasoning: parsed.reasoning ?? 'No reasoning provided',
        parameters: parsed.parameters,
      };
    } catch (error) {
      logger.error({ error, response: response.substring(0, 200) }, 'Failed to parse action decision');
      return { action: 'END_TURN', reasoning: 'Failed to parse response' };
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
        case 'SUMMON_MONSTER':
          success = await this.executeSummon(gameId, decision, context);
          break;

        case 'SET_CARD':
          success = await this.executeSetCard(gameId, decision, context);
          break;

        case 'ACTIVATE_SPELL':
          success = await this.executeActivateSpell(gameId, decision, context);
          break;

        case 'ATTACK':
          success = await this.executeAttack(gameId, decision, context);
          break;

        case 'CHANGE_POSITION':
          success = await this.executeChangePosition(gameId, decision, context);
          break;

        case 'FLIP_SUMMON':
          success = await this.executeFlipSummon(gameId, decision, context);
          break;

        case 'END_TURN':
          success = await this.executeEndTurn(gameId);
          break;

        default:
          logger.warn({ action: decision.action }, 'Unhandled action type');
          success = false;
      }

      return success;
    } catch (error) {
      logger.error({ error, action: decision.action }, 'Action execution failed');
      return false;
    } finally {
      // Record decision for panel display
      const endTime = Date.now();
      this.recordDecision(gameId, decision, context, success, startTime, endTime);
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
    const result = success ? 'success' : 'failed';

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

    const history = this.decisionHistory.get(gameId)!;
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
      logger.warn({ error }, 'Failed to persist decision to Convex');
    });

    logger.debug(
      { action: decision.action, success, executionTime: executionTimeMs },
      'Recorded decision'
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
      logger.debug({ error }, 'Decision persistence failed (non-critical)');
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
    const monsters = hand.filter((c: CardInHand) => c.type === 'creature');

    if (monsters.length === 0) {
      logger.info('No monsters in hand to summon');
      return false;
    }

    // Use handIndex from decision parameters, or fall back to first monster
    let handIndex = decision.parameters?.handIndex as number | undefined;
    if (handIndex === undefined) {
      handIndex = monsters[0].handIndex ?? 0;
    }

    const position = (decision.parameters?.position as 'attack' | 'defense') ?? 'attack';

    try {
      await this.client!.summon({
        gameId,
        handIndex: handIndex ?? 0,
        position,
      });

      const card = hand.find((c: CardInHand) => c.handIndex === handIndex);
      logger.info({ cardName: card?.name, position }, 'Summoned monster');
      return true;
    } catch (error) {
      logger.error({ error }, 'Failed to execute summon');
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

    // Use handIndex from decision parameters, or fall back to first settable card
    let handIndex = decision.parameters?.handIndex as number | undefined;
    if (handIndex === undefined) {
      // Prefer setting spells/traps over monsters
      const spellTraps = hand.filter((c: CardInHand) => c.type !== 'creature');
      const toSet = spellTraps[0] ?? hand[0];
      handIndex = toSet.handIndex;
    }

    const card = hand.find((c: CardInHand) => c.handIndex === handIndex);
    const zone = card?.type === 'creature' ? 'monster' : 'spellTrap';

    try {
      await this.client!.setCard({
        gameId,
        handIndex: handIndex!,
        zone,
      });

      logger.info({ cardName: card?.name }, 'Set card');
      return true;
    } catch (error) {
      logger.error({ error }, 'Failed to set card');
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
    const spells = hand.filter((c: CardInHand) => c.type === 'spell');

    // Check if activating from hand or board
    const boardIndex = decision.parameters?.boardIndex as number | undefined;
    if (boardIndex !== undefined) {
      try {
        await this.client!.activateSpell({
          gameId,
          boardIndex,
        });
        logger.info({ boardIndex }, 'Activated spell from board');
        return true;
      } catch (error) {
        logger.error({ error }, 'Failed to activate spell from board');
        return false;
      }
    }

    if (spells.length === 0) return false;

    let handIndex = decision.parameters?.handIndex as number | undefined;
    if (handIndex === undefined) {
      handIndex = spells[0].handIndex;
    }

    try {
      await this.client!.activateSpell({
        gameId,
        handIndex,
      });

      const spell = hand.find((c: CardInHand) => c.handIndex === handIndex);
      logger.info({ cardName: spell?.name }, 'Activated spell');
      return true;
    } catch (error) {
      logger.error({ error }, 'Failed to activate spell');
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
    const myMonsters = context.gameState.hostPlayer?.monsterZone ?? [];
    const oppMonsters = context.gameState.opponentPlayer?.monsterZone ?? [];

    const attackers = myMonsters.filter((m: MonsterCard) => m.position === 'attack' && m.canAttack);

    if (attackers.length === 0) return false;

    // Use attackerBoardIndex from decision or pick first available attacker
    let attackerBoardIndex = decision.parameters?.attackerBoardIndex as number | undefined;
    if (attackerBoardIndex === undefined) {
      attackerBoardIndex = attackers[0].boardIndex;
    }

    const attacker = myMonsters.find((m: MonsterCard) => m.boardIndex === attackerBoardIndex);

    // Choose target - direct attack if no opponents, otherwise from decision or attack weakest
    let targetBoardIndex = decision.parameters?.targetBoardIndex as number | undefined;

    if (targetBoardIndex === undefined && oppMonsters.length > 0) {
      // Attack the weakest face-up opponent monster
      const faceUpOpp = oppMonsters.filter((m: MonsterCard) => m.faceUp !== false && m.position !== 'facedown');
      if (faceUpOpp.length > 0) {
        const weakest = faceUpOpp.reduce((min: MonsterCard, m: MonsterCard) =>
          (m.position === 'attack' ? (m.atk ?? 0) : (m.def ?? 0)) <
          (min.position === 'attack' ? (min.atk ?? 0) : (min.def ?? 0))
            ? m
            : min
        );
        targetBoardIndex = weakest.boardIndex;
      }
    }

    try {
      await this.client!.attack({
        gameId,
        attackerBoardIndex: attackerBoardIndex!,
        targetBoardIndex, // undefined = direct attack
      });

      logger.info(
        { attacker: attacker?.name, target: targetBoardIndex !== undefined ? 'monster' : 'direct' },
        'Executed attack'
      );
      return true;
    } catch (error) {
      logger.error({ error }, 'Failed to execute attack');
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
    const myMonsters = context.gameState.hostPlayer?.monsterZone ?? [];
    const changeable = myMonsters.filter((m: MonsterCard) => m.canChangePosition);

    if (changeable.length === 0) return false;

    let boardIndex = decision.parameters?.boardIndex as number | undefined;
    if (boardIndex === undefined) {
      boardIndex = changeable[0].boardIndex;
    }

    const monster = myMonsters.find((m: MonsterCard) => m.boardIndex === boardIndex);
    const newPosition = monster?.position === 'attack' ? 'defense' : 'attack';

    try {
      await this.client!.changePosition({
        gameId,
        boardIndex: boardIndex!,
        newPosition,
      });

      logger.info({ monster: monster?.name, newPosition }, 'Changed position');
      return true;
    } catch (error) {
      logger.error({ error }, 'Failed to change position');
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
    const myMonsters = context.gameState.hostPlayer?.monsterZone ?? [];
    const faceDown = myMonsters.filter((m: MonsterCard) => m.position === 'facedown');

    if (faceDown.length === 0) return false;

    let boardIndex = decision.parameters?.boardIndex as number | undefined;
    if (boardIndex === undefined) {
      boardIndex = faceDown[0].boardIndex;
    }

    const monster = myMonsters.find((m: MonsterCard) => m.boardIndex === boardIndex);

    try {
      await this.client!.flipSummon({
        gameId,
        boardIndex: boardIndex!,
      });

      logger.info({ monster: monster?.name }, 'Flip summoned');
      return true;
    } catch (error) {
      logger.error({ error }, 'Failed to flip summon');
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
      logger.info({ gameId }, 'Ended turn');
      return true;
    } catch (error) {
      logger.error({ error }, 'Failed to end turn');
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
      const chainableSpells = hand.filter(
        (c: CardInHand) => c.type === 'spell'
      );

      const setTraps = gameState.hostPlayer?.spellTrapZone?.filter(
        (c: SpellTrapCard) => !c.faceUp && c.type === 'trap'
      ) ?? [];

      const hasChainOption = chainableSpells.length > 0 || setTraps.length > 0;

      if (!hasChainOption) {
        // No chain options, pass
        await this.client.chainResponse({ gameId, respond: false });
        logger.info('Passed chain (no options)');
        return;
      }

      // Ask LLM if we should chain
      const prompt = `An opponent's effect is resolving. You can chain with:
${chainableSpells.map((c: CardInHand) => `- ${c.name} (Spell) [handIndex: ${c.handIndex}]`).join('\n')}
${setTraps.map((c: SpellTrapCard) => `- ${c.name} (Trap) [boardIndex: ${c.boardIndex}]`).join('\n')}

Should you chain? Consider the strategic value.
Respond with JSON: {"chain": true/false, "handIndex": number OR "boardIndex": number}`;

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
              respond: true,
              handIndex: parsed.handIndex,
              boardIndex: parsed.boardIndex,
            });
            logger.info('Activated chain');
            return;
          }
        }
      } catch {
        // Parse failed, pass
      }

      await this.client.chainResponse({ gameId, respond: false });
      logger.info('Passed chain');
    } catch (error) {
      logger.error({ error }, 'Chain response failed');
    }
  }

  // ============================================================================
  // Utility
  // ============================================================================

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
