"use client";

/**
 * Chat Moderation Page
 *
 * View and moderate global chat messages, mute users.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAdmin } from "@/contexts/AdminContext";
import { apiAny, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import { formatDistanceToNow, format } from "date-fns";
import Link from "next/link";
import { useState } from "react";

export default function ChatModerationPage() {
  const { isAdmin } = useAdmin();

  const [search, setSearch] = useState("");
  const [timeFilter, setTimeFilter] = useState<string>("24h");
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [muteDialogOpen, setMuteDialogOpen] = useState(false);
  const [muteUserId, setMuteUserId] = useState<string | null>(null);
  const [muteUsername, setMuteUsername] = useState("");
  const [muteDuration, setMuteDuration] = useState(60);
  const [muteReason, setMuteReason] = useState("");
  const [deleteReason, setDeleteReason] = useState("");

  // Calculate since timestamp based on filter
  const getSinceTimestamp = () => {
    const now = Date.now();
    switch (timeFilter) {
      case "1h":
        return now - 60 * 60 * 1000;
      case "6h":
        return now - 6 * 60 * 60 * 1000;
      case "24h":
        return now - 24 * 60 * 60 * 1000;
      case "7d":
        return now - 7 * 24 * 60 * 60 * 1000;
      default:
        return undefined;
    }
  };

  const messages = useConvexQuery(
    apiAny.admin.chat.listMessages,
    isAdmin
      ? {
          search: search || undefined,
          since: getSinceTimestamp(),
          limit: 200,
        }
      : "skip"
  );

  const stats = useConvexQuery(
    apiAny.admin.chat.getChatStats,
    isAdmin ? {} : "skip"
  );

  const mutedUsers = useConvexQuery(
    apiAny.admin.chat.getMutedUsers,
    isAdmin ? {} : "skip"
  );

  const deleteMessage = useConvexMutation(apiAny.admin.chat.deleteMessage);
  const bulkDeleteMessages = useConvexMutation(apiAny.admin.chat.bulkDeleteMessages);
  const muteUser = useConvexMutation(apiAny.admin.chat.muteUser);
  const unmuteUser = useConvexMutation(apiAny.admin.chat.unmuteUser);

  const handleSelectAll = (checked: boolean) => {
    if (checked && messages?.messages) {
      setSelectedMessages(new Set(messages.messages.map((m: { _id: string }) => m._id)));
    } else {
      setSelectedMessages(new Set());
    }
  };

  const handleSelectMessage = (messageId: string, checked: boolean) => {
    const newSelected = new Set(selectedMessages);
    if (checked) {
      newSelected.add(messageId);
    } else {
      newSelected.delete(messageId);
    }
    setSelectedMessages(newSelected);
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage({ messageId, reason: deleteReason || undefined });
      setDeleteReason("");
    } catch (error) {
      console.error("Failed to delete message:", error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedMessages.size === 0) return;

    try {
      await bulkDeleteMessages({
        messageIds: Array.from(selectedMessages),
        reason: deleteReason || undefined,
      });
      setSelectedMessages(new Set());
      setDeleteReason("");
    } catch (error) {
      console.error("Failed to delete messages:", error);
    }
  };

  const handleMuteUser = async () => {
    if (!muteUserId) return;

    try {
      await muteUser({
        userId: muteUserId,
        durationMinutes: muteDuration,
        reason: muteReason || undefined,
      });
      setMuteDialogOpen(false);
      setMuteUserId(null);
      setMuteUsername("");
      setMuteDuration(60);
      setMuteReason("");
    } catch (error) {
      console.error("Failed to mute user:", error);
    }
  };

  const handleUnmuteUser = async (userId: string) => {
    try {
      await unmuteUser({ userId });
    } catch (error) {
      console.error("Failed to unmute user:", error);
    }
  };

  const openMuteDialog = (userId: string, username: string) => {
    setMuteUserId(userId);
    setMuteUsername(username);
    setMuteDialogOpen(true);
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Access denied</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Chat Moderation</h1>
        <p className="text-muted-foreground">
          Monitor and moderate global chat messages
        </p>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Messages</CardDescription>
              <CardTitle className="text-2xl">{stats.totalMessages}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Last Hour</CardDescription>
              <CardTitle className="text-2xl">{stats.messagesLastHour}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Last 24h</CardDescription>
              <CardTitle className="text-2xl">{stats.messagesLast24h}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Users</CardDescription>
              <CardTitle className="text-2xl">{stats.uniqueUsersToday}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Muted Users</CardDescription>
              <CardTitle className="text-2xl text-yellow-500">
                {stats.mutedUsersCount}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      <Tabs defaultValue="messages" className="space-y-4">
        <TabsList>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="muted">
            Muted Users
            {mutedUsers && mutedUsers.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {mutedUsers.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-1 gap-4">
                  <Input
                    placeholder="Search messages or usernames..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-sm"
                  />
                  <Select value={timeFilter} onValueChange={setTimeFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Time range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1h">Last hour</SelectItem>
                      <SelectItem value="6h">Last 6 hours</SelectItem>
                      <SelectItem value="24h">Last 24 hours</SelectItem>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="all">All time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedMessages.size > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {selectedMessages.size} selected
                    </span>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleBulkDelete}
                    >
                      Delete Selected
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!messages ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-muted-foreground">Loading...</p>
                </div>
              ) : messages.messages.length === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-muted-foreground">No messages found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            messages.messages.length > 0 &&
                            selectedMessages.size === messages.messages.length
                          }
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="w-32">User</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead className="w-40">Time</TableHead>
                      <TableHead className="w-32 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {messages.messages.map((message: {
                      _id: string;
                      userId: string;
                      username: string;
                      message: string;
                      createdAt: number;
                      isSystem: boolean;
                    }) => (
                      <TableRow key={message._id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedMessages.has(message._id)}
                            onCheckedChange={(checked) =>
                              handleSelectMessage(message._id, checked as boolean)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/players/${message.userId}`}
                              className="font-medium text-primary hover:underline"
                            >
                              {message.username}
                            </Link>
                            {message.isSystem && (
                              <Badge variant="outline" className="text-xs">
                                System
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <p className="truncate">{message.message}</p>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDistanceToNow(new Date(message.createdAt), {
                            addSuffix: true,
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                openMuteDialog(message.userId, message.username)
                              }
                            >
                              Mute
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteMessage(message._id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {messages?.hasMore && (
                <div className="flex justify-center mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {messages.messages.length} of {messages.totalCount} messages
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="muted" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Currently Muted Users</CardTitle>
              <CardDescription>
                Users who are temporarily prevented from sending chat messages
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!mutedUsers ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-muted-foreground">Loading...</p>
                </div>
              ) : mutedUsers.length === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-muted-foreground">No muted users</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Muted Until</TableHead>
                      <TableHead>Time Remaining</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mutedUsers.map((user: {
                      _id: string;
                      username: string;
                      mutedUntil: number;
                      remainingMinutes: number;
                    }) => (
                      <TableRow key={user._id}>
                        <TableCell>
                          <Link
                            href={`/players/${user._id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {user.username}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {format(new Date(user.mutedUntil), "PPpp")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {user.remainingMinutes} min remaining
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUnmuteUser(user._id)}
                          >
                            Unmute
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Mute Dialog */}
      <Dialog open={muteDialogOpen} onOpenChange={setMuteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mute User</DialogTitle>
            <DialogDescription>
              Temporarily prevent {muteUsername} from sending chat messages
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Duration (minutes)</Label>
              <Select
                value={muteDuration.toString()}
                onValueChange={(v) => setMuteDuration(Number(v))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                  <SelectItem value="360">6 hours</SelectItem>
                  <SelectItem value="720">12 hours</SelectItem>
                  <SelectItem value="1440">24 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Reason (optional)</Label>
              <Textarea
                value={muteReason}
                onChange={(e) => setMuteReason(e.target.value)}
                placeholder="Reason for muting..."
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMuteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMuteUser}>
              Mute User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
