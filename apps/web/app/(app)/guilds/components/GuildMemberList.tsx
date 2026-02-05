"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useMyGuild } from "@/hooks/guilds";
import { useGuild } from "@/hooks/guilds/useGuild";
import { cn } from "@/lib/utils";
import type { Id } from "@convex/_generated/dataModel";
import { Circle, Crown, Loader2, MoreVertical, Shield, UserMinus, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface GuildMemberListProps {
  guildId: Id<"guilds">;
}

export function GuildMemberList({ guildId }: GuildMemberListProps) {
  const { members, isLoading, kickMember, transferOwnership } = useGuild(guildId);
  const { isOwner } = useMyGuild();
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    userId: string;
    action: "kick" | "transfer";
  } | null>(null);

  const handleKick = async (userId: Id<"users">, username: string) => {
    try {
      await kickMember(userId);
      toast.success(`${username} has been removed from the guild`);
    } catch (error) {
      toast.error("Failed to remove member");
    }
    setConfirmAction(null);
    setActionMenu(null);
  };

  const handleTransfer = async (userId: Id<"users">, username: string) => {
    try {
      await transferOwnership(userId);
      toast.success(`Ownership transferred to ${username}`);
    } catch (error) {
      toast.error("Failed to transfer ownership");
    }
    setConfirmAction(null);
    setActionMenu(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-[#d4af37] animate-spin" />
      </div>
    );
  }

  const owner = members?.find((m) => m.role === "owner");
  const regularMembers = members?.filter((m) => m.role === "member") || [];

  return (
    <div className="space-y-6">
      {/* Owner Section */}
      {owner && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-[#d4af37]" />
            <span className="text-xs font-bold text-[#a89f94] uppercase tracking-wider">
              Guild Leader
            </span>
          </div>
          <MemberCard member={owner} isOwner={true} showActions={false} />
        </div>
      )}

      {/* Members Section */}
      {regularMembers.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#a89f94]" />
            <span className="text-xs font-bold text-[#a89f94] uppercase tracking-wider">
              Members — {regularMembers.length}
            </span>
          </div>
          <div className="space-y-2">
            {regularMembers.map((member) => (
              <div key={member.userId} className="relative">
                <MemberCard
                  member={member}
                  isOwner={false}
                  showActions={isOwner}
                  onActionClick={() =>
                    setActionMenu(actionMenu === member.userId ? null : member.userId)
                  }
                  isActionOpen={actionMenu === member.userId}
                />

                {/* Action Menu */}
                {actionMenu === member.userId && isOwner && (
                  <>
                    {/* Backdrop */}
                    <button
                      type="button"
                      className="fixed inset-0 z-40"
                      onClick={() => setActionMenu(null)}
                      aria-label="Close menu"
                    />

                    {/* Menu */}
                    <div className="absolute right-0 top-full mt-2 z-50 w-48 rounded-xl bg-[#1a1614] border border-[#3d2b1f] shadow-2xl overflow-hidden">
                      {confirmAction?.userId === member.userId ? (
                        <div className="p-3 space-y-3">
                          <p className="text-sm text-[#e8e0d5] font-medium">
                            {confirmAction.action === "kick"
                              ? `Remove ${member.username}?`
                              : `Transfer ownership to ${member.username}?`}
                          </p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                if (confirmAction.action === "kick") {
                                  handleKick(member.userId as Id<"users">, member.username);
                                } else {
                                  handleTransfer(member.userId as Id<"users">, member.username);
                                }
                              }}
                              className={cn(
                                "flex-1 rounded-lg",
                                confirmAction.action === "kick"
                                  ? "bg-red-600 hover:bg-red-500"
                                  : "bg-[#d4af37] hover:bg-[#f9e29f] text-[#1a1614]"
                              )}
                            >
                              Confirm
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setConfirmAction(null)}
                              className="flex-1 text-[#a89f94]"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-1">
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmAction({ userId: member.userId, action: "transfer" })
                            }
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#e8e0d5] hover:bg-[#d4af37]/10 hover:text-[#d4af37] transition-all"
                          >
                            <Crown className="w-4 h-4" />
                            Transfer Ownership
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmAction({ userId: member.userId, action: "kick" })
                            }
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#e8e0d5] hover:bg-red-500/10 hover:text-red-400 transition-all"
                          >
                            <UserMinus className="w-4 h-4" />
                            Remove Member
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {regularMembers.length === 0 && (
        <div className="text-center py-12 rounded-xl bg-black/40 border border-[#3d2b1f]">
          <UserPlus className="w-12 h-12 mx-auto mb-3 text-[#a89f94]/50" />
          <p className="text-[#a89f94]">No other members yet</p>
          <p className="text-sm text-[#a89f94]/60 mt-1">Invite players to join your guild!</p>
        </div>
      )}
    </div>
  );
}

interface MemberCardProps {
  member: {
    userId: string;
    username: string;
    role: "owner" | "member";
    joinedAt: number;
    isOnline?: boolean;
  };
  isOwner: boolean;
  showActions?: boolean;
  onActionClick?: () => void;
  isActionOpen?: boolean;
}

function MemberCard({
  member,
  isOwner,
  showActions = false,
  onActionClick,
  isActionOpen = false,
}: MemberCardProps) {
  const joinedDate = new Date(member.joinedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4 rounded-xl bg-black/40 border transition-all",
        isOwner ? "border-[#d4af37]/30" : "border-[#3d2b1f]",
        "hover:bg-black/50"
      )}
    >
      {/* Avatar */}
      <div className="relative">
        <Avatar className="w-12 h-12 border-2 border-[#3d2b1f]">
          <AvatarFallback
            className={cn(
              "font-bold",
              isOwner ? "bg-[#d4af37]/20 text-[#d4af37]" : "bg-[#1a1614] text-[#d4af37]"
            )}
          >
            {member.username[0]?.toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
        {member.isOnline && (
          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-[#1a1614]" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#e8e0d5] truncate">{member.username}</span>
          {isOwner && <Crown className="w-4 h-4 text-[#d4af37] shrink-0" />}
        </div>
        <p className="text-xs text-[#a89f94]">
          {member.isOnline ? (
            <span className="flex items-center gap-1">
              <Circle className="w-2 h-2 fill-green-500 text-green-500" />
              Online
            </span>
          ) : (
            `Joined ${joinedDate}`
          )}
        </p>
      </div>

      {/* Actions */}
      {showActions && !isOwner && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onActionClick}
          className={cn(
            "text-[#a89f94] hover:text-[#e8e0d5]",
            isActionOpen && "bg-[#d4af37]/10 text-[#d4af37]"
          )}
          aria-label={`Member actions for ${member.username}`}
          aria-expanded={isActionOpen}
        >
          <MoreVertical className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
