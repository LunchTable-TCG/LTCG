"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GuildMember } from "@/types/guilds";
import type { Id } from "@convex/_generated/dataModel";
import { Circle, Crown, Loader2, MoreVertical, Shield, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface GuildMemberListProps {
  members: GuildMember[];
  isLoading: boolean;
  isOwner: boolean;
  onKickMember: (userId: Id<"users">) => Promise<unknown>;
  onTransferOwnership: (userId: Id<"users">) => Promise<unknown>;
}

export function GuildMemberList({
  members,
  isLoading,
  isOwner,
  onKickMember,
  onTransferOwnership,
}: GuildMemberListProps) {
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    userId: string;
    action: "kick" | "transfer";
  } | null>(null);

  const handleKick = async (userId: Id<"users">, username: string) => {
    try {
      await onKickMember(userId);
      toast.success(`${username} has been removed from the guild`);
    } catch (_error) {
      toast.error("Failed to remove member");
    }
    setConfirmAction(null);
    setActionMenu(null);
  };

  const handleTransfer = async (userId: Id<"users">, username: string) => {
    try {
      await onTransferOwnership(userId);
      toast.success(`Ownership transferred to ${username}`);
    } catch (_error) {
      toast.error("Failed to transfer ownership");
    }
    setConfirmAction(null);
    setActionMenu(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
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
            <Crown className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
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
            <Shield className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
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
                    <div className="absolute right-0 top-full mt-2 z-50 w-48 rounded-xl bg-popover border border-border shadow-2xl overflow-hidden">
                      {confirmAction?.userId === member.userId ? (
                        <div className="p-3 space-y-3">
                          <p className="text-sm text-foreground font-medium">
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
                                  ? "bg-destructive hover:bg-destructive/90"
                                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
                              )}
                            >
                              Confirm
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => setConfirmAction(null)}
                              className="flex-1 text-muted-foreground hover:text-foreground"
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
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-primary/10 hover:text-primary transition-all"
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
        <div className="text-center py-12 rounded-xl bg-card/40 border border-border">
          <UserPlus className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">No other members yet</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            Invite players to join your guild!
          </p>
        </div>
      )}
    </div>
  );
}

interface MemberCardProps {
  member: {
    userId: string;
    username: string;
    image?: string;
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
        "flex items-center gap-4 p-4 rounded-xl bg-card/40 border transition-all",
        isOwner ? "border-primary/30" : "border-border",
        "hover:bg-card/60"
      )}
    >
      {/* Avatar */}
      <div className="relative">
        <Avatar className="w-12 h-12 border-2 border-border">
          {member.image && <AvatarImage src={member.image} alt={member.username || "Member"} />}
          <AvatarFallback
            className={cn(
              "font-bold",
              isOwner ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
            )}
          >
            {member.username[0]?.toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
        {member.isOnline && (
          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-background" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-foreground truncate">{member.username}</span>
          {isOwner && <Crown className="w-4 h-4 text-primary shrink-0" />}
        </div>
        <p className="text-xs text-muted-foreground">
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
            "text-muted-foreground hover:text-foreground",
            isActionOpen && "bg-primary/10 text-primary"
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
