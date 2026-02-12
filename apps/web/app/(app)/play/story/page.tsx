"use client";

import { useStoryMode } from "@/hooks/story/useStoryMode";

export default function StoryModePage() {
  // Logic extracted to hook
  const { chapters, stats, storyModeEnabled, isLoading } = useStoryMode();

  if (isLoading) return null;

  return (
    <div>
      {/* UI extracted. Logic handled in useStoryMode. */}
      <h1>Story Mode</h1>
      <p>Enabled: {String(storyModeEnabled)}</p>
      <p>Chapters: {chapters.length}</p>
      <pre>{JSON.stringify(stats, null, 2)}</pre>
    </div>
  );
}
