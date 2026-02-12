"use client";

import { useStoryChapter } from "@/hooks/story/useStoryChapter";
import { use } from "react";

interface ChapterPageProps {
  params: Promise<{ chapterId: string }>;
}

export default function ChapterPage({ params }: ChapterPageProps) {
  const resolvedParams = use(params);
  const { chapterId } = resolvedParams;

  // Logic extracted to hook
  const { chapterDetails, isLoading, isMissing, startBattle } = useStoryChapter(chapterId);

  if (isLoading) return null;
  if (isMissing) return <div>Chapter not found</div>;

  return (
    <div>
      {/* UI extracted. Logic handled in useStoryChapter. */}
      <h1>Chapter: {chapterDetails.title}</h1>
      <pre>{JSON.stringify({ stages: chapterDetails.stages }, null, 2)}</pre>
      <button onClick={() => startBattle()}>Start Battle (Test)</button>
    </div>
  );
}
