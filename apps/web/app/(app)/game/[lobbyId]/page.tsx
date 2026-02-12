"use client";

import { useGameRoom } from "@/hooks/game/useGameRoom";
import type { Id } from "@convex/_generated/dataModel";
import { use } from "react";

interface GamePageProps {
  params: Promise<{
    lobbyId: string;
  }>;
}

export default function GamePage({ params }: GamePageProps) {
  const resolvedParams = use(params);
  const { lobbyId } = resolvedParams;

  // Logic extracted to hook
  const { gameState, isLoading, isPlayer } = useGameRoom(lobbyId as Id<"gameLobbies">);

  if (isLoading) return null;

  return (
    <div>
      {/* UI extracted. Logic handled in useGameRoom. */}
      <h1>Game Room: {lobbyId}</h1>
      <pre>{JSON.stringify({ isPlayer, gameState: gameState?.stage }, null, 2)}</pre>
    </div>
  );
}
