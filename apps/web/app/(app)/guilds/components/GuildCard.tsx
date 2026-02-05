"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Id } from "@convex/_generated/dataModel";
import { Crown, Lock, Shield, Users } from "lucide-react";

interface GuildCardProps {
  guild: {
    _id: Id<"guilds">;
    name: string;
    description?: string;
    profileImageUrl?: string;
    visibility: "public" | "private";
    memberCount: number;
    ownerUsername?: string;
  };
  onJoin?: () => void;
  isJoining?: boolean;
  showJoinButton?: boolean;
}

export function GuildCard({
  guild,
  onJoin,
  isJoining = false,
  showJoinButton = true,
}: GuildCardProps) {
  const isPrivate = guild.visibility === "private";

  return (
    <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-[#1a1614] to-[#261f1c] border border-[#3d2b1f] hover:border-[#d4af37]/50 transition-all duration-300">
      {/* Hover glow effect */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#d4af37]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          {/* Guild Avatar */}
          <div className="relative shrink-0">
            {guild.profileImageUrl ? (
              <img
                src={guild.profileImageUrl}
                alt={guild.name}
                className="w-14 h-14 rounded-xl object-cover border-2 border-[#d4af37]/20 group-hover:border-[#d4af37]/50 transition-colors"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#8b4513] to-[#3d2b1f] border-2 border-[#d4af37]/20 group-hover:border-[#d4af37]/50 flex items-center justify-center transition-colors">
                <Shield className="w-7 h-7 text-[#d4af37]" />
              </div>
            )}
            {isPrivate && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#1a1614] border border-[#3d2b1f] flex items-center justify-center">
                <Lock className="w-3 h-3 text-[#a89f94]" />
              </div>
            )}
          </div>

          {/* Guild Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-[#e8e0d5] truncate group-hover:text-[#d4af37] transition-colors">
                {guild.name}
              </h3>
            </div>
            {guild.ownerUsername && (
              <div className="flex items-center gap-1.5 mt-1">
                <Crown className="w-3 h-3 text-[#d4af37]" />
                <span className="text-xs text-[#a89f94]">{guild.ownerUsername}</span>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {guild.description && (
          <p className="text-sm text-[#a89f94] line-clamp-2 mb-4 leading-relaxed">
            {guild.description}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[#a89f94]" />
              <span className="text-sm font-medium text-[#e8e0d5]">
                {guild.memberCount}
                <span className="text-[#a89f94]">/50</span>
              </span>
            </div>
            <div
              className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                isPrivate
                  ? "bg-[#a89f94]/10 text-[#a89f94] border border-[#a89f94]/20"
                  : "bg-green-500/10 text-green-400 border border-green-500/20"
              )}
            >
              {isPrivate ? "Private" : "Public"}
            </div>
          </div>

          {showJoinButton && onJoin && guild.memberCount < 50 && (
            <Button
              onClick={onJoin}
              disabled={isJoining}
              size="sm"
              className={cn(
                "rounded-lg font-bold text-xs",
                isPrivate
                  ? "bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#d4af37] hover:bg-[#d4af37]/20"
                  : "tcg-button-primary"
              )}
            >
              {isJoining ? "..." : isPrivate ? "Request" : "Join"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
