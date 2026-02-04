"use client";

import { Button } from "@/components/ui/button";
import { typedApi, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import { componentLogger, logger, perf, useDebugLifecycle } from "@/lib/debug";
import { categorizeEffect, showEffectActivated } from "@/lib/effectToasts";
import type { Id } from "@convex/_generated/dataModel";
import { Flag, Loader2, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AgentActivityIndicator } from "./AgentActivityIndicator";
import { GameResultScreen } from "./GameResultScreen";
import { TutorialManager } from "./TutorialManager";
import { LifePointsBar } from "./board/LifePointsBar";
import { OpponentBoard } from "./board/OpponentBoard";
import { PlayerBoard } from "./board/PlayerBoard";
import { PlayerHand } from "./board/PlayerHand";
import { ActionButtons } from "./controls/ActionButtons";
import { PhaseBar } from "./controls/PhaseBar";
import { type GamePhase, PhaseSkipButtons } from "./controls/PhaseSkipButtons";
import { PriorityIndicator } from "./controls/PriorityIndicator";
import { TimeoutDisplay } from "./controls/TimeoutDisplay";
import { ActivateCardModal } from "./dialogs/ActivateCardModal";
import { AttackModal } from "./dialogs/AttackModal";
import { CardInspectorModal } from "./dialogs/CardInspectorModal";
import { CardSelectionModal } from "./dialogs/CardSelectionModal";
import { ChainDisplayWidget } from "./dialogs/ChainDisplayWidget";
import { CostPaymentModal } from "./dialogs/CostPaymentModal";
import { ForfeitDialog } from "./dialogs/ForfeitDialog";
import { OptionalTriggerPrompt } from "./dialogs/OptionalTriggerPrompt";
import { ResponsePrompt } from "./dialogs/ResponsePrompt";
import { SummonModal } from "./dialogs/SummonModal";
import { EffectFeedback, useEffectFeedback } from "./effects/EffectFeedback";
import { EffectQueueWidget, type QueuedEffect } from "./effects/EffectQueueWidget";
import { type CardInZone, useGameBoard } from "./hooks/useGameBoard";

interface GameBoardProps {
  lobbyId: Id<"gameLobbies">;
  playerId?: Id<"users">;
  gameMode?: "pvp" | "story";
}

interface TargetCard {
  cardId: Id<"cardDefinitions">;
  name: string;
  instanceId: string;
  imageUrl?: string;
  attack?: number;
  defense?: number;
  cardType?: string;
  monsterStats?: {
    level: number;
    attack: number;
    defense: number;
  };
}

interface ActivationResult {
  success: boolean;
  error?: string;
  requiresSelection?: boolean;
  availableTargets?: TargetCard[];
  selectionSource?: "deck" | "graveyard" | "banished" | "board" | "hand";
  minSelections?: number;
  maxSelections?: number;
  selectionPrompt?: string;
}

interface ChainLink {
  cardId: Id<"cardDefinitions">;
  effect: string;
  spellSpeed: number;
  playerId: Id<"users">;
  chainLink?: number;
  cardName?: string;
}

export function GameBoard({
  lobbyId,
  playerId: providedPlayerId,
  gameMode = "pvp",
}: GameBoardProps) {
  const log = componentLogger("GameBoard");
  const router = useRouter();

  // Debug lifecycle
  useDebugLifecycle("GameBoard", { lobbyId, gameMode });

  // Get player ID from auth if not provided (story mode)
  const authUser = useConvexQuery(typedApi.core.users.currentUser, {});
  const playerId = providedPlayerId || (authUser?._id as Id<"users"> | undefined);

  log.debug("GameBoard rendered", { lobbyId, playerId, gameMode });

  // First check lobby status - MUST be called before any conditional returns
  const lobbyDetails = useConvexQuery(typedApi.gameplay.games.queries.getLobbyDetails, { lobbyId });

  // Selection effect mutations
  const completeSearchEffectMutation = useConvexMutation(
    typedApi.gameplay.gameEngine.spellsTraps.completeSearchEffect
  );
  const completeSearchEffect = useCallback(
    async (args: {
      lobbyId: Id<"gameLobbies">;
      sourceCardId: Id<"cardDefinitions">;
      selectedCardId: Id<"cardDefinitions">;
    }) => {
      return completeSearchEffectMutation(args);
    },
    [completeSearchEffectMutation]
  );

  const {
    // State
    player,
    opponent,
    phase,
    validActions,
    attackOptions,
    pendingAction,
    chainResponses,
    // Computed
    isLoading,
    isPlayerTurn,
    currentPhase,
    isMainPhase,
    isBattlePhase,
    gameEnded,
    winner,
    playableHandCards,
    activatableBackrowCards,
    // Actions
    normalSummon,
    setMonster,
    setSpellTrap,
    advancePhase,
    endTurn,
    declareAttack,
    forfeitGame,
    activateSpell,
    activateFieldSpell,
    activateTrap,
    activateMonsterEffect,
    respondToChain,
  } = useGameBoard(lobbyId, playerId ?? ("" as Id<"users">));

  // UI State
  const [selectedHandCard, setSelectedHandCard] = useState<CardInZone | null>(null);
  const [selectedFieldCard, setSelectedFieldCard] = useState<CardInZone | null>(null);
  const [selectedBackrowCard, setSelectedBackrowCard] = useState<CardInZone | null>(null);
  const [inspectedCard, setInspectedCard] = useState<CardInZone | null>(null);
  const [isInspectedOpponent, setIsInspectedOpponent] = useState(false);
  const [showSummonModal, setShowSummonModal] = useState(false);
  const [showAttackModal, setShowAttackModal] = useState(false);
  const [showForfeitDialog, setShowForfeitDialog] = useState(false);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [showCardInspector, setShowCardInspector] = useState(false);
  const [isForfeitLoading, setIsForfeitLoading] = useState(false);

  // Card Selection State (for search effects, etc.)
  const [cardSelection, setCardSelection] = useState<{
    cards: CardInZone[];
    zone: "deck" | "graveyard" | "banished" | "board" | "hand";
    selectionMode?: "single" | "multi";
    minSelections?: number;
    maxSelections?: number;
    title?: string;
    description?: string;
    callback: (cardIds: Id<"cardDefinitions">[]) => void;
  } | null>(null);

  // Effect Feedback System
  const effectFeedback = useEffectFeedback();
  const [effectQueue, _setEffectQueue] = useState<QueuedEffect[]>([]);

  // Cost Payment State
  const [costPayment, setCostPayment] = useState<{
    cardId: Id<"cardDefinitions">;
    cardName: string;
    costType: "discard" | "pay_lp" | "tribute" | "banish";
    costValue: number;
    availableCards: CardInZone[];
    effectIndex?: number;
    callback: (costTargets?: Id<"cardDefinitions">[]) => void;
  } | null>(null);

  // New feature queries
  const pendingOptionalTriggers = useConvexQuery(
    typedApi.gameplay.games.queries.getPendingOptionalTriggers,
    { lobbyId }
  );
  const timeoutStatus = useConvexQuery(typedApi.gameplay.games.queries.getTimeoutStatus, {
    lobbyId,
  });

  // Effect Notifications - Subscribe to auto-triggered effects
  const lastEventTimestamp = useRef<number>(Date.now());
  const gameEventsArgs = lobbyId
    ? {
        lobbyId,
        sinceTimestamp: lastEventTimestamp.current,
        eventTypes: ["effect_activated"],
        limit: 10,
      }
    : "skip";
  const gameEvents = useConvexQuery(
    typedApi.gameplay.gameEvents.subscribeToGameEvents,
    gameEventsArgs
  );

  // Show toast notifications for auto-triggered effects
  useEffect(() => {
    if (!gameEvents || gameEvents.length === 0) return;

    gameEvents.forEach(
      (event: {
        timestamp: number;
        description?: string;
        metadata?: { trigger?: string; cardName?: string };
      }) => {
        // Update last seen timestamp
        if (event.timestamp > lastEventTimestamp.current) {
          lastEventTimestamp.current = event.timestamp;
        }

        // Don't show notifications for manual activations (handled by other toasts)
        if (event.metadata?.trigger === "manual") return;

        const cardName = event.metadata?.cardName as string | undefined;
        const description = event.description || "Effect activated";

        // Use enhanced toast with categorization
        categorizeEffect(description);
        showEffectActivated(cardName || "Card Effect", description);
      }
    );
  }, [gameEvents]);

  const attackableAttackers = useMemo(() => {
    if (!attackOptions) return new Set<Id<"cardDefinitions">>();
    return new Set(
      attackOptions.filter((option) => option.canAttack).map((option) => option.instanceId)
    );
  }, [attackOptions]);

  const selectedAttackOption = useMemo(() => {
    if (!attackOptions || !selectedFieldCard) return null;
    return (
      attackOptions.find((option) => option.instanceId === selectedFieldCard.instanceId) ?? null
    );
  }, [attackOptions, selectedFieldCard]);

  const targetableCards = useMemo(() => {
    if (!isBattlePhase || !selectedAttackOption || !selectedAttackOption.canAttack) {
      return new Set<Id<"cardDefinitions">>();
    }
    return new Set(selectedAttackOption.validTargets);
  }, [isBattlePhase, selectedAttackOption]);

  const attackTargets = useMemo(() => {
    if (!selectedAttackOption || !opponent) return [];
    const opponentField = new Map<Id<"cardDefinitions">, CardInZone>();
    if (opponent.frontline) {
      opponentField.set(opponent.frontline.instanceId, opponent.frontline);
    }
    for (const card of opponent.support) {
      opponentField.set(card.instanceId, card);
    }

    return selectedAttackOption.validTargets.flatMap((targetId) => {
      const card = opponentField.get(targetId);
      if (!card) return [];
      return [
        {
          instanceId: card.instanceId,
          name: card.name,
          attack: card.monsterStats?.attack,
          defense: card.monsterStats?.defense,
          position: card.position ?? (card.isFaceDown ? "setDefense" : "attack"),
          isFaceDown: card.isFaceDown,
        },
      ];
    });
  }, [selectedAttackOption, opponent]);

  const canAttack = useMemo(() => {
    return attackOptions?.some((option) => option.canAttack) ?? false;
  }, [attackOptions]);

  const defaultAttacker = useMemo(() => {
    if (!player || attackableAttackers.size === 0) return null;
    if (player.frontline && attackableAttackers.has(player.frontline.instanceId)) {
      return player.frontline;
    }
    return player.support.find((card) => attackableAttackers.has(card.instanceId)) ?? null;
  }, [player, attackableAttackers]);

  const handleDeclareAttack = useCallback(
    async (targetId?: Id<"cardDefinitions">) => {
      if (!selectedFieldCard) return;

      const result = await declareAttack(selectedFieldCard.instanceId, targetId);

      if (result.success) {
        toast.success(`${selectedFieldCard.name} attacked!`);
        setSelectedFieldCard(null);
        setShowAttackModal(false);
      } else if (result.error) {
        toast.error("Attack Failed", {
          description: result.error,
        });
      }
    },
    [selectedFieldCard, declareAttack]
  );

  const handleHandCardClick = useCallback(
    (card: CardInZone) => {
      console.log("Hand card clicked:", {
        cardName: card.name,
        isPlayerTurn,
        isMainPhase,
        currentPhase: phase?.currentPhase,
        validActions,
      });

      if (!isPlayerTurn) {
        toast.warning("Not Your Turn", {
          description: "Wait for your opponent to finish their turn.",
        });
        return;
      }

      if (!isMainPhase) {
        const phaseNames: Record<string, string> = {
          draw: "Draw Phase",
          standby: "Standby Phase",
          main1: "Main Phase 1",
          battle_start: "Battle Start",
          battle: "Battle Phase",
          battle_end: "Battle End",
          main2: "Main Phase 2",
          end: "End Phase",
        };
        const phaseName =
          phaseNames[phase?.currentPhase || ""] || phase?.currentPhase || "Unknown Phase";
        toast.warning("Wrong Phase", {
          description: `You can only play cards during Main Phase 1 or Main Phase 2. Current Phase: ${phaseName}. Click the "Next" or "Battle" button to advance.`,
        });
        return;
      }

      // Allow clicking any card in hand - backend will validate if action is allowed
      console.log("Opening card dialog for:", card.name);
      setSelectedHandCard(card);
      setShowSummonModal(true);
    },
    [isPlayerTurn, isMainPhase, phase, validActions]
  );

  const handleMonsterAttackClick = useCallback(
    (card: CardInZone) => {
      if (!isBattlePhase || !isPlayerTurn) return;
      console.log("Monster attack button clicked:", card.name);
      setSelectedFieldCard(card);
      setShowAttackModal(true);
    },
    [isBattlePhase, isPlayerTurn]
  );

  const handleFieldCardClick = useCallback(
    (card: CardInZone) => {
      // Check if this is a battle phase attack
      if (isBattlePhase && isPlayerTurn && attackableAttackers.has(card.instanceId)) {
        setSelectedFieldCard(card);
        setShowAttackModal(true);
        return;
      }

      // Check if this is selecting an attack target
      if (isBattlePhase && selectedFieldCard && targetableCards.has(card.instanceId)) {
        handleDeclareAttack(card.instanceId);
        return;
      }

      // Check if this is your own monster with activatable effects
      const isPlayerCard =
        player?.frontline?.instanceId === card.instanceId ||
        player?.support?.some((c) => c.instanceId === card.instanceId);
      const isMonster = card.cardType === "monster" || card.cardType === "creature";
      const hasManualEffects = card.effects?.some(
        (e) => e.activationType === "ignition" || e.activationType === "quick"
      );

      if (isPlayerCard && isMonster && hasManualEffects && !card.isFaceDown && isPlayerTurn) {
        // Show activation modal for monster with manual effects
        setSelectedFieldCard(card);
        setShowActivateModal(true);
        return;
      }

      // Default: Show card inspector for face-up cards
      if (!card.isFaceDown) {
        setInspectedCard(card);
        const isOpponentCard =
          opponent?.frontline?.instanceId === card.instanceId ||
          opponent?.support?.some((c) => c.instanceId === card.instanceId) ||
          opponent?.backrow?.some((c) => c.instanceId === card.instanceId);
        setIsInspectedOpponent(isOpponentCard ?? false);
        setShowCardInspector(true);
        return;
      }

      setSelectedFieldCard((prev) => (prev?.instanceId === card.instanceId ? null : card));
    },
    [
      isBattlePhase,
      isPlayerTurn,
      player,
      opponent,
      attackableAttackers,
      selectedFieldCard,
      targetableCards,
      handleDeclareAttack,
    ]
  );

  const handleSummon = useCallback(
    async (position: "attack" | "defense", tributeIds?: Id<"cardDefinitions">[]) => {
      if (!selectedHandCard) return;

      logger.userAction("summon_monster", {
        cardName: selectedHandCard.name,
        position,
        tributesCount: tributeIds?.length || 0,
      });

      // Calculate tributes required based on monster level
      const level = selectedHandCard.monsterStats?.level ?? 0;
      const tributesRequired = level >= 7 ? 2 : level >= 5 ? 1 : 0;
      const tributesProvided = tributeIds?.length ?? 0;

      log.debug("Calculating tribute requirements", {
        cardName: selectedHandCard.name,
        level,
        tributesRequired,
        tributesProvided,
      });

      // Validate tributes before attempting summon
      if (tributesRequired > 0 && tributesProvided < tributesRequired) {
        log.warn("Insufficient tributes", {
          cardName: selectedHandCard.name,
          required: tributesRequired,
          provided: tributesProvided,
        });
        toast.error("Tribute Required", {
          description: `This Level ${level} monster requires ${tributesRequired} tribute${tributesRequired > 1 ? "s" : ""}. Please select ${tributesRequired} monster${tributesRequired > 1 ? "s" : ""} from your field to tribute.`,
        });
        return;
      }

      const result = await perf.time(`normalSummon_${selectedHandCard.name}`, async () =>
        normalSummon(selectedHandCard.instanceId, position, tributeIds)
      );

      if (result.success) {
        log.info("Monster summoned successfully", {
          cardName: selectedHandCard.name,
          position,
        });
        toast.success(`${selectedHandCard.name} summoned in ${position} position!`);
        setSelectedHandCard(null);
        setShowSummonModal(false);
      } else if (result.error) {
        log.warn("Summon failed", { cardName: selectedHandCard.name, error: result.error });
        toast.error("Summon Failed", {
          description: result.error,
        });
      }
    },
    [selectedHandCard, normalSummon, log]
  );

  const handleSetMonster = useCallback(async () => {
    if (!selectedHandCard) return;

    const result = await setMonster(selectedHandCard.instanceId);

    if (result.success) {
      toast.success(`${selectedHandCard.name} set face-down in defense position!`);
      setSelectedHandCard(null);
      setShowSummonModal(false);
    } else if (result.error) {
      toast.error("Set Monster Failed", {
        description: result.error,
      });
    }
  }, [selectedHandCard, setMonster]);

  const handleSetSpellTrap = useCallback(async () => {
    if (!selectedHandCard) return;

    const result = await setSpellTrap(selectedHandCard.instanceId);

    if (result.success) {
      toast.success(`${selectedHandCard.name} set face-down in spell/trap zone!`);
      setSelectedHandCard(null);
      setShowSummonModal(false);
    } else if (result.error) {
      toast.error("Set Spell/Trap Failed", {
        description: result.error,
      });
    }
  }, [selectedHandCard, setSpellTrap]);

  const handleHandCardActivate = useCallback(async () => {
    if (!selectedHandCard) return;

    let result: ActivationResult;
    if (selectedHandCard.cardType === "field") {
      result = await activateFieldSpell(selectedHandCard.instanceId);
    } else {
      result = await activateSpell(selectedHandCard.instanceId);
    }

    // Check if effect requires player selection (search, etc.)
    if (result?.success && result.requiresSelection && Array.isArray(result.availableTargets)) {
      setCardSelection({
        cards: result.availableTargets.map((target) => ({
          cardId: target.cardId,
          name: target.name,
          cardType: target.cardType,
          imageUrl: target.imageUrl,
          monsterStats: target.monsterStats,
          instanceId: target.cardId, // Use cardId as instanceId for selection
        })),
        zone: result.selectionSource || "deck",
        selectionMode: (result.maxSelections || 1) > 1 ? "multi" : "single",
        minSelections: result.minSelections || 1,
        maxSelections: result.maxSelections || 1,
        title: result.selectionPrompt?.split(":")[0] || "Select Cards",
        description: result.selectionPrompt || "Select a card",
        callback: async (selectedIds) => {
          try {
            await completeSearchEffect({
              lobbyId,
              sourceCardId: selectedHandCard.cardId,
              selectedCardId: selectedIds[0]!,
            });
            toast.success("Card added to hand!");
            setSelectedHandCard(null);
            setShowSummonModal(false);
          } catch (_error) {
            toast.error("Failed to complete search");
          }
        },
      });
    } else if (result?.success) {
      toast.success(`${selectedHandCard.name} activated!`);
      setSelectedHandCard(null);
      setShowSummonModal(false);
    } else if (result?.error) {
      toast.error("Activation Failed", {
        description: result.error,
      });
    }
  }, [selectedHandCard, activateSpell, activateFieldSpell, lobbyId, completeSearchEffect]);

  const handleAdvancePhase = useCallback(async () => {
    const result = await advancePhase();
    if (!result.success && result.error) {
      toast.error("Phase Advance Failed", {
        description: result.error,
      });
    }
  }, [advancePhase]);

  const handleEndTurn = useCallback(async () => {
    const result = await endTurn();
    if (!result.success && result.error) {
      toast.error("End Turn Failed", {
        description: result.error,
      });
    }
  }, [endTurn]);

  const handleForfeit = useCallback(async () => {
    setIsForfeitLoading(true);
    try {
      const result = await forfeitGame();
      if (result.success) {
        toast.info("Game forfeited");

        // Redirect to appropriate screen after forfeit
        if (gameMode === "story") {
          // Redirect back to story mode page
          router.push("/play/story");
        } else {
          // Redirect to lobby for PVP games
          router.push("/lunchtable");
        }
      } else if (result.error) {
        toast.error("Forfeit Failed", {
          description: result.error,
        });
      }
    } finally {
      setIsForfeitLoading(false);
      setShowForfeitDialog(false);
    }
  }, [forfeitGame, gameMode, router]);

  const handleBackrowCardClick = useCallback((card: CardInZone) => {
    setSelectedBackrowCard(card);
    setShowActivateModal(true);
  }, []);

  // Cost payment query
  const getPendingCostMutation = useConvexMutation(
    typedApi.gameplay.effectSystem.costPayment.getPendingCostRequirement
  );

  const handleActivateCard = useCallback(
    async (effectIndex?: number, costTargets?: Id<"cardDefinitions">[]) => {
      const selectedCard = selectedBackrowCard || selectedFieldCard;
      if (!selectedCard) return;

      const isField = selectedCard.cardType === "field";
      const isSpell = selectedCard.cardType === "spell" || selectedCard.cardType === "equipment";
      const isTrap = selectedCard.cardType === "trap";
      const isMonster = selectedCard.cardType === "monster" || selectedCard.cardType === "creature";

      // Check for cost requirement first
      try {
        const costCheck = await getPendingCostMutation({
          lobbyId,
          cardId: selectedCard.cardId,
          effectIndex,
        });

        if (costCheck.hasCost && costCheck.canPay && costCheck.requiresSelection && !costTargets) {
          // Show cost payment modal
          setCostPayment({
            cardId: selectedCard.cardId,
            cardName: costCheck.cardName || selectedCard.name,
            costType: costCheck.costType as "discard" | "pay_lp" | "tribute" | "banish",
            costValue: costCheck.costValue || 1,
            availableCards: ((costCheck.availableTargets || []) as TargetCard[]).map((target) => ({
              cardId: target.cardId,
              name: target.name,
              cardType: target.cardType,
              imageUrl: target.imageUrl,
              monsterStats: target.monsterStats,
              instanceId: target.cardId,
            })),
            effectIndex,
            callback: async (selectedCostTargets) => {
              // Recursively call with cost targets
              await handleActivateCard(effectIndex, selectedCostTargets);
              setCostPayment(null);
            },
          });
          return;
        }
      } catch (error) {
        // Cost check failed, continue with activation attempt
        console.error("Cost check error:", error);
      }

      let result: ActivationResult | undefined;
      if (isField) {
        result = await activateFieldSpell(selectedCard.instanceId, effectIndex);
      } else if (isSpell) {
        result = await activateSpell(selectedCard.instanceId, effectIndex);
      } else if (isTrap) {
        result = await activateTrap(selectedCard.instanceId, effectIndex);
      } else if (isMonster) {
        result = await activateMonsterEffect(selectedCard.instanceId, effectIndex);
      } else {
        return; // Not a valid card type
      }

      // Check if effect requires player selection
      if (result?.success && result.requiresSelection && Array.isArray(result.availableTargets)) {
        setCardSelection({
          cards: result.availableTargets.map((target) => ({
            cardId: target.cardId,
            name: target.name,
            cardType: target.cardType,
            imageUrl: target.imageUrl,
            monsterStats: target.monsterStats,
            instanceId: target.cardId,
          })),
          zone: result.selectionSource || "deck",
          selectionMode: (result.maxSelections || 1) > 1 ? "multi" : "single",
          minSelections: result.minSelections || 1,
          maxSelections: result.maxSelections || 1,
          title: result.selectionPrompt?.split(":")[0] || "Select Cards",
          description: result.selectionPrompt || "Select a card",
          callback: async (selectedIds) => {
            try {
              await completeSearchEffect({
                lobbyId,
                sourceCardId: selectedCard.cardId,
                selectedCardId: selectedIds[0]!,
              });
              toast.success("Card added to hand!");
              setSelectedBackrowCard(null);
              setShowActivateModal(false);
            } catch (_error) {
              toast.error("Failed to complete effect");
            }
          },
        });
      } else if (result?.success) {
        toast.success(`${selectedCard.name} activated!`);
        setSelectedBackrowCard(null);
        setSelectedFieldCard(null);
        setShowActivateModal(false);
      } else if (result?.error) {
        toast.error("Activation Failed", {
          description: result.error,
        });
      }
    },
    [
      selectedBackrowCard,
      selectedFieldCard,
      activateSpell,
      activateFieldSpell,
      activateTrap,
      activateMonsterEffect,
      lobbyId,
      completeSearchEffect,
      getPendingCostMutation,
    ]
  );

  const handleChainResponse = useCallback(
    async (cardInstanceId: Id<"cardDefinitions">, effectIndex: number) => {
      await respondToChain({
        cardId: cardInstanceId,
        effectIndex,
      });
    },
    [respondToChain]
  );

  const handlePassChain = useCallback(async () => {
    await respondToChain("pass");
  }, [respondToChain]);

  const responseCards = useMemo(() => {
    if (!chainResponses || !chainResponses.chain || !player) return [];

    return chainResponses.chain.map((response) => {
      const card =
        player.backrow.find((c) => c.instanceId === response.cardId) ??
        player.hand.find((c) => c.instanceId === response.cardId);

      return {
        cardId: response.cardId,
        effectName: response.effect,
        effectIndex: 0,
        speed: response.spellSpeed as 1 | 2 | 3,
        card,
      };
    });
  }, [chainResponses, player]);

  // Player ID check - MUST happen after all hooks are called
  if (!playerId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0d0a09]">
        <Loader2 className="w-8 h-8 animate-spin text-[#d4af37]" />
      </div>
    );
  }

  // Waiting for opponent state
  if (lobbyDetails && lobbyDetails.status === "waiting") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d0a09]">
        <div className="flex flex-col items-center gap-4 p-8 rounded-xl border border-[#3d2b1f] bg-black/40">
          <Users className="h-16 w-16 text-[#d4af37] animate-pulse" />
          <h2 className="text-2xl font-bold text-[#e8e0d5]">Waiting for Opponent</h2>
          <p className="text-sm text-[#a89f94] text-center max-w-md">
            Your game lobby is ready. Share your join code or wait for someone to join from the
            lobby list.
          </p>
          {lobbyDetails.joinCode && (
            <div className="flex flex-col items-center gap-2 mt-2">
              <p className="text-xs text-[#a89f94]">Private Game Code:</p>
              <div className="px-4 py-2 rounded-lg bg-[#d4af37]/20 border border-[#d4af37]/30">
                <p
                  className="text-2xl font-mono font-bold text-[#d4af37] tracking-wider"
                  data-testid="game-code"
                >
                  {lobbyDetails.joinCode}
                </p>
              </div>
            </div>
          )}
          <Loader2 className="h-6 w-6 animate-spin text-[#d4af37] mt-2" />
          <Button asChild variant="outline" className="mt-4">
            <Link href="/lunchtable">Back to Lobby</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d0a09]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Loading game...</span>
        </div>
      </div>
    );
  }

  // Game ended state
  if (gameEnded) {
    const isWinner = winner === "player";
    const returnLink = gameMode === "story" ? "/play/story" : "/lunchtable";

    const playerFieldCount =
      (player?.support?.length ?? 0) + (player?.backrow?.length ?? 0) + (player?.frontline ? 1 : 0);
    const playerDamageReceived = player?.maxLifePoints
      ? player.maxLifePoints - (player?.lifePoints ?? 0)
      : 0;
    const opponentDamageReceived = opponent?.maxLifePoints
      ? opponent.maxLifePoints - (opponent?.lifePoints ?? 0)
      : 0;

    return (
      <GameResultScreen
        result={isWinner ? "victory" : "defeat"}
        playerName={player?.playerName ?? "Player"}
        opponentName={opponent?.playerName ?? "Opponent"}
        stats={{
          damageDealt: opponentDamageReceived,
          damageReceived: playerDamageReceived,
          cardsPlayed: playerFieldCount,
          creaturesDestroyed: 0,
          spellsCast: 0,
          turnsPlayed: phase?.turnNumber ?? 0,
          matchDuration: 0,
        }}
        rewards={{
          gold: isWinner ? 100 : 25,
          xp: isWinner ? 50 : 10,
        }}
        gameMode={gameMode === "story" ? "story" : "casual"}
        isOpen={true}
        onReturnToMenu={() => {
          router.push(returnLink);
        }}
      />
    );
  }

  // No data state
  if (!player || !opponent || !phase) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#0d0a09]">
        <div className="text-xs text-muted-foreground">Game data not available</div>
      </div>
    );
  }

  // Determine summon options based on card type
  const isCreature = selectedHandCard?.cardType === "creature";
  const isSpell = selectedHandCard?.cardType === "spell";
  const isTrap = selectedHandCard?.cardType === "trap";

  const canSummonAttack = isCreature && (validActions?.canNormalSummon ?? false);
  const canSummonDefense = isCreature && (validActions?.canNormalSummon ?? false);
  const canSetMonster = isCreature && (validActions?.canSetMonster ?? false);
  const canSetSpellTrap = (isSpell || isTrap) && (validActions?.canSetSpellTrap ?? false);

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-arena flex flex-col"
      data-testid="game-board"
      role="application"
      aria-label={`Game board - ${isPlayerTurn ? "Your turn" : "Opponent's turn"} - ${currentPhase} phase`}
    >
      {/* Decorative Overlay */}
      <div className="absolute inset-0 bg-black/40 z-0" />
      <div className="absolute inset-0 bg-vignette z-0 pointer-events-none" />

      {/* Screen reader announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {isPlayerTurn ? "Your turn" : "Opponent's turn"}, {currentPhase} phase. Your life points:{" "}
        {player?.lifePoints ?? 0}. Opponent life points: {opponent?.lifePoints ?? 0}.
      </div>

      {/* Game Content Container - full height, no scroll */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Top Bar: Opponent Life Points + Timeout + Forfeit Button */}
        <div className="px-2 pt-2 flex items-center justify-between gap-2 shrink-0">
          <LifePointsBar
            playerName={opponent.playerName}
            lifePoints={opponent.lifePoints}
            maxLifePoints={opponent.maxLifePoints}
            isOpponent
            isActive={!isPlayerTurn}
            isAi={opponent.playerType === "ai"}
          />
          <div className="flex items-center gap-2">
            {/* Timeout Display */}
            {timeoutStatus && (
              <TimeoutDisplay
                actionTimeRemainingMs={timeoutStatus.actionTimeRemainingMs}
                matchTimeRemainingMs={timeoutStatus.matchTimeRemainingMs}
                isWarning={timeoutStatus.isWarning}
                isTimedOut={timeoutStatus.isTimedOut}
                isMatchTimedOut={timeoutStatus.isMatchTimedOut}
                className="hidden sm:flex"
              />
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowForfeitDialog(true)}
              className="text-red-500 hover:text-red-400 hover:bg-red-500/10 text-[10px] h-7 px-2"
            >
              <Flag className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Forfeit</span>
            </Button>
          </div>
        </div>

        {/* Opponent Hand */}
        <div
          className="shrink-0"
          role="region"
          aria-label={`Opponent's hand: ${opponent.handCount} cards`}
        >
          <PlayerHand cards={[]} handCount={opponent.handCount} isOpponent />
        </div>

        {/* Opponent Board */}
        <div
          className="border-b border-slate-700/50 shrink-0"
          role="region"
          aria-label="Opponent's field"
        >
          <OpponentBoard
            board={opponent}
            selectedCard={selectedFieldCard?.instanceId}
            targetableCards={targetableCards}
            onCardClick={handleFieldCardClick}
          />
        </div>

        {/* Phase Bar (Center) */}
        <div className="px-2 py-1 border-y border-white/5 bg-black/40 backdrop-blur-sm shrink-0">
          <PhaseBar
            currentPhase={currentPhase}
            turnNumber={phase.turnNumber}
            isPlayerTurn={isPlayerTurn}
            canAdvancePhase={validActions?.canAdvancePhase ?? false}
            onAdvancePhase={handleAdvancePhase}
            onEndTurn={handleEndTurn}
          />
        </div>

        {/* Player Board */}
        <div className="border-b border-white/5 shrink-0" role="region" aria-label="Your field">
          <PlayerBoard
            board={player}
            selectedCard={selectedFieldCard?.instanceId}
            attackingCard={phase.attackingCardId}
            targetableCards={targetableCards}
            attackableCards={attackableAttackers}
            onCardClick={handleFieldCardClick}
            onCardAttack={handleMonsterAttackClick}
            onEmptyBackrowClick={handleSetSpellTrap}
            activatableBackrowCards={activatableBackrowCards}
            onBackrowCardClick={handleBackrowCardClick}
          />
        </div>

        {/* Player Hand - flexible, takes remaining space */}
        <div
          className="flex-1 min-h-0 border-b border-white/5 bg-black/20 overflow-visible relative"
          role="region"
          aria-label={`Your hand: ${player.hand.length} cards`}
        >
          <div className="absolute inset-0 bg-linear-to-t from-primary/5 to-transparent pointer-events-none" />
          <PlayerHand
            cards={player.hand}
            handCount={player.hand.length}
            playableCards={playableHandCards}
            selectedCard={selectedHandCard?.instanceId}
            onCardClick={handleHandCardClick}
          />
        </div>

        {/* Player Life Points & Actions */}
        <div
          className="px-2 py-1.5 flex items-center justify-between gap-2 shrink-0"
          role="region"
          aria-label="Your status and actions"
        >
          <LifePointsBar
            playerName={player.playerName}
            lifePoints={player.lifePoints}
            maxLifePoints={player.maxLifePoints}
            isActive={isPlayerTurn}
          />

          <div className="flex items-center gap-2">
            {/* Phase Skip Buttons */}
            <PhaseSkipButtons
              lobbyId={lobbyId}
              currentPhase={currentPhase as GamePhase}
              isCurrentPlayerTurn={isPlayerTurn}
            />

            <ActionButtons
              isPlayerTurn={isPlayerTurn}
              isBattlePhase={isBattlePhase}
              canAttack={canAttack}
              canEndTurn={validActions?.canEndTurn ?? false}
              onEndTurn={handleEndTurn}
              onAttack={() => {
                if (defaultAttacker) {
                  setSelectedFieldCard(defaultAttacker);
                  setShowAttackModal(true);
                }
              }}
            />
          </div>
        </div>

        {/* Modals */}
        <SummonModal
          isOpen={showSummonModal}
          card={selectedHandCard}
          canSummonAttack={canSummonAttack ?? false}
          canSummonDefense={canSummonDefense ?? false}
          canSet={
            selectedHandCard?.cardType === "creature"
              ? (canSetMonster ?? false)
              : (canSetSpellTrap ?? false)
          }
          canActivate={
            selectedHandCard?.cardType === "spell" && (validActions?.canActivateSpell ?? false)
          }
          tributesRequired={
            selectedHandCard?.monsterStats?.level
              ? selectedHandCard.monsterStats.level >= 7
                ? 2
                : selectedHandCard.monsterStats.level >= 5
                  ? 1
                  : 0
              : 0
          }
          availableTributes={
            player?.frontline || player?.support?.length > 0
              ? [...(player.frontline ? [player.frontline] : []), ...(player.support || [])].filter(
                  (card) => !card.isFaceDown
                )
              : []
          }
          onSummon={handleSummon}
          onSet={selectedHandCard?.cardType === "creature" ? handleSetMonster : handleSetSpellTrap}
          onActivate={handleHandCardActivate}
          onClose={() => {
            setShowSummonModal(false);
            setSelectedHandCard(null);
          }}
        />

        <AttackModal
          isOpen={showAttackModal}
          attacker={selectedAttackOption}
          targets={attackTargets}
          canDirectAttack={selectedAttackOption?.canDirectAttack ?? false}
          onSelectTarget={handleDeclareAttack}
          onClose={() => {
            setShowAttackModal(false);
            setSelectedFieldCard(null);
          }}
        />

        <ForfeitDialog
          isOpen={showForfeitDialog}
          onConfirm={handleForfeit}
          onCancel={() => setShowForfeitDialog(false)}
          isLoading={isForfeitLoading}
        />

        <ActivateCardModal
          isOpen={showActivateModal}
          card={selectedBackrowCard || selectedFieldCard}
          canActivate={
            selectedBackrowCard
              ? activatableBackrowCards.has(selectedBackrowCard.instanceId)
              : selectedFieldCard
                ? isPlayerTurn && isMainPhase
                : false
          }
          onActivate={handleActivateCard}
          onClose={() => {
            setShowActivateModal(false);
            setSelectedBackrowCard(null);
            setSelectedFieldCard(null);
          }}
        />

        <ResponsePrompt
          isOpen={!!pendingAction && responseCards.length > 0}
          actionType="chain_response"
          responseCards={responseCards}
          timeRemaining={30000}
          onActivate={handleChainResponse}
          onPass={handlePassChain}
        />

        <CardInspectorModal
          isOpen={showCardInspector}
          card={inspectedCard}
          isOpponentCard={isInspectedOpponent}
          onClose={() => {
            setShowCardInspector(false);
            setInspectedCard(null);
          }}
        />

        <CardSelectionModal
          isOpen={!!cardSelection}
          cards={cardSelection?.cards || []}
          zone={cardSelection?.zone || "deck"}
          selectionMode={cardSelection?.selectionMode || "single"}
          minSelections={cardSelection?.minSelections || 1}
          maxSelections={cardSelection?.maxSelections || 1}
          title={cardSelection?.title}
          description={cardSelection?.description}
          onConfirm={(selectedIds) => {
            if (cardSelection?.callback) {
              cardSelection.callback(selectedIds);
            }
            setCardSelection(null);
          }}
          onCancel={() => setCardSelection(null)}
        />

        {/* Cost Payment Modal */}
        {costPayment && (
          <CostPaymentModal
            isOpen={true}
            costType={costPayment.costType}
            costValue={costPayment.costValue}
            currentLP={player?.lifePoints}
            availableCards={costPayment.availableCards}
            sourceCardName={costPayment.cardName}
            onConfirm={(selectedCardIds) => {
              costPayment.callback(selectedCardIds);
              setCostPayment(null);
            }}
            onCancel={() => {
              setCostPayment(null);
            }}
          />
        )}

        {/* Optional Trigger Prompt */}
        {playerId && pendingOptionalTriggers && pendingOptionalTriggers.length > 0 && (
          <OptionalTriggerPrompt
            pendingTriggers={pendingOptionalTriggers}
            lobbyId={lobbyId}
            currentPlayerId={playerId}
            onClose={() => {
              // Component manages its own state - closing handled internally
            }}
          />
        )}

        {/* Chain Display Widget */}
        {chainResponses?.chain && chainResponses.chain.length > 0 && (
          <ChainDisplayWidget
            chain={chainResponses.chain.map((c: ChainLink) => ({
              chainPosition: c.chainLink || 1,
              cardId: c.cardId,
              cardName: c.cardName || "Unknown Card",
              effectName: typeof c.effect === "string" ? c.effect : "Effect",
              spellSpeed: (c.spellSpeed || 1) as 1 | 2 | 3,
              playerId: c.playerId,
            }))}
            currentPlayerId={playerId}
            isResolving={false}
          />
        )}

        {/* Priority Indicator */}
        {chainResponses?.priorityPlayer && (
          <PriorityIndicator
            isOpen={true}
            windowType="open"
            hasPriority={chainResponses.canRespond}
            isChainOpen={chainResponses.chain && chainResponses.chain.length > 0}
            onPass={async () => {
              await respondToChain("pass");
            }}
          />
        )}

        {/* Effect Feedback System */}
        <EffectFeedback
          floatingNumbers={effectFeedback.floatingNumbers}
          animations={effectFeedback.animations}
        />

        {/* Effect Queue Widget */}
        {effectQueue.length > 0 && <EffectQueueWidget effects={effectQueue} isResolving={false} />}

        {/* elizaOS Agent Activity Indicator */}
        <AgentActivityIndicator lobbyId={lobbyId} />

        {/* Tutorial Manager (Story Mode Only) */}
        {gameMode === "story" && player && opponent && phase && (
          <TutorialManager
            enabled={true}
            gameState={{
              currentPhase: currentPhase,
              isPlayerTurn,
              turnNumber: phase.turnNumber,
              myLifePoints: player.lifePoints,
              opponentLifePoints: opponent.lifePoints,
              myHand: player.hand || [],
              myField: [
                ...(player.support || []),
                ...(player.backrow || []),
                ...(player.frontline ? [player.frontline] : []),
              ],
            }}
          />
        )}
      </div>
    </div>
  );
}
