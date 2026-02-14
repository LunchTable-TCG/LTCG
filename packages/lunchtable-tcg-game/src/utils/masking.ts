
import { v } from "convex/values";

/**
 * Masks the game state for a specific player (observer).
 * Hides:
 * - Opponent's hand contents (replaced with placeholder or count).
 * - Face-down cards on opponent's board (unless revealed by effect).
 * - Opponent's deck contents.
 * - Private information in logs/events if any.
 */
export function maskGameState(gameState: any, observerId: string) {
  if (!gameState) return null;

  // Clone to avoid mutating original
  const masked = JSON.parse(JSON.stringify(gameState));

  const isHost = observerId === gameState.hostId;
  const isOpponent = observerId === gameState.opponentId;
  const isSpectator = !isHost && !isOpponent; // Spectators see a "neutral" or host-biased view, or maybe all public info?

  // Rule: Spectators see Host's view for now, or maybe generic public view?
  // Let's assume Spectators see public board + public hands (maybe neither hand?).
  // For now, let's just mask for the active players.

  if (isHost) {
    // Mask Opponent's Hand
    masked.opponentHand = maskHand(masked.opponentHand);
    // Mask Opponent's Deck
    masked.opponentDeck = maskDeck(masked.opponentDeck);

    // Mask Opponent's Face-Down Board Cards
    masked.opponentBoard = maskBoard(masked.opponentBoard);
    masked.opponentSpellTrapZone = maskBoard(masked.opponentSpellTrapZone);
  } else if (isOpponent) {
    // Mask Host's Hand
    masked.hostHand = maskHand(masked.hostHand);
    // Mask Host's Deck
    masked.hostDeck = maskDeck(masked.hostDeck);

    // Mask Host's Face-Down Board Cards
    masked.hostBoard = maskBoard(masked.hostBoard);
    masked.hostSpellTrapZone = maskBoard(masked.hostSpellTrapZone);
  } else {
    // Spectator Mode
    // Mask BOTH hands for fairness
    masked.hostHand = maskHand(masked.hostHand);
    masked.opponentHand = maskHand(masked.opponentHand);
    masked.hostDeck = maskDeck(masked.hostDeck);
    masked.opponentDeck = maskDeck(masked.opponentDeck);

    // Mask Face-Downs on both sides
    masked.hostBoard = maskBoard(masked.hostBoard);
    masked.opponentBoard = maskBoard(masked.opponentBoard);
    masked.hostSpellTrapZone = maskBoard(masked.hostSpellTrapZone);
    masked.opponentSpellTrapZone = maskBoard(masked.opponentSpellTrapZone);
  }

  return masked;
}

function maskHand(hand: any[]) {
  // Replace actual cards with a placeholder object that just indicates existence
  // or return just the count if the UI only needs that.
  // The UI likely needs an array of "Unknown Card" objects to render the card backs.
  return hand.map(() => ({
    _id: "hidden",
    name: "Unknown Card",
    cardType: "unknown",
    isFaceDown: true, // Hand cards are effectively face down to opponent
  }));
}

function maskDeck(deck: any[]) {
    // Deck is always hidden, just return count or empty array if client only needs count
    // Usually client just needs deck.length
    return deck.map(() => ({
        _id: "hidden",
        name: "Unknown Card",
    }));
}

function maskBoard(zone: any[]) {
  return zone.map((card) => {
    if (card.isFaceDown) {
      return {
        _id: card._id, // Keep ID for tracking/targeting involved in chains? Or hide ID too?
        // Ideally hide ID if not targeted. But simpler to just hide details.
        // If we hide ID, we can't update it easily.
        // Compromise: Keep ID, hide stats/name.
        name: "Set Card",
        cardType: "unknown",
        isFaceDown: true,
        // Hide stats
        attack: undefined,
        defense: undefined,
        ability: undefined,
      };
    }
    return card;
  });
}
