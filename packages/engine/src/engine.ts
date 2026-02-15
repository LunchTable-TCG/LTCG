import type { CardDefinition } from "./types/cards.js";
import type { Command } from "./types/commands.js";
import type { EngineEvent } from "./types/events.js";
import type { GameState, PlayerView, Seat, BoardCard, SpellTrapCard } from "./types/state.js";
import type { EngineConfig } from "./types/config.js";
import { DEFAULT_CONFIG } from "./types/config.js";
import { nextPhase, opponentSeat } from "./rules/phases.js";
import { decideSummon, decideSetMonster, decideFlipSummon, evolveSummon } from "./rules/summoning.js";
import { decideSetSpellTrap, decideActivateSpell, decideActivateTrap, evolveSpellTrap } from "./rules/spellsTraps.js";
import { decideDeclareAttack, evolveCombat } from "./rules/combat.js";
import { evolveVice } from "./rules/vice.js";
import { drawCard } from "./rules/stateBasedActions.js";

export interface EngineOptions {
  config?: Partial<EngineConfig>;
  cardLookup: Record<string, CardDefinition>;
  hostId: string;
  awayId: string;
  hostDeck: string[];
  awayDeck: string[];
  firstPlayer?: Seat;
}

export interface Engine {
  getState(): GameState;
  mask(seat: Seat): PlayerView;
  legalMoves(seat: Seat): Command[];
  decide(command: Command, seat: Seat): EngineEvent[];
  evolve(events: EngineEvent[]): void;
}

