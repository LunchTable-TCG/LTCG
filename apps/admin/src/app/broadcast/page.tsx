"use client";

/**
 * Broadcast Page
 *
 * Send announcements and system messages to players.
 */

import { PageWrapper } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { RoleGuard } from "@/contexts/AdminContext";
import { typedApi, useConvexMutation } from "@/lib/convexHelpers";
import type { Id } from "@convex/_generated/dataModel";
import { Card, Text, Title } from "@tremor/react";
import { Loader2, Megaphone, Send, Users, Wrench } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// =============================================================================
// Types
// =============================================================================

type Priority = "normal" | "important" | "urgent";

// =============================================================================
// Component
// =============================================================================

export default function BroadcastPage() {
  return (
    <PageWrapper title="Broadcast Center" description="Send announcements and messages to players">
      {/* Info Card */}
      <Card className="mb-6">
        <Title>About Broadcasts</Title>
        <Text className="text-muted-foreground">
          Send messages directly to player inboxes. All broadcasts are logged to the audit trail.
        </Text>
        <div className="mt-4 grid gap-2 md:grid-cols-3">
          <div className="p-3 rounded-lg bg-muted/50">
            <Text className="font-medium">📢 Announcements</Text>
            <Text className="text-xs text-muted-foreground">News, updates, events</Text>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <Text className="font-medium">🔧 System Messages</Text>
            <Text className="text-xs text-muted-foreground">
              Maintenance, issues, account updates
            </Text>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <Text className="font-medium">📣 Broadcasts</Text>
            <Text className="text-xs text-muted-foreground">Send to all or filtered players</Text>
          </div>
        </div>
      </Card>

      {/* Broadcast Tabs */}
      <RoleGuard
        permission="batch.operations"
        fallback={
          <Card>
            <div className="text-center py-8">
              <Text className="text-muted-foreground">
                You don't have permission to send broadcasts.
              </Text>
            </div>
          </Card>
        }
      >
        <Tabs defaultValue="announcement" className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="announcement" className="flex items-center gap-2">
              <Megaphone className="w-4 h-4" />
              Announcement
            </TabsTrigger>
            <TabsTrigger value="broadcast" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Mass Broadcast
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              System Message
            </TabsTrigger>
          </TabsList>

          {/* Send Announcement Tab */}
          <TabsContent value="announcement">
            <AnnouncementForm />
          </TabsContent>

          {/* Mass Broadcast Tab */}
          <TabsContent value="broadcast">
            <BroadcastForm />
          </TabsContent>

          {/* System Message Tab */}
          <TabsContent value="system">
            <SystemMessageForm />
          </TabsContent>
        </Tabs>
      </RoleGuard>
    </PageWrapper>
  );
}

// =============================================================================
// Announcement Form (Targeted)
// =============================================================================

function AnnouncementForm() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [expiresInDays, setExpiresInDays] = useState<string>("");
  const [playerIds, setPlayerIds] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const sendAnnouncement = useConvexMutation(typedApi.admin.batchAdmin.sendAnnouncement);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !message.trim()) {
      toast.error("Title and message are required");
      return;
    }

    const ids = playerIds
      .split(/[\s,]+/)
      .map((id) => id.trim())
      .filter(Boolean);

    if (ids.length === 0) {
      toast.error("At least one player ID is required");
      return;
    }

    setIsLoading(true);
    try {
      const result = (await sendAnnouncement({
        playerIds: ids as Id<"users">[],
        title: title.trim(),
        message: message.trim(),
        priority,
        expiresInDays: expiresInDays ? Number.parseInt(expiresInDays) : undefined,
      })) as { message: string };

      toast.success(result.message);

      // Reset form
      setTitle("");
      setMessage("");
      setPlayerIds("");
      setExpiresInDays("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send announcement");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <Title>Send Announcement</Title>
      <Text className="text-muted-foreground mb-6">
        Send an announcement to specific players by their IDs.
      </Text>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Announcement title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="important">Important</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            placeholder="Write your announcement message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            required
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="playerIds">Player IDs (comma or space separated)</Label>
            <Textarea
              id="playerIds"
              placeholder="Enter player IDs..."
              value={playerIds}
              onChange={(e) => setPlayerIds(e.target.value)}
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expires">Expires In (days, optional)</Label>
            <Input
              id="expires"
              type="number"
              placeholder="Leave empty for no expiration"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
              min={1}
              max={365}
            />
          </div>
        </div>

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Send Announcement
            </>
          )}
        </Button>
      </form>
    </Card>
  );
}

// =============================================================================
// Mass Broadcast Form (All Players)
// =============================================================================

