"use client";

import { GameBoard } from "@/components/game/GameBoard";
import { useAuth } from "@/hooks/auth/useConvexAuthHook";
import { apiAny, useConvexQuery } from "@/lib/convexHelpers";
import type { Id } from "@convex/_generated/dataModel";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useEffect } from "react";
import { SpectatorGameView } from "../../lunchtable/components/SpectatorGameView";

interface GamePageProps {
  params: Promise<{
    lobbyId: string;
  }>;
}

export default function GamePage({ params }: GamePageProps) {
  const resolvedParams = use(params);
  const { lobbyId } = resolvedParams;
  const router = useRouter();

  const { isAuthenticated } = useAuth();
  const currentUser = useConvexQuery(apiAny.core.users.currentUser, isAuthenticated ? {} : "skip");

  // Get lobby details to check if user is a player
  const lobby = useConvexQuery(apiAny.gameplay.games.queries.getLobbyDetails, {
    lobbyId: lobbyId as Id<"gameLobbies">,
  });

  // Get game state to check if game exists
  const gameState = useConvexQuery(
    apiAny.gameplay.games.queries.getGameStateForPlayer,
    lobby ? { lobbyId: lobbyId as Id<"gameLobbies"> } : "skip"
  );

  // Redirect to lunchtable if game doesn't exist or is closed
  useEffect(() => {
    if (gameState === null || lobby === null) {
      router.push("/lunchtable");
    }
  }, [gameState, lobby, router]);

  // Show loading state
  if (!currentUser || lobby === undefined || gameState === undefined) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0d0a09]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-[#d4af37]" />
          <span className="text-xs text-[#a89f94]">Loading game...</span>
        </div>
      </div>
    );
  }

  const isPlayer =
    lobby && (lobby.hostId === currentUser._id || lobby.opponentId === currentUser._id);

  if (isPlayer) {
    // User is a player - show full game board
    return <GameBoard lobbyId={lobbyId as Id<"gameLobbies">} playerId={currentUser._id} />;
  }

  // User is a spectator - show spectator view
  return (
    <SpectatorGameView
      lobbyId={lobbyId as Id<"gameLobbies">}
      onExit={() => router.push("/lunchtable")}
    />
  );
}
