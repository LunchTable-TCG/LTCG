"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Id } from "@convex/_generated/dataModel";
import { Circle, MessageSquare, UserMinus } from "lucide-react";

interface FriendRowProps {
  userId: Id<"users">;
  username?: string;
  image?: string;
  level: number;
  rankedElo: number;
  isOnline: boolean;
  friendsSince: number;
  onMessage: () => void;
  onRemove: () => void;
  isConfirmingRemove: boolean;
  onCancelRemove: () => void;
}

export function FriendRow({
  username,
  image,
  level,
  rankedElo,
  isOnline,
  friendsSince,
  onMessage,
  onRemove,
  isConfirmingRemove,
  onCancelRemove,
}: FriendRowProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-black/40 border border-[#3d2b1f] hover:border-[#d4af37]/30 transition-colors group">
      {/* Avatar */}
      <div className="relative shrink-0">
        <Avatar className="w-10 h-10 rounded-lg border border-[#3d2b1f]">
          {image && <AvatarImage src={image} alt={username || "User"} className="rounded-lg" />}
          <AvatarFallback className="bg-gradient-to-br from-[#8b4513] to-[#3d2b1f] text-[#d4af37] font-bold rounded-lg">
            {(username || "?")[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <Circle
          className={cn(
            "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 border-2 border-[#0d0a09] rounded-full",
            isOnline ? "fill-green-400 text-green-400" : "fill-[#3d2b1f] text-[#3d2b1f]"
          )}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-[#e8e0d5] truncate">{username || "Unknown"}</p>
        <p className="text-xs text-[#a89f94]">
          Lvl {level} · {rankedElo} ELO
          <span className="hidden sm:inline text-[#a89f94]/40">
            {" "}
            · Friends since{" "}
            {new Date(friendsSince).toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            })}
          </span>
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {isConfirmingRemove ? (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/30">
            <span className="text-xs text-red-400 font-medium">Remove?</span>
            <Button
              onClick={onRemove}
              size="sm"
              className="h-6 px-2 bg-red-600 hover:bg-red-500 text-white text-xs rounded"
            >
              Yes
            </Button>
            <Button
              onClick={onCancelRemove}
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[#a89f94] hover:text-[#e8e0d5] text-xs"
            >
              No
            </Button>
          </div>
        ) : (
          <>
            <Button
              onClick={onMessage}
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-[#a89f94] hover:text-[#d4af37] hover:bg-[#d4af37]/10 rounded-lg"
              title="Send message"
            >
              <MessageSquare className="w-4 h-4" />
            </Button>
            <Button
              onClick={onRemove}
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-[#a89f94] hover:text-red-400 hover:bg-red-500/10 rounded-lg"
              title="Remove friend"
            >
              <UserMinus className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
