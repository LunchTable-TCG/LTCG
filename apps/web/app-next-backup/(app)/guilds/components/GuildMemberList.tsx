"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GuildMember } from "@/types/guilds";
import type { Id } from "@convex/_generated/dataModel";
import { Crown, Loader2, MoreVertical, Shield, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface GuildMemberListProps {
  members: GuildMember[];
  isLoading: boolean;
  isOwner: boolean;
  onKickMember: (userId: Id<any>) => Promise<unknown>;
  onTransferOwnership: (userId: Id<any>) => Promise<unknown>;
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

  const handleKick = async (userId: Id<any>, username: string) => {
    try {
      await onKickMember(userId);
      toast.success(`${username} has been removed from the guild`);
    } catch (_error) {
      toast.error("Failed to remove member");
    }
    setConfirmAction(null);
    setActionMenu(null);
  };

  const handleTransfer = async (userId: Id<any>, username: string) => {
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
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  const owner = members?.find((m) => m.role === "owner");
  const regularMembers = members?.filter((m) => m.role === "member") || [];

  return (
    <div className="space-y-10">
      {/* Owner Section */}
      {owner && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary bg-primary flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
               <Crown className="w-4 h-4 text-primary-foreground" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-widest ink-bleed">
              Overseer
            </h3>
          </div>
          <MemberCard member={owner} isOwner={true} showActions={false} />
        </div>
      )}

      {/* Members Section */}
      {regularMembers.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 border-2 border-primary bg-secondary/10 flex items-center justify-center">
               <Shield className="w-4 h-4 text-primary" />
             </div>
             <h3 className="text-sm font-black uppercase tracking-widest ink-bleed text-muted-foreground">
               Registry — {regularMembers.length.toString().padStart(2, '0')} Members
             </h3>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {regularMembers.map((member) => (
              <div key={member.userId} className="relative group/member">
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
                      className="fixed inset-0 z-40 cursor-default"
                      onClick={() => setActionMenu(null)}
                      aria-label="Close menu"
                    />

                    {/* Menu */}
                    <div className="absolute right-0 sm:right-4 top-12 z-50 w-48 sm:w-56 border-4 border-primary bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] md:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                      {confirmAction?.userId === member.userId ? (
                        <div className="p-4 space-y-4 bg-secondary/5">
                          <p className="text-xs font-black uppercase tracking-tight leading-none text-foreground ink-bleed">
                            {confirmAction.action === "kick"
                              ? `Expel ${member.username}?`
                              : `Transfer control?`}
                          </p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                if (confirmAction.action === "kick") {
                                  handleKick(member.userId as Id<any>, member.username);
                                } else {
                                  handleTransfer(member.userId as Id<any>, member.username);
                                }
                              }}
                              className={cn(
                                "flex-1 rounded-none border-2 border-primary font-black uppercase text-[10px] h-10",
                                confirmAction.action === "kick"
                                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  : "bg-primary text-primary-foreground hover:bg-primary/90"
                              )}
                            >
                              EXECUTE
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setConfirmAction(null)}
                              className="flex-1 rounded-none border-2 border-primary font-black uppercase text-[10px] h-10 bg-white"
                            >
                              ABORT
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="divide-y-2 divide-primary">
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmAction({ userId: member.userId, action: "transfer" })
                            }
                            className="w-full flex items-center justify-between px-4 py-3 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary hover:text-primary-foreground transition-all group/item"
                          >
                            <span>Transfer Overseer</span>
                            <Crown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmAction({ userId: member.userId, action: "kick" })
                            }
                            className="w-full flex items-center justify-between px-4 py-3 text-[10px] font-black uppercase tracking-widest text-destructive hover:bg-destructive hover:text-white transition-all group/item"
                          >
                            <span>Expel Member</span>
                            <UserPlus className="w-3.5 h-3.5 rotate-45" />
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
        <div className="text-center py-20 border-4 border-dashed border-primary/20 bg-secondary/5 paper-panel">
          <div className="w-16 h-16 border-4 border-primary/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <UserPlus className="w-8 h-8 text-primary/30" />
          </div>
          <h3 className="font-black uppercase italic tracking-tighter text-2xl ink-bleed mb-2">Solo Front</h3>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 max-w-xs mx-auto">
            Recruit loyalists to grow your influence across the network.
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
        "flex flex-col sm:flex-row sm:items-center gap-4 p-4 sm:p-5 border-4 transition-all relative group/card overflow-hidden bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5",
        isOwner ? "border-primary" : "border-primary/20 hover:border-primary"
      )}
    >
      {/* Avatar Container */}
      <div className="relative shrink-0">
        <div className={cn(
          "w-14 h-14 border-2 p-0.5",
          isOwner ? "border-primary" : "border-primary/20 group-hover/card:border-primary"
        )}>
          {member.image ? (
            <img src={member.image} alt={member.username} className="w-full h-full object-cover grayscale-[30%]" />
          ) : (
            <div className="w-full h-full bg-secondary/10 flex items-center justify-center font-black text-xs uppercase">
              {member.username[0]}
            </div>
          )}
        </div>

        {member.isOnline && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-black text-lg uppercase italic tracking-tighter ink-bleed truncate">
            {member.username}
          </span>
          {isOwner && (
            <div className="w-5 h-5 border-2 border-primary bg-primary flex items-center justify-center shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
               <Crown className="w-3 h-3 text-primary-foreground" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
            {member.isOnline ? (
              <span className="flex items-center gap-1.5 text-green-600">
                <div className="w-2 h-2 bg-green-500 border border-primary/20" />
                Active Now
              </span>
            ) : (
              `Registered: ${joinedDate}`
            )}
          </p>
        </div>
      </div>

      {/* Actions Trigger */}
      {showActions && !isOwner && (
        <Button
          variant="outline"
          size="icon"
          onClick={onActionClick}
          className={cn(
            "rounded-none border-2 border-primary w-10 h-10 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] absolute top-2 right-2 sm:relative sm:top-auto sm:right-auto",
            isActionOpen
              ? "bg-primary text-primary-foreground shadow-none translate-x-0.5 translate-y-0.5"
              : "bg-white hover:bg-secondary/5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          )}
        >
          <MoreVertical className="w-4 h-4" />
        </Button>
      )}

      {/* Zine Background Noise Decorator */}
      <div className="absolute top-0 right-0 w-12 h-12 bg-primary/5 -mr-6 -mt-6 rounded-full blur-xl pointer-events-none group-hover/card:bg-primary/10 transition-colors" />
    </div>
  );
}
