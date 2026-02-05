"use client";

import { Button } from "@/components/ui/button";
import { useMyGuild } from "@/hooks/guilds";
import { cn } from "@/lib/utils";
import type { Id } from "@convex/_generated/dataModel";
import { Calendar, Crown, DoorOpen, Lock, Shield, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface GuildHeaderProps {
  guild: {
    _id: Id<"guilds">;
    name: string;
    description?: string;
    profileImageUrl?: string;
    bannerImageUrl?: string;
    visibility: "public" | "private";
    ownerUsername?: string;
    memberCount: number;
    createdAt: number;
  };
  myRole?: "owner" | "member";
}

export function GuildHeader({ guild, myRole }: GuildHeaderProps) {
  const { leaveGuild } = useMyGuild();
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
    } catch (error) {
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
    <div className="relative overflow-hidden rounded-2xl border border-[#3d2b1f]">
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
              <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-[#8b4513] to-[#3d2b1f] border-4 border-[#0d0a09] shadow-2xl flex items-center justify-center">
                <Shield className="w-12 h-12 text-[#d4af37]" />
              </div>
            )}
            {isPrivate && (
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-[#1a1614] border-2 border-[#3d2b1f] flex items-center justify-center">
                <Lock className="w-4 h-4 text-[#a89f94]" />
              </div>
            )}
          </div>

          {/* Guild Info */}
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl md:text-4xl font-black text-[#e8e0d5]">{guild.name}</h1>
              <div
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                  isPrivate
                    ? "bg-[#a89f94]/10 text-[#a89f94] border border-[#a89f94]/20"
                    : "bg-green-500/10 text-green-400 border border-green-500/20"
                )}
              >
                {isPrivate ? "Private" : "Public"}
              </div>
            </div>

            {guild.description && (
              <p className="text-[#a89f94] leading-relaxed max-w-2xl">{guild.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#d4af37]" />
                <span className="text-[#e8e0d5] font-medium">
                  {guild.memberCount}
                  <span className="text-[#a89f94]">/50 members</span>
                </span>
              </div>

              {guild.ownerUsername && (
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-[#d4af37]" />
                  <span className="text-[#a89f94]">
                    Led by <span className="text-[#e8e0d5] font-medium">{guild.ownerUsername}</span>
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#a89f94]" />
                <span className="text-[#a89f94]">Founded {formattedDate}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="shrink-0">
            {!isOwner && (
              <div className="relative">
                {showLeaveConfirm ? (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                    <span className="text-sm text-red-400 font-medium">Leave guild?</span>
                    <Button
                      onClick={handleLeave}
                      disabled={isLeaving}
                      size="sm"
                      className="bg-red-600 hover:bg-red-500 text-white rounded-lg"
                    >
                      {isLeaving ? "..." : "Yes"}
                    </Button>
                    <Button
                      onClick={() => setShowLeaveConfirm(false)}
                      size="sm"
                      variant="ghost"
                      className="text-[#a89f94] hover:text-[#e8e0d5]"
                    >
                      No
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => setShowLeaveConfirm(true)}
                    variant="outline"
                    className="border-[#3d2b1f] text-[#a89f94] hover:text-red-400 hover:border-red-500/50 hover:bg-red-500/10 rounded-xl"
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
