"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useFriendsInteraction } from "@/hooks/social/useFriendsInteraction";
import { Check, UserPlus, Users, X } from "lucide-react";
import { EmptyState } from "./EmptyState";

interface FriendRequestsProps {
  incomingRequests: ReturnType<typeof useFriendsInteraction>["incomingRequests"];
  outgoingRequests: ReturnType<typeof useFriendsInteraction>["outgoingRequests"];
  incomingCount: number;
  outgoingCount: number;
  acceptFriendRequest: (id: any) => void;
  declineFriendRequest: (id: any) => void;
  cancelFriendRequest: (id: any) => void;
}

export function FriendRequests({
  incomingRequests,
  outgoingRequests,
  incomingCount,
  outgoingCount,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
}: FriendRequestsProps) {
  return (
    <div className="space-y-6">
      {/* Incoming Requests */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#d4af37] mb-3">
          Incoming — {incomingCount}
        </h3>
        {incomingRequests && incomingRequests.length > 0 ? (
          <div className="space-y-1">
            {incomingRequests.map((req) => (
              <div
                key={req.userId}
                className="flex items-center gap-3 p-3 rounded-xl bg-black/40 border border-[#3d2b1f] hover:border-[#d4af37]/30 transition-colors"
              >
                <Avatar className="w-10 h-10 rounded-lg border border-[#3d2b1f]">
                  {req.image && (
                    <AvatarImage
                      src={req.image}
                      alt={req.username || "User"}
                      className="rounded-lg"
                    />
                  )}
                  <AvatarFallback className="bg-gradient-to-br from-[#8b4513] to-[#3d2b1f] text-[#d4af37] font-bold rounded-lg">
                    {(req.username || "?")[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#e8e0d5] truncate">
                    {req.username || "Unknown"}
                  </p>
                  <p className="text-xs text-[#a89f94]">
                    Level {req.level} · {req.rankedElo} ELO
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => acceptFriendRequest(req.userId)}
                    size="sm"
                    className="bg-green-600 hover:bg-green-500 text-white rounded-lg"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => declineFriendRequest(req.userId)}
                    size="sm"
                    variant="ghost"
                    className="text-[#a89f94] hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<UserPlus className="w-10 h-10" />}
            title="No incoming requests"
            description="When someone sends you a friend request, it will appear here"
            compact
          />
        )}
      </div>

      {/* Outgoing Requests */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#a89f94]/60 mb-3">
          Sent — {outgoingCount}
        </h3>
        {outgoingRequests && outgoingRequests.length > 0 ? (
          <div className="space-y-1">
            {outgoingRequests.map((req) => (
              <div
                key={req.userId}
                className="flex items-center gap-3 p-3 rounded-xl bg-black/40 border border-[#3d2b1f] transition-colors"
              >
                <Avatar className="w-10 h-10 rounded-lg border border-[#3d2b1f]">
                  {req.image && (
                    <AvatarImage
                      src={req.image}
                      alt={req.username || "User"}
                      className="rounded-lg"
                    />
                  )}
                  <AvatarFallback className="bg-gradient-to-br from-[#8b4513] to-[#3d2b1f] text-[#a89f94] font-bold rounded-lg">
                    {(req.username || "?")[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#e8e0d5] truncate">
                    {req.username || "Unknown"}
                  </p>
                  <p className="text-xs text-[#a89f94]">
                    Sent{" "}
                    {new Date(req.requestedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <Button
                  onClick={() => cancelFriendRequest(req.userId)}
                  size="sm"
                  variant="outline"
                  className="border-[#3d2b1f] text-[#a89f94] hover:text-red-400 hover:border-red-500/50 rounded-lg"
                >
                  Cancel
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Users className="w-10 h-10" />}
            title="No pending requests"
            description="Friend requests you've sent will appear here"
            compact
          />
        )}
      </div>
    </div>
  );
}
