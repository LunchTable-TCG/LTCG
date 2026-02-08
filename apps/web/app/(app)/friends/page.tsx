"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useFriends } from "@/hooks";
import { useDMConversations } from "@/hooks/social/useDMConversations";
import { cn } from "@/lib/utils";
import type { Id } from "@convex/_generated/dataModel";
import {
  Ban,
  Check,
  Circle,
  Loader2,
  MessageSquare,
  Search,
  Shield,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type TabType = "friends" | "requests" | "blocked";

export default function FriendsPage() {
  const {
    friends,
    incomingRequests,
    outgoingRequests,
    blockedUsers,
    friendCount,
    incomingRequestCount,
    outgoingRequestCount,
    onlineCount,
    isLoading,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    cancelFriendRequest,
    removeFriend,
    unblockUser,
  } = useFriends();

  const { startConversation } = useDMConversations();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabType>("friends");
  const [searchQuery, setSearchQuery] = useState("");
  const [addFriendUsername, setAddFriendUsername] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0d0a09] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#d4af37] animate-spin" />
      </div>
    );
  }

  const handleAddFriend = async () => {
    if (!addFriendUsername.trim() || isAdding) return;
    setIsAdding(true);
    try {
      await sendFriendRequest(addFriendUsername.trim());
      setAddFriendUsername("");
      setShowAddFriend(false);
    } catch {
      // Error handled by hook
    } finally {
      setIsAdding(false);
    }
  };

  const handleMessage = async (friendId: Id<"users">) => {
    try {
      await startConversation(friendId);
      router.push("/lunchtable");
    } catch {
      // Error handled by hook
    }
  };

  const tabs = [
    { id: "friends" as const, label: "Friends", count: friendCount },
    {
      id: "requests" as const,
      label: "Requests",
      count: incomingRequestCount + outgoingRequestCount,
    },
    { id: "blocked" as const, label: "Blocked", count: blockedUsers?.length ?? 0 },
  ];

  // Filter friends by search
  const filteredFriends = searchQuery
    ? friends?.filter((f) => f.username?.toLowerCase().includes(searchQuery.toLowerCase()))
    : friends;

  // Separate online and offline
  const offlineFriends = filteredFriends?.filter((f) => !f.isOnline) ?? [];
  const filteredOnline = filteredFriends?.filter((f) => f.isOnline) ?? [];

  return (
    <div className="min-h-screen bg-[#0d0a09] pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
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

        {/* Add Friend Input */}
        {showAddFriend && (
          <div className="mb-6 p-4 rounded-2xl bg-black/40 border border-[#3d2b1f]">
            <p className="text-sm text-[#a89f94] mb-3">Enter a username to send a friend request</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={addFriendUsername}
                onChange={(e) => setAddFriendUsername(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddFriend();
                }}
                placeholder="Username..."
                className="flex-1 px-4 py-3 rounded-xl bg-parchment text-[#2a1f14] placeholder:text-[#2a1f14]/40 border border-amber-500/20 focus:border-amber-500/50 focus:ring-amber-500/10 focus:outline-none focus:ring-2 text-sm"
              />
              <Button
                onClick={handleAddFriend}
                disabled={!addFriendUsername.trim() || isAdding}
                className="tcg-button-primary rounded-xl px-6"
              >
                {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send"}
              </Button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-black/40 rounded-xl border border-[#3d2b1f] w-fit mb-6">
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
                    ? "bg-[#d4af37] text-[#1a1614]"
                    : "text-[#a89f94] hover:text-[#e8e0d5] hover:bg-white/5"
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

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {/* Friends Tab */}
          {activeTab === "friends" && (
            <div className="space-y-6">
              {/* Search */}
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

              {!filteredFriends || filteredFriends.length === 0 ? (
                <EmptyState
                  icon={<Users className="w-12 h-12" />}
                  title={searchQuery ? "No friends found" : "No friends yet"}
                  description={
                    searchQuery
                      ? "Try a different search term"
                      : "Add friends to play together and chat!"
                  }
                />
              ) : (
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
                    <div>
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
              )}
            </div>
          )}

          {/* Requests Tab */}
          {activeTab === "requests" && (
            <div className="space-y-6">
              {/* Incoming Requests */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#d4af37] mb-3">
                  Incoming — {incomingRequestCount}
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
                  Sent — {outgoingRequestCount}
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
          )}

          {/* Blocked Tab */}
          {activeTab === "blocked" && (
            <div>
              {blockedUsers && blockedUsers.length > 0 ? (
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
              ) : (
                <EmptyState
                  icon={<Shield className="w-12 h-12" />}
                  title="No blocked users"
                  description="Users you block will appear here"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function FriendRow({
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
}: {
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
}) {
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

function EmptyState({
  icon,
  title,
  description,
  compact,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-8" : "py-16"
      )}
    >
      <div className="text-[#a89f94]/30 mb-3">{icon}</div>
      <p className="text-[#e8e0d5] font-medium">{title}</p>
      <p className="text-sm text-[#a89f94] mt-1 max-w-xs">{description}</p>
    </div>
  );
}
