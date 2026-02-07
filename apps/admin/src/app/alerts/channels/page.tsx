"use client";

/**
 * Notification Channels Page
 *
 * Configure channels for alert delivery: in-app, Slack, Discord.
 */

import { PageWrapper } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { typedApi, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { Badge, Text, Title } from "@tremor/react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

// =============================================================================
// Types
// =============================================================================

type ChannelType = "in_app" | "push" | "email" | "slack" | "discord";
type Severity = "critical" | "warning" | "info";

interface ChannelFormData {
  name: string;
  type: ChannelType | "";
  webhookUrl: string;
  email: string;
  minSeverity: Severity | "";
}

// =============================================================================
// Helper Functions
// =============================================================================

function getChannelIcon(type: string) {
  switch (type) {
    case "in_app":
      return "🔔";
    case "email":
      return "📧";
    case "slack":
      return "💬";
    case "discord":
      return "🎮";
    default:
      return "📡";
  }
}

function getChannelLabel(type: string) {
  switch (type) {
    case "in_app":
      return "In-App";
    case "email":
      return "Email";
    case "slack":
      return "Slack";
    case "discord":
      return "Discord";
    default:
      return type;
  }
}

function getSeverityBadge(severity: string) {
  switch (severity) {
    case "critical":
      return <Badge color="rose">Critical+</Badge>;
    case "warning":
      return <Badge color="amber">Warning+</Badge>;
    case "info":
      return <Badge color="blue">All Alerts</Badge>;
    default:
      return <Badge>{severity}</Badge>;
  }
}

// =============================================================================
// Component
// =============================================================================

export default function AlertChannelsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isTesting, setIsTesting] = useState<string | null>(null);
  const [editingChannel, setEditingChannel] = useState<Doc<"alertChannels"> | null>(null);

  // Form state
  const [formData, setFormData] = useState<ChannelFormData>({
    name: "",
    type: "",
    webhookUrl: "",
    email: "",
    minSeverity: "warning",
  });

  // Fetch channels
  const channels = useConvexQuery(typedApi.alerts.channels.getAll, {}) as
    | Doc<"alertChannels">[]
    | undefined;

  // Mutations
  const createChannel = useConvexMutation(typedApi.alerts.channels.create);
  const updateChannel = useConvexMutation(typedApi.alerts.channels.update);
  const removeChannel = useConvexMutation(typedApi.alerts.channels.remove);
  const testChannel = useConvexMutation(typedApi.alerts.channels.test);
  const setupDefaults = useConvexMutation(typedApi.alerts.channels.setupDefaults);

  const isLoading = channels === undefined;

  function resetForm() {
    setFormData({
      name: "",
      type: "",
      webhookUrl: "",
      email: "",
      minSeverity: "warning",
    });
    setEditingChannel(null);
  }

  function openEditDialog(channel: Doc<"alertChannels">) {
    setFormData({
      name: channel.name,
      type: channel.type,
      webhookUrl: channel.config?.webhookUrl || "",
      email: channel.config?.email || "",
      minSeverity: channel.config?.minSeverity || "warning",
    });
    setEditingChannel(channel);
    setIsCreateOpen(true);
  }

  async function handleSubmit() {
    if (!formData.name || !formData.type) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Webhook URL required for Slack and Discord
    if ((formData.type === "slack" || formData.type === "discord") && !formData.webhookUrl) {
      toast.error("Webhook URL is required for Slack and Discord channels");
      return;
    }

    // Email address required for email channels
    if (formData.type === "email" && !formData.email) {
      toast.error("Email address is required for email channels");
      return;
    }

    setIsCreating(true);
    try {
      if (editingChannel) {
        await updateChannel({
          channelId: editingChannel._id,
          name: formData.name,
          config: {
            webhookUrl: formData.webhookUrl || undefined,
            email: formData.email || undefined,
            minSeverity: (formData.minSeverity as Severity) || "warning",
          },
        });
        toast.success("Channel updated");
      } else {
        await createChannel({
          name: formData.name,
          type: formData.type as ChannelType,
          config: {
            webhookUrl: formData.webhookUrl || undefined,
            email: formData.email || undefined,
            minSeverity: (formData.minSeverity as Severity) || "warning",
          },
        });
        toast.success("Channel created");
      }
      setIsCreateOpen(false);
      resetForm();
    } catch (error) {
      toast.error(`Failed to ${editingChannel ? "update" : "create"} channel: ${error}`);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleTest(channelId: string) {
    setIsTesting(channelId);
    try {
      const result = (await testChannel({ channelId: channelId as Id<"alertChannels"> })) as {
        success: boolean;
        message?: string;
      };
      if (result.success) {
        toast.success(result.message || "Test notification sent successfully");
      } else {
        toast.error("Test failed");
      }
    } catch (error) {
      toast.error(`Failed to test channel: ${error}`);
    } finally {
      setIsTesting(null);
    }
  }

  async function handleDelete(channelId: string) {
    if (!confirm("Are you sure you want to delete this channel?")) return;
    try {
      await removeChannel({ channelId: channelId as Id<"alertChannels"> });
      toast.success("Channel deleted");
    } catch (error) {
      toast.error(`Failed to delete channel: ${error}`);
    }
  }

  async function handleSetupDefaults() {
    try {
      const result = (await setupDefaults({})) as { message: string };
      toast.success(result.message);
    } catch (error) {
      toast.error(`Failed to setup defaults: ${error}`);
    }
  }

  return (
    <PageWrapper
      title="Notification Channels"
      description="Configure where alerts are delivered"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/alerts">Back to Dashboard</Link>
          </Button>
          {channels && channels.length === 0 && (
            <Button variant="outline" onClick={handleSetupDefaults}>
              Setup Defaults
            </Button>
          )}
          <Dialog
            open={isCreateOpen}
            onOpenChange={(open) => {
              setIsCreateOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button>Create Channel</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingChannel ? "Edit Channel" : "Create Notification Channel"}
                </DialogTitle>
                <DialogDescription>
                  Configure a channel for receiving alert notifications.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Channel Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Critical Alerts Slack"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Channel Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, type: value as ChannelType })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select channel type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_app">🔔 In-App - Browser notifications</SelectItem>
                      <SelectItem value="email">📧 Email - Email notifications</SelectItem>
                      <SelectItem value="slack">💬 Slack - Webhook integration</SelectItem>
                      <SelectItem value="discord">🎮 Discord - Webhook integration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(formData.type === "slack" || formData.type === "discord") && (
                  <div className="space-y-2">
                    <Label htmlFor="webhookUrl">Webhook URL *</Label>
                    <Input
                      id="webhookUrl"
                      type="url"
                      placeholder={
                        formData.type === "slack"
                          ? "https://hooks.slack.com/services/..."
                          : "https://discord.com/api/webhooks/..."
                      }
                      value={formData.webhookUrl}
                      onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      {formData.type === "slack"
                        ? "Create a Slack app and add an Incoming Webhook"
                        : "Create a Discord webhook in your server settings"}
                    </p>
                  </div>
                )}
                {formData.type === "email" && (
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="alerts@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Alert notifications will be sent to this email address
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="minSeverity">Minimum Severity</Label>
                  <Select
                    value={formData.minSeverity}
                    onValueChange={(value) =>
                      setFormData({ ...formData, minSeverity: value as Severity })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select minimum severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">ℹ️ Info - Receive all alerts</SelectItem>
                      <SelectItem value="warning">⚠️ Warning - Warning and Critical only</SelectItem>
                      <SelectItem value="critical">🚨 Critical - Critical alerts only</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Only alerts at or above this severity will be sent to this channel
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isCreating}>
                  {isCreating ? "Saving..." : editingChannel ? "Update Channel" : "Create Channel"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      {/* Channels Grid */}
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (channels?.length ?? 0) > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {channels?.map((channel) => (
            <Card key={channel._id} className={!channel.isEnabled ? "opacity-60" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getChannelIcon(channel.type)}</span>
                    <div>
                      <CardTitle className="text-lg">{channel.name}</CardTitle>
                      <CardDescription>{getChannelLabel(channel.type)}</CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={channel.isEnabled !== false}
                    onCheckedChange={async () => {
                      try {
                        await updateChannel({
                          channelId: channel._id,
                          isEnabled: channel.isEnabled === false,
                        });
                        toast.success(
                          `Channel ${channel.isEnabled === false ? "enabled" : "disabled"}`
                        );
                      } catch (error) {
                        toast.error(`Failed to update channel: ${error}`);
                      }
                    }}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Channel Details */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Text className="text-sm text-muted-foreground">Min Severity</Text>
                    {getSeverityBadge(channel.config.minSeverity || "info")}
                  </div>
                </div>

                {/* Webhook URL (masked) */}
                {channel.config.webhookUrl && (
                  <div className="space-y-1">
                    <Text className="text-xs text-muted-foreground">Webhook</Text>
                    <code className="block rounded bg-muted px-2 py-1 text-xs truncate">
                      {channel.config.webhookUrl.slice(0, 40)}...
                    </code>
                  </div>
                )}

                {/* Stats - Fields not yet in schema */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Status: {channel.isEnabled ? "Active" : "Disabled"}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleTest(channel._id)}
                    disabled={isTesting === channel._id}
                  >
                    {isTesting === channel._id ? "Testing..." : "Test"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openEditDialog(channel)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(channel._id)}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-4xl mb-4">📡</div>
            <Title>No Notification Channels</Title>
            <Text className="text-muted-foreground mb-4">
              Create channels to receive alert notifications.
            </Text>
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={handleSetupDefaults}>
                Setup Defaults
              </Button>
              <Button onClick={() => setIsCreateOpen(true)}>Create Channel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>About Notification Channels</CardTitle>
        </CardHeader>
        <CardContent>
          <Text className="text-muted-foreground">
            Notification channels determine how and where you receive alert notifications. You can
            have multiple channels and filter by severity level.
          </Text>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>
              • <strong>In-App</strong>: Notifications appear in the admin dashboard
            </li>
            <li>
              • <strong>Slack</strong>: Sends alerts to a Slack channel via webhook
            </li>
            <li>
              • <strong>Discord</strong>: Sends alerts to a Discord channel via webhook
            </li>
            <li>
              • <strong>Minimum Severity</strong>: Filter which alerts go to each channel
            </li>
          </ul>
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