function BroadcastForm() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [expiresInDays, setExpiresInDays] = useState<string>("");
  const [minLevel, setMinLevel] = useState<string>("");
  const [activeInDays, setActiveInDays] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const broadcastAnnouncement = useConvexMutation(typedApi.admin.batchAdmin.broadcastAnnouncement);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !message.trim()) {
      toast.error("Title and message are required");
      return;
    }

    // Confirm before broadcasting to all
    if (!confirm("This will send a message to all matching players. Continue?")) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await broadcastAnnouncement({
        title: title.trim(),
        message: message.trim(),
        priority,
        expiresInDays: expiresInDays ? Number.parseInt(expiresInDays) : undefined,
        filterByMinLevel: minLevel ? Number.parseInt(minLevel) : undefined,
        filterByActiveInDays: activeInDays ? Number.parseInt(activeInDays) : undefined,
      });

      toast.success((result as { message?: string })?.message ?? "Broadcast sent successfully");

      // Reset form
      setTitle("");
      setMessage("");
      setMinLevel("");
      setActiveInDays("");
      setExpiresInDays("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to broadcast");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <Title>Mass Broadcast</Title>
      <Text className="text-muted-foreground mb-6">
        Send an announcement to all players (or filtered subset). Requires superadmin role.
      </Text>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="broadcast-title">Title</Label>
            <Input
              id="broadcast-title"
              placeholder="Announcement title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="broadcast-priority">Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="important">Important</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="broadcast-message">Message</Label>
          <Textarea
            id="broadcast-message"
            placeholder="Write your broadcast message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            required
          />
        </div>

        <div className="p-4 rounded-lg bg-muted/50 space-y-4">
          <Text className="font-medium">Filters (optional)</Text>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="minLevel">Minimum Level</Label>
              <Input
                id="minLevel"
                type="number"
                placeholder="e.g., 5"
                value={minLevel}
                onChange={(e) => setMinLevel(e.target.value)}
                min={1}
                max={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="activeInDays">Active in Last X Days</Label>
              <Input
                id="activeInDays"
                type="number"
                placeholder="e.g., 30"
                value={activeInDays}
                onChange={(e) => setActiveInDays(e.target.value)}
                min={1}
                max={365}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="broadcast-expires">Expires In (days)</Label>
              <Input
                id="broadcast-expires"
                type="number"
                placeholder="No expiration"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
                min={1}
                max={365}
              />
            </div>
          </div>
        </div>

        <Button type="submit" disabled={isLoading} className="w-full" variant="destructive">
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Broadcasting...
            </>
          ) : (
            <>
              <Users className="w-4 h-4 mr-2" />
              Broadcast to All Players
            </>
          )}
        </Button>
      </form>
    </Card>
  );
}

// =============================================================================
// System Message Form
// =============================================================================

function SystemMessageForm() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("general");
  const [playerIds, setPlayerIds] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Cast to unknown first to bypass typedApi's incorrect type signature
  const sendSystemMessageMutation = useConvexMutation(
    typedApi.admin.batchAdmin.sendSystemMessage
  ) as unknown as (args: {
    playerIds: Id<"users">[];
    title: string;
    message: string;
    category?: string;
  }) => Promise<{ message: string }>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !message.trim()) {
      toast.error("Title and message are required");
      return;
    }

    const ids = playerIds
      .split(/[\s,]+/)
      .map((id) => id.trim())
      .filter(Boolean);

    if (ids.length === 0) {
      toast.error("At least one player ID is required");
      return;
    }

    setIsLoading(true);
    try {
      const result = await sendSystemMessageMutation({
        playerIds: ids as Id<"users">[],
        title: title.trim(),
        message: message.trim(),
        category,
      });

      toast.success(result.message);

      // Reset form
      setTitle("");
      setMessage("");
      setPlayerIds("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send system message");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <Title>Send System Message</Title>
      <Text className="text-muted-foreground mb-6">
        Send system messages for maintenance notices, account issues, etc.
      </Text>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="system-title">Title</Label>
            <Input
              id="system-title"
              placeholder="System message title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="account">Account</SelectItem>
                <SelectItem value="security">Security</SelectItem>
                <SelectItem value="support">Support</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="system-message">Message</Label>
          <Textarea
            id="system-message"
            placeholder="Write your system message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="system-playerIds">Player IDs (comma or space separated)</Label>
          <Textarea
            id="system-playerIds"
            placeholder="Enter player IDs..."
            value={playerIds}
            onChange={(e) => setPlayerIds(e.target.value)}
            rows={3}
            required
          />
        </div>

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Wrench className="w-4 h-4 mr-2" />
              Send System Message
            </>
          )}
        </Button>
      </form>
    </Card>
  );
}
