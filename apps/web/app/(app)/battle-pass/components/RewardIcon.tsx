"use client";

import { cn } from "@/lib/utils";
import {
  Coins,
  Gem,
  Image,
  Package,
  Sparkles,
  Star,
  Trophy,
  Zap,
} from "lucide-react";

type RewardType = "gold" | "gems" | "xp" | "card" | "pack" | "title" | "avatar";

interface RewardIconProps {
  type: RewardType;
  amount?: number;
  className?: string;
  size?: "sm" | "md" | "lg";
  showAmount?: boolean;
}

const rewardConfig: Record<
  RewardType,
  {
    icon: typeof Coins;
    color: string;
    bgColor: string;
    label: string;
  }
> = {
  gold: {
    icon: Coins,
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20",
    label: "Gold",
  },
  gems: {
    icon: Gem,
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
    label: "Gems",
  },
  xp: {
    icon: Zap,
    color: "text-purple-400",
    bgColor: "bg-purple-500/20",
    label: "XP",
  },
  card: {
    icon: Star,
    color: "text-orange-400",
    bgColor: "bg-orange-500/20",
    label: "Card",
  },
  pack: {
    icon: Package,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20",
    label: "Pack",
  },
  title: {
    icon: Trophy,
    color: "text-[#d4af37]",
    bgColor: "bg-[#d4af37]/20",
    label: "Title",
  },
  avatar: {
    icon: Image,
    color: "text-pink-400",
    bgColor: "bg-pink-500/20",
    label: "Avatar",
  },
};

const sizeClasses = {
  sm: {
    container: "w-10 h-10",
    icon: "w-5 h-5",
    text: "text-xs",
  },
  md: {
    container: "w-14 h-14",
    icon: "w-7 h-7",
    text: "text-sm",
  },
  lg: {
    container: "w-20 h-20",
    icon: "w-10 h-10",
    text: "text-base",
  },
};

export function RewardIcon({
  type,
  amount,
  className,
  size = "md",
  showAmount = true,
}: RewardIconProps) {
  const config = rewardConfig[type];
  const Icon = config.icon;
  const sizeClass = sizeClasses[size];

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div
        className={cn(
          "rounded-lg flex items-center justify-center",
          config.bgColor,
          sizeClass.container
        )}
      >
        <Icon className={cn(config.color, sizeClass.icon)} />
      </div>
      {showAmount && amount !== undefined && (
        <span className={cn("font-bold", config.color, sizeClass.text)}>
          {type === "xp" ? `${amount} XP` : amount.toLocaleString()}
        </span>
      )}
      {showAmount && amount === undefined && (
        <span className={cn("font-medium text-[#a89f94]", sizeClass.text)}>
          {config.label}
        </span>
      )}
    </div>
  );
}

export function RewardIconInline({
  type,
  amount,
  className,
}: {
  type: RewardType;
  amount?: number;
  className?: string;
}) {
  const config = rewardConfig[type];
  const Icon = config.icon;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Icon className={cn("w-4 h-4", config.color)} />
      {amount !== undefined ? (
        <span className={cn("font-bold text-sm", config.color)}>
          {type === "xp" ? `${amount} XP` : amount.toLocaleString()}
        </span>
      ) : (
        <span className={cn("font-medium text-sm", config.color)}>{config.label}</span>
      )}
    </div>
  );
}

export function MilestoneIcon({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "w-6 h-6 rounded-full bg-[#d4af37]/30 flex items-center justify-center",
        className
      )}
    >
      <Sparkles className="w-4 h-4 text-[#d4af37]" />
    </div>
  );
}
