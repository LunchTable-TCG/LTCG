"use client";

import { GameBoard } from "@/components/game/GameBoard";
import { StoryBattleCompleteDialog } from "@/components/story/StoryBattleCompleteDialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/auth/useConvexAuthHook";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

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

  const { isAuthenticated } = useAuth();
  const currentUser = useQuery(api.core.users.currentUser, isAuthenticated ? {} : "skip");

  const [gameId, setGameId] = useState<string | null>(null);
  const [lobbyId, setLobbyId] = useState<Id<"gameLobbies"> | null>(null);
  const [stageId, setStageId] = useState<Id<"storyStages"> | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [completionResult, setCompletionResult] = useState<any>(null);

  const initializeStoryBattle = useMutation(api.progression.storyBattle.initializeStoryBattle);
  const completeStage = useMutation(api.progression.storyStages.completeStage);

  // Get game state to watch for end
  const gameState = useQuery(
    api.gameplay.games.queries.getGameStateForPlayer,
    lobbyId ? { lobbyId } : "skip"
  );

  // Get stage information
  const stageInfo = useQuery(api.progression.storyQueries.getStageByChapterAndNumber, {
    chapterId,
    stageNumber: Number.parseInt(stageNumber),
  });

  // Initialize story battle on mount
  useEffect(() => {
    let mounted = true;

    async function initialize() {
      console.log("Initializing story battle for chapter:", chapterId, "stage:", stageNumber);
      try {
        const result = await initializeStoryBattle({
          chapterId,
          stageNumber: Number.parseInt(stageNumber),
        });
        console.log("Battle initialized successfully:", result);

        if (mounted) {
          setGameId(result.gameId);
          setLobbyId(result.lobbyId);
          setIsInitializing(false);
        }
      } catch (error) {
        console.error("Failed to initialize story battle:", error);
        if (mounted) {
          setInitError(error instanceof Error ? error.message : "Failed to start battle");
          setIsInitializing(false);
        }
      }
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, [chapterId, initializeStoryBattle]);

  // Set stageId once stage info is loaded
  useEffect(() => {
    if (stageInfo) {
      setStageId(stageInfo._id);
    }
  }, [stageInfo]);

  // Watch for game end and complete stage
  useEffect(() => {
    if (!gameState || !stageId || !currentUser) return;

    // Check if game ended
    const isGameEnded = gameState.myLifePoints <= 0 || gameState.opponentLifePoints <= 0;

    if (isGameEnded && !showCompletionDialog) {
      const playerWon = gameState.myLifePoints > 0;
      const finalLP = gameState.myLifePoints;

      // Complete the stage
      completeStage({
        stageId,
        won: playerWon,
        finalLP,
      })
        .then((result) => {
          setCompletionResult(result);
          setShowCompletionDialog(true);
        })
        .catch((error) => {
          console.error("Failed to complete stage:", error);
        });
    }
  }, [gameState, stageId, currentUser, showCompletionDialog, completeStage]);

  // Show loading state
  if (isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0d0a09]">
        <Loader2 className="w-12 h-12 animate-spin text-[#d4af37] mb-4" />
        <p className="text-[#a89f94]">Preparing battle...</p>
      </div>
    );
  }

  // Show error state
  if (initError || !gameId || !lobbyId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-linear-to-b from-[#1a1510] to-[#0f0a08] p-8">
        <div className="tcg-chat-leather rounded-2xl p-8 border border-[#3d2b1f] max-w-md text-center">
          <h1 className="text-3xl font-bold text-red-500 mb-4">Battle Failed</h1>
          <p className="text-[#a89f94] mb-6">
            {initError || "Failed to initialize battle. Please try again."}
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

  // Show game board
  return (
    <>
      <div className="min-h-screen bg-[#0d0a09]">
        <GameBoard lobbyId={lobbyId} gameMode="story" />
      </div>

      {/* Battle Completion Dialog */}
      {completionResult && (
        <StoryBattleCompleteDialog
          open={showCompletionDialog}
          onClose={() => {
            setShowCompletionDialog(false);
            router.push(`/play/story/${chapterId}`);
          }}
          result={completionResult}
          chapterName={stageInfo?.title}
        />
      )}
    </>
  );
}
