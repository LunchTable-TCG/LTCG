"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGuildInvites } from "@/hooks/guilds";
import { useGuild } from "@/hooks/guilds/useGuild";
import { cn } from "@/lib/utils";
import type { Id } from "@convex/_generated/dataModel";
import { Check, Clock, Loader2, Mail, Send, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface GuildInvitePanelProps {
  guildId: Id<any>;
}

export function GuildInvitePanel({ guildId }: GuildInvitePanelProps) {
  const { guildPendingInvites, sendInvite, cancelInvite } = useGuildInvites(guildId);
  const { joinRequests, approveRequest, rejectRequest } = useGuild(guildId);

  const [inviteUsername, setInviteUsername] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState<"invites" | "requests">("invites");

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteUsername.trim()) return;

    setIsSending(true);
    try {
      await sendInvite(guildId, inviteUsername.trim());
      setInviteUsername("");
    } catch (_error) {
      // Error is handled by the hook
    } finally {
      setIsSending(false);
    }
  };

  const handleApprove = async (requestId: Id<any>, username: string) => {
    try {
      await approveRequest(requestId);
      toast.success(`${username} has joined the guild!`);
    } catch (_error) {
      toast.error("Failed to approve request");
    }
  };

  const handleReject = async (requestId: Id<any>, username: string) => {
    try {
      await rejectRequest(requestId);
      toast.success(`Request from ${username} declined`);
    } catch (_error) {
      toast.error("Failed to reject request");
    }
  };

  const tabs = [
    { id: "invites" as const, label: "PENDING INVITES", count: guildPendingInvites?.length || 0 },
    { id: "requests" as const, label: "JOIN REQUESTS", count: joinRequests?.length || 0 },
  ];

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Send Invite Form */}
      <div className="paper-panel border-4 border-primary p-6 bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative">
        <div className="absolute top-0 right-0 p-2 bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest border-l-4 border-b-4 border-primary">
          Recruitment
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 border-2 border-primary bg-secondary/20 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <UserPlus className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-black text-2xl uppercase italic tracking-tighter ink-bleed">Draft New Member</h3>
        </div>

        <form onSubmit={handleSendInvite} className="flex flex-col sm:flex-row gap-3">
          <Input
            value={inviteUsername}
            onChange={(e) => setInviteUsername(e.target.value)}
            placeholder="ENTER USERNAME..."
            className="flex-1 border-2 border-primary bg-secondary/10 font-bold focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all uppercase placeholder:text-muted-foreground/50 h-12"
          />
          <Button
            type="submit"
            disabled={!inviteUsername.trim() || isSending}
            className={cn(
              "h-12 border-2 border-primary font-black uppercase tracking-widest transition-all",
              inviteUsername.trim() && !isSending
                ? "bg-primary text-primary-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                : "bg-muted text-muted-foreground border-primary/20 cursor-not-allowed shadow-none"
            )}
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Draft
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Tabs */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-3 px-6 py-3 border-2 transition-all relative group overflow-hidden",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                    : "bg-white text-muted-foreground border-primary/20 hover:border-primary hover:text-foreground"
                )}
              >
                <span className="font-black uppercase tracking-tight text-sm">{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    className={cn(
                      "px-2 py-0.5 text-xs font-bold border-2",
                      isActive
                        ? "bg-black/20 border-primary-foreground/20 text-primary-foreground"
                        : "bg-secondary/20 border-primary/20 text-primary"
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="paper-panel border-4 border-primary p-6 bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] min-h-[300px]">
          {activeTab === "invites" &&
            (guildPendingInvites && guildPendingInvites.length > 0 ? (
              <div className="space-y-3">
                {guildPendingInvites.map((invite) => (
                  <div
                    key={invite._id}
                    className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border-2 border-primary/20 bg-secondary/5 hover:border-primary hover:bg-white hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all group"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <Avatar className="w-10 h-10 border-2 border-primary bg-white rounded-none">
                        <AvatarFallback className="bg-primary/10 text-primary font-black uppercase text-sm rounded-none">
                          {invite.invitedUsername?.[0] || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-foreground uppercase tracking-tight ink-bleed text-lg leading-none">
                          {invite.invitedUsername || "Unknown"}
                        </p>
                        <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" />
                          Expires {new Date(invite.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => cancelInvite(invite._id)}
                      size="sm"
                      variant="ghost"
                      className="border-2 border-destructive/20 text-destructive/70 hover:text-destructive hover:bg-destructive hover:border-destructive hover:text-white rounded-none h-10 self-start sm:self-center w-full sm:w-auto font-black uppercase tracking-wider text-xs"
                      aria-label={`Cancel invite to ${invite.invitedUsername || "user"}`}
                    >
                      <X className="w-4 h-4 mr-2 sm:hidden" />
                      Revoke
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/60">
                <Mail className="w-16 h-16 mb-4 opacity-20" />
                <p className="font-black uppercase tracking-widest">No pending invites</p>
                <p className="text-xs font-bold uppercase mt-1 opacity-70">The roster is clear</p>
              </div>
            ))}

          {activeTab === "requests" &&
            (joinRequests && joinRequests.length > 0 ? (
              <div className="space-y-3">
                {joinRequests.map((request) => (
                  <div
                    key={request._id}
                    className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border-2 border-primary/20 bg-secondary/5 hover:border-primary hover:bg-white hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all group"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <Avatar className="w-10 h-10 border-2 border-primary bg-white rounded-none">
                        <AvatarFallback className="bg-primary/10 text-primary font-black uppercase text-sm rounded-none">
                          {request.username?.[0] || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-foreground uppercase tracking-tight ink-bleed text-lg leading-none">
                          {request.username || "Unknown"}
                        </p>
                        <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">
                          Requested {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                        {request.message && (
                          <div className="mt-2 p-2 bg-secondary/10 border-l-2 border-primary text-xs font-medium italic text-muted-foreground">
                            "{request.message}"
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 self-start sm:self-center w-full sm:w-auto">
                      <Button
                        onClick={() => handleApprove(request._id, request.username || "Unknown")}
                        size="sm"
                        className="flex-1 sm:flex-initial bg-green-600 hover:bg-green-500 text-white rounded-none border-2 border-transparent h-10 font-black uppercase text-xs tracking-wider shadow-[2px_2px_0px_0px_rgba(22,163,74,1)] hover:shadow-[4px_4px_0px_0px_rgba(22,163,74,1)] hover:-translate-y-0.5 transition-all"
                        aria-label={`Approve ${request.username || "user"}'s join request`}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleReject(request._id, request.username || "Unknown")}
                        size="sm"
                        variant="outline"
                        className="flex-1 sm:flex-initial border-2 border-destructive/30 text-destructive hover:bg-destructive hover:text-white hover:border-destructive rounded-none h-10 font-black uppercase text-xs tracking-wider hover:shadow-[4px_4px_0px_0px_rgba(239,68,68,1)] transition-all"
                        aria-label={`Reject ${request.username || "user"}'s join request`}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Deny
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/60">
                <UserPlus className="w-16 h-16 mb-4 opacity-20" />
                <p className="font-black uppercase tracking-widest">No pending requests</p>
                <p className="text-xs font-bold uppercase mt-1 opacity-70">The gates are quiet</p>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
