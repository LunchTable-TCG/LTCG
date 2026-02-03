import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { SCENE_TIMING, TRANSITION_FRAMES } from "../utils/animations";

// Import all scene components
import { EpicLogoReveal } from "../scenes/EpicLogoReveal";
import { ScrollReveal } from "../scenes/ScrollReveal";
import { DualArchetypeClash } from "../scenes/DualArchetypeClash";
import { CollectionShowcase } from "../scenes/CollectionShowcase";
import { DeckBuilderShowcase } from "../scenes/DeckBuilderShowcase";
import { BattleShowcase } from "../scenes/BattleShowcase";
import { ElizaAgentScene } from "../scenes/ElizaAgentScene";
import { PropsShowcase } from "../scenes/PropsShowcase";
import { StoryPathPreview } from "../scenes/StoryPathPreview";
import { EpicBattleScene } from "../scenes/EpicBattleScene";
import { VictoryMoment } from "../scenes/VictoryMoment";
import { FeatureFlash } from "../scenes/FeatureFlash";
import { EpicOutro } from "../scenes/EpicOutro";

// ============================================================================
// TYPES
// ============================================================================

export type EpicGameTrailerProps = {
  // Future props for customization
};

// ============================================================================
// MAIN COMPOSITION
// ============================================================================

/**
 * EpicGameTrailer - 90-second (2700 frames @ 30fps) epic game trailer
 *
 * Structure:
 * - ACT I: THE WORLD (0-810 frames) - Logo, Scroll, Archetype Clashes
 * - ACT II: THE CHALLENGE (810-1890 frames) - Features & Gameplay
 * - ACT III: THE CLASH (1890-2700 frames) - Epic Battle & CTA
 *
 * Scene Breakdown:
 * 1. EpicLogoReveal (150 frames) - Golden particles coalesce into logo
 * 2. ScrollReveal (180 frames) - Scroll unrolls revealing world map
 * 3. DualArchetypeClash (480 frames) - 5 paired archetype battles
 * 4. CollectionShowcase (150 frames) - Cards fly into grid
 * 5. DeckBuilderShowcase (180 frames) - Deck building with synergy
 * 6. BattleShowcase (210 frames) - Arena combat preview
 * 7. ElizaAgentScene (300 frames) - AI opponent reveal (KEY FEATURE)
 * 8. PropsShowcase (150 frames) - Rotating props display
 * 9. StoryPathPreview (90 frames) - Campaign path tease
 * 10. EpicBattleScene (450 frames) - Full battle with AI overlay
 * 11. VictoryMoment (150 frames) - Victory celebration
 * 12. FeatureFlash (90 frames) - Rapid feature cuts
 * 13. EpicOutro (120 frames) - All archetypes assemble, CTA
 */
export function EpicGameTrailer(_props: EpicGameTrailerProps) {
  return (
    <AbsoluteFill style={{ background: "#0a0a0a" }}>
      <TransitionSeries>
        {/* ================================================================ */}
        {/* ACT I: THE WORLD */}
        {/* ================================================================ */}

        {/* Scene 1: Epic Logo Reveal */}
        <TransitionSeries.Sequence durationInFrames={SCENE_TIMING.logoReveal.duration}>
          <EpicLogoReveal />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />

        {/* Scene 2: Scroll Reveal */}
        <TransitionSeries.Sequence durationInFrames={SCENE_TIMING.worldAwakening.duration}>
          <ScrollReveal />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />

        {/* Scene 3: Dual Archetype Clash */}
        <TransitionSeries.Sequence durationInFrames={SCENE_TIMING.archetypeMontage.duration}>
          <DualArchetypeClash />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />

        {/* ================================================================ */}
        {/* ACT II: THE CHALLENGE */}
        {/* ================================================================ */}

        {/* Scene 4: Collection Showcase */}
        <TransitionSeries.Sequence durationInFrames={SCENE_TIMING.collection.duration}>
          <CollectionShowcase />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />

        {/* Scene 5: Deck Builder Showcase */}
        <TransitionSeries.Sequence durationInFrames={SCENE_TIMING.deckBuilding.duration}>
          <DeckBuilderShowcase />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />

        {/* Scene 6: Battle Showcase */}
        <TransitionSeries.Sequence durationInFrames={SCENE_TIMING.battlePreview.duration}>
          <BattleShowcase />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />

        {/* Scene 7: Eliza Agent Scene (KEY FEATURE) */}
        <TransitionSeries.Sequence durationInFrames={SCENE_TIMING.aiAgentReveal.duration}>
          <ElizaAgentScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />

        {/* Scene 8: Props Showcase */}
        <TransitionSeries.Sequence durationInFrames={SCENE_TIMING.propsShowcase.duration}>
          <PropsShowcase />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />

        {/* Scene 9: Story Path Preview */}
        <TransitionSeries.Sequence durationInFrames={SCENE_TIMING.storyTease.duration}>
          <StoryPathPreview />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />

        {/* ================================================================ */}
        {/* ACT III: THE CLASH */}
        {/* ================================================================ */}

        {/* Scene 10: Epic Battle Scene */}
        <TransitionSeries.Sequence durationInFrames={SCENE_TIMING.epicBattle.duration}>
          <EpicBattleScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />

        {/* Scene 11: Victory Moment */}
        <TransitionSeries.Sequence durationInFrames={SCENE_TIMING.victoryMoment.duration}>
          <VictoryMoment />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />

        {/* Scene 12: Feature Flash */}
        <TransitionSeries.Sequence durationInFrames={SCENE_TIMING.featureFlash.duration}>
          <FeatureFlash />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />

        {/* Scene 13: Epic Outro */}
        <TransitionSeries.Sequence durationInFrames={SCENE_TIMING.grandOutro.duration}>
          <EpicOutro />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
}

export default EpicGameTrailer;
