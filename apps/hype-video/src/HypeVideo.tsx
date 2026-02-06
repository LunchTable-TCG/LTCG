import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { OpeningScene } from "./scenes/OpeningScene";
import { ArchetypeShowcase } from "./scenes/ArchetypeShowcase";
import { GameplayClips } from "./scenes/GameplayClips";
import { FinalCTA } from "./scenes/FinalCTA";

export const HypeVideo = () => {
  const frame = useCurrentFrame();

  // Smooth crossfade helper
  const crossfade = (start: number, end: number) => {
    return interpolate(
      frame,
      [start - 30, start, end, end + 30],
      [0, 1, 1, 0],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }
    );
  };

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
      {/* Opening logo reveal - 0-240 frames (4 seconds at 60fps) */}
      <Sequence from={0} durationInFrames={270}>
        <AbsoluteFill style={{ opacity: crossfade(0, 240) }}>
          <OpeningScene />
        </AbsoluteFill>
      </Sequence>

      {/* Archetype showcase - 240-840 frames (10 seconds) */}
      <Sequence from={210} durationInFrames={660}>
        <AbsoluteFill style={{ opacity: crossfade(240, 840) }}>
          <ArchetypeShowcase />
        </AbsoluteFill>
      </Sequence>

      {/* Gameplay clips montage - 840-1500 frames (11 seconds) */}
      <Sequence from={810} durationInFrames={720}>
        <AbsoluteFill style={{ opacity: crossfade(840, 1500) }}>
          <GameplayClips />
        </AbsoluteFill>
      </Sequence>

      {/* Final CTA - 1500-1800 frames (5 seconds) */}
      <Sequence from={1470} durationInFrames={330}>
        <AbsoluteFill style={{ opacity: crossfade(1500, 1800) }}>
          <FinalCTA />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
