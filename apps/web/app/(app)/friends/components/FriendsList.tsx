"use client";

import { useFriendsInteraction } from "@/hooks/social/useFriendsInteraction";
import { Circle, Users } from "lucide-react";
import { FriendRow } from "./FriendRow";
import { EmptyState } from "./EmptyState";

interface FriendsListProps {
  filteredFriends?: ReturnType<typeof useFriendsInteraction>["filteredFriends"];
  filteredOnline: ReturnType<typeof useFriendsInteraction>["filteredOnline"];
  offlineFriends: ReturnType<typeof useFriendsInteraction>["offlineFriends"];
  searchQuery: string;
  handleMessage: (friendId: any) => void;
  removeFriend: (friendId: any) => void;
  confirmRemove: string | null;
  setConfirmRemove: (id: string | null) => void;
}

export function FriendsList({
  filteredFriends,
  filteredOnline,
  offlineFriends,
  searchQuery,
  handleMessage,
  removeFriend,
  confirmRemove,
  setConfirmRemove,
}: FriendsListProps) {
  if (!filteredFriends || filteredFriends.length === 0) {
    return (
      <EmptyState
        icon={<Users className="w-12 h-12" />}
        title={searchQuery ? "No friends found" : "No friends yet"}
        description={
          searchQuery ? "Try a different search term" : "Add friends to play together and chat!"
        }
      />
    );
  }

  return (
    <>
      {/* Online Friends */}
      {filteredOnline.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-green-400 mb-3 flex items-center gap-2">
            <Circle className="w-2.5 h-2.5 fill-green-400 text-green-400" />
            Online — {filteredOnline.length}
          </h3>
          <div className="space-y-1">
            {filteredOnline.map((friend) => (
              <FriendRow
                key={friend.userId}
                userId={friend.userId}
                username={friend.username}
                image={friend.image}
                level={friend.level}
                rankedElo={friend.rankedElo}
                isOnline
                friendsSince={friend.friendsSince}
                onMessage={() => handleMessage(friend.userId)}
                onRemove={() => {
                  if (confirmRemove === friend.userId) {
                    removeFriend(friend.userId);
                    setConfirmRemove(null);
                  } else {
                    setConfirmRemove(friend.userId);
                  }
                }}
                isConfirmingRemove={confirmRemove === friend.userId}
                onCancelRemove={() => setConfirmRemove(null)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Offline Friends */}
      {offlineFriends.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#a89f94]/60 mb-3">
            Offline — {offlineFriends.length}
          </h3>
          <div className="space-y-1">
            {offlineFriends.map((friend) => (
              <FriendRow
                key={friend.userId}
                userId={friend.userId}
                username={friend.username}
                image={friend.image}
                level={friend.level}
                rankedElo={friend.rankedElo}
                isOnline={false}
                friendsSince={friend.friendsSince}
                onMessage={() => handleMessage(friend.userId)}
                onRemove={() => {
                  if (confirmRemove === friend.userId) {
                    removeFriend(friend.userId);
                    setConfirmRemove(null);
                  } else {
                    setConfirmRemove(friend.userId);
                  }
                }}
                isConfirmingRemove={confirmRemove === friend.userId}
                onCancelRemove={() => setConfirmRemove(null)}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
