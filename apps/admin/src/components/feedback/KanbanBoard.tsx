"use client";

import { Badge } from "@/components/ui/badge";
import { apiAny, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import { cn } from "@/lib/utils";
import { Bug, Clock, GripVertical, Image, Lightbulb, User, Video } from "lucide-react";
import { useState } from "react";

// =============================================================================
// Types
// =============================================================================

interface FeedbackItem {
  _id: string;
  userId: string;
  username: string;
  type: "bug" | "feature";
  title: string;
  description: string;
  status: string;
  priority?: "low" | "medium" | "high" | "critical";
  screenshotUrl?: string;
  recordingUrl?: string;
  createdAt: number;
  updatedAt: number;
}

interface KanbanBoardProps {
  type: "bug" | "feature";
  onSelectItem: (item: FeedbackItem) => void;
}

type StatusType = "new" | "triaged" | "in_progress" | "resolved" | "closed";

// =============================================================================
// Constants
// =============================================================================

const COLUMNS: { id: StatusType; title: string; color: string }[] = [
  { id: "new", title: "New", color: "bg-blue-500" },
  { id: "triaged", title: "Triaged", color: "bg-yellow-500" },
  { id: "in_progress", title: "In Progress", color: "bg-purple-500" },
  { id: "resolved", title: "Resolved", color: "bg-green-500" },
  { id: "closed", title: "Closed", color: "bg-gray-500" },
];

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-500/20 text-gray-300",
  medium: "bg-blue-500/20 text-blue-300",
  high: "bg-orange-500/20 text-orange-300",
  critical: "bg-red-500/20 text-red-300",
};

// =============================================================================
// Helper Functions
// =============================================================================

function formatTimeAgo(timestamp: number) {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
}

// =============================================================================
// Kanban Card Component
// =============================================================================

interface KanbanCardProps {
  item: FeedbackItem;
  onClick: () => void;
  onDragStart: (e: React.DragEvent, item: FeedbackItem) => void;
}

function KanbanCard({ item, onClick, onDragStart }: KanbanCardProps) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item)}
      onClick={onClick}
      className={cn(
        "p-3 rounded-lg border border-border bg-card hover:bg-accent/50",
        "cursor-pointer transition-all",
        "hover:shadow-md hover:border-primary/30",
        "group"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <GripVertical className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
          {item.type === "bug" ? (
            <Bug className="w-4 h-4 text-red-400 flex-shrink-0" />
          ) : (
            <Lightbulb className="w-4 h-4 text-blue-400 flex-shrink-0" />
          )}
        </div>
        {item.priority && (
          <Badge
            variant="outline"
            className={cn("text-xs py-0 px-1.5", PRIORITY_COLORS[item.priority])}
          >
            {item.priority}
          </Badge>
        )}
      </div>

      {/* Title */}
      <h4 className="font-medium text-sm text-foreground line-clamp-2 mb-2">{item.title}</h4>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <User className="w-3 h-3" />
          <span className="truncate max-w-[80px]">{item.username}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Media indicators */}
          {item.screenshotUrl && (
            <span title="Has screenshot">
              <Image className="w-3 h-3 text-green-400" />
            </span>
          )}
          {item.recordingUrl && (
            <span title="Has recording">
              <Video className="w-3 h-3 text-purple-400" />
            </span>
          )}
          {/* Time */}
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{formatTimeAgo(item.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Kanban Column Component
// =============================================================================

interface KanbanColumnProps {
  column: (typeof COLUMNS)[number];
  items: FeedbackItem[];
  onSelectItem: (item: FeedbackItem) => void;
  onDragStart: (e: React.DragEvent, item: FeedbackItem) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, status: StatusType) => void;
  isDragOver: boolean;
}

function KanbanColumn({
  column,
  items,
  onSelectItem,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver,
}: KanbanColumnProps) {
  return (
    <div
      className={cn(
        "flex flex-col min-w-[280px] max-w-[320px] rounded-lg border border-border bg-muted/30",
        isDragOver && "border-primary/50 bg-primary/5"
      )}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, column.id)}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", column.color)} />
          <h3 className="font-medium text-sm">{column.title}</h3>
        </div>
        <Badge variant="secondary" className="text-xs">
          {items.length}
        </Badge>
      </div>

      {/* Column Content */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-320px)]">
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">No items</div>
        ) : (
          items.map((item) => (
            <KanbanCard
              key={item._id}
              item={item}
              onClick={() => onSelectItem(item)}
              onDragStart={onDragStart}
            />
          ))
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function KanbanBoard({ type, onSelectItem }: KanbanBoardProps) {
  const [dragOverColumn, setDragOverColumn] = useState<StatusType | null>(null);
  const [draggedItem, setDraggedItem] = useState<FeedbackItem | null>(null);

  // Query feedback grouped by status
  const feedbackByStatus = useConvexQuery(apiAny.feedback.feedback.listByStatus, {
    type,
  }) as Record<StatusType, FeedbackItem[]> | undefined;

  // Mutation for updating status
  const updateStatus = useConvexMutation(apiAny.feedback.feedback.updateStatus);

  const handleDragStart = (e: React.DragEvent, item: FeedbackItem) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (status: StatusType) => {
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: StatusType) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggedItem || draggedItem.status === newStatus) {
      setDraggedItem(null);
      return;
    }

    try {
      await updateStatus({
        feedbackId: draggedItem._id,
        status: newStatus,
      });
    } catch (error) {
      console.error("Failed to update status:", error);
    }

    setDraggedItem(null);
  };

  if (!feedbackByStatus) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((column) => (
          <div
            key={column.id}
            className="flex flex-col min-w-[280px] max-w-[320px] rounded-lg border border-border bg-muted/30 animate-pulse"
          >
            <div className="p-3 border-b border-border">
              <div className="h-4 bg-muted rounded w-20" />
            </div>
            <div className="p-2 space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-muted rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4" onDragLeave={handleDragLeave}>
      {COLUMNS.map((column) => (
        <div key={column.id} onDragEnter={() => handleDragEnter(column.id)}>
          <KanbanColumn
            column={column}
            items={feedbackByStatus[column.id] || []}
            onSelectItem={onSelectItem}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            isDragOver={dragOverColumn === column.id}
          />
        </div>
      ))}
    </div>
  );
}
