"use client";

import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

interface FriendsHeaderProps {
  friendCount: number;
  onlineCount: number;
  showAddFriend: boolean;
  setShowAddFriend: (show: boolean) => void;
}

export function FriendsHeader({
  friendCount,
  onlineCount,
  showAddFriend,
  setShowAddFriend,
}: FriendsHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-3xl font-black text-[#e8e0d5]">Friends</h1>
        <p className="text-[#a89f94] mt-1">
          {friendCount} friends · {onlineCount} online
        </p>
      </div>
      <Button
        onClick={() => setShowAddFriend(!showAddFriend)}
        className="tcg-button-primary rounded-xl"
      >
        <UserPlus className="w-4 h-4 mr-2" />
        Add Friend
      </Button>
    </div>
  );
}
