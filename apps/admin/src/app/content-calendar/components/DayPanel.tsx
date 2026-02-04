"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { Doc, Id } from "@convex/_generated/dataModel";
import {
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  CopyIcon,
  EditIcon,
  FileTextIcon,
  ImageIcon,
  MailIcon,
  MegaphoneIcon,
  MessageSquareIcon,
  PlusIcon,
  TrashIcon,
  TwitterIcon,
  XCircleIcon,
} from "lucide-react";

type ScheduledContent = Doc<"scheduledContent">;

// Content type icons
const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  blog: FileTextIcon,
  x_post: TwitterIcon,
  reddit: MessageSquareIcon,
  email: MailIcon,
  announcement: MegaphoneIcon,
  news: FileTextIcon,
  image: ImageIcon,
};

// Status colors
const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  scheduled: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  published: "bg-green-500/20 text-green-400 border-green-500/30",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
};

// Type colors
const TYPE_COLORS: Record<string, string> = {
  blog: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  x_post: "bg-sky-500/20 text-sky-400 border-sky-500/30",
  reddit: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  email: "bg-green-500/20 text-green-400 border-green-500/30",
  announcement: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  news: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  image: "bg-pink-500/20 text-pink-400 border-pink-500/30",
};

interface DayPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  content: ScheduledContent[];
  onCreateContent: () => void;
  onEditContent: (content: ScheduledContent) => void;
  onDeleteContent: (id: Id<"scheduledContent">) => void;
  onDuplicateContent: (id: Id<"scheduledContent">) => void;
}

export function DayPanel({
  open,
  onOpenChange,
  selectedDate,
  content,
  onCreateContent,
  onEditContent,
  onDeleteContent,
  onDuplicateContent,
}: DayPanelProps) {
  if (!selectedDate) return null;

  const formattedDate = selectedDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Group content by status
  const scheduled = content.filter((c) => c.status === "scheduled");
  const drafts = content.filter((c) => c.status === "draft");
  const published = content.filter((c) => c.status === "published");
  const failed = content.filter((c) => c.status === "failed");

  const renderContentItem = (item: ScheduledContent) => {
    const Icon = TYPE_ICONS[item.type] ?? FileTextIcon;
    const time = new Date(item.scheduledFor).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

    return (
      <div key={item._id} className="p-3 rounded-lg border bg-card/50 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <span className="font-medium truncate">{item.title}</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onEditContent(item)}
              title="Edit"
            >
              <EditIcon className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onDuplicateContent(item._id)}
              title="Duplicate"
            >
              <CopyIcon className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              onClick={() => onDeleteContent(item._id)}
              title="Delete"
            >
              <TrashIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={cn(
              "px-2 py-0.5 rounded-full text-xs font-medium border",
              TYPE_COLORS[item.type]
            )}
          >
            {item.type.replace("_", " ")}
          </span>
          <span
            className={cn(
              "px-2 py-0.5 rounded-full text-xs font-medium border",
              STATUS_STYLES[item.status]
            )}
          >
            {item.status}
          </span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <ClockIcon className="h-3 w-3" />
            {time}
          </span>
        </div>

        {item.content && (
          <p className="text-sm text-muted-foreground line-clamp-2">{item.content}</p>
        )}

        {item.publishError && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <XCircleIcon className="h-3.5 w-3.5" />
            {item.publishError}
          </p>
        )}
      </div>
    );
  };

  const renderSection = (
    title: string,
    items: ScheduledContent[],
    icon: React.ReactNode,
    emptyMessage: string
  ) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {icon}
        {title} ({items.length})
      </div>
      {items.length > 0 ? (
        <div className="space-y-2">{items.map(renderContentItem)}</div>
      ) : (
        <p className="text-sm text-muted-foreground italic">{emptyMessage}</p>
      )}
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {formattedDate}
          </SheetTitle>
          <SheetDescription>
            {content.length} content item{content.length !== 1 ? "s" : ""} scheduled
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Add Content Button */}
          <Button onClick={onCreateContent} className="w-full">
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Content for This Day
          </Button>

          {/* Scheduled */}
          {renderSection(
            "Scheduled",
            scheduled,
            <ClockIcon className="h-4 w-4" />,
            "No scheduled content"
          )}

          {/* Drafts */}
          {renderSection("Drafts", drafts, <FileTextIcon className="h-4 w-4" />, "No drafts")}

          {/* Published */}
          {renderSection(
            "Published",
            published,
            <CheckCircleIcon className="h-4 w-4" />,
            "Nothing published yet"
          )}

          {/* Failed */}
          {failed.length > 0 &&
            renderSection("Failed", failed, <XCircleIcon className="h-4 w-4" />, "")}
        </div>
      </SheetContent>
    </Sheet>
  );
}
