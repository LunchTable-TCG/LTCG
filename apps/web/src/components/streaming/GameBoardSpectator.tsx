"use client";

interface CardOnBoard {
  _id?: string;
  name?: string;
  currentAttack?: number;
  currentDefense?: number;
  position?: number; // 1 = ATK, -1 = DEF
  isFaceDown?: boolean;
  hasAttacked?: boolean;
  cardType?: string;
}

interface SpellTrapOnBoard {
  _id?: string;
  name?: string;
  isFaceDown?: boolean;
  cardType?: string;
}

interface FieldSpell {
  name?: string;
  isActive?: boolean;
}

interface GameState {
  hostBoard?: CardOnBoard[];
  opponentBoard?: CardOnBoard[];
  hostLifePoints?: number | null;
  opponentLifePoints?: number | null;
  currentPhase?: string;
  turnNumber?: number;
  hostUsername?: string;
  opponentUsername?: string;
  hostHandCount?: number;
  hostDeckCount?: number;
  hostSpellTrapZone?: SpellTrapOnBoard[];
  hostGraveyard?: unknown[];
  hostFieldSpell?: FieldSpell | null;
  opponentHandCount?: number;
  opponentDeckCount?: number;
  opponentSpellTrapZone?: SpellTrapOnBoard[];
  opponentGraveyard?: unknown[];
  opponentFieldSpell?: FieldSpell | null;
}

interface GameBoardSpectatorProps {
  gameState: GameState;
}

function MonsterCard({ card }: { card: CardOnBoard }) {
  if (card.isFaceDown) {
    return (
      <div className="card card--facedown card--monster">
        <div className="card__back">?</div>
        <div className="card__mode">DEF</div>
      </div>
    );
  }

  const isDefense = card.position !== 1; // 1 = attack, -1 = defense
  return (
    <div className={`card card--monster ${isDefense ? "card--defense" : ""}`}>
      <div className="card__name">{card.name || "Monster"}</div>
      <div className="card__stats">
        <span className="card__atk">{card.currentAttack ?? "?"}</span>
        <span className="card__sep">/</span>
        <span className="card__def">{card.currentDefense ?? "?"}</span>
      </div>
      <div className="card__mode">{isDefense ? "DEF" : "ATK"}</div>
    </div>
  );
}

function SpellTrapCard({ card }: { card: SpellTrapOnBoard }) {
  if (card.isFaceDown) {
    return (
      <div className="card card--facedown card--spelltrap">
        <div className="card__back">SET</div>
      </div>
    );
  }

  return (
    <div className="card card--spelltrap">
      <div className="card__name">{card.name || "Spell/Trap"}</div>
    </div>
  );
}

function EmptyZone({ count, label }: { count: number; label: string }) {
  if (count > 0) return null;
  return <div className="zone__empty">{label}</div>;
}

