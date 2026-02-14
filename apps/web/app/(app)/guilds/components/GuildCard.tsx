"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Visibility } from "@/types/common";
import type { Id } from "@convex/_generated/dataModel";
import { Crown, Lock, Shield, Users } from "lucide-react";

interface GuildCardProps {
  guild: {
    _id: Id<"guilds">;
    name: string;
    description?: string;
    profileImageUrl?: string;
    visibility: Visibility;
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
    <div className={cn(
      "paper-panel group relative flex flex-col p-5 transition-all border-2 border-primary min-h-[180px]",
      "hover:shadow-[4px_4px_0px_0px_rgba(18,18,18,1)] hover:-translate-y-0.5",
      isJoining && "opacity-70 grayscale pointer-events-none"
    )}>
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        {/* Guild Avatar */}
        <div className="relative shrink-0">
          <div className="w-16 h-16 border-2 border-primary bg-slate-50 overflow-hidden relative shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            {guild.profileImageUrl ? (
              <img
                src={guild.profileImageUrl}
                alt={guild.name}
                className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-secondary/20">
                <Shield className="w-8 h-8 text-primary" />
              </div>
            )}
          </div>
          {isPrivate && (
            <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-white border-2 border-primary flex items-center justify-center shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
              <Lock className="w-3 h-3 text-primary" />
            </div>
          )}
        </div>

        {/* Guild Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-black uppercase italic tracking-tighter leading-none ink-bleed truncate pr-2 group-hover:text-destructive transition-colors">
            {guild.name}
          </h3>
          {guild.ownerUsername && (
            <div className="flex items-center gap-1.5 mt-2">
              <Crown className="w-3 h-3 text-destructive" />
              <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">
                Lead: {guild.ownerUsername}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="flex-1">
        {guild.description && (
          <p className="text-xs font-bold text-muted-foreground uppercase leading-tight line-clamp-2 mb-4 tracking-tighter">
            {guild.description}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-4 border-t-2 border-dashed border-primary/20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-xs font-black uppercase tracking-tighter">
              {guild.memberCount}<span className="opacity-40">/50</span>
            </span>
          </div>
          <div
            className={cn(
              "px-2 py-0.5 border-2 font-black text-[9px] uppercase tracking-widest",
              isPrivate
                ? "border-muted-foreground/30 text-muted-foreground bg-secondary/10"
                : "border-primary bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] text-primary"
            )}
          >
            {isPrivate ? "Private" : "Public"}
          </div>
        </div>

        {showJoinButton && onJoin && guild.memberCount < 50 && (
          <Button
            onClick={onJoin}
            disabled={isJoining}
            className={cn(
              "tcg-button-primary h-9 px-4 text-[10px] font-black uppercase tracking-widest",
              isPrivate && "bg-secondary text-foreground hover:bg-secondary/80 border-primary"
            )}
          >
             {isPrivate ? "Apply" : "Join"}
          </Button>
        )}
      </div>
    </div>
  );
}
