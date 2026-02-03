import { Composition, Folder } from "remotion";
import { CardShowcase, type CardShowcaseProps } from "./compositions/CardShowcase";
import { GameTrailer } from "./compositions/GameTrailer";
import { EpicGameTrailer } from "./compositions/EpicGameTrailer";
import { ArchetypeReveal, type ArchetypeRevealProps } from "./compositions/ArchetypeReveal";
import { ElizaAgentScene } from "./scenes/ElizaAgentScene";
import { EpicBattleScene } from "./scenes/EpicBattleScene";
import { TOTAL_DURATION } from "./utils/animations";

export const RemotionRoot: React.FC = () => {
  // GameTrailer duration calculation:
  // 6 scenes x 150 frames each = 900 frames
  // 5 transitions x 20 frames each = 100 frames overlap
  // Total: 900 - 100 = 800 frames
  const TRAILER_DURATION = 800;

  return (
    <>
      <Folder name="Marketing">
        {/* Epic Game Trailer - 90-second cinematic trailer with AI opponent */}
        <Composition
          id="EpicGameTrailer"
          component={EpicGameTrailer}
          durationInFrames={TOTAL_DURATION}
          fps={30}
          width={1920}
          height={1080}
        />

        {/* Game Trailer - Original 27-second promotional video */}
        <Composition
          id="GameTrailer"
          component={GameTrailer}
          durationInFrames={TRAILER_DURATION}
          fps={30}
          width={1920}
          height={1080}
        />

        {/* Card Showcase - Shows animated cards with effects */}
        <Composition
          id="CardShowcase"
          component={CardShowcase}
          durationInFrames={300} // 10 seconds at 30fps
          fps={30}
          width={1920}
          height={1080}
          defaultProps={
            {
              cards: [
                { name: "Infernal Overlord", archetype: "infernal_dragons", rarity: "legendary" },
                { name: "Celestial Protector", archetype: "celestial_guardians", rarity: "epic" },
                { name: "Arcane Master", archetype: "arcane_mages", rarity: "rare" },
              ],
            } satisfies CardShowcaseProps
          }
        />
      </Folder>

      <Folder name="AI-Features">
        {/* Eliza Agent Scene - AI visualization reveal */}
        <Composition
          id="ElizaAgentScene"
          component={ElizaAgentScene}
          durationInFrames={300} // 10 seconds at 30fps
          fps={30}
          width={1920}
          height={1080}
        />

        {/* Epic Battle Scene - Split-screen battle with AI overlay */}
        <Composition
          id="EpicBattleScene"
          component={EpicBattleScene}
          durationInFrames={450} // 15 seconds at 30fps
          fps={30}
          width={1920}
          height={1080}
        />
      </Folder>

      <Folder name="Archetypes">
        {/* Archetype Reveals - One for each archetype */}
        <Composition
          id="InfernalDragons"
          component={ArchetypeReveal}
          durationInFrames={180}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={
            {
              archetype: "infernal_dragons",
              name: "Infernal Dragons",
              tagline: "Masters of flame and fury",
            } satisfies ArchetypeRevealProps
          }
        />
        <Composition
          id="AbyssalHorrors"
          component={ArchetypeReveal}
          durationInFrames={180}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={
            {
              archetype: "abyssal_horrors",
              name: "Abyssal Horrors",
              tagline: "Terrors from the deep",
            } satisfies ArchetypeRevealProps
          }
        />
        <Composition
          id="NatureSpirits"
          component={ArchetypeReveal}
          durationInFrames={180}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={
            {
              archetype: "nature_spirits",
              name: "Nature Spirits",
              tagline: "Guardians of the wild",
            } satisfies ArchetypeRevealProps
          }
        />
        <Composition
          id="StormElementals"
          component={ArchetypeReveal}
          durationInFrames={180}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={
            {
              archetype: "storm_elementals",
              name: "Storm Elementals",
              tagline: "Wielders of lightning",
            } satisfies ArchetypeRevealProps
          }
        />
        <Composition
          id="ShadowAssassins"
          component={ArchetypeReveal}
          durationInFrames={180}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={
            {
              archetype: "shadow_assassins",
              name: "Shadow Assassins",
              tagline: "Dealers in darkness",
            } satisfies ArchetypeRevealProps
          }
        />
        <Composition
          id="CelestialGuardians"
          component={ArchetypeReveal}
          durationInFrames={180}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={
            {
              archetype: "celestial_guardians",
              name: "Celestial Guardians",
              tagline: "Protectors of light",
            } satisfies ArchetypeRevealProps
          }
        />
        <Composition
          id="UndeadLegion"
          component={ArchetypeReveal}
          durationInFrames={180}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={
            {
              archetype: "undead_legion",
              name: "Undead Legion",
              tagline: "Army of the fallen",
            } satisfies ArchetypeRevealProps
          }
        />
        <Composition
          id="DivineKnights"
          component={ArchetypeReveal}
          durationInFrames={180}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={
            {
              archetype: "divine_knights",
              name: "Divine Knights",
              tagline: "Champions of honor",
            } satisfies ArchetypeRevealProps
          }
        />
        <Composition
          id="ArcaneMages"
          component={ArchetypeReveal}
          durationInFrames={180}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={
            {
              archetype: "arcane_mages",
              name: "Arcane Mages",
              tagline: "Scholars of mystery",
            } satisfies ArchetypeRevealProps
          }
        />
        <Composition
          id="MechanicalConstructs"
          component={ArchetypeReveal}
          durationInFrames={180}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={
            {
              archetype: "mechanical_constructs",
              name: "Mechanical Constructs",
              tagline: "Engines of war",
            } satisfies ArchetypeRevealProps
          }
        />
      </Folder>
    </>
  );
};
