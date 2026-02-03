import { useCurrentFrame, interpolate } from "remotion";
import { COLORS, TYPOGRAPHY, typewriter, breathingGlow } from "../../utils/animations";

type MemoryEntry = {
  key: string;
  value: string;
};

type MemoryAccessLogProps = {
  memories: MemoryEntry[];
  frame?: number;
  startFrame?: number;
  charsPerFrame?: number;
  staggerDelay?: number;
  maxVisibleEntries?: number;
};

export const MemoryAccessLog: React.FC<MemoryAccessLogProps> = ({
  memories,
  frame: frameProp,
  startFrame = 0,
  charsPerFrame = 0.8,
  staggerDelay = 30,
  maxVisibleEntries = 5,
}) => {
  const currentFrame = useCurrentFrame();
  const frame = frameProp ?? currentFrame;

  // Calculate which entries should be visible (scrolling effect)
  const totalEntries = memories.length;
  const scrollOffset = Math.max(0, totalEntries - maxVisibleEntries);
  const visibleStart = Math.min(
    scrollOffset,
    Math.floor(Math.max(0, frame - startFrame) / staggerDelay)
  );

  // Glow intensity for terminal effect
  const glowIntensity = breathingGlow(frame, 0.3, 0.7);

  return (
    <div
      style={{
        fontFamily: TYPOGRAPHY.mono,
        fontSize: 14,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          color: COLORS.terminalGreenDim,
          marginBottom: 8,
          opacity: interpolate(frame, [startFrame, startFrame + 15], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        MEMORY ACCESS
      </div>

      {memories.slice(visibleStart, visibleStart + maxVisibleEntries).map((memory, index) => {
        const actualIndex = visibleStart + index;
        const entryStartFrame = startFrame + 15 + actualIndex * staggerDelay;

        // Full entry text
        const fullText = `${memory.key}: ${memory.value}`;

        // Typewriter effect
        const displayedText = typewriter(frame, fullText, entryStartFrame, charsPerFrame);

        // Entry opacity
        const entryOpacity = interpolate(
          frame,
          [entryStartFrame, entryStartFrame + 10],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );

        // Fade out old entries when scrolling
        const fadeOutOpacity = actualIndex < visibleStart + 1 && totalEntries > maxVisibleEntries
          ? interpolate(
              frame,
              [entryStartFrame + staggerDelay * 2, entryStartFrame + staggerDelay * 3],
              [1, 0.3],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            )
          : 1;

        // Cursor blink for typing effect
        const isTyping = displayedText.length < fullText.length;
        const cursorVisible = isTyping && Math.floor(frame / 8) % 2 === 0;

        return (
          <div
            key={memory.key}
            style={{
              display: "flex",
              marginBottom: 4,
              opacity: entryOpacity * fadeOutOpacity,
              color: COLORS.terminalGreen,
              textShadow: `0 0 ${6 + glowIntensity * 4}px rgba(0, 255, 0, ${glowIntensity * 0.5})`,
            }}
          >
            <span style={{ color: COLORS.terminalGreenDim, marginRight: 8 }}>{">"}</span>
            <span>
              {displayedText}
              {cursorVisible && (
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 14,
                    background: COLORS.terminalGreen,
                    marginLeft: 2,
                    verticalAlign: "middle",
                  }}
                />
              )}
            </span>
          </div>
        );
      })}

      {/* Scroll indicator when there are more entries */}
      {totalEntries > maxVisibleEntries && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            color: COLORS.terminalGreenDim,
            fontSize: 12,
            opacity: interpolate(
              frame,
              [startFrame + staggerDelay * maxVisibleEntries, startFrame + staggerDelay * (maxVisibleEntries + 1)],
              [0, 0.6],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            ),
          }}
        >
          [{visibleStart + maxVisibleEntries}/{totalEntries}]
        </div>
      )}
    </div>
  );
};
