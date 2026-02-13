import type {
  BoardCard,
  BackrowCard,
  GraveyardCard,
  HandCard,
  CardDefinition,
} from "./card.js";

export interface GameConfig {
  startingLP: number;
  maxHandSize: number;
  phases: string[];
  drawPerTurn: number;
  maxFieldSlots?: number;
  maxBackrowSlots?: number;
  turnTimeLimit?: number;
  metadata?: Record<string, unknown>;
}

export interface PlayerState {
  id: string;
  deckId: string;
  lifePoints: number;
  hand: HandCard[];
  field: BoardCard[];
  backrow: BackrowCard[];
  graveyard: GraveyardCard[];
  deck: CardDefinition[];
  normalSummonUsed?: boolean;
  metadata?: Record<string, unknown>;
}

export interface GameState {
  players: PlayerState[];
  currentPhase: string;
  currentPlayerIndex: number;
  turnNumber: number;
  status: GameStatus;
  winner?: string;
  config: GameConfig;
  metadata?: Record<string, unknown>;
}

export type GameStatus = "waiting" | "active" | "finished" | "abandoned";

export interface GameEvent {
  type: string;
  playerId?: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export interface QueueEntry {
  playerId: string;
  deckId: string;
  rating: number;
  joinedAt: number;
  mode: string;
  metadata?: Record<string, unknown>;
}

export interface MatchResult {
  matched: boolean;
  player1?: QueueEntry;
  player2?: QueueEntry;
  gameId?: string;
}
