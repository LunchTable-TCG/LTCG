"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { typedApi, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import type { Id } from "@convex/_generated/dataModel";
import {
  Bug,
  Clock,
  ExternalLink,
  Globe,
  Image,
  Lightbulb,
  Loader2,
  Monitor,
  Save,
  Video,
} from "lucide-react";
import { useEffect, useState } from "react";

// =============================================================================
// Types
// =============================================================================

type FeedbackStatus = "new" | "triaged" | "in_progress" | "resolved" | "closed";
type FeedbackPriority = "low" | "medium" | "high" | "critical";

interface FeedbackItem {
  _id: string;
  userId: string;
  username: string;
  type: "bug" | "feature";
  title: string;
  description: string;
  status: FeedbackStatus;
  priority?: FeedbackPriority;
  screenshotUrl?: string;
  recordingUrl?: string;
  pageUrl: string;
  userAgent: string;
  viewport: { width: number; height: number };
  adminNotes?: string;
  assignedTo?: string;
  assignedUser?: { _id: string; username?: string };
  resolvedAt?: number;
  resolvedBy?: string;
  resolvedByUser?: { _id: string; username?: string };
  createdAt: number;
  updatedAt: number;
}

interface FeedbackDetailSheetProps {
  feedbackId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// =============================================================================
// Constants
// =============================================================================

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low", color: "text-gray-400" },
  { value: "medium", label: "Medium", color: "text-blue-400" },
  { value: "high", label: "High", color: "text-orange-400" },
  { value: "critical", label: "Critical", color: "text-red-400" },
];

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "triaged", label: "Triaged" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

// =============================================================================
// Helper Functions
// =============================================================================

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleString();
}

function parseUserAgent(ua: string) {
  // Simple browser detection
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari")) return "Safari";
  if (ua.includes("Edge")) return "Edge";
  return "Unknown Browser";
}

// =============================================================================
// Main Component
// =============================================================================

export function FeedbackDetailSheet({ feedbackId, open, onOpenChange }: FeedbackDetailSheetProps) {
  const [priority, setPriority] = useState<FeedbackPriority | undefined>();
  const [status, setStatus] = useState<FeedbackStatus | undefined>();
  const [adminNotes, setAdminNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch feedback details
  const feedback = useConvexQuery(
    typedApi.feedback.feedback.get,
    feedbackId ? { feedbackId: feedbackId as Id<"feedback"> } : "skip"
  ) as FeedbackItem | undefined;

  // Mutations
  const updateFeedback = useConvexMutation(typedApi.feedback.feedback.update);
  const updateStatus = useConvexMutation(typedApi.feedback.feedback.updateStatus);

  // Initialize local state when feedback loads or changes
  useEffect(() => {
    if (feedback) {
      setPriority(feedback.priority);
      setStatus(feedback.status);
      setAdminNotes(feedback.adminNotes || "");
      setHasChanges(false);
    }
  }, [feedback]);

  const handlePriorityChange = (value: string) => {
    setPriority(value as FeedbackPriority);
    setHasChanges(true);
  };

  const handleStatusChange = (value: string) => {
    setStatus(value as FeedbackStatus);
    setHasChanges(true);
  };

  const handleNotesChange = (value: string) => {
    setAdminNotes(value);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!feedbackId || !hasChanges) return;

    setIsSaving(true);
    try {
      // Update status if changed
      if (status && status !== feedback?.status) {
        await updateStatus({
          feedbackId: feedbackId as Id<"feedback">,
          status,
        });
      }

      // Update other fields
      await updateFeedback({
        feedbackId: feedbackId as Id<"feedback">,
        priority,
        adminNotes,
      });

      setHasChanges(false);
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!feedbackId) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        {!feedback ? (
          <>
            <SheetHeader className="sr-only">
              <SheetTitle>Loading feedback details</SheetTitle>
            </SheetHeader>
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          </>
        ) : (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2 mb-2">
                {feedback.type === "bug" ? (
                  <Badge variant="destructive" className="gap-1">
                    <Bug className="w-3 h-3" />
                    Bug Report
                  </Badge>
                ) : (
                  <Badge className="gap-1 bg-blue-500/20 text-blue-400 border-blue-500/30">
                    <Lightbulb className="w-3 h-3" />
                    Feature Request
                  </Badge>
                )}
              </div>
              <SheetTitle>{feedback.title}</SheetTitle>
              <SheetDescription>
                Submitted by {feedback.username} on {formatDate(feedback.createdAt)}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 py-4">
              {/* Description */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Description</Label>
                <div className="p-3 rounded-lg bg-muted/50 text-sm whitespace-pre-wrap">
                  {feedback.description}
                </div>
              </div>

              {/* Media */}
              {(feedback.screenshotUrl || feedback.recordingUrl) && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Attachments</Label>

                  {feedback.screenshotUrl && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Image className="w-4 h-4" />
                        Screenshot
                      </div>
                      <a
                        href={feedback.screenshotUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img
                          src={feedback.screenshotUrl}
                          alt="Screenshot"
                          className="rounded-lg border border-border max-h-48 w-full object-contain bg-black/20 hover:opacity-80 transition-opacity"
                        />
                      </a>
                    </div>
                  )}

                  {feedback.recordingUrl && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Video className="w-4 h-4" />
                        Screen Recording
                      </div>
                      <video
                        src={feedback.recordingUrl}
                        controls
                        className="rounded-lg border border-border max-h-48 w-full bg-black"
                      >
                        <track kind="captions" />
                      </video>
                    </div>
                  )}
                </div>
              )}

              {/* Context Info */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Context</Label>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Globe className="w-4 h-4" />
                    <a
                      href={feedback.pageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate hover:text-foreground flex items-center gap-1"
                    >
                      {new URL(feedback.pageUrl).pathname}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Monitor className="w-4 h-4" />
                    {feedback.viewport.width} × {feedback.viewport.height} •{" "}
                    {parseUserAgent(feedback.userAgent)}
                  </div>
                </div>
              </div>

              {/* Status & Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status ?? feedback.status} onValueChange={handleStatusChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={priority ?? feedback.priority ?? ""} onValueChange={handlePriorityChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Set priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <span className={option.color}>{option.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Admin Notes */}
              <div className="space-y-2">
                <Label>Admin Notes</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  placeholder="Add internal notes about this feedback..."
                  rows={3}
                />
              </div>

              {/* Resolution Info */}
              {feedback.resolvedAt && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                  <div className="flex items-center gap-2 text-sm text-green-400">
                    <Clock className="w-4 h-4" />
                    Resolved on {formatDate(feedback.resolvedAt)}
                    {feedback.resolvedByUser?.username && (
                      <span className="text-muted-foreground">
                        by {feedback.resolvedByUser.username}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <SheetFooter className="border-t pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
