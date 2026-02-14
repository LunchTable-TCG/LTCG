"use client";

import { Button } from "@/components/ui/button";
import { useMyGuild } from "@/hooks/guilds";
import { useGuild } from "@/hooks/guilds/useGuild";
import { cn } from "@/lib/utils";
import type { Visibility } from "@/types/common";
import type { Id } from "@convex/_generated/dataModel";
import { Calendar, Circle, Crown, DoorOpen, Lock, Share2, Shield, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { GuildShareDialog } from "./GuildShareDialog";

interface GuildHeaderProps {
  guild: {
    _id: Id<"guilds">;
    name: string;
    description?: string;
    profileImageUrl?: string;
    bannerImageUrl?: string;
    visibility: Visibility;
    ownerUsername?: string;
    memberCount: number;
    createdAt: number;
  };
  myRole?: "owner" | "member";
}

export function GuildHeader({ guild, myRole }: GuildHeaderProps) {
  const { leaveGuild } = useMyGuild();
  const { onlineMemberCount } = useGuild(guild._id);
  const [isLeaving, setIsLeaving] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const isOwner = myRole === "owner";
  const isPrivate = guild.visibility === "private";

  const handleLeave = async () => {
    if (isOwner) {
      toast.error("Owners cannot leave their guild", {
        description: "Transfer ownership first or delete the guild.",
      });
      return;
    }

    setIsLeaving(true);
    try {
      await leaveGuild();
      toast.success("You have left the guild");
    } catch {
      toast.error("Failed to leave guild");
    } finally {
      setIsLeaving(false);
      setShowLeaveConfirm(false);
    }
  };

  const formattedDate = new Date(guild.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border">
      {/* Banner */}
      <div className="relative h-48 md:h-64">
        {guild.bannerImageUrl ? (
          <img
            src={guild.bannerImageUrl}
            alt={`${guild.name} banner`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#8b4513] via-[#5c3d2e] to-[#3d2b1f]" />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0a09] via-[#0d0a09]/60 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative px-6 pb-6 -mt-20">
        <div className="flex flex-col md:flex-row md:items-end gap-6">
          {/* Profile Image */}
          <div className="relative shrink-0">
            {guild.profileImageUrl ? (
              <img
                src={guild.profileImageUrl}
                alt={guild.name}
                className="w-28 h-28 rounded-2xl object-cover border-4 border-[#0d0a09] shadow-2xl"
              />
            ) : (
              <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border-4 border-background shadow-2xl flex items-center justify-center">
                <Shield className="w-12 h-12 text-primary" />
              </div>
            )}
            {isPrivate && (
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-card border-2 border-border flex items-center justify-center">
                <Lock className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Guild Info */}
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl md:text-4xl font-black text-foreground">{guild.name}</h1>
              <div
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                  isPrivate
                    ? "bg-muted/10 text-muted-foreground border border-muted/20"
                    : "bg-green-500/10 text-green-400 border border-green-500/20"
                )}
              >
                {isPrivate ? "Private" : "Public"}
              </div>
            </div>

            {guild.description && (
              <p className="text-muted-foreground leading-relaxed max-w-2xl">{guild.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-foreground font-medium">
                  {guild.memberCount}
                  <span className="text-muted-foreground">/50 members</span>
                </span>
              </div>

              {onlineMemberCount != null && onlineMemberCount > 0 && (
                <div className="flex items-center gap-2">
                  <Circle className="w-3 h-3 fill-green-400 text-green-400" />
                  <span className="text-green-400 font-medium">{onlineMemberCount} online</span>
                </div>
              )}

              {guild.ownerUsername && (
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">
                    Led by{" "}
                    <span className="text-foreground font-medium">{guild.ownerUsername}</span>
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Founded {formattedDate}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="shrink-0 flex items-center gap-2">
            {/* Invite Friends - available to all members */}
            <GuildShareDialog guildName={guild.name}>
              <Button
                variant="outline"
                className="border-border text-primary hover:text-primary hover:border-primary/50 hover:bg-primary/10 rounded-xl"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Invite Friends
              </Button>
            </GuildShareDialog>

            {!isOwner && (
              <div className="relative">
                {showLeaveConfirm ? (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                    <span className="text-sm text-red-400 font-medium">Leave guild?</span>
                    <Button
                      onClick={handleLeave}
                      disabled={isLeaving}
                      size="sm"
                      className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg"
                    >
                      {isLeaving ? "..." : "Yes"}
                    </Button>
                    <Button
                      onClick={() => setShowLeaveConfirm(false)}
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      No
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => setShowLeaveConfirm(true)}
                    variant="outline"
                    className="border-border text-muted-foreground hover:text-destructive hover:border-destructive/50 hover:bg-destructive/10 rounded-xl"
                  >
                    <DoorOpen className="w-4 h-4 mr-2" />
                    Leave Guild
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
