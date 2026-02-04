"use client";

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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { Doc, Id } from "@convex/_generated/dataModel";
import {
  FileTextIcon,
  ImageIcon,
  Loader2Icon,
  MailIcon,
  MegaphoneIcon,
  MessageSquareIcon,
  SparklesIcon,
  TwitterIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

type ScheduledContent = Doc<"scheduledContent">;
type ContentType = "blog" | "x_post" | "reddit" | "email" | "announcement" | "news" | "image";
type ContentStatus = "draft" | "scheduled";

// Content type configuration
const CONTENT_TYPES: {
  value: ContentType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color: string;
}[] = [
  {
    value: "blog",
    label: "Blog Post",
    icon: FileTextIcon,
    description: "Long-form content for your website",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30",
  },
  {
    value: "x_post",
    label: "X Post",
    icon: TwitterIcon,
    description: "Short posts for X/Twitter (280 chars)",
    color: "bg-sky-500/20 text-sky-400 border-sky-500/30 hover:bg-sky-500/30",
  },
  {
    value: "reddit",
    label: "Reddit Post",
    icon: MessageSquareIcon,
    description: "Posts for Reddit communities",
    color: "bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500/30",
  },
  {
    value: "email",
    label: "Email",
    icon: MailIcon,
    description: "Email campaigns via Resend",
    color: "bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30",
  },
  {
    value: "announcement",
    label: "Announcement",
    icon: MegaphoneIcon,
    description: "In-game announcements to players",
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30",
  },
  {
    value: "news",
    label: "News Article",
    icon: FileTextIcon,
    description: "News for the Chronicles page",
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30",
  },
  {
    value: "image",
    label: "Image Post",
    icon: ImageIcon,
    description: "Images with captions",
    color: "bg-pink-500/20 text-pink-400 border-pink-500/30 hover:bg-pink-500/30",
  },
];

interface ContentCreatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ContentFormData) => Promise<void>;
  initialDate?: Date;
  editingContent?: ScheduledContent | null;
  emailLists?: { _id: Id<"emailLists">; name: string }[];
  onGenerateWithAI?: (
    type: ContentType,
    prompt: string
  ) => Promise<{ title: string; content: string }>;
}

export interface ContentFormData {
  type: ContentType;
  title: string;
  content: string;
  scheduledFor: number;
  status: ContentStatus;
  metadata: {
    slug?: string;
    excerpt?: string;
    featuredImage?: string;
    subreddit?: string;
    subject?: string;
    recipientType?: "players" | "subscribers" | "both" | "custom";
    recipientListId?: Id<"emailLists">;
    priority?: "normal" | "important" | "urgent";
    expiresAt?: number;
    imageUrl?: string;
    altText?: string;
    caption?: string;
  };
}

