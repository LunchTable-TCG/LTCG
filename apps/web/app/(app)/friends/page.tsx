"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFriendsInteraction } from "@/hooks/social/useFriendsInteraction";
import { cn } from "@/lib/utils";
import type { Friend } from "@/types";
import type { Id } from "@convex/_generated/dataModel";
import {
  Check,
  Clock,
  Loader2,
  MessageSquare,
  Search,
  Swords,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";

export default function FriendsPage() {
  const {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    tabs,
    filteredOnline,
    offlineFriends,
    incomingRequests,
    outgoingRequests,
    acceptFriendRequest,
    cancelFriendRequest,
    declineFriendRequest,
    removeFriend,
    blockedUsers,
    unblockUser,
    isLoading,
    showAddFriend,
    setShowAddFriend,
    addFriendUsername,
    setAddFriendUsername,
    handleAddFriend,
    isAdding,
    confirmRemove,
    setConfirmRemove,
    handleMessage,
  } = useFriendsInteraction();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pb-24 space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-left">
          <h1 className="text-4xl font-heading font-bold bg-gradient-to-r from-primary via-amber-200 to-primary bg-clip-text text-transparent drop-shadow-sm">
            Social Circle
          </h1>
          <p className="text-muted-foreground mt-1">Build your alliance and challenge rivals.</p>
        </div>
        <Button onClick={() => setShowAddFriend(true)} className="tcg-button-primary">
          <UserPlus className="w-4 h-4 mr-2" />
          Add Friend
        </Button>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as TabType)}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <TabsList className="bg-secondary/50 border border-border/50">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="gap-2">
                {tab.label}
                {tab.count > 0 && (
                  <Badge variant="secondary" className="bg-background text-xs px-1.5 h-5 min-w-5">
                    {tab.count}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Search - Only on friends tab */}
          {activeTab === "friends" && (
            <div className="relative w-full max-w-xs hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search friends..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background/50 border-border/50 focus-visible:ring-primary/50"
              />
            </div>
          )}
        </div>

        {/* Content: Friends */}
        <TabsContent value="friends" className="space-y-8 outline-none mt-6">
          {filteredOnline.length === 0 && offlineFriends.length === 0 ? (
            <div className="text-center py-20 bg-card/30 rounded-xl border border-border/50 border-dashed">
              <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-muted-foreground">No Friends Yet</h3>
              <p className="text-sm text-muted-foreground/60 mb-4">
                Your circle is empty. Add friends to start battling!
              </p>
              <Button variant="outline" onClick={() => setShowAddFriend(true)}>
                Find Champions
              </Button>
            </div>
          ) : (
            <>
              {/* Online Friends */}
              {filteredOnline.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
                    Online - {filteredOnline.length}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredOnline.map((friend) => (
                      <FriendCard
                        key={friend.friendId}
                        friend={friend}
                        onMessage={() => handleMessage(friend.userId)}
                        onRemove={() => setConfirmRemove(friend.userId)}
                        isOnline
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Offline Friends */}
              {offlineFriends.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-slate-500" />
                    Offline - {offlineFriends.length}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {offlineFriends.map((friend) => (
                      <FriendCard
                        key={friend.friendId}
                        friend={friend}
                        onMessage={() => handleMessage(friend.userId)}
                        onRemove={() => setConfirmRemove(friend.userId)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Content: Requests */}
        <TabsContent value="requests" className="space-y-8 outline-none mt-6">
          {/* Incoming */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
              Incoming Requests
            </h3>
            {incomingRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground/50 italic">No pending requests.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {incomingRequests.map((req) => (
                  <div
                    key={req.requestId}
                    className="flex items-center justify-between p-4 rounded-xl bg-card border border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 border border-border">
                        <AvatarFallback>{req.username[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-bold">{req.username}</p>
                        <p className="text-xs text-muted-foreground">Wants to be friends</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => declineFriendRequest(req.userId)}
                        className="hover:text-destructive hover:bg-destructive/10"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        onClick={() => acceptFriendRequest(req.userId)}
                        className="bg-green-600 hover:bg-green-500 text-white"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Outgoing */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
              Sent Requests
            </h3>
            {outgoingRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground/50 italic">No sent requests.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {outgoingRequests.map((req) => (
                  <div
                    key={req.requestId}
                    className="flex items-center justify-between p-4 rounded-xl bg-card/50 border border-border/50"
                  >
                    <div className="flex items-center gap-3 opacity-70">
                      <Avatar className="w-10 h-10 border border-border">
                        <AvatarFallback>{req.username[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-bold">{req.username}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Pending acceptance
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => cancelFriendRequest(req.userId)}
                      className="border-border/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                    >
                      Cancel
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Content: Blocked */}
        <TabsContent value="blocked" className="mt-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
              Blocked Users
            </h3>
            {blockedUsers?.length === 0 ? (
              <p className="text-sm text-muted-foreground/50 italic">No blocked users.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {blockedUsers?.map((user) => (
                  <div
                    key={user.userId}
                    className="flex items-center justify-between p-4 rounded-xl bg-card border border-border/50 opacity-70"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 grayscale">
                        <AvatarFallback>{user.username[0]}</AvatarFallback>
                      </Avatar>
                      <p className="font-bold text-muted-foreground">{user.username}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => unblockUser(user.userId)}>
                      Unblock
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Friend Dialog */}
      <Dialog open={showAddFriend} onOpenChange={setShowAddFriend}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a Champion</DialogTitle>
            <DialogDescription>
              Enter the username of the player you want to add to your circle.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Username"
              value={addFriendUsername}
              onChange={(e) => setAddFriendUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddFriend()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddFriend(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddFriend}
              disabled={!addFriendUsername.trim() || isAdding}
              className="tcg-button-primary"
            >
              {isAdding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Friend Confirmation */}
      <Dialog open={!!confirmRemove} onOpenChange={(open) => !open && setConfirmRemove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Friend?</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this player from your friends list?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemove(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (confirmRemove) removeFriend(confirmRemove as Id<"users">);
                setConfirmRemove(null);
              }}
              variant="destructive"
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FriendCard({
  friend,
  onMessage,
  onRemove,
  isOnline,
}: { friend: Friend; onMessage: () => void; onRemove: () => void; isOnline?: boolean }) {
  return (
    <div
      className={cn(
        "group relative flex items-center gap-4 p-4 rounded-xl border transition-all duration-300",
        isOnline
          ? "bg-gradient-to-r from-card to-card/50 border-primary/20 hover:border-primary/50"
          : "bg-card/30 border-border/50 hover:bg-card/50"
      )}
    >
      <div className="relative">
        <Avatar className="w-12 h-12 border-2 border-border group-hover:border-primary/50 transition-colors">
          <AvatarFallback>{friend.username[0]}</AvatarFallback>
        </Avatar>
        {isOnline && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-bold truncate text-foreground group-hover:text-primary transition-colors">
          {friend.username}
        </h4>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          {isOnline
            ? "Online"
            : `Last seen ${new Date(friend.lastInteraction || Date.now()).toLocaleDateString()}`}
        </p>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-primary"
          onClick={onMessage}
        >
          <MessageSquare className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-orange-500"
        >
          <Swords className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          <UserMinus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
