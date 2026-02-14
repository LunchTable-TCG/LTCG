"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { useFriendsInteraction } from "@/hooks/social/useFriendsInteraction";
import type { Id } from "@convex/_generated/dataModel";
import { Ban, Shield } from "lucide-react";
import { EmptyState } from "./EmptyState";

interface BlockedUsersListProps {
  blockedUsers: ReturnType<typeof useFriendsInteraction>["blockedUsers"];
  unblockUser: (id: Id<"users">) => void;
}

export function BlockedUsersList({ blockedUsers, unblockUser }: BlockedUsersListProps) {
  if (!blockedUsers || blockedUsers.length === 0) {
    return (
      <EmptyState
        icon={<Shield className="w-12 h-12" />}
        title="No blocked users"
        description="Users you block will appear here"
      />
    );
  }

  return (
    <div className="space-y-1">
      {blockedUsers.map((user) => (
        <div
          key={user.userId}
          className="flex items-center gap-3 p-3 rounded-xl bg-black/40 border border-[#3d2b1f] transition-colors"
        >
          <Avatar className="w-10 h-10 rounded-lg border border-[#3d2b1f]">
            <AvatarFallback className="bg-gradient-to-br from-[#3d2b1f] to-[#1a1614] text-[#a89f94] font-bold rounded-lg">
              <Ban className="w-5 h-5" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#a89f94] truncate">
              {user.username || "Unknown"}
            </p>
            <p className="text-xs text-[#a89f94]/60">
              Blocked{" "}
              {new Date(user.blockedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
          <Button
            onClick={() => unblockUser(user.userId)}
            size="sm"
            variant="outline"
            className="border-[#3d2b1f] text-[#a89f94] hover:text-[#e8e0d5] hover:border-[#d4af37]/50 rounded-lg"
          >
            Unblock
          </Button>
        </div>
      ))}
    </div>
  );
}
