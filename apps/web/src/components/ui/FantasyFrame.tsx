"use client";

import { cn } from "@/lib/utils";
import type React from "react";

interface FantasyFrameProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "obsidian" | "gold" | "ethereal";
  gemAccents?: boolean;
  noPadding?: boolean;
}

export function FantasyFrame({
  children,
  className,
  variant = "obsidian",
  gemAccents = false,
  noPadding = false,
  ...props
}: FantasyFrameProps) {
  return (
    <div
      className={cn("relative rounded-xl border border-transparent shadow-xl", className)}
      {...props}
    >
      {/* Border Layer */}
      <div
        className={cn("absolute inset-0 rounded-xl -z-10", "p-[2px]")}
        style={{
          background:
            variant === "obsidian"
              ? "linear-gradient(135deg, #c6a34a, #f7e6a1, #6d5119)"
              : variant === "gold"
                ? "linear-gradient(135deg, #f7e6a1, #d4af37, #c6a34a)"
                : "linear-gradient(135deg, #a855f7, #6366f1, #8b5cf6)",
          boxShadow: "0 0 15px rgba(251, 191, 36, 0.2)",
        }}
      >
        <div className="h-full w-full rounded-[10px] bg-zinc-950" />
      </div>

      {/* Main Content Areas */}
      <div className="relative h-full w-full rounded-[11px] overflow-hidden bg-zinc-950/90 shadow-inner shadow-black/80 m-[1px]">
        {/* Inner Vignette for depth */}
        <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.8)] pointer-events-none" />

        {/* Content */}
        <div className={cn("relative z-10", !noPadding && "p-6")}>{children}</div>
      </div>

      {/* Gem Accents */}
      {gemAccents && (
        <>
          <Gem position="tl" />
          <Gem position="tr" />
          <Gem position="bl" />
          <Gem position="br" />
        </>
      )}
    </div>
  );
}

function Gem({ position }: { position: "tl" | "tr" | "bl" | "br" }) {
  const posClass = {
    tl: "-top-1.5 -left-1.5",
    tr: "-top-1.5 -right-1.5",
    bl: "-bottom-1.5 -left-1.5",
    br: "-bottom-1.5 -right-1.5",
  }[position];

  return (
    <div
      className={cn(
        "absolute w-4 h-4 rounded-full border border-white/40 shadow-lg z-20",
        posClass
      )}
    >
      <div className="w-full h-full rounded-full bg-linear-to-br from-cyan-300 via-cyan-500 to-cyan-900 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
      <div className="absolute top-[20%] left-[20%] w-[30%] h-[30%] bg-white rounded-full opacity-60 blur-[1px]" />
    </div>
  );
}
