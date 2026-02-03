"use client";

import { cn } from "@/lib/utils";
import { getTooltip } from "@/lib/game-rules";
import { XIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useHelpModeSafe } from "./HelpModeProvider";

interface TooltipProps {
  id: string;
  className?: string;
  children: React.ReactNode;
  // Optional custom content (overrides game-rules lookup)
  title?: string;
  body?: string;
  learnMoreAnchor?: string;
}

/**
 * Help Mode Tooltip
 *
 * Wraps an element to make it tooltippable in Help Mode.
 * When Help Mode is active and user clicks the element, shows the tooltip.
 */
export function Tooltip({
  id,
  className,
  children,
  title: customTitle,
  body: customBody,
  learnMoreAnchor: customAnchor,
}: TooltipProps) {
  const helpMode = useHelpModeSafe();
  const elementRef = useRef<HTMLDivElement>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  // Get tooltip content from game-rules or custom props
  const tooltipData = getTooltip(id);
  const title = customTitle ?? tooltipData?.title ?? id;
  const body = customBody ?? tooltipData?.body ?? "";
  const learnMoreAnchor = customAnchor ?? tooltipData?.learnMoreAnchor;

  const isActive = helpMode?.isHelpModeActive && helpMode?.activeTooltipId === id;

  // Handle client-side mounting for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate tooltip position when shown
  useEffect(() => {
    if (isActive && elementRef.current) {
      const rect = elementRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Default: position above the element
      let top = rect.top - 10;
      let left = rect.left + rect.width / 2;

      // If too close to top, position below
      if (rect.top < 150) {
        top = rect.bottom + 10;
      }

      // Clamp to viewport
      left = Math.max(160, Math.min(viewportWidth - 160, left));
      top = Math.max(10, Math.min(viewportHeight - 100, top));

      setTooltipPosition({ top, left });
    }
  }, [isActive]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (helpMode?.isHelpModeActive) {
        e.preventDefault();
        e.stopPropagation();
        helpMode.setActiveTooltipId(helpMode.activeTooltipId === id ? null : id);
      }
    },
    [helpMode, id]
  );

  const handleClose = useCallback(() => {
    helpMode?.setActiveTooltipId(null);
  }, [helpMode]);

  return (
    <>
      <div
        ref={elementRef}
        onClick={handleClick}
        className={cn(
          "relative",
          helpMode?.isHelpModeActive && [
            "cursor-help",
            "outline outline-2 outline-offset-2 outline-amber-500/50 rounded",
            "hover:outline-amber-500",
          ],
          className
        )}
      >
        {children}
      </div>

      {/* Tooltip Portal */}
      {mounted &&
        isActive &&
        createPortal(
          <div
            className="fixed z-[100] animate-in fade-in-0 zoom-in-95 duration-200"
            style={{
              top: tooltipPosition.top,
              left: tooltipPosition.left,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div className="relative bg-slate-900 border border-amber-500/50 rounded-lg shadow-xl shadow-amber-500/20 max-w-xs p-4">
              {/* Arrow */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-900 border-b border-r border-amber-500/50 rotate-45" />

              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-2 right-2 text-slate-400 hover:text-white"
                aria-label="Close tooltip"
              >
                <XIcon className="h-4 w-4" />
              </button>

              {/* Content */}
              <div className="pr-6">
                <h4 className="font-semibold text-amber-400 mb-1">{title}</h4>
                <p className="text-sm text-slate-300 leading-relaxed">{body}</p>

                {learnMoreAnchor && (
                  <Link
                    href={`/how-to-play#${learnMoreAnchor}`}
                    className="inline-block mt-2 text-xs text-amber-500 hover:text-amber-400 underline"
                    onClick={handleClose}
                  >
                    Learn more →
                  </Link>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

/**
 * Simple tooltip for non-Help Mode use
 *
 * Shows on hover, no Help Mode integration.
 */
export function SimpleTooltip({
  content,
  children,
  className,
}: {
  content: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isVisible && elementRef.current) {
      const rect = elementRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
      });
    }
  }, [isVisible]);

  return (
    <>
      <div
        ref={elementRef}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className={cn("relative inline-block", className)}
      >
        {children}
      </div>

      {mounted &&
        isVisible &&
        createPortal(
          <div
            className="fixed z-[100] pointer-events-none animate-in fade-in-0 duration-150"
            style={{
              top: position.top,
              left: position.left,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div className="bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-lg max-w-xs">
              {content}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
