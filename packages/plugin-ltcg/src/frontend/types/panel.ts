/**
 * Type definitions for LTCG Panel System
 *
 * These types define the data structures used by the panel REST API
 * and React components for displaying agent state and metrics.
 */

export interface AgentStatus {
  agentId: string;
  isRunning: boolean;
  pollingActive: boolean;
  currentGameId: string | null;
  autoMatchmaking: boolean;
  uptime: number;
  lastActivity: number;
}

export interface MatchmakingStatus {
  enabled: boolean;
  status: "idle" | "scanning" | "joining" | "in_game";
  lobbiesScanned: number;
  recentJoins: MatchmakingEvent[];
  stats: {
    lobbiesJoined: number;
    gamesStarted: number;
    lastScanAt: number;
  };
  nextScanIn: number;
}

export interface MatchmakingEvent {
  timestamp: number;
  lobbyId: string;
  hostUsername: string;
  gameId?: string;
}

export interface GameSnapshot {
  gameId: string;
  phase: string;
  turnNumber: number;
  isMyTurn: boolean;
  lifePoints: {
    agent: number;
    opponent: number;
  };
  board: {
    agentMonsters: number;
    agentSpellTraps: number;
    opponentMonsters: number;
    opponentSpellTraps: number;
  };
  hand: {
    count: number;
    cards: Array<{
      type: "monster" | "spell" | "trap";
      name: string;
    }>;
  };
  status: "waiting" | "active" | "completed";
  winner?: "agent" | "opponent";
}

export interface Decision {
  id: string;
  timestamp: number;
  turnNumber: number;
  phase: string;
  action: string;
  reasoning: string;
  parameters: Record<string, unknown>;
  result: "success" | "failed" | "pending";
  executionTimeMs: number;
  confidence?: number;
}

export interface AgentMetrics {
  lifetime: {
    gamesPlayed: number;
    wins: number;
    losses: number;
    winRate: number;
  };
  performance: {
    avgTurnTimeMs: number;
    avgActionsPerTurn: number;
    apiCallCount: number;
    apiErrorRate: number;
  };
  recentGames: Array<{
    gameId: string;
    timestamp: number;
    result: "win" | "loss";
    duration: number;
    turns: number;
  }>;
  storyMode?: {
    battlesCompleted: number;
    currentBattle: string;
    progress: number;
  };
}
