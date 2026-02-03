"use client";

import { getTutorialMoment } from "@/lib/game-rules";
import { cn } from "@/lib/utils";
import { ChevronRightIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface TutorialOverlayProps {
  momentId: number;
  onDismiss: () => void;
  onComplete: () => void;
  highlightRef?: React.RefObject<HTMLElement>;
}

/**
 * Tutorial Overlay
 *
 * Displays teaching moment panels during the tutorial.
 * Shows a message with a "Got it" button to proceed.
 */
export function TutorialOverlay({
  momentId,
  onDismiss,
  onComplete,
  highlightRef,
}: TutorialOverlayProps) {
  const [mounted, setMounted] = useState(false);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);

  const moment = getTutorialMoment(momentId);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Track highlight element position
  useEffect(() => {
    if (!highlightRef?.current) return;

    const updateRect = () => {
      setHighlightRect(highlightRef.current?.getBoundingClientRect() ?? null);
    };
    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect);
    };
  }, [highlightRef]);

  const handleGotIt = useCallback(() => {
    onComplete();
  }, [onComplete]);

  const handleSkip = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  if (!moment || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200]">
      {/* Backdrop with cutout for highlighted element */}
      <div
        className="absolute inset-0 bg-black/70"
        onClick={handleSkip}
        style={
          highlightRect
            ? {
                clipPath: `polygon(
                  0% 0%,
                  0% 100%,
                  ${highlightRect.left - 8}px 100%,
                  ${highlightRect.left - 8}px ${highlightRect.top - 8}px,
                  ${highlightRect.right + 8}px ${highlightRect.top - 8}px,
                  ${highlightRect.right + 8}px ${highlightRect.bottom + 8}px,
                  ${highlightRect.left - 8}px ${highlightRect.bottom + 8}px,
                  ${highlightRect.left - 8}px 100%,
                  100% 100%,
                  100% 0%
                )`,
              }
            : undefined
        }
      />

      {/* Highlight border */}
      {highlightRect && (
        <div
          className="absolute border-2 border-amber-400 rounded-lg animate-pulse pointer-events-none"
          style={{
            top: highlightRect.top - 8,
            left: highlightRect.left - 8,
            width: highlightRect.width + 16,
            height: highlightRect.height + 16,
          }}
        />
      )}

      {/* Tutorial Panel */}
      <div
        className={cn(
          "absolute bg-gradient-to-b from-slate-800 to-slate-900",
          "border-2 border-amber-500/50 rounded-xl shadow-2xl shadow-amber-500/20",
          "p-6 max-w-md",
          "animate-in slide-in-from-bottom-4 duration-300"
        )}
        style={{
          // Position panel based on highlight element or center
          ...(highlightRect
            ? {
                top: Math.min(highlightRect.bottom + 20, window.innerHeight - 200),
                left: Math.max(
                  20,
                  Math.min(
                    highlightRect.left + highlightRect.width / 2 - 200,
                    window.innerWidth - 420
                  )
                ),
              }
            : {
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              }),
        }}
      >
        {/* Progress indicator */}
        <div className="flex items-center gap-1 mb-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 w-8 rounded-full transition-colors",
                i <= momentId ? "bg-amber-500" : "bg-slate-600"
              )}
            />
          ))}
          <span className="text-xs text-slate-400 ml-2">{momentId}/5</span>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-amber-400 mb-2">{moment.title}</h3>

        {/* Message */}
        <p className="text-slate-300 leading-relaxed mb-6">{moment.message}</p>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1"
          >
            <XIcon className="h-4 w-4" />
            Exit Tutorial
          </button>

          <button
            onClick={handleGotIt}
            className={cn(
              "px-6 py-2 rounded-lg font-semibold transition-all",
              "bg-amber-500 hover:bg-amber-400 text-slate-900",
              "flex items-center gap-2"
            )}
          >
            Got it
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * Tutorial Resume Prompt
 *
 * Toast-like prompt asking user to resume their tutorial.
 */
interface TutorialResumePromptProps {
  onResume: () => void;
  onDismiss: () => void;
  lastMoment: number;
}

export function TutorialResumePrompt({
  onResume,
  onDismiss,
  lastMoment,
}: TutorialResumePromptProps) {
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Animate in after mount
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className={cn(
        "fixed bottom-20 left-1/2 -translate-x-1/2 z-50",
        "transition-all duration-300",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}
    >
      <div className="bg-slate-800 border border-amber-500/50 rounded-xl shadow-xl shadow-amber-500/10 p-4 max-w-sm">
        <p className="text-slate-200 text-sm mb-3">
          You have an unfinished tutorial.{" "}
          {lastMoment > 0 && <span className="text-amber-400">({lastMoment}/5 completed)</span>}
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={onResume}
            className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-lg font-medium text-sm transition-colors"
          >
            Resume Tutorial
          </button>
          <button
            onClick={onDismiss}
            className="px-4 py-2 text-slate-400 hover:text-white text-sm transition-colors"
          >
            Not Now
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