export function createEngine(options: EngineOptions): Engine {
  const config: EngineConfig = { ...DEFAULT_CONFIG, ...options.config };
  let state = createInitialState(
    options.cardLookup,
    config,
    options.hostId,
    options.awayId,
    options.hostDeck,
    options.awayDeck,
    options.firstPlayer ?? "host"
  );

  return {
    getState: () => state,
    mask: (seat: Seat) => mask(state, seat),
    legalMoves: (seat: Seat) => legalMoves(state, seat),
    decide: (command: Command, seat: Seat) => decide(state, command, seat),
    evolve: (events: EngineEvent[]) => {
      state = evolve(state, events);
    },
  };
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createInitialState(
  cardLookup: Record<string, CardDefinition>,
  config: EngineConfig,
  hostId: string,
  awayId: string,
  hostDeckIds: string[],
  awayDeckIds: string[],
  firstPlayer: Seat
): GameState {
  const hostDeck = shuffle(hostDeckIds);
  const awayDeck = shuffle(awayDeckIds);

  const hostHand = hostDeck.slice(0, config.startingHandSize);
  const hostDeckRemaining = hostDeck.slice(config.startingHandSize);

  const awayHand = awayDeck.slice(0, config.startingHandSize);
  const awayDeckRemaining = awayDeck.slice(config.startingHandSize);

  return {
    config,
    cardLookup,
    hostId,
    awayId,
    hostHand,
    hostBoard: [],
    hostSpellTrapZone: [],
    hostFieldSpell: null,
    hostDeck: hostDeckRemaining,
    hostGraveyard: [],
    hostBanished: [],
    awayHand,
    awayBoard: [],
    awaySpellTrapZone: [],
    awayFieldSpell: null,
    awayDeck: awayDeckRemaining,
    awayGraveyard: [],
    awayBanished: [],
    hostLifePoints: config.startingLP,
    awayLifePoints: config.startingLP,
    hostBreakdownsCaused: 0,
    awayBreakdownsCaused: 0,
    currentTurnPlayer: firstPlayer,
    turnNumber: 1,
    currentPhase: "draw",
    hostNormalSummonedThisTurn: false,
    awayNormalSummonedThisTurn: false,
    currentChain: [],
    currentPriorityPlayer: null,
    pendingAction: null,
    temporaryModifiers: [],
    lingeringEffects: [],
    optUsedThisTurn: [],
    hoptUsedEffects: [],
    winner: null,
    winReason: null,
    gameOver: false,
  };
}

function maskBoard(board: BoardCard[]): BoardCard[] {
  return board.map((card) => ({
    ...card,
    definitionId: card.faceDown ? "hidden" : card.definitionId,
  }));
}

function maskSpellTrapZone(zone: SpellTrapCard[]): SpellTrapCard[] {
  return zone.map((card) => ({
    ...card,
    definitionId: card.faceDown ? "hidden" : card.definitionId,
  }));
}

export function mask(state: GameState, seat: Seat): PlayerView {
  const isHost = seat === "host";

  const myHand = isHost ? state.hostHand : state.awayHand;
  const myBoard = isHost ? state.hostBoard : state.awayBoard;
  const mySpellTrapZone = isHost ? state.hostSpellTrapZone : state.awaySpellTrapZone;
  const myFieldSpell = isHost ? state.hostFieldSpell : state.awayFieldSpell;
  const myGraveyard = isHost ? state.hostGraveyard : state.awayGraveyard;
  const myBanished = isHost ? state.hostBanished : state.awayBanished;
  const myLifePoints = isHost ? state.hostLifePoints : state.awayLifePoints;
  const myDeckCount = isHost ? state.hostDeck.length : state.awayDeck.length;
  const myBreakdownsCaused = isHost ? state.hostBreakdownsCaused : state.awayBreakdownsCaused;

  const opponentHand = isHost ? state.awayHand : state.hostHand;
  const opponentBoard = isHost ? state.awayBoard : state.hostBoard;
  const opponentSpellTrapZone = isHost ? state.awaySpellTrapZone : state.hostSpellTrapZone;
  const opponentFieldSpell = isHost ? state.awayFieldSpell : state.hostFieldSpell;
  const opponentGraveyard = isHost ? state.awayGraveyard : state.hostGraveyard;
  const opponentBanished = isHost ? state.awayBanished : state.hostBanished;
  const opponentLifePoints = isHost ? state.awayLifePoints : state.hostLifePoints;
  const opponentDeckCount = isHost ? state.awayDeck.length : state.hostDeck.length;
  const opponentBreakdownsCaused = isHost ? state.awayBreakdownsCaused : state.hostBreakdownsCaused;

  return {
    hand: myHand,
    board: myBoard,
    spellTrapZone: mySpellTrapZone,
    fieldSpell: myFieldSpell,
    graveyard: myGraveyard,
    banished: myBanished,
    lifePoints: myLifePoints,
    deckCount: myDeckCount,
    breakdownsCaused: myBreakdownsCaused,
    opponentHandCount: opponentHand.length,
    opponentBoard: maskBoard(opponentBoard),
    opponentSpellTrapZone: maskSpellTrapZone(opponentSpellTrapZone),
    opponentFieldSpell: opponentFieldSpell
      ? {
          ...opponentFieldSpell,
          definitionId: opponentFieldSpell.faceDown ? "hidden" : opponentFieldSpell.definitionId,
        }
      : null,
    opponentGraveyard,
    opponentBanished,
    opponentLifePoints,
    opponentDeckCount,
    opponentBreakdownsCaused,
    currentTurnPlayer: state.currentTurnPlayer,
    turnNumber: state.turnNumber,
    currentPhase: state.currentPhase,
    currentChain: state.currentChain,
    mySeat: seat,
    gameOver: state.gameOver,
    winner: state.winner,
    winReason: state.winReason,
  };
}

export function legalMoves(state: GameState, seat: Seat): Command[] {
  if (state.gameOver) return [];
  if (state.currentTurnPlayer !== seat) return [];

  const moves: Command[] = [];

  // Always allow ADVANCE_PHASE and END_TURN and SURRENDER
  moves.push({ type: "ADVANCE_PHASE" });
  moves.push({ type: "END_TURN" });
  moves.push({ type: "SURRENDER" });

  // TODO: Add phase-specific moves (summon, set, activate, attack, etc.)

  return moves;
}

export function decide(state: GameState, command: Command, seat: Seat): EngineEvent[] {
  if (state.gameOver) return [];

  const events: EngineEvent[] = [];

  switch (command.type) {
    case "ADVANCE_PHASE": {
      const from = state.currentPhase;
      const to = nextPhase(from);
      events.push({ type: "PHASE_CHANGED", from, to });

      // When transitioning from draw phase, current player draws a card
      if (from === "draw" && to === "standby") {
        events.push(...drawCard(state, state.currentTurnPlayer));
      }
      break;
    }

    case "END_TURN": {
      events.push({ type: "TURN_ENDED", seat });
      const nextSeat = opponentSeat(seat);
      events.push({ type: "TURN_STARTED", seat: nextSeat, turnNumber: state.turnNumber + 1 });
      break;
    }

    case "SURRENDER": {
      const winner = opponentSeat(seat);
      events.push({ type: "GAME_ENDED", winner, reason: "surrender" });
      break;
    }

    case "SUMMON": {
      events.push(...decideSummon(state, seat, command));
      break;
    }

    case "SET_MONSTER": {
      events.push(...decideSetMonster(state, seat, command));
      break;
    }

    case "FLIP_SUMMON": {
      events.push(...decideFlipSummon(state, seat, command));
      break;
    }

    case "SET_SPELL_TRAP": {
      events.push(...decideSetSpellTrap(state, seat, command));
      break;
    }

    case "ACTIVATE_SPELL": {
      events.push(...decideActivateSpell(state, seat, command));
      break;
    }

    case "ACTIVATE_TRAP": {
      events.push(...decideActivateTrap(state, seat, command));
      break;
    }

    case "DECLARE_ATTACK": {
      events.push(...decideDeclareAttack(state, seat, command));
      break;
    }

    // TODO: Handle other commands
    default:
      break;
  }

  return events;
}

export function evolve(state: GameState, events: EngineEvent[]): GameState {
  let newState = { ...state };

  for (const event of events) {
    switch (event.type) {
      case "PHASE_CHANGED":
        newState.currentPhase = event.to;
        break;

      case "TURN_STARTED":
        newState.currentTurnPlayer = event.seat;
        newState.turnNumber = event.turnNumber;
        newState.currentPhase = "draw";
        // Reset per-turn flags
        newState.hostNormalSummonedThisTurn = false;
        newState.awayNormalSummonedThisTurn = false;
        newState.optUsedThisTurn = [];
        // Reset combat flags for the new turn player's monsters
        if (event.seat === "host") {
          newState.hostBoard = newState.hostBoard.map((c) => ({
            ...c,
            canAttack: true,
            hasAttackedThisTurn: false,
          }));
        } else {
          newState.awayBoard = newState.awayBoard.map((c) => ({
            ...c,
            canAttack: true,
            hasAttackedThisTurn: false,
          }));
        }
        break;

      case "TURN_ENDED":
        // Minimal - the TURN_STARTED event handles the actual state change
        break;

      case "GAME_ENDED":
        newState.gameOver = true;
        newState.winner = event.winner;
        newState.winReason = event.reason;
        break;

      case "MONSTER_SUMMONED":
      case "MONSTER_SET":
      case "FLIP_SUMMONED":
        newState = evolveSummon(newState, event);
        break;

      case "SPELL_TRAP_SET":
      case "SPELL_ACTIVATED":
      case "TRAP_ACTIVATED":
        newState = evolveSpellTrap(newState, event);
        break;

      case "CARD_SENT_TO_GRAVEYARD":
        // Both summoning and spellsTraps can handle this event
        newState = evolveSummon(newState, event);
        newState = evolveSpellTrap(newState, event);
        break;

      case "ATTACK_DECLARED":
      case "DAMAGE_DEALT":
      case "CARD_DESTROYED":
      case "BATTLE_RESOLVED":
        newState = evolveCombat(newState, event);
        break;

      case "VICE_COUNTER_ADDED":
      case "VICE_COUNTER_REMOVED":
      case "BREAKDOWN_TRIGGERED":
        newState = evolveVice(newState, event);
        break;

      case "CARD_DRAWN": {
        const { seat, cardId } = event;
        if (seat === "host") {
          newState.hostDeck = newState.hostDeck.slice(1); // Remove top card from deck
          newState.hostHand = [...newState.hostHand, cardId]; // Add to hand
        } else {
          newState.awayDeck = newState.awayDeck.slice(1);
          newState.awayHand = [...newState.awayHand, cardId];
        }
        break;
      }

      case "DECK_OUT": {
        const { seat } = event;
        const winner = opponentSeat(seat);
        newState.gameOver = true;
        newState.winner = winner;
        newState.winReason = "deck_out";
        break;
      }

      // TODO: Handle other events
      default:
        break;
    }
  }

  // State-based check: LP reaching 0 ends the game
  if (!newState.gameOver) {
    if (newState.hostLifePoints <= 0) {
      newState.gameOver = true;
      newState.winner = "away";
      newState.winReason = "lp_zero";
    } else if (newState.awayLifePoints <= 0) {
      newState.gameOver = true;
      newState.winner = "host";
      newState.winReason = "lp_zero";
    }
  }

  return newState;
}
