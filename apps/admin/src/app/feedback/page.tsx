"use client";

/**
 * Feedback Management Page
 *
 * Dual kanban boards for managing bug reports and feature requests.
 * Includes stats overview and detailed item view.
 */

import { StatCard, StatGrid } from "@/components/data";
import { FeedbackDetailSheet } from "@/components/feedback/FeedbackDetailSheet";
import { KanbanBoard } from "@/components/feedback/KanbanBoard";
import { PageWrapper } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, useConvexQuery } from "@/lib/convexHelpers";
import { AlertCircle, Bug, CheckCircle, Clock, Inbox, Lightbulb } from "lucide-react";
import { useState } from "react";

// =============================================================================
// Types
// =============================================================================

interface FeedbackStats {
  total: number;
  byType: {
    bug: number;
    feature: number;
  };
  byStatus: {
    new: number;
    triaged: number;
    in_progress: number;
    resolved: number;
    closed: number;
  };
  byPriority: {
    low: number;
    medium: number;
    high: number;
    critical: number;
    unset: number;
  };
}

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

// =============================================================================
// Main Component
// =============================================================================

export default function FeedbackPage() {
  const [selectedFeedbackId, setSelectedFeedbackId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"bugs" | "features">("bugs");

  // Query stats
  const stats = useConvexQuery(api.feedback.feedback.getStats, {}) as FeedbackStats | undefined;

  const handleSelectItem = (item: FeedbackItem) => {
    setSelectedFeedbackId(item._id);
  };

  return (
    <PageWrapper
      title="Feedback"
      description="Manage bug reports and feature requests from players"
    >
      {/* Stats Overview */}
      <StatGrid columns={3}>
        <StatCard
          title="Total Feedback"
          value={stats?.total ?? 0}
          icon={<Inbox className="w-4 h-4" />}
        />
        <StatCard
          title="Bug Reports"
          value={stats?.byType.bug ?? 0}
          icon={<Bug className="w-4 h-4" />}
          subtitle={stats?.byStatus.new ? `${stats.byStatus.new} new` : undefined}
        />
        <StatCard
          title="Feature Requests"
          value={stats?.byType.feature ?? 0}
          icon={<Lightbulb className="w-4 h-4" />}
        />
        <StatCard
          title="Needs Attention"
          value={(stats?.byStatus.new ?? 0) + (stats?.byPriority.critical ?? 0)}
          icon={<AlertCircle className="w-4 h-4" />}
          subtitle="New + Critical"
        />
        <StatCard
          title="In Progress"
          value={stats?.byStatus.in_progress ?? 0}
          icon={<Clock className="w-4 h-4" />}
        />
        <StatCard
          title="Resolved"
          value={stats?.byStatus.resolved ?? 0}
          icon={<CheckCircle className="w-4 h-4" />}
        />
      </StatGrid>

      {/* Tabs for Bug/Feature boards */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "bugs" | "features")}
        className="mt-6"
      >
        <TabsList className="mb-4">
          <TabsTrigger value="bugs" className="gap-2">
            <Bug className="w-4 h-4" />
            Bug Reports
            {stats?.byType.bug ? (
              <span className="ml-1 text-xs text-muted-foreground">({stats.byType.bug})</span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="features" className="gap-2">
            <Lightbulb className="w-4 h-4" />
            Feature Requests
            {stats?.byType.feature ? (
              <span className="ml-1 text-xs text-muted-foreground">({stats.byType.feature})</span>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bugs" className="mt-0">
          <KanbanBoard type="bug" onSelectItem={handleSelectItem} />
        </TabsContent>

        <TabsContent value="features" className="mt-0">
          <KanbanBoard type="feature" onSelectItem={handleSelectItem} />
        </TabsContent>
      </Tabs>

      {/* Detail Sheet */}
      <FeedbackDetailSheet
        feedbackId={selectedFeedbackId}
        open={selectedFeedbackId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedFeedbackId(null);
        }}
      />
    </PageWrapper>
  );
}