function PlayerStats({
  handCount = 0,
  deckCount = 0,
  graveyardCount = 0,
  fieldSpell,
}: {
  handCount?: number;
  deckCount?: number;
  graveyardCount?: number;
  fieldSpell?: FieldSpell | null;
}) {
  return (
    <div className="player-stats">
      <div className="player-stats__item" title="Hand">
        <span className="player-stats__icon">🂠</span>
        <span className="player-stats__value">{handCount}</span>
      </div>
      <div className="player-stats__item" title="Deck">
        <span className="player-stats__icon">📚</span>
        <span className="player-stats__value">{deckCount}</span>
      </div>
      <div className="player-stats__item" title="Graveyard">
        <span className="player-stats__icon">💀</span>
        <span className="player-stats__value">{graveyardCount}</span>
      </div>
      {fieldSpell && (
        <div className="player-stats__item player-stats__item--field" title="Field Spell">
          <span className="player-stats__icon">🌍</span>
          <span className="player-stats__value">{fieldSpell.name || "Field"}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Enhanced game board view for streaming overlay.
 * Shows monster zones, spell/trap zones, LP, hand/deck/GY counts.
 */
export function GameBoardSpectator({ gameState }: GameBoardSpectatorProps) {
  const {
    hostLifePoints: rawHostLP,
    opponentLifePoints: rawOpponentLP,
    currentPhase = "main1",
    turnNumber = 1,
    hostUsername = "Player 1",
    opponentUsername = "Player 2",
    hostBoard = [],
    opponentBoard = [],
    hostSpellTrapZone = [],
    opponentSpellTrapZone = [],
    hostHandCount = 0,
    hostDeckCount = 0,
    hostGraveyard = [],
    hostFieldSpell,
    opponentHandCount = 0,
    opponentDeckCount = 0,
    opponentGraveyard = [],
    opponentFieldSpell,
  } = gameState;

  const hostLifePoints = typeof rawHostLP === "number" ? rawHostLP : 8000;
  const opponentLifePoints = typeof rawOpponentLP === "number" ? rawOpponentLP : 8000;

  const phaseLabels: Record<string, string> = {
    draw: "Draw Phase",
    standby: "Standby",
    main1: "Main Phase 1",
    battle: "Battle Phase",
    main2: "Main Phase 2",
    end: "End Phase",
  };

  const hostLPPercent = Math.max(0, Math.min(100, (hostLifePoints / 8000) * 100));
  const oppLPPercent = Math.max(0, Math.min(100, (opponentLifePoints / 8000) * 100));

  return (
    <div className="game-spectator">
      {/* Turn / Phase indicator */}
      <div className="game-spectator__turn">
        <span className="turn__number">Turn {turnNumber}</span>
        <span className="turn__divider">·</span>
        <span className="turn__phase">{phaseLabels[currentPhase] || currentPhase}</span>
      </div>

      {/* === OPPONENT SIDE === */}
      <div className="game-spectator__player game-spectator__player--opponent">
        {/* Opponent info bar */}
        <div className="player-bar">
          <div className="player-bar__name">{opponentUsername}</div>
          <div className="player-bar__lp">
            <div className="lp-bar">
              <div
                className="lp-bar__fill lp-bar__fill--opponent"
                style={{ width: `${oppLPPercent}%` }}
              />
            </div>
            <span className="lp-bar__text">{opponentLifePoints.toLocaleString()}</span>
          </div>
          <PlayerStats
            handCount={opponentHandCount}
            deckCount={opponentDeckCount}
            graveyardCount={opponentGraveyard.length}
            fieldSpell={opponentFieldSpell}
          />
        </div>

        {/* Opponent spell/trap zone */}
        <div className="zone zone--spelltrap">
          {opponentSpellTrapZone.map((card) => (
            <SpellTrapCard key={card._id || card.name} card={card} />
          ))}
          <EmptyZone count={opponentSpellTrapZone.length} label="" />
        </div>

        {/* Opponent monster zone */}
        <div className="zone zone--monster">
          {opponentBoard.map((card) => (
            <MonsterCard key={card._id || card.name} card={card} />
          ))}
          <EmptyZone count={opponentBoard.length} label="No monsters" />
        </div>
      </div>

      {/* VS Divider */}
      <div className="game-spectator__divider">
        <div className="divider__line" />
        <span className="divider__text">VS</span>
        <div className="divider__line" />
      </div>

      {/* === HOST SIDE === */}
      <div className="game-spectator__player game-spectator__player--host">
        {/* Host monster zone */}
        <div className="zone zone--monster">
          {hostBoard.map((card) => (
            <MonsterCard key={card._id || card.name} card={card} />
          ))}
          <EmptyZone count={hostBoard.length} label="No monsters" />
        </div>

        {/* Host spell/trap zone */}
        <div className="zone zone--spelltrap">
          {hostSpellTrapZone.map((card) => (
            <SpellTrapCard key={card._id || card.name} card={card} />
          ))}
          <EmptyZone count={hostSpellTrapZone.length} label="" />
        </div>

        {/* Host info bar */}
        <div className="player-bar">
          <div className="player-bar__name">{hostUsername}</div>
          <div className="player-bar__lp">
            <div className="lp-bar">
              <div
                className="lp-bar__fill lp-bar__fill--host"
                style={{ width: `${hostLPPercent}%` }}
              />
            </div>
            <span className="lp-bar__text">{hostLifePoints.toLocaleString()}</span>
          </div>
          <PlayerStats
            handCount={hostHandCount}
            deckCount={hostDeckCount}
            graveyardCount={hostGraveyard.length}
            fieldSpell={hostFieldSpell}
          />
        </div>
      </div>

      <style jsx>{`
        .game-spectator {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          padding: 24px 32px;
          gap: 8px;
          position: relative;
          z-index: 2;
        }

        /* Turn indicator */
        .game-spectator__turn {
          position: absolute;
          top: 12px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(0, 0, 0, 0.7);
          padding: 6px 20px;
          border-radius: 20px;
          border: 1px solid rgba(212, 175, 55, 0.3);
          z-index: 10;
        }
        .turn__number {
          font-size: 14px;
          font-weight: 700;
          color: #d4af37;
          text-transform: uppercase;
          letter-spacing: 1.5px;
        }
        .turn__divider {
          color: rgba(212, 175, 55, 0.4);
          font-size: 16px;
        }
        .turn__phase {
          font-size: 14px;
          font-weight: 500;
          color: #e8e0d5;
        }

        /* Player sections */
        .game-spectator__player {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-height: 0;
        }
        .game-spectator__player--opponent {
          justify-content: flex-start;
          padding-top: 36px;
        }
        .game-spectator__player--host {
          justify-content: flex-end;
        }

        /* Player bar (name + LP + stats) */
        .player-bar {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 8px 16px;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 8px;
          border: 1px solid rgba(139, 69, 19, 0.3);
        }
        .player-bar__name {
          font-size: 18px;
          font-weight: 700;
          color: #f0d77a;
          min-width: 120px;
          font-family: var(--font-cinzel), serif;
        }
        .player-bar__lp {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          max-width: 300px;
        }

        /* LP bar */
        .lp-bar {
          flex: 1;
          height: 14px;
          background: rgba(0, 0, 0, 0.6);
          border-radius: 7px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .lp-bar__fill {
          height: 100%;
          border-radius: 7px;
          transition: width 0.6s ease;
        }
        .lp-bar__fill--host {
          background: linear-gradient(90deg, #2ecc71, #27ae60);
        }
        .lp-bar__fill--opponent {
          background: linear-gradient(90deg, #e74c3c, #c0392b);
        }
        .lp-bar__text {
          font-size: 16px;
          font-weight: 700;
          color: #e8e0d5;
          min-width: 50px;
          text-align: right;
          font-variant-numeric: tabular-nums;
        }

        /* Player stats (hand/deck/gy) */
        .player-stats {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-left: auto;
        }
        .player-stats__item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          color: #a89f94;
        }
        .player-stats__icon {
          font-size: 14px;
        }
        .player-stats__value {
          font-weight: 600;
          color: #e8e0d5;
          font-variant-numeric: tabular-nums;
        }
        .player-stats__item--field .player-stats__value {
          font-size: 11px;
          max-width: 80px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* Zones (monster + spell/trap) */
        .zone {
          display: flex;
          justify-content: center;
          gap: 8px;
          min-height: 80px;
          align-items: center;
          padding: 4px 0;
        }
        .zone--monster {
          min-height: 100px;
        }
        .zone--spelltrap {
          min-height: 60px;
        }
        .zone__empty {
          font-size: 14px;
          opacity: 0.3;
          font-style: italic;
          color: #a89f94;
        }

        /* Cards */
        .card {
          width: 90px;
          height: 120px;
          border-radius: 6px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 6px;
          text-align: center;
          position: relative;
          transition: transform 0.2s ease;
        }

        /* Monster cards */
        .card--monster {
          background: linear-gradient(135deg, #5c3a1e 0%, #3d2512 100%);
          border: 2px solid rgba(212, 175, 55, 0.5);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(212, 175, 55, 0.15);
        }
        .card--monster.card--defense {
          width: 120px;
          height: 90px;
        }

        /* Spell/Trap cards */
        .card--spelltrap {
          width: 70px;
          height: 90px;
          background: linear-gradient(135deg, #1a5c3a 0%, #0d3321 100%);
          border: 2px solid rgba(46, 204, 113, 0.4);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
        }

        /* Face-down cards */
        .card--facedown {
          background: linear-gradient(135deg, #2c3e50 0%, #1a1a2e 100%);
          border: 2px solid rgba(255, 255, 255, 0.15);
        }
        .card--facedown.card--monster {
          width: 120px;
          height: 90px;
        }
        .card__back {
          font-size: 20px;
          font-weight: 700;
          opacity: 0.4;
          color: #a89f94;
        }

        /* Card content */
        .card__name {
          font-size: 10px;
          font-weight: 600;
          color: #f0d77a;
          line-height: 1.2;
          max-height: 36px;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          margin-bottom: auto;
        }
        .card__stats {
          display: flex;
          align-items: center;
          gap: 2px;
          font-size: 13px;
          font-weight: 700;
          color: #e8e0d5;
          margin-top: 4px;
          font-variant-numeric: tabular-nums;
        }
        .card__atk {
          color: #e74c3c;
        }
        .card__sep {
          color: rgba(255, 255, 255, 0.3);
          font-size: 11px;
        }
        .card__def {
          color: #3498db;
        }
        .card__mode {
          position: absolute;
          bottom: 3px;
          right: 4px;
          font-size: 8px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          opacity: 0.5;
          color: #a89f94;
        }

        /* VS Divider */
        .game-spectator__divider {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 2px 0;
        }
        .divider__line {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(139, 69, 19, 0.4), transparent);
        }
        .divider__text {
          font-size: 20px;
          font-weight: 700;
          color: rgba(212, 175, 55, 0.3);
          letter-spacing: 3px;
          font-family: var(--font-cinzel), serif;
        }
      `}</style>
    </div>
  );
}
