"use client";

import { useRouter } from "next/navigation";
import { use } from "react";
import { Button } from "@/components/ui/button";

interface BattlePageProps {
  params: Promise<{
    chapterId: string;
    stageNumber: string;
  }>;
}

export default function BattlePage({ params }: BattlePageProps) {
  const resolvedParams = use(params);
  const { chapterId, stageNumber } = resolvedParams;
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-[#1a1510] to-[#0f0a08] p-8">
      <div className="tcg-chat-leather rounded-2xl p-8 border border-[#3d2b1f] max-w-md text-center">
        <h1 className="text-3xl font-bold text-[#d4af37] mb-4">Story Battle</h1>
        <p className="text-[#a89f94] mb-2">Chapter: {chapterId}</p>
        <p className="text-[#a89f94] mb-6">Stage: {stageNumber}</p>
        <p className="text-[#e8e0d5] mb-8">
          Story battles are coming soon! For now, try multiplayer matches in the Lunchtable.
        </p>
        <Button
          onClick={() => router.push(`/play/story/${chapterId}`)}
          className="bg-[#d4af37] hover:bg-[#f9e29f] text-[#1a1614]"
        >
          Back to Chapter
        </Button>
      </div>
    </div>
  );
}
