"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface AddFriendInputProps {
  username: string;
  setUsername: (username: string) => void;
  onAddFriend: () => void;
  isAdding: boolean;
}

export function AddFriendInput({
  username,
  setUsername,
  onAddFriend,
  isAdding,
}: AddFriendInputProps) {
  return (
    <div className="mb-6 p-4 rounded-2xl bg-black/40 border border-[#3d2b1f]">
      <p className="text-sm text-[#a89f94] mb-3">Enter a username to send a friend request</p>
      <div className="flex gap-2">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onAddFriend();
          }}
          placeholder="Username..."
          className="flex-1 px-4 py-3 rounded-xl bg-parchment text-[#2a1f14] placeholder:text-[#2a1f14]/40 border border-amber-500/20 focus:border-amber-500/50 focus:ring-amber-500/10 focus:outline-none focus:ring-2 text-sm"
        />
        <Button
          onClick={onAddFriend}
          disabled={!username.trim() || isAdding}
          className="tcg-button-primary rounded-xl px-6"
        >
          {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send"}
        </Button>
      </div>
    </div>
  );
}
