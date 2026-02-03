"use client";

import { GameBoard } from "@/components/game/GameBoard";
import {
  DialogueDisplay,
  type DialogueLine,
} from "@/components/story/DialogueDisplay";
import { StoryBattleCompleteDialog } from "@/components/story/StoryBattleCompleteDialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/auth/useConvexAuthHook";
import { apiAny, useConvexQuery } from "@/lib/convexHelpers";
import { cn } from "@/lib/utils";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Crown, Loader2, Shield, Swords } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { use, useEffect, useState, useCallback } from "react";

type DialoguePhase = "pre" | "battle" | "post" | "complete";
type StoryDifficulty = "normal" | "hard" | "legendary";

// Difficulty display configuration
const DIFFICULTY_DISPLAY = {
  normal: {
    label: "Normal",
    icon: Shield,
    color: "text-green-400",
    bgColor: "bg-green-500/20",
    borderColor: "border-green-500/50",
  },
  hard: {
    label: "Hard",
    icon: Swords,
    color: "text-orange-400",
    bgColor: "bg-orange-500/20",
    borderColor: "border-orange-500/50",
  },
  legendary: {
    label: "Legendary",
    icon: Crown,
    color: "text-purple-400",
    bgColor: "bg-purple-500/20",
    borderColor: "border-purple-500/50",
  },
} as const;

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
  const searchParams = useSearchParams();

  // Get difficulty from URL params, default to "normal"
  const difficultyParam = searchParams.get("difficulty");
  const difficulty: StoryDifficulty =
    difficultyParam === "hard" || difficultyParam === "legendary"
      ? difficultyParam
      : "normal";

  const { isAuthenticated } = useAuth();
  const currentUser = useConvexQuery(apiAny.core.users.currentUser, isAuthenticated ? {} : "skip");

  const [gameId, setGameId] = useState<string | null>(null);
  const [lobbyId, setLobbyId] = useState<Id<"gameLobbies"> | null>(null);
  const [stageId, setStageId] = useState<Id<"storyStages"> | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [completionResult, setCompletionResult] = useState<any>(null);

  // Dialogue state
  const [dialoguePhase, setDialoguePhase] = useState<DialoguePhase>("pre");
  const [battleOutcome, setBattleOutcome] = useState<{
    won: boolean;
    finalLP: number;
  } | null>(null);

  const initializeStoryBattle = useMutation(apiAny.progression.storyBattle.initializeStoryBattle);
  const completeStage = useMutation(apiAny.progression.storyStages.completeStage);

  // Get game state to watch for end
  const gameState = useQuery(
    apiAny.gameplay.games.queries.getGameStateForPlayer,
    lobbyId && dialoguePhase === "battle" ? { lobbyId } : "skip"
  );

  // Get stage information (includes dialogue)
  const stageInfo = useQuery(apiAny.progression.storyQueries.getStageByChapterAndNumber, {
    chapterId,
    stageNumber: Number.parseInt(stageNumber),
  });

  // Extract dialogue from stage info
  const preMatchDialogue: DialogueLine[] | undefined = stageInfo?.preMatchDialogue;
  const postMatchWinDialogue: DialogueLine[] | undefined = stageInfo?.postMatchWinDialogue;
  const postMatchLoseDialogue: DialogueLine[] | undefined = stageInfo?.postMatchLoseDialogue;

  // Determine if we should skip pre-dialogue
  const hasPreDialogue = preMatchDialogue && preMatchDialogue.length > 0;

  // Initialize story battle on mount
  useEffect(() => {
    let mounted = true;

    async function initialize() {
      console.log(
        "Initializing story battle for chapter:",
        chapterId,
        "stage:",
        stageNumber,
        "difficulty:",
        difficulty
      );
      try {
        const result = await initializeStoryBattle({
          chapterId,
          stageNumber: Number.parseInt(stageNumber),
          difficulty,
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
  }, [chapterId, stageNumber, difficulty, initializeStoryBattle]);

  // Once stage info loads, determine initial dialogue phase
  useEffect(() => {
    if (!isInitializing && stageInfo !== undefined) {
      // If there's pre-match dialogue, show it; otherwise go straight to battle
      if (hasPreDialogue) {
        setDialoguePhase("pre");
      } else {
        setDialoguePhase("battle");
      }
    }
  }, [isInitializing, stageInfo, hasPreDialogue]);

  // Handle pre-dialogue completion
  const handlePreDialogueComplete = useCallback(() => {
    setDialoguePhase("battle");
  }, []);

  // Handle post-dialogue completion
  const handlePostDialogueComplete = useCallback(() => {
    if (battleOutcome && stageId) {
      // Now complete the stage and show rewards
      completeStage({
        stageId,
        won: battleOutcome.won,
        finalLP: battleOutcome.finalLP,
      })
        .then((result) => {
          setCompletionResult(result);
          setDialoguePhase("complete");
          setShowCompletionDialog(true);
        })
        .catch((error) => {
          console.error("Failed to complete stage:", error);
          // Still show completion dialog on error
          setDialoguePhase("complete");
          setShowCompletionDialog(true);
        });
    }
  }, [battleOutcome, stageId, completeStage]);

  // Set stageId once stage info is loaded
  useEffect(() => {
    if (stageInfo) {
      setStageId(stageInfo._id);
    }
  }, [stageInfo]);

  // Watch for game end and transition to post-dialogue
  useEffect(() => {
    if (!gameState || !stageId || !currentUser) return;
    if (dialoguePhase !== "battle") return;

    // Check if game ended
    const isGameEnded = gameState.myLifePoints <= 0 || gameState.opponentLifePoints <= 0;

    if (isGameEnded) {
      const playerWon = gameState.myLifePoints > 0;
      const finalLP = gameState.myLifePoints;

      // Store the outcome
      setBattleOutcome({ won: playerWon, finalLP });

      // Determine which post-dialogue to show
      const postDialogue = playerWon ? postMatchWinDialogue : postMatchLoseDialogue;
      const hasPostDialogue = postDialogue && postDialogue.length > 0;

      if (hasPostDialogue) {
        // Show post-match dialogue first
        setDialoguePhase("post");
      } else {
        // No post-dialogue, complete the stage directly
        completeStage({
          stageId,
          won: playerWon,
          finalLP,
        })
          .then((result) => {
            setCompletionResult(result);
            setDialoguePhase("complete");
            setShowCompletionDialog(true);
          })
          .catch((error) => {
            console.error("Failed to complete stage:", error);
            setDialoguePhase("complete");
            setShowCompletionDialog(true);
          });
      }
    }
  }, [
    gameState,
    stageId,
    currentUser,
    dialoguePhase,
    postMatchWinDialogue,
    postMatchLoseDialogue,
    completeStage,
  ]);

  // Show loading state (stageInfo is undefined while loading, null if not found)
  if (isInitializing || stageInfo === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0d0a09]">
        <Loader2 className="w-12 h-12 animate-spin text-[#d4af37] mb-4" />
        <p className="text-[#a89f94]">Preparing battle...</p>
      </div>
    );
  }

  // Stage not found
  if (stageInfo === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-linear-to-b from-[#1a1510] to-[#0f0a08] p-8">
        <div className="tcg-chat-leather rounded-2xl p-8 border border-[#3d2b1f] max-w-md text-center">
          <h1 className="text-3xl font-bold text-red-500 mb-4">Stage Not Found</h1>
          <p className="text-[#a89f94] mb-6">The requested stage could not be found.</p>
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

  // Pre-match dialogue phase
  if (dialoguePhase === "pre" && preMatchDialogue && preMatchDialogue.length > 0) {
    return (
      <div className="min-h-screen bg-[#0d0a09]">
        {/* Background with stage info */}
        <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-[#d4af37] mb-2">
              {stageInfo.title || `Stage ${stageNumber}`}
            </h1>
            {stageInfo.opponentName && (
              <p className="text-xl text-[#a89f94]">vs {stageInfo.opponentName}</p>
            )}
          </div>
        </div>

        <DialogueDisplay
          lines={preMatchDialogue}
          onComplete={handlePreDialogueComplete}
          title="Before Battle"
        />
      </div>
    );
  }

  // Post-match dialogue phase
  if (dialoguePhase === "post" && battleOutcome) {
    const postDialogue = battleOutcome.won ? postMatchWinDialogue : postMatchLoseDialogue;

    if (postDialogue && postDialogue.length > 0) {
      return (
        <div className="min-h-screen bg-[#0d0a09]">
          {/* Background with outcome */}
          <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
            <h1
              className={`text-6xl font-bold ${battleOutcome.won ? "text-[#d4af37]" : "text-gray-500"}`}
            >
              {battleOutcome.won ? "VICTORY" : "DEFEAT"}
            </h1>
          </div>

          <DialogueDisplay
            lines={postDialogue}
            onComplete={handlePostDialogueComplete}
            title={battleOutcome.won ? "Victory" : "Defeat"}
          />
        </div>
      );
    }
  }

  // Show game board during battle phase
  const difficultyConfig = DIFFICULTY_DISPLAY[difficulty];
  const DifficultyIcon = difficultyConfig.icon;

  return (
    <>
      <div className="min-h-screen bg-[#0d0a09] relative">
        {/* Difficulty Indicator */}
        <div className="absolute top-4 left-4 z-50">
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full border",
              difficultyConfig.bgColor,
              difficultyConfig.borderColor
            )}
          >
            <DifficultyIcon className={cn("w-4 h-4", difficultyConfig.color)} />
            <span className={cn("text-sm font-medium", difficultyConfig.color)}>
              {difficultyConfig.label}
            </span>
          </div>
        </div>

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
