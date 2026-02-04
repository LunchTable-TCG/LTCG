"use client";

/**
 * Token Launch Checklist & Approvals Page
 *
 * Manage pre-launch checklist items, admin approvals,
 * and launch scheduling.
 */

import { PageWrapper } from "@/components/layout";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api, useMutation, useQuery } from "@/lib/convexHelpers";
import type { Id } from "@convex/_generated/dataModel";
import { Badge } from "@tremor/react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

// =============================================================================
// Types
// =============================================================================

type ChecklistCategory = "treasury" | "token" | "marketing" | "technical" | "team";

interface ChecklistItem {
  _id: string;
  category: ChecklistCategory;
  item: string;
  description?: string;
  isRequired: boolean;
  isCompleted: boolean;
  completedBy?: string;
  completedAt?: number;
  evidence?: string;
  order: number;
}

interface Approval {
  _id: string;
  adminId: string;
  adminName?: string;
  adminEmail?: string;
  approved: boolean;
  comments?: string;
  approvedAt?: number;
}

interface ChecklistSummary {
  overall: {
    completed: number;
    total: number;
    requiredCompleted: number;
    required: number;
    allRequiredComplete: boolean;
    percentComplete: number;
  };
  byCategory: Record<
    string,
    {
      completed?: number;
      total?: number;
      requiredCompleted?: number;
      required?: number;
    }
  >;
}

// =============================================================================
// Helper Functions
// =============================================================================

function getCategoryIcon(category: ChecklistCategory) {
  switch (category) {
    case "treasury":
      return "🏦";
    case "token":
      return "🪙";
    case "marketing":
      return "📢";
    case "technical":
      return "⚙️";
    case "team":
      return "👥";
    default:
      return "📋";
  }
}

