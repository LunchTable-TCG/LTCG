"use client";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  compact?: boolean;
}

export function EmptyState({ icon, title, description, compact }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-8" : "py-16"
      )}
    >
      <div className="text-[#a89f94]/30 mb-3">{icon}</div>
      <p className="text-[#e8e0d5] font-medium">{title}</p>
      <p className="text-sm text-[#a89f94] mt-1 max-w-xs">{description}</p>
    </div>
  );
}
