"use client";

import { useFriendsInteraction } from "@/hooks/social/useFriendsInteraction";
import { Loader2, Search } from "lucide-react";
import { AddFriendInput } from "./components/AddFriendInput";
import { BlockedUsersList } from "./components/BlockedUsersList";
import { FriendRequests } from "./components/FriendRequests";
import { FriendsHeader } from "./components/FriendsHeader";
import { FriendsList } from "./components/FriendsList";
import { FriendsTabs } from "./components/FriendsTabs";

export default function FriendsPage() {
  const {
    incomingRequests,
    outgoingRequests,
    blockedUsers,
    friendCount,
    incomingRequestCount,
    outgoingRequestCount,
    onlineCount,
    isLoading,
    acceptFriendRequest,
    declineFriendRequest,
    cancelFriendRequest,
    removeFriend,
    unblockUser,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    addFriendUsername,
    setAddFriendUsername,
    isAdding,
    showAddFriend,
    setShowAddFriend,
    confirmRemove,
    setConfirmRemove,
    tabs,
    filteredFriends,
    offlineFriends,
    filteredOnline,
    handleAddFriend,
    handleMessage,
  } = useFriendsInteraction();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0d0a09] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#d4af37] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0a09] pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <FriendsHeader
          friendCount={friendCount}
          onlineCount={onlineCount}
          showAddFriend={showAddFriend}
          setShowAddFriend={setShowAddFriend}
        />

        {showAddFriend && (
          <AddFriendInput
            username={addFriendUsername}
            setUsername={setAddFriendUsername}
            onAddFriend={handleAddFriend}
            isAdding={isAdding}
          />
        )}

        <FriendsTabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="min-h-[400px]">
          {activeTab === "friends" && (
            <div className="space-y-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a89f94]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search friends..."
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-black/40 text-[#e8e0d5] placeholder:text-[#a89f94]/50 border border-[#3d2b1f] focus:border-[#d4af37]/50 focus:ring-[#d4af37]/10 focus:outline-none focus:ring-2 text-sm"
                />
              </div>

              <FriendsList
                filteredFriends={filteredFriends}
                filteredOnline={filteredOnline}
                offlineFriends={offlineFriends}
                searchQuery={searchQuery}
                handleMessage={handleMessage}
                removeFriend={removeFriend}
                confirmRemove={confirmRemove}
                setConfirmRemove={setConfirmRemove}
              />
            </div>
          )}

          {activeTab === "requests" && (
            <FriendRequests
              incomingRequests={incomingRequests}
              outgoingRequests={outgoingRequests}
              incomingCount={incomingRequestCount}
              outgoingCount={outgoingRequestCount}
              acceptFriendRequest={acceptFriendRequest}
              declineFriendRequest={declineFriendRequest}
              cancelFriendRequest={cancelFriendRequest}
            />
          )}

          {activeTab === "blocked" && (
            <BlockedUsersList blockedUsers={blockedUsers} unblockUser={unblockUser} />
          )}
        </div>
      </div>
    </div>
  );
}
