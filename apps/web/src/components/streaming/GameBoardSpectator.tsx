"use client";

interface GameState {
  hostBoard?: any[];
  opponentBoard?: any[];
  hostLifePoints?: number;
  opponentLifePoints?: number;
  currentPhase?: string;
  turnNumber?: number;
  hostUsername?: string;
  opponentUsername?: string;
}

interface GameBoardSpectatorProps {
  gameState: GameState;
}

/**
 * Simplified game board view for streaming overlay
 * Shows key game information without full interactivity
 */
export function GameBoardSpectator({ gameState }: GameBoardSpectatorProps) {
  const {
    hostLifePoints = 8000,
    opponentLifePoints = 8000,
    currentPhase = "main1",
    turnNumber = 1,
    hostUsername = "Player 1",
    opponentUsername = "Player 2",
    hostBoard = [],
    opponentBoard = [],
  } = gameState;

  const phaseLabels: Record<string, string> = {
    draw: "Draw Phase",
    standby: "Standby Phase",
    main1: "Main Phase 1",
    battle: "Battle Phase",
    main2: "Main Phase 2",
    end: "End Phase",
  };

  return (
    <div className="game-spectator">
      {/* Turn indicator */}
      <div className="game-spectator__turn">
        <span className="game-spectator__turn-label">Turn {turnNumber}</span>
        <span className="game-spectator__phase">{phaseLabels[currentPhase] || currentPhase}</span>
      </div>

      {/* Opponent side */}
      <div className="game-spectator__player game-spectator__player--opponent">
        <div className="game-spectator__player-info">
          <span className="game-spectator__username">{opponentUsername}</span>
          <span className="game-spectator__lp">
            <span className="lp-icon">❤️</span>
            {opponentLifePoints.toLocaleString()}
          </span>
        </div>
        <div className="game-spectator__board">
          {opponentBoard.length > 0 ? (
            opponentBoard.map((card: any, idx: number) => (
              <div key={idx} className="game-spectator__card">
                {card.isFaceDown ? "?" : card.name?.slice(0, 10) || "Card"}
              </div>
            ))
          ) : (
            <div className="game-spectator__empty">No monsters</div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="game-spectator__divider">
        <span>VS</span>
      </div>

      {/* Host side */}
      <div className="game-spectator__player game-spectator__player--host">
        <div className="game-spectator__board">
          {hostBoard.length > 0 ? (
            hostBoard.map((card: any, idx: number) => (
              <div key={idx} className="game-spectator__card">
                {card.isFaceDown ? "?" : card.name?.slice(0, 10) || "Card"}
              </div>
            ))
          ) : (
            <div className="game-spectator__empty">No monsters</div>
          )}
        </div>
        <div className="game-spectator__player-info">
          <span className="game-spectator__username">{hostUsername}</span>
          <span className="game-spectator__lp">
            <span className="lp-icon">❤️</span>
            {hostLifePoints.toLocaleString()}
          </span>
        </div>
      </div>

      <style jsx>{`
        .game-spectator {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          padding: 40px;
          gap: 20px;
        }

        .game-spectator__turn {
          position: absolute;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          background: rgba(0, 0, 0, 0.6);
          padding: 12px 24px;
          border-radius: 12px;
        }

        .game-spectator__turn-label {
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 2px;
          opacity: 0.7;
        }

        .game-spectator__phase {
          font-size: 20px;
          font-weight: 600;
        }

        .game-spectator__player {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .game-spectator__player--opponent {
          justify-content: flex-start;
        }

        .game-spectator__player--host {
          justify-content: flex-end;
        }

        .game-spectator__player-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          background: rgba(0, 0, 0, 0.4);
          border-radius: 12px;
        }

        .game-spectator__username {
          font-size: 24px;
          font-weight: 600;
        }

        .game-spectator__lp {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 28px;
          font-weight: 700;
        }

        .lp-icon {
          font-size: 24px;
        }

        .game-spectator__board {
          display: flex;
          justify-content: center;
          gap: 12px;
          min-height: 120px;
          align-items: center;
        }

        .game-spectator__card {
          width: 100px;
          height: 140px;
          background: linear-gradient(135deg, #2c3e50 0%, #1a1a2e 100%);
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          text-align: center;
          padding: 8px;
        }

        .game-spectator__empty {
          font-size: 18px;
          opacity: 0.5;
          font-style: italic;
        }

        .game-spectator__divider {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
        }

        .game-spectator__divider span {
          font-size: 32px;
          font-weight: 700;
          opacity: 0.3;
        }
      `}</style>
    </div>
  );
}
