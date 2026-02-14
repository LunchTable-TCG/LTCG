"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMyGuild } from "@/hooks/guilds";
import { useGuild } from "@/hooks/guilds/useGuild";
import type { Visibility } from "@/types/common";
import type { Id } from "@convex/_generated/dataModel";
import { Calendar, Crown, DoorOpen, Lock, Share2, Shield, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { GuildShareDialog } from "./GuildShareDialog";

interface GuildHeaderProps {
  guild: {
    _id: Id<any>;
    name: string;
    description?: string;
    profileImageUrl?: string;
    bannerImageUrl?: string;
    visibility: Visibility;
    ownerUsername?: string;
    memberCount: number;
    createdAt: number;
  };
  myRole?: "owner" | "admin" | "member";
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
    <div className="relative overflow-hidden border-4 border-primary bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      {/* Banner */}
      <div className="relative h-48 md:h-64 border-b-4 border-primary">
        {guild.bannerImageUrl ? (
          <img
            src={guild.bannerImageUrl}
            alt={`${guild.name} banner`}
            className="w-full h-full object-cover grayscale-[30%]"
          />
        ) : (
          <div className="w-full h-full bg-secondary/20" />
        )}
        {/* Ink overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-primary/40 to-transparent pointer-events-none" />
      </div>

      {/* Content */}
      <div className="relative px-8 pb-8 -mt-24">
        <div className="flex flex-col md:flex-row md:items-end gap-8">
          {/* Profile Image */}
          <div className="relative shrink-0">
            {guild.profileImageUrl ? (
              <img
                src={guild.profileImageUrl}
                alt={guild.name}
                className="w-32 h-32 border-4 border-primary shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] object-cover bg-white"
              />
            ) : (
              <div className="w-32 h-32 border-4 border-primary shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-secondary/10 flex items-center justify-center bg-white">
                <Shield className="w-16 h-16 text-primary opacity-20" />
              </div>
            )}
            {isPrivate && (
              <div className="absolute -bottom-3 -right-3 w-10 h-10 border-2 border-primary bg-primary flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <Lock className="w-5 h-5 text-primary-foreground" />
              </div>
            )}
          </div>

          {/* Guild Info */}
          <div className="flex-1 min-w-0 space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter ink-bleed">
                {guild.name}
              </h1>
              <Badge className="rounded-none border-2 border-primary bg-primary text-primary-foreground text-[10px] font-black uppercase px-3 py-1">
                {isPrivate ? "RESTRICTED" : "PUBLIC"}
              </Badge>
            </div>

            {guild.description && (
              <p className="text-sm font-bold text-muted-foreground uppercase leading-tight max-w-2xl opacity-70">
                {guild.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span>
                  <span className="text-primary">{guild.memberCount}</span>
                  /50 REGISTRY
                </span>
              </div>

              {onlineMemberCount != null && onlineMemberCount > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-green-500 border-2 border-primary" />
                  <span className="text-green-600">{onlineMemberCount} DEPLOYED</span>
                </div>
              )}

              {guild.ownerUsername && (
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-primary" />
                  <span>
                    OVERSEER: <span className="text-primary">{guild.ownerUsername}</span>
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span>EST: {formattedDate}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="shrink-0 flex items-center gap-3">
            <GuildShareDialog guildName={guild.name}>
              <Button
                variant="outline"
                className="tcg-button-outline h-12 px-6 text-xs gap-2"
              >
                <Share2 className="w-4 h-4" />
                RELAY
              </Button>
            </GuildShareDialog>

            {!isOwner && (
              <div className="relative">
                {showLeaveConfirm ? (
                  <div className="flex items-center gap-2 p-2 border-2 border-destructive bg-destructive/5">
                    <span className="text-[10px] font-black text-destructive uppercase">EXIT?</span>
                    <Button
                      onClick={handleLeave}
                      disabled={isLeaving}
                      size="sm"
                      className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-none h-8 px-4 font-black"
                    >
                      {isLeaving ? "..." : "YES"}
                    </Button>
                    <Button
                      onClick={() => setShowLeaveConfirm(false)}
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-foreground h-8 font-black text-[10px]"
                    >
                      NO
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => setShowLeaveConfirm(true)}
                    variant="outline"
                    className="tcg-button-destructive h-12 px-6 text-xs gap-2"
                  >
                    <DoorOpen className="w-4 h-4" />
                    ABANDON
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
