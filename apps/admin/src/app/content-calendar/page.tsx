"use client";

/**
 * Content Calendar Page
 *
 * A calendar-based content management system for scheduling:
 * - Blog posts
 * - X/Twitter posts
 * - Reddit posts
 * - Emails (via Resend)
 * - In-game announcements
 * - News articles
 * - Image posts
 */

import { StatCard, StatGrid } from "@/components/data";
import { PageWrapper } from "@/components/layout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { RoleGuard } from "@/contexts/AdminContext";
import { typedApi, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import type { Doc, Id } from "@convex/_generated/dataModel";

// Use typedApi which has the type bypass built-in
const contentApi = typedApi.content.scheduledContent;
const emailApi = typedApi.email.lists;
import {
  CheckCircleIcon,
  ClockIcon,
  FileTextIcon,
  Loader2Icon,
  PlusIcon,
  XCircleIcon,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarGrid } from "./components/CalendarGrid";
import { ContentCreator, type ContentFormData } from "./components/ContentCreator";
import { DayPanel } from "./components/DayPanel";
import { useAIContentGenerator } from "./components/useAIContentGenerator";

type ScheduledContent = Doc<"scheduledContent">;

export default function ContentCalendarPage() {
  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayPanelOpen, setDayPanelOpen] = useState(false);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<ScheduledContent | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Id<"scheduledContent"> | null>(null);

  // AI generation hook
  const { generateContent } = useAIContentGenerator();

  // Calculate date range for current month view
  const dateRange = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    // Get first day of month and last day, plus some buffer for calendar grid
    const startDate = new Date(year, month - 1, 1).getTime();
    const endDate = new Date(year, month + 2, 0).getTime();
    return { startDate, endDate };
  }, [currentDate]);

  // Queries
  const contentResult = useConvexQuery(contentApi.getByDateRange, {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  const statsResult = useConvexQuery(contentApi.getStats, {});
  const emailListsResult = useConvexQuery(emailApi.listLists, {});

  // Mutations
  const createContent = useConvexMutation(contentApi.create);
  const updateContent = useConvexMutation(contentApi.update);
  const deleteContent = useConvexMutation(contentApi.remove);
  const duplicateContent = useConvexMutation(contentApi.duplicate);

  // Get content for selected day
  const selectedDayContent = useMemo(() => {
    if (!selectedDate || !contentResult) return [];

    const startOfDay = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate()
    ).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000 - 1;

    return contentResult.filter(
      (item: ScheduledContent) => item.scheduledFor >= startOfDay && item.scheduledFor <= endOfDay
    );
  }, [selectedDate, contentResult]);

  // Handlers
  const handleDayClick = useCallback((date: Date) => {
    setSelectedDate(date);
    setDayPanelOpen(true);
  }, []);

  const handleCreateContent = useCallback(() => {
    setEditingContent(null);
    setCreatorOpen(true);
  }, []);

  const handleEditContent = useCallback((content: ScheduledContent) => {
    setEditingContent(content);
    setDayPanelOpen(false);
    setCreatorOpen(true);
  }, []);

  const handleDeleteContent = useCallback((id: Id<"scheduledContent">) => {
    setDeleteConfirm(id);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteConfirm) return;
    try {
      await deleteContent({ id: deleteConfirm });
      toast.success("Content deleted");
      setDeleteConfirm(null);
    } catch (error) {
      toast.error("Failed to delete content", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, [deleteConfirm, deleteContent]);

  const handleDuplicateContent = useCallback(
    async (id: Id<"scheduledContent">) => {
      try {
        await duplicateContent({ id });
        toast.success("Content duplicated");
      } catch (error) {
        toast.error("Failed to duplicate content", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    [duplicateContent]
  );

  const handleSubmitContent = useCallback(
    async (data: ContentFormData) => {
      try {
        if (editingContent) {
          await updateContent({
            id: editingContent._id,
            type: data.type,
            title: data.title,
            content: data.content,
            scheduledFor: data.scheduledFor,
            status: data.status,
            metadata: data.metadata,
          });
          toast.success("Content updated");
        } else {
          await createContent({
            type: data.type,
            title: data.title,
            content: data.content,
            scheduledFor: data.scheduledFor,
            status: data.status,
            metadata: data.metadata,
          });
          toast.success("Content created");
        }
        setCreatorOpen(false);
        setEditingContent(null);
      } catch (error) {
        toast.error(editingContent ? "Failed to update content" : "Failed to create content", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      }
    },
    [editingContent, createContent, updateContent]
  );

  const handleGenerateWithAI = useCallback(
    async (type: string, prompt: string) => {
      return generateContent(type as Parameters<typeof generateContent>[0], prompt);
    },
    [generateContent]
  );

  // Loading state
  const isLoading = contentResult === undefined;

  return (
    <RoleGuard minRole="admin">
      <PageWrapper
        title="Content Calendar"
        description="Schedule and manage content across all platforms"
        actions={
          <Button onClick={handleCreateContent}>
            <PlusIcon className="mr-2 h-4 w-4" />
            New Content
          </Button>
        }
      >
        {/* Stats */}
        <StatGrid columns={5}>
          <StatCard
            title="Total Content"
            value={statsResult?.total ?? 0}
            icon={<FileTextIcon className="h-4 w-4" />}
            isLoading={!statsResult}
          />
          <StatCard
            title="Drafts"
            value={statsResult?.draft ?? 0}
            icon={<FileTextIcon className="h-4 w-4" />}
            isLoading={!statsResult}
          />
          <StatCard
            title="Scheduled"
            value={statsResult?.scheduled ?? 0}
            icon={<ClockIcon className="h-4 w-4" />}
            isLoading={!statsResult}
          />
          <StatCard
            title="Published"
            value={statsResult?.published ?? 0}
            icon={<CheckCircleIcon className="h-4 w-4" />}
            isLoading={!statsResult}
          />
          <StatCard
            title="Failed"
            value={statsResult?.failed ?? 0}
            icon={<XCircleIcon className="h-4 w-4" />}
            isLoading={!statsResult}
          />
        </StatGrid>

        {/* Calendar */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <CalendarGrid
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            content={contentResult ?? []}
            onDayClick={handleDayClick}
            selectedDate={selectedDate}
          />
        )}

        {/* Day Panel (slide-out) */}
        <DayPanel
          open={dayPanelOpen}
          onOpenChange={setDayPanelOpen}
          selectedDate={selectedDate}
          content={selectedDayContent}
          onCreateContent={handleCreateContent}
          onEditContent={handleEditContent}
          onDeleteContent={handleDeleteContent}
          onDuplicateContent={handleDuplicateContent}
        />

        {/* Content Creator Dialog */}
        <ContentCreator
          open={creatorOpen}
          onOpenChange={setCreatorOpen}
          onSubmit={handleSubmitContent}
          initialDate={selectedDate ?? undefined}
          editingContent={editingContent}
          emailLists={emailListsResult ?? []}
          onGenerateWithAI={handleGenerateWithAI}
        />

        {/* Delete Confirmation */}
        <AlertDialog
          open={!!deleteConfirm}
          onOpenChange={(open) => !open && setDeleteConfirm(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Content</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this content? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageWrapper>
    </RoleGuard>
  );
}
