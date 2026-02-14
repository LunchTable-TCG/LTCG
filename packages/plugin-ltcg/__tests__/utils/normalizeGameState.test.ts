import { describe, expect, it } from "vitest";
import { normalizeGameState } from "../../src/utils/normalizeGameState";

describe("normalizeGameState", () => {
  it("preserves player identity and normalizes spell/trap zones from API payload", () => {
    const normalized = normalizeGameState({
      gameId: "game_1",
      lobbyId: "lobby_1",
      phase: "main",
      turnNumber: 3,
      currentTurnPlayer: "user_me",
      isMyTurn: true,
      myPlayerId: "user_me",
      opponentPlayerId: "user_opp",
      myLifePoints: 7600,
      opponentLifePoints: 6500,
      hand: [],
      myBoard: [],
      opponentBoard: [],
      mySpellTrapZone: [
        { boardIndex: 0, cardId: "st_1", name: "Mirror Trap", faceUp: false, type: "trap" },
        { _id: "st_2", name: "Field Boost", isFaceDown: false, cardType: "spell" },
      ],
      opponentSpellTrapZone: [
        { boardIndex: 0, cardId: "opp_st_1", name: "Unknown", faceUp: false, type: "trap" },
      ],
      myDeckCount: 22,
      opponentDeckCount: 20,
      myGraveyardCount: 1,
      opponentGraveyardCount: 2,
      opponentHandCount: 3,
      normalSummonedThisTurn: false,
    } as any);

    expect(normalized.hostPlayer.playerId).toBe("user_me");
    expect(normalized.opponentPlayer.playerId).toBe("user_opp");
    expect(normalized.hostPlayer.spellTrapZone).toHaveLength(2);
    expect(normalized.hostPlayer.spellTrapZone[0]).toMatchObject({
      cardId: "st_1",
      type: "trap",
      faceUp: false,
    });
    expect(normalized.hostPlayer.spellTrapZone[1]).toMatchObject({
      cardId: "st_2",
      type: "spell",
      faceUp: true,
    });
    expect(normalized.opponentPlayer.spellTrapZone[0]).toMatchObject({
      cardId: "opp_st_1",
      type: "trap",
    });
  });
});