function getCategoryLabel(category: ChecklistCategory) {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

// =============================================================================
// Checklist Item Component
// =============================================================================

function ChecklistItemRow({
  item,
  onComplete,
  onUncomplete,
}: {
  item: ChecklistItem;
  onComplete: (id: string, evidence?: string) => Promise<void>;
  onUncomplete: (id: string) => Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [evidence, setEvidence] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleComplete() {
    setIsLoading(true);
    try {
      await onComplete(item._id, evidence || undefined);
      setIsOpen(false);
      setEvidence("");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleToggle() {
    if (item.isCompleted) {
      setIsLoading(true);
      try {
        await onUncomplete(item._id);
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsOpen(true);
    }
  }

  return (
    <div
      className={`flex items-center justify-between rounded-lg border p-3 ${
        item.isCompleted ? "bg-emerald-50 dark:bg-emerald-950/30" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <Checkbox checked={item.isCompleted} onCheckedChange={handleToggle} disabled={isLoading} />
        <div>
          <div className="flex items-center gap-2">
            <span className={item.isCompleted ? "line-through opacity-60" : ""}>{item.item}</span>
            {item.isRequired && (
              <Badge color="rose" size="xs">
                Required
              </Badge>
            )}
          </div>
          {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
          {item.isCompleted && item.completedAt && (
            <p className="text-xs text-muted-foreground">
              Completed {new Date(item.completedAt).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Checklist Item</DialogTitle>
            <DialogDescription>{item.item}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="evidence">Evidence / Notes (optional)</Label>
              <Textarea
                id="evidence"
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
                placeholder="Add any notes or evidence..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleComplete} disabled={isLoading}>
              {isLoading ? "Saving..." : "Mark Complete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =============================================================================
// Schedule Dialog Component
// =============================================================================

function ScheduleDialog({
  onSchedule,
}: {
  onSchedule: (scheduledAt: number, timezone: string) => Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSchedule() {
    if (!date || !time) {
      toast.error("Please select a date and time");
      return;
    }

    const scheduledAt = new Date(`${date}T${time}`).getTime();
    if (scheduledAt <= Date.now()) {
      toast.error("Scheduled time must be in the future");
      return;
    }

    setIsLoading(true);
    try {
      await onSchedule(scheduledAt, Intl.DateTimeFormat().resolvedOptions().timeZone);
      setIsOpen(false);
      setDate("");
      setTime("");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>Schedule Launch</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule Token Launch</DialogTitle>
          <DialogDescription>Set the date and time for the token launch</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="time">Time</Label>
            <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <p className="text-sm text-muted-foreground">
            Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSchedule} disabled={isLoading}>
            {isLoading ? "Scheduling..." : "Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function TokenLaunchPage() {
  // Fetch data
  const checklist = useQuery(api.tokenLaunch.checklist.getAll, {}) as ChecklistItem[] | undefined;
  const checklistSummary = useQuery(api.tokenLaunch.checklist.getSummary, {}) as
    | ChecklistSummary
    | undefined;
  const approvals = useQuery(api.tokenLaunch.approvals.getAll, {}) as Approval[] | undefined;
  const approvalSummary = useQuery(api.tokenLaunch.approvals.getSummary, {}) as
    | {
        approvedCount: number;
        requiredApprovals: number;
        totalAdmins: number;
        hasEnoughApprovals: boolean;
      }
    | undefined;
  const myApproval = useQuery(api.tokenLaunch.approvals.getMyApproval, {}) as
    | Approval
    | null
    | undefined;
  const schedule = useQuery(api.tokenLaunch.schedule.getSchedule, {}) as
    | {
        scheduledAt: number;
        timezone?: string;
        status?: "countdown" | "go" | "launched" | "aborted" | "scheduled";
        countdown?: {
          days: number;
          hours: number;
          minutes: number;
          seconds: number;
        };
      }
    | null
    | undefined;

  // Mutations
  const completeItem = useMutation(api.tokenLaunch.checklist.completeItem);
  const uncompleteItem = useMutation(api.tokenLaunch.checklist.uncompleteItem);
  const setupDefaults = useMutation(api.tokenLaunch.checklist.setupDefaults);
  const approve = useMutation(api.tokenLaunch.approvals.approve);
  const revoke = useMutation(api.tokenLaunch.approvals.revoke);
  const setSchedule = useMutation(api.tokenLaunch.schedule.setSchedule);
  const clearSchedule = useMutation(api.tokenLaunch.schedule.clearSchedule);

  const [approvalComment, setApprovalComment] = useState("");

  const isLoading = checklist === undefined;

  // Group checklist by category
  const categories: ChecklistCategory[] = ["treasury", "token", "marketing", "technical", "team"];
  const itemsByCategory = categories.reduce(
    (acc, category) => {
      acc[category] = (checklist ?? []).filter((item: ChecklistItem) => item.category === category);
      return acc;
    },
    {} as Record<ChecklistCategory, ChecklistItem[]>
  );

  // Handlers
  async function handleComplete(id: string, evidence?: string) {
    try {
      await completeItem({ itemId: id as Id<"launchChecklist">, evidence });
      toast.success("Item marked as complete");
    } catch (_error) {
      toast.error("Failed to complete item");
    }
  }

  async function handleUncomplete(id: string) {
    try {
      await uncompleteItem({ itemId: id as Id<"launchChecklist"> });
      toast.success("Item marked as incomplete");
    } catch (_error) {
      toast.error("Failed to update item");
    }
  }

  async function handleSetupDefaults() {
    try {
      const result = (await setupDefaults({})) as { message: string };
      toast.success(result.message);
    } catch (_error) {
      toast.error("Failed to setup defaults");
    }
  }

  async function handleApprove() {
    try {
      await approve({ comments: approvalComment || undefined });
      setApprovalComment("");
      toast.success("Launch approved");
    } catch (_error) {
      toast.error("Failed to approve launch");
    }
  }

  async function handleRevoke() {
    if (!confirm("Are you sure you want to revoke your approval?")) return;
    try {
      await revoke({});
      toast.success("Approval revoked");
    } catch (_error) {
      toast.error("Failed to revoke approval");
    }
  }

  async function handleSchedule(scheduledAt: number, timezone: string) {
    try {
      await setSchedule({ scheduledAt, timezone });
      toast.success("Launch scheduled");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to schedule launch");
    }
  }

  async function handleClearSchedule() {
    if (!confirm("Are you sure you want to clear the schedule?")) return;
    try {
      await clearSchedule({});
      toast.success("Schedule cleared");
    } catch (_error) {
      toast.error("Failed to clear schedule");
    }
  }

  return (
    <PageWrapper
      title="Launch Checklist & Approvals"
      description="Complete all required items and get admin approvals before launch"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/token">Back to Launch Control</Link>
          </Button>
        </div>
      }
    >
      <Tabs defaultValue="checklist">
        <TabsList className="mb-6">
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>

        {/* Checklist Tab */}
        <TabsContent value="checklist">
          {/* Progress Summary */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Overall Progress</p>
                  <p className="text-2xl font-bold">
                    {checklistSummary?.overall?.completed ?? 0} /{" "}
                    {checklistSummary?.overall?.total ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Required Items</p>
                  <p className="text-2xl font-bold">
                    {checklistSummary?.overall?.requiredCompleted ?? 0} /{" "}
                    {checklistSummary?.overall?.required ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <Badge
                    color={checklistSummary?.overall?.allRequiredComplete ? "emerald" : "amber"}
                    size="lg"
                  >
                    {checklistSummary?.overall?.allRequiredComplete ? "Ready" : "In Progress"}
                  </Badge>
                </div>
                <div>
                  <Progress
                    value={checklistSummary?.overall?.percentComplete ?? 0}
                    className="h-3 w-40"
                  />
                  <p className="text-right text-xs text-muted-foreground">
                    {checklistSummary?.overall?.percentComplete ?? 0}% complete
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Empty State */}
          {!isLoading && (checklist?.length ?? 0) === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No checklist items configured</p>
                <Button className="mt-4" onClick={handleSetupDefaults}>
                  Setup Default Checklist
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Checklist by Category */}
          {isLoading ? (
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[1, 2, 3].map((j) => (
                      <Skeleton key={j} className="h-16 w-full" />
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {categories.map((category) => {
                const items = itemsByCategory[category];
                if (items.length === 0) return null;

                const categoryStats = checklistSummary?.byCategory?.[category];
                const isComplete = categoryStats?.requiredCompleted === categoryStats?.required;

                return (
                  <Card key={category}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{getCategoryIcon(category)}</span>
                          <CardTitle>{getCategoryLabel(category)}</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {categoryStats?.requiredCompleted ?? 0}/{categoryStats?.required ?? 0}{" "}
                            required
                          </span>
                          <Badge color={isComplete ? "emerald" : "amber"}>
                            {isComplete ? "Complete" : "Pending"}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {items.map((item: ChecklistItem) => (
                        <ChecklistItemRow
                          key={item._id}
                          item={item}
                          onComplete={handleComplete}
                          onUncomplete={handleUncomplete}
                        />
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Approvals Tab */}
        <TabsContent value="approvals">
          {/* Your Approval */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Your Approval</CardTitle>
              <CardDescription>Submit or revoke your approval for the token launch</CardDescription>
            </CardHeader>
            <CardContent>
              {myApproval?.approved ? (
                <div className="space-y-4">
                  <div className="rounded-lg bg-emerald-50 p-4 dark:bg-emerald-950/30">
                    <p className="font-medium text-emerald-700 dark:text-emerald-300">
                      You have approved this launch
                    </p>
                    {myApproval.comments && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Comments: {myApproval.comments}
                      </p>
                    )}
                    {myApproval.approvedAt && (
                      <p className="text-xs text-muted-foreground">
                        Approved at: {new Date(myApproval.approvedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <Button variant="destructive" onClick={handleRevoke}>
                    Revoke Approval
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="approvalComment">Comments (optional)</Label>
                    <Textarea
                      id="approvalComment"
                      value={approvalComment}
                      onChange={(e) => setApprovalComment(e.target.value)}
                      placeholder="Add any comments or conditions..."
                      rows={3}
                    />
                  </div>
                  <Button onClick={handleApprove} className="bg-emerald-600 hover:bg-emerald-700">
                    Approve Launch
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Approval Summary */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Total Approvals</p>
                  <p className="text-2xl font-bold">
                    {approvalSummary?.approvedCount ?? 0} /{" "}
                    {approvalSummary?.requiredApprovals ?? 2}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Total Admins</p>
                  <p className="text-2xl font-bold">{approvalSummary?.totalAdmins ?? 0}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <Badge
                    color={approvalSummary?.hasEnoughApprovals ? "emerald" : "amber"}
                    size="lg"
                  >
                    {approvalSummary?.hasEnoughApprovals ? "Approved" : "Pending"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* All Approvals */}
          <Card>
            <CardHeader>
              <CardTitle>All Approvals</CardTitle>
              <CardDescription>Approval status from all admins</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (approvals?.length ?? 0) > 0 ? (
                <div className="space-y-3">
                  {approvals?.map((approval: Approval) => (
                    <div
                      key={approval._id}
                      className={`flex items-center justify-between rounded-lg border p-3 ${
                        approval.approved ? "bg-emerald-50 dark:bg-emerald-950/30" : ""
                      }`}
                    >
                      <div>
                        <p className="font-medium">{approval.adminName || "Unknown Admin"}</p>
                        {approval.adminEmail && (
                          <p className="text-xs text-muted-foreground">{approval.adminEmail}</p>
                        )}
                        {approval.comments && (
                          <p className="mt-1 text-sm text-muted-foreground">{approval.comments}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {approval.approvedAt && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(approval.approvedAt).toLocaleString()}
                          </span>
                        )}
                        <Badge color={approval.approved ? "emerald" : "rose"}>
                          {approval.approved ? "Approved" : "Revoked"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <p>No approvals yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Launch Schedule</CardTitle>
                  <CardDescription>Set the launch date and time</CardDescription>
                </div>
                <div className="flex gap-2">
                  {schedule?.scheduledAt && (
                    <Button variant="outline" onClick={handleClearSchedule}>
                      Clear Schedule
                    </Button>
                  )}
                  <ScheduleDialog onSchedule={handleSchedule} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {schedule?.scheduledAt ? (
                <div className="space-y-4">
                  <div className="rounded-lg border p-6 text-center">
                    <p className="text-sm text-muted-foreground">Scheduled Launch</p>
                    <p className="text-3xl font-bold">
                      {new Date(schedule.scheduledAt).toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Timezone: {schedule.timezone || "UTC"}
                    </p>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium">Schedule Status</p>
                      <p className="text-sm text-muted-foreground">
                        {schedule.status === "countdown"
                          ? "Countdown active - less than 24 hours"
                          : schedule.status === "go"
                            ? "Ready for launch"
                            : schedule.status === "launched"
                              ? "Token has been launched"
                              : schedule.status === "aborted"
                                ? "Launch aborted"
                                : "Scheduled"}
                      </p>
                    </div>
                    <Badge
                      color={
                        schedule.status === "launched"
                          ? "green"
                          : schedule.status === "go"
                            ? "emerald"
                            : schedule.status === "aborted"
                              ? "rose"
                              : "blue"
                      }
                    >
                      {schedule.status}
                    </Badge>
                  </div>

                  {schedule.countdown && (
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div className="rounded-lg bg-muted p-4">
                        <div className="text-2xl font-bold">{schedule.countdown.days}</div>
                        <div className="text-xs text-muted-foreground">Days</div>
                      </div>
                      <div className="rounded-lg bg-muted p-4">
                        <div className="text-2xl font-bold">{schedule.countdown.hours}</div>
                        <div className="text-xs text-muted-foreground">Hours</div>
                      </div>
                      <div className="rounded-lg bg-muted p-4">
                        <div className="text-2xl font-bold">{schedule.countdown.minutes}</div>
                        <div className="text-xs text-muted-foreground">Minutes</div>
                      </div>
                      <div className="rounded-lg bg-muted p-4">
                        <div className="text-2xl font-bold">{schedule.countdown.seconds}</div>
                        <div className="text-xs text-muted-foreground">Seconds</div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  <p className="text-lg">No launch scheduled</p>
                  <p className="text-sm">
                    Complete the checklist and get approvals before scheduling
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
