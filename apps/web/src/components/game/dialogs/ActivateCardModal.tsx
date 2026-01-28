"use client";

import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X, Zap } from "lucide-react";
import Image from "next/image";
import type { CardInZone } from "../hooks/useGameBoard";

interface ActivateCardModalProps {
  isOpen: boolean;
  card: CardInZone | null;
  canActivate: boolean;
  onActivate: (effectIndex?: number) => void;
  onClose: () => void;
}

export function ActivateCardModal({
  isOpen,
  card,
  canActivate,
  onActivate,
  onClose,
}: ActivateCardModalProps) {
  if (!card) return null;

  const isSpell =
    card.cardType === "spell" || card.cardType === "equipment" || card.cardType === "field";
  const isTrap = card.cardType === "trap";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-xs"
          >
            <div className="bg-background border rounded-xl shadow-2xl p-3">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-sm">{card.name}</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    {isSpell && (
                      <>
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
                        Spell Card
                      </>
                    )}
                    {isTrap && (
                      <>
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-500" />
                        Trap Card
                      </>
                    )}
                  </p>
                </div>
                <Button size="icon" variant="ghost" onClick={onClose} className="h-7 w-7">
                  <X className="h-3 w-3" />
                </Button>
              </div>

              {/* Card Preview */}
              <div className="flex justify-center mb-3">
                <div className="w-20 h-28 rounded-lg border-2 overflow-hidden">
                  {card.imageUrl ? (
                    <Image
                      src={card.imageUrl}
                      alt={card.name || "Card"}
                      width={80}
                      height={112}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className={`w-full h-full flex items-center justify-center ${
                        isSpell
                          ? "bg-linear-to-br from-green-600 to-green-800"
                          : "bg-linear-to-br from-purple-600 to-purple-800"
                      }`}
                    >
                      <span className="text-[10px] text-white/80 text-center px-2">
                        {card.name}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Effects */}
              {card.effects && card.effects.length > 0 && (
                <div className="mb-3 max-h-24 overflow-y-auto space-y-1">
                  {card.effects.map((effect, index) => (
                    <div
                      key={`effect-${effect.name}-${index}`}
                      className="p-2 border rounded-md bg-muted/30 text-xs"
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium">{effect.name}</span>
                        {effect.effectType && (
                          <span className="text-[10px] px-1 py-0.5 bg-primary/10 text-primary rounded">
                            {effect.effectType}
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground text-[10px]">{effect.description}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Activation Options */}
              <div className="space-y-1.5">
                {canActivate ? (
                  <>
                    <p className="text-xs text-muted-foreground text-center mb-2">
                      {card.isFaceDown ? "Activate this card?" : "Use this card's effect?"}
                    </p>

                    {/* Helpful hint for trap cards */}
                    {isTrap && card.isFaceDown && (
                      <div className="p-2 bg-purple-500/10 border border-purple-500/30 rounded text-center mb-2">
                        <p className="text-[10px] text-purple-300 font-medium">
                          💡 Trap cards can be activated during any player's turn!
                        </p>
                      </div>
                    )}

                    {/* Activate each effect (usually just one) */}
                    {card.effects && card.effects.length > 0 ? (
                      card.effects.map((effect, index) => (
                        <Button
                          key={`activate-${effect.name}-${index}`}
                          className="w-full justify-start gap-2 h-auto py-2"
                          variant="outline"
                          onClick={() => onActivate(index)}
                        >
                          <Zap
                            className={`h-4 w-4 ${isSpell ? "text-green-500" : "text-purple-500"}`}
                          />
                          <div className="text-left">
                            <div className="font-medium text-xs">Activate: {effect.name}</div>
                            <div className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                              {effect.description}
                            </div>
                          </div>
                        </Button>
                      ))
                    ) : (
                      <Button
                        className="w-full justify-start gap-2 h-auto py-2"
                        variant="outline"
                        onClick={() => onActivate()}
                      >
                        <Sparkles
                          className={`h-4 w-4 ${isSpell ? "text-green-500" : "text-purple-500"}`}
                        />
                        <div className="text-left">
                          <div className="font-medium text-xs">Activate Card</div>
                          <div className="text-[10px] text-muted-foreground">
                            Use this card&apos;s effect
                          </div>
                        </div>
                      </Button>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    {card.isFaceDown && isTrap
                      ? "Traps cannot be activated the same turn they are set"
                      : "Cannot activate this card right now"}
                  </p>
                )}

                {/* Cancel */}
                <Button className="w-full mt-2" variant="ghost" onClick={onClose} size="sm">
                  Cancel
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
