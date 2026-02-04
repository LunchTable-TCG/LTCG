/**
 * Type definitions for action handlers
 */

/**
 * Options parameter passed to action handlers.
 * Currently unused but present in elizaOS Action interface.
 */
export type ActionHandlerOptions = Record<string, unknown>;

/**
 * Selected card from different sources
 */
export interface SelectedCard {
  name: string;
  handIndex?: number;
  boardIndex?: number;
  cardId?: string;
  [key: string]: unknown;
}
