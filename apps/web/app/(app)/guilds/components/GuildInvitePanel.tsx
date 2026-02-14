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
  guildId: Id<"guilds">;
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

  const handleApprove = async (requestId: Id<"guildJoinRequests">, username: string) => {
    try {
      await approveRequest(requestId);
      toast.success(`${username} has joined the guild!`);
    } catch (_error) {
      toast.error("Failed to approve request");
    }
  };

  const handleReject = async (requestId: Id<"guildJoinRequests">, username: string) => {
    try {
      await rejectRequest(requestId);
      toast.success(`Request from ${username} declined`);
    } catch (_error) {
      toast.error("Failed to reject request");
    }
  };

  const tabs = [
    { id: "invites" as const, label: "Sent Invites", count: guildPendingInvites?.length || 0 },
    { id: "requests" as const, label: "Join Requests", count: joinRequests?.length || 0 },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Send Invite Form */}
      <div className="p-6 rounded-xl bg-card/40 border border-border">
        <div className="flex items-center gap-3 mb-4">
          <UserPlus className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">Invite a Player</h3>
        </div>

        <form onSubmit={handleSendInvite} className="flex gap-3">
          <Input
            value={inviteUsername}
            onChange={(e) => setInviteUsername(e.target.value)}
            placeholder="Enter username..."
            className="flex-1 bg-card/40 border-border text-foreground focus:border-primary/50"
          />
          <Button
            type="submit"
            disabled={!inviteUsername.trim() || isSending}
            className="rounded-xl px-6"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-card/40 rounded-xl border border-border w-fit">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-all",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-bold",
                    isActive ? "bg-black/20" : "bg-white/10"
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
      <div className="space-y-3">
        {activeTab === "invites" &&
          (guildPendingInvites && guildPendingInvites.length > 0 ? (
            guildPendingInvites.map((invite) => (
              <div
                key={invite._id}
                className="flex items-center gap-4 p-4 rounded-xl bg-card/40 border border-border"
              >
                <Avatar className="w-12 h-12 border border-border">
                  <AvatarFallback className="bg-muted text-foreground font-bold">
                    {invite.invitedUsername?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">
                    {invite.invitedUsername || "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Expires {new Date(invite.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  onClick={() => cancelInvite(invite._id)}
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  aria-label={`Cancel invite to ${invite.invitedUsername || "user"}`}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))
          ) : (
            <div className="text-center py-12 rounded-xl bg-card/40 border border-border">
              <Mail className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">No pending invites</p>
            </div>
          ))}

        {activeTab === "requests" &&
          (joinRequests && joinRequests.length > 0 ? (
            joinRequests.map((request) => (
              <div
                key={request._id}
                className="flex items-center gap-4 p-4 rounded-xl bg-card/40 border border-border"
              >
                <Avatar className="w-12 h-12 border border-border">
                  <AvatarFallback className="bg-muted text-foreground font-bold">
                    {request.username?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{request.username || "Unknown"}</p>
                  {request.message && (
                    <p className="text-sm text-muted-foreground line-clamp-1">{request.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Requested {new Date(request.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleApprove(request._id, request.username || "Unknown")}
                    size="sm"
                    className="bg-green-600 hover:bg-green-500 text-white rounded-lg"
                    aria-label={`Approve ${request.username || "user"}'s join request`}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => handleReject(request._id, request.username || "Unknown")}
                    size="sm"
                    variant="outline"
                    className="border-destructive/30 text-destructive hover:bg-destructive/10 rounded-lg"
                    aria-label={`Reject ${request.username || "user"}'s join request`}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 rounded-xl bg-card/40 border border-border">
              <UserPlus className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">No pending join requests</p>
            </div>
          ))}
      </div>
    </div>
  );
}