export function ContentCreator({
  open,
  onOpenChange,
  onSubmit,
  initialDate,
  editingContent,
  emailLists = [],
  onGenerateWithAI,
}: ContentCreatorProps) {
  const [step, setStep] = useState<"type" | "form">("type");
  const [selectedType, setSelectedType] = useState<ContentType>("blog");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");

  // Form state
  const [formData, setFormData] = useState<ContentFormData>({
    type: "blog",
    title: "",
    content: "",
    scheduledFor: initialDate?.getTime() ?? Date.now(),
    status: "draft",
    metadata: {},
  });

  // Reset form when dialog opens/closes or editing content changes
  useEffect(() => {
    if (open) {
      if (editingContent) {
        setSelectedType(editingContent.type as ContentType);
        setFormData({
          type: editingContent.type as ContentType,
          title: editingContent.title,
          content: editingContent.content,
          scheduledFor: editingContent.scheduledFor,
          status:
            editingContent.status === "published"
              ? "scheduled"
              : (editingContent.status as ContentStatus),
          metadata: editingContent.metadata as ContentFormData["metadata"],
        });
        setStep("form");
      } else {
        setFormData({
          type: "blog",
          title: "",
          content: "",
          scheduledFor: initialDate?.getTime() ?? Date.now(),
          status: "draft",
          metadata: {},
        });
        setStep("type");
        setSelectedType("blog");
      }
    }
  }, [open, editingContent, initialDate]);

  const handleTypeSelect = (type: ContentType) => {
    setSelectedType(type);
    setFormData((prev) => ({ ...prev, type }));
    setStep("form");
  };

  const handleGenerateWithAI = async () => {
    if (!onGenerateWithAI || !aiPrompt.trim()) return;

    setIsGenerating(true);
    try {
      const result = await onGenerateWithAI(selectedType, aiPrompt);
      setFormData((prev) => ({
        ...prev,
        title: result.title || prev.title,
        content: result.content || prev.content,
      }));
      setAiPrompt("");
    } catch (error) {
      console.error("AI generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onOpenChange(false);
    } catch (error) {
      console.error("Submit failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = <K extends keyof ContentFormData>(key: K, value: ContentFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const updateMetadata = <K extends keyof ContentFormData["metadata"]>(
    key: K,
    value: ContentFormData["metadata"][K]
  ) => {
    setFormData((prev) => ({
      ...prev,
      metadata: { ...prev.metadata, [key]: value },
    }));
  };

  // Format date for datetime-local input
  const formatDateForInput = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toISOString().slice(0, 16);
  };

  const parseDateFromInput = (value: string) => {
    return new Date(value).getTime();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {step === "type" ? (
          <>
            <DialogHeader>
              <DialogTitle>Create Content</DialogTitle>
              <DialogDescription>Choose the type of content you want to create.</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3 py-4">
              {CONTENT_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handleTypeSelect(type.value)}
                    className={cn(
                      "flex items-start gap-3 p-4 rounded-lg border text-left transition-colors",
                      type.color
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-xs opacity-80">{type.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {(() => {
                  const typeConfig = CONTENT_TYPES.find((t) => t.value === selectedType);
                  const Icon = typeConfig?.icon ?? FileTextIcon;
                  return (
                    <>
                      <Icon className="h-5 w-5" />
                      {editingContent ? "Edit" : "Create"} {typeConfig?.label}
                    </>
                  );
                })()}
              </DialogTitle>
              <DialogDescription>
                {editingContent
                  ? "Update your content below."
                  : "Fill in the details for your content."}
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="content" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
                <TabsTrigger value="ai">AI Assist</TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="space-y-4 mt-4">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => updateField("title", e.target.value)}
                    placeholder="Enter a title..."
                  />
                </div>

                {/* Type-specific fields */}
                {selectedType === "x_post" && (
                  <div className="space-y-2">
                    <Label htmlFor="content">Post Content * ({formData.content.length}/280)</Label>
                    <textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => updateField("content", e.target.value.slice(0, 280))}
                      placeholder="What's happening?"
                      maxLength={280}
                      className="w-full min-h-[100px] px-3 py-2 rounded-md border bg-background text-sm resize-y"
                    />
                  </div>
                )}

                {selectedType === "reddit" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="subreddit">Subreddit *</Label>
                      <Input
                        id="subreddit"
                        value={formData.metadata.subreddit ?? ""}
                        onChange={(e) => updateMetadata("subreddit", e.target.value)}
                        placeholder="e.g., gaming"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="content">Post Body *</Label>
                      <textarea
                        id="content"
                        value={formData.content}
                        onChange={(e) => updateField("content", e.target.value)}
                        placeholder="Write your post..."
                        className="w-full min-h-[150px] px-3 py-2 rounded-md border bg-background text-sm resize-y"
                      />
                    </div>
                  </>
                )}

                {selectedType === "email" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="subject">Email Subject *</Label>
                      <Input
                        id="subject"
                        value={formData.metadata.subject ?? ""}
                        onChange={(e) => updateMetadata("subject", e.target.value)}
                        placeholder="Email subject line"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="recipientType">Recipients *</Label>
                      <Select
                        value={formData.metadata.recipientType ?? "players"}
                        onValueChange={(v) =>
                          updateMetadata(
                            "recipientType",
                            v as ContentFormData["metadata"]["recipientType"]
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="players">All Players</SelectItem>
                          <SelectItem value="subscribers">Subscriber List</SelectItem>
                          <SelectItem value="both">Players + Subscribers</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {(formData.metadata.recipientType === "subscribers" ||
                      formData.metadata.recipientType === "both") &&
                      emailLists.length > 0 && (
                        <div className="space-y-2">
                          <Label htmlFor="listId">Email List</Label>
                          <Select
                            value={formData.metadata.recipientListId ?? ""}
                            onValueChange={(v) =>
                              updateMetadata("recipientListId", v as Id<"emailLists">)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a list" />
                            </SelectTrigger>
                            <SelectContent>
                              {emailLists.map((list) => (
                                <SelectItem key={list._id} value={list._id}>
                                  {list.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    <div className="space-y-2">
                      <Label htmlFor="content">Email Body * (HTML/Markdown)</Label>
                      <textarea
                        id="content"
                        value={formData.content}
                        onChange={(e) => updateField("content", e.target.value)}
                        placeholder="Write your email content..."
                        className="w-full min-h-[200px] px-3 py-2 rounded-md border bg-background text-sm resize-y font-mono"
                      />
                    </div>
                  </>
                )}

                {selectedType === "announcement" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select
                        value={formData.metadata.priority ?? "normal"}
                        onValueChange={(v) =>
                          updateMetadata("priority", v as ContentFormData["metadata"]["priority"])
                        }
                      >
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
                    <div className="space-y-2">
                      <Label htmlFor="content">Announcement Message *</Label>
                      <textarea
                        id="content"
                        value={formData.content}
                        onChange={(e) => updateField("content", e.target.value)}
                        placeholder="Write your announcement..."
                        className="w-full min-h-[100px] px-3 py-2 rounded-md border bg-background text-sm resize-y"
                      />
                    </div>
                  </>
                )}

                {(selectedType === "blog" || selectedType === "news") && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="slug">URL Slug</Label>
                        <Input
                          id="slug"
                          value={formData.metadata.slug ?? ""}
                          onChange={(e) => updateMetadata("slug", e.target.value)}
                          placeholder="url-friendly-slug"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="featuredImage">Featured Image URL</Label>
                        <Input
                          id="featuredImage"
                          value={formData.metadata.featuredImage ?? ""}
                          onChange={(e) => updateMetadata("featuredImage", e.target.value)}
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="excerpt">Excerpt</Label>
                      <Input
                        id="excerpt"
                        value={formData.metadata.excerpt ?? ""}
                        onChange={(e) => updateMetadata("excerpt", e.target.value)}
                        placeholder="Brief summary..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="content">Content * (Markdown)</Label>
                      <textarea
                        id="content"
                        value={formData.content}
                        onChange={(e) => updateField("content", e.target.value)}
                        placeholder="Write your content..."
                        className="w-full min-h-[200px] px-3 py-2 rounded-md border bg-background text-sm resize-y"
                      />
                    </div>
                  </>
                )}

                {selectedType === "image" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="imageUrl">Image URL *</Label>
                      <Input
                        id="imageUrl"
                        value={formData.metadata.imageUrl ?? ""}
                        onChange={(e) => updateMetadata("imageUrl", e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="altText">Alt Text</Label>
                      <Input
                        id="altText"
                        value={formData.metadata.altText ?? ""}
                        onChange={(e) => updateMetadata("altText", e.target.value)}
                        placeholder="Description for accessibility"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="caption">Caption</Label>
                      <textarea
                        id="caption"
                        value={formData.metadata.caption ?? formData.content}
                        onChange={(e) => {
                          updateMetadata("caption", e.target.value);
                          updateField("content", e.target.value);
                        }}
                        placeholder="Image caption..."
                        className="w-full min-h-[80px] px-3 py-2 rounded-md border bg-background text-sm resize-y"
                      />
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="settings" className="space-y-4 mt-4">
                {/* Schedule */}
                <div className="space-y-2">
                  <Label htmlFor="scheduledFor">Schedule For</Label>
                  <Input
                    id="scheduledFor"
                    type="datetime-local"
                    value={formatDateForInput(formData.scheduledFor)}
                    onChange={(e) =>
                      updateField("scheduledFor", parseDateFromInput(e.target.value))
                    }
                  />
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) => updateField("status", v as ContentStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Save as Draft</SelectItem>
                      <SelectItem value="scheduled">Schedule for Publishing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Type selector (to change type) */}
                <div className="space-y-2">
                  <Label>Content Type</Label>
                  <div className="flex flex-wrap gap-2">
                    {CONTENT_TYPES.map((type) => (
                      <Button
                        key={type.value}
                        variant={selectedType === type.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setSelectedType(type.value);
                          updateField("type", type.value);
                        }}
                      >
                        {type.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="ai" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="aiPrompt">Describe what you want to create</Label>
                  <textarea
                    id="aiPrompt"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder={`e.g., "Write a ${selectedType.replace("_", " ")} about our upcoming card expansion featuring new fire-type cards..."`}
                    className="w-full min-h-[100px] px-3 py-2 rounded-md border bg-background text-sm resize-y"
                  />
                </div>
                <Button
                  onClick={handleGenerateWithAI}
                  disabled={!aiPrompt.trim() || isGenerating || !onGenerateWithAI}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="mr-2 h-4 w-4" />
                      Generate with AI
                    </>
                  )}
                </Button>
                {!onGenerateWithAI && (
                  <p className="text-sm text-muted-foreground text-center">
                    AI generation is not configured. Connect your AI assistant to enable this
                    feature.
                  </p>
                )}
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setStep("type")}>
                Back
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting || !formData.title.trim()}>
                {isSubmitting && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
                {editingContent
                  ? "Update"
                  : formData.status === "draft"
                    ? "Save Draft"
                    : "Schedule"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
