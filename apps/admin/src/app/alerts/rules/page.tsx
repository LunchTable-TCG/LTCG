"use client";

/**
 * Alert Rules Management Page
 *
 * Create, edit, and manage alert rules that define when
 * alerts should be triggered.
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
import { Textarea } from "@/components/ui/textarea";
import { typedApi, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { Badge, Text, Title } from "@tremor/react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

// =============================================================================
// Types
// =============================================================================

type TriggerType =
  | "price_change"
  | "price_threshold"
  | "volume_spike"
  | "whale_activity"
  | "holder_milestone"
  | "bonding_progress"
  | "treasury_balance"
  | "transaction_failed"
  | "graduation";

type Severity = "critical" | "warning" | "info";

interface RuleFormData {
  name: string;
  description: string;
  triggerType: TriggerType | "";
  severity: Severity | "";
  cooldownMinutes: string;
  conditions: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

function getSeverityBadge(severity: string) {
  switch (severity) {
    case "critical":
      return <Badge color="rose">Critical</Badge>;
    case "warning":
      return <Badge color="amber">Warning</Badge>;
    case "info":
      return <Badge color="blue">Info</Badge>;
    default:
      return <Badge>{severity}</Badge>;
  }
}

function getTriggerTypeLabel(type: string) {
  switch (type) {
    case "price_change":
      return "Price Change";
    case "price_threshold":
      return "Price Threshold";
    case "volume_spike":
      return "Volume Spike";
    case "whale_activity":
      return "Whale Activity";
    case "holder_milestone":
      return "Holder Milestone";
    case "bonding_progress":
      return "Bonding Progress";
    case "treasury_balance":
      return "Treasury Balance";
    case "transaction_failed":
      return "Transaction Failed";
    case "graduation":
      return "Graduation";
    default:
      return type;
  }
}

function getTriggerTypeIcon(type: string) {
  switch (type) {
    case "price_change":
      return "📈";
    case "price_threshold":
      return "📊";
    case "volume_spike":
      return "📶";
    case "whale_activity":
      return "🐋";
    case "holder_milestone":
      return "👥";
    case "bonding_progress":
      return "🔗";
    case "treasury_balance":
      return "💰";
    case "transaction_failed":
      return "❌";
    case "graduation":
      return "🎓";
    default:
      return "📋";
  }
}

// =============================================================================
// Component
// =============================================================================

export default function AlertRulesPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingRule, setEditingRule] = useState<Doc<"alertRules"> | null>(null);

  // Form state
  const [formData, setFormData] = useState<RuleFormData>({
    name: "",
    description: "",
    triggerType: "",
    severity: "",
    cooldownMinutes: "15",
    conditions: "",
  });

  // Fetch rules
  const rules = useConvexQuery(typedApi.alerts.rules.getAll, {}) as Doc<"alertRules">[] | undefined;

  // Mutations
  const createRule = useConvexMutation(typedApi.alerts.rules.create);
  const updateRule = useConvexMutation(typedApi.alerts.rules.update);
  const removeRule = useConvexMutation(typedApi.alerts.rules.remove);
  const toggleEnabled = useConvexMutation(typedApi.alerts.rules.toggleEnabled);
  const setupDefaults = useConvexMutation(typedApi.alerts.rules.setupDefaults);

  const isLoading = rules === undefined;

  function resetForm() {
    setFormData({
      name: "",
      description: "",
      triggerType: "",
      severity: "",
      cooldownMinutes: "15",
      conditions: "",
    });
    setEditingRule(null);
  }

  function openEditDialog(rule: Doc<"alertRules">) {
    setFormData({
      name: rule.name,
      description: rule.description || "",
      triggerType: rule.triggerType,
      severity: rule.severity,
      cooldownMinutes: String(rule.cooldownMinutes || 15),
      conditions: rule.conditions ? JSON.stringify(rule.conditions, null, 2) : "",
    });
    setEditingRule(rule);
    setIsCreateOpen(true);
  }

  async function handleSubmit() {
    if (!formData.name || !formData.triggerType || !formData.severity) {
      toast.error("Please fill in all required fields");
      return;
    }

    let parsedConditions = {};
    if (formData.conditions) {
      try {
        parsedConditions = JSON.parse(formData.conditions);
      } catch {
        toast.error("Invalid JSON in conditions field");
        return;
      }
    }

    setIsCreating(true);
    try {
      if (editingRule) {
        await updateRule({
          ruleId: editingRule._id,
          name: formData.name,
          description: formData.description || undefined,
          severity: formData.severity as Severity,
          cooldownMinutes: Number.parseInt(formData.cooldownMinutes) || 15,
          conditions: parsedConditions,
        });
        toast.success("Rule updated");
      } else {
        await createRule({
          name: formData.name,
          description: formData.description || undefined,
          triggerType: formData.triggerType as TriggerType,
          severity: formData.severity as Severity,
          cooldownMinutes: Number.parseInt(formData.cooldownMinutes) || 15,
          conditions: parsedConditions,
        });
        toast.success("Rule created");
      }
      setIsCreateOpen(false);
      resetForm();
    } catch (error) {
      toast.error(`Failed to ${editingRule ? "update" : "create"} rule: ${error}`);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleToggle(ruleId: string, currentEnabled: boolean) {
    try {
      await toggleEnabled({ ruleId: ruleId as Id<"alertRules"> });
      toast.success(`Rule ${currentEnabled ? "disabled" : "enabled"}`);
    } catch (error) {
      toast.error(`Failed to toggle rule: ${error}`);
    }
  }

  async function handleDelete(ruleId: string) {
    if (!confirm("Are you sure you want to delete this rule?")) return;
    try {
      await removeRule({ ruleId: ruleId as Id<"alertRules"> });
      toast.success("Rule deleted");
    } catch (error) {
      toast.error(`Failed to delete rule: ${error}`);
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
      title="Alert Rules"
      description="Configure conditions that trigger alerts"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/alerts">Back to Dashboard</Link>
          </Button>
          {rules && rules.length === 0 && (
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
              <Button>Create Rule</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingRule ? "Edit Rule" : "Create Alert Rule"}</DialogTitle>
                <DialogDescription>
                  Define when this rule should trigger an alert.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                <div className="space-y-2">
                  <Label htmlFor="name">Rule Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., High Error Rate"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe when this alert should fire..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="triggerType">Trigger Type *</Label>
                  <Select
                    value={formData.triggerType}
                    onValueChange={(value) =>
                      setFormData({ ...formData, triggerType: value as TriggerType })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select trigger type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="price_change">
                        📈 Price Change - % change in timeframe
                      </SelectItem>
                      <SelectItem value="price_threshold">
                        📊 Price Threshold - Above/below price
                      </SelectItem>
                      <SelectItem value="volume_spike">📶 Volume Spike - Unusual volume</SelectItem>
                      <SelectItem value="whale_activity">
                        🐋 Whale Activity - Large holder movement
                      </SelectItem>
                      <SelectItem value="holder_milestone">
                        👥 Holder Milestone - Holder count threshold
                      </SelectItem>
                      <SelectItem value="bonding_progress">
                        🔗 Bonding Progress - Graduation proximity
                      </SelectItem>
                      <SelectItem value="treasury_balance">
                        💰 Treasury Balance - Low balance warning
                      </SelectItem>
                      <SelectItem value="transaction_failed">
                        ❌ Transaction Failed - Failed tx alert
                      </SelectItem>
                      <SelectItem value="graduation">🎓 Graduation - Token graduated!</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="severity">Severity *</Label>
                  <Select
                    value={formData.severity}
                    onValueChange={(value) =>
                      setFormData({ ...formData, severity: value as Severity })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">
                        🚨 Critical - Immediate action required
                      </SelectItem>
                      <SelectItem value="warning">⚠️ Warning - Should be reviewed</SelectItem>
                      <SelectItem value="info">ℹ️ Info - For awareness</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cooldown">Cooldown (minutes)</Label>
                  <Input
                    id="cooldown"
                    type="number"
                    min="1"
                    placeholder="15"
                    value={formData.cooldownMinutes}
                    onChange={(e) => setFormData({ ...formData, cooldownMinutes: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum time between repeated alerts for this rule
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="conditions">Conditions (JSON)</Label>
                  <Textarea
                    id="conditions"
                    placeholder='{"threshold": 100, "metric": "error_count"}'
                    className="font-mono text-sm"
                    rows={4}
                    value={formData.conditions}
                    onChange={(e) => setFormData({ ...formData, conditions: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional JSON object with trigger-specific conditions
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
                  {isCreating ? "Saving..." : editingRule ? "Update Rule" : "Create Rule"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      {/* Rules Grid */}
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (rules?.length ?? 0) > 0 ? (
        <div className="grid gap-6 md:grid-cols-2">
          {rules?.map((rule) => (
            <Card key={rule._id} className={!rule.isEnabled ? "opacity-60" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{getTriggerTypeIcon(rule.triggerType)}</span>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {rule.name}
                        {getSeverityBadge(rule.severity)}
                      </CardTitle>
                      {rule.description && <CardDescription>{rule.description}</CardDescription>}
                    </div>
                  </div>
                  <Switch
                    checked={rule.isEnabled}
                    onCheckedChange={() => handleToggle(rule._id, rule.isEnabled)}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Rule Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-muted p-2">
                    <Text className="text-xs text-muted-foreground">Trigger Type</Text>
                    <Title className="text-sm">{getTriggerTypeLabel(rule.triggerType)}</Title>
                  </div>
                  <div className="rounded-lg bg-muted p-2">
                    <Text className="text-xs text-muted-foreground">Cooldown</Text>
                    <Title className="text-sm">{rule.cooldownMinutes || 15} min</Title>
                  </div>
                </div>

                {/* Conditions */}
                {rule.conditions && Object.keys(rule.conditions).length > 0 && (
                  <div className="space-y-1">
                    <Text className="text-xs text-muted-foreground">Conditions</Text>
                    <code className="block rounded bg-muted px-2 py-1 text-xs overflow-auto max-h-20">
                      {JSON.stringify(rule.conditions, null, 2)}
                    </code>
                  </div>
                )}

                {/* Stats */}
                {rule.lastTriggeredAt && (
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      Last triggered: {new Date(rule.lastTriggeredAt).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openEditDialog(rule)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(rule._id)}
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
            <div className="text-4xl mb-4">📋</div>
            <Title>No Alert Rules Configured</Title>
            <Text className="text-muted-foreground mb-4">
              Create alert rules to monitor your platform for important events.
            </Text>
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={handleSetupDefaults}>
                Setup Defaults
              </Button>
              <Button onClick={() => setIsCreateOpen(true)}>Create Rule</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>About Alert Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <Text className="text-muted-foreground">
            Alert rules define the conditions that trigger alerts. Each rule can have a different
            severity level and cooldown period to prevent alert fatigue.
          </Text>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>
              • <strong>Threshold</strong>: Triggers when a metric exceeds a defined limit
            </li>
            <li>
              • <strong>Rate Limit</strong>: Triggers when too many events occur in a time period
            </li>
            <li>
              • <strong>Pattern</strong>: Triggers when data matches a specific pattern
            </li>
            <li>
              • <strong>Scheduled</strong>: Runs periodic checks at defined intervals
            </li>
            <li>
              • <strong>Event</strong>: Triggers when a specific event occurs in the system
            </li>
          </ul>
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
