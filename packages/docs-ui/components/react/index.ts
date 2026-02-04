/**
 * React Island Components
 * Interactive components for documentation
 *
 * Usage in Astro:
 * import { CardPreview } from '@ltcg/docs-ui/components/react';
 * <CardPreview client:load card={cardData} />
 */

export { CardPreview, type CardData, type CardAbility } from './CardPreview';
export { BattleSimulator, type BattleScenario, type Turn, type PlayerFieldState, type BattlePhase, type CardInZone } from './BattleSimulator';
export { AbilityShowcase, type Ability, type AbilityEffect } from './AbilityShowcase';
export { DeckBuilderPreview, type DeckData, type DeckCard } from './DeckBuilderPreview';
export { MatchupCalculator, type MatchupData, type Element } from './MatchupCalculator';
export { TurnSequenceViewer, type PhaseDetail, type TurnPhase } from './TurnSequenceViewer';
