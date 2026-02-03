"use client";

/**
 * Treasury Policies Page
 *
 * Create and manage spending policies for treasury wallets.
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { apiAny, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import { Badge, Text, Title } from "@tremor/react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

// =============================================================================
// Helper Functions
// =============================================================================

function formatLamports(lamports: number) {
  const sol = lamports / 1_000_000_000;
  return `${sol.toFixed(2)} SOL`;
}

// =============================================================================
// Component
// =============================================================================

export default function TreasuryPoliciesPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    maxTransactionAmount: "",
    dailyLimit: "",
    requiresApproval: true,
    minApprovers: "1",
  });

  // Fetch policies
  const policies = useConvexQuery(apiAny.treasury.policies.listPolicies, { includeInactive: true });

  // Mutations
  const createPolicy = useConvexMutation(apiAny.treasury.policies.createPolicy);
  const updatePolicy = useConvexMutation(apiAny.treasury.policies.updatePolicy);
  // deletePolicy will be used when delete UI is implemented
  const setupDefaults = useConvexMutation(apiAny.treasury.policies.setupDefaultPolicies);

  const isLoading = policies === undefined;

  function resetForm() {
    setFormData({
      name: "",
      description: "",
      maxTransactionAmount: "",
      dailyLimit: "",
      requiresApproval: true,
      minApprovers: "1",
    });
  }

  async function handleCreatePolicy() {
    if (!formData.name) {
      toast.error("Please enter a policy name");
      return;
    }

    setIsCreating(true);
    try {
      await createPolicy({
        name: formData.name,
        description: formData.description || undefined,
        rules: {
          maxTransactionAmount: formData.maxTransactionAmount
            ? parseFloat(formData.maxTransactionAmount) * 1_000_000_000 // Convert SOL to lamports
            : undefined,
          dailyLimit: formData.dailyLimit
            ? parseFloat(formData.dailyLimit) * 1_000_000_000
            : undefined,
          requiresApproval: formData.requiresApproval,
          minApprovers: formData.requiresApproval
            ? parseInt(formData.minApprovers) || 1
            : undefined,
        },
      });
      toast.success("Policy created");
      setIsCreateOpen(false);
      resetForm();
    } catch (error) {
      toast.error(`Failed to create policy: ${error}`);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleToggleActive(policyId: string, currentActive: boolean) {
    try {
      await updatePolicy({ policyId, isActive: !currentActive });
      toast.success(`Policy ${currentActive ? "deactivated" : "activated"}`);
    } catch (error) {
      toast.error(`Failed to update policy: ${error}`);
    }
  }

  async function handleSetupDefaults() {
    try {
      const result = await setupDefaults({});
      toast.success(result.message);
    } catch (error) {
      toast.error(`Failed to setup defaults: ${error}`);
    }
  }

  return (
    <PageWrapper
      title="Treasury Policies"
      description="Manage spending policies and approval workflows"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/treasury">← Back to Overview</Link>
          </Button>
          {policies && policies.length === 0 && (
            <Button variant="outline" onClick={handleSetupDefaults}>
              Setup Defaults
            </Button>
          )}
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>Create Policy</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Spending Policy</DialogTitle>
                <DialogDescription>
                  Define rules for treasury spending.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Policy Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Standard Distribution"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe when this policy should be used..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxTx">Max Transaction (SOL)</Label>
                  <Input
                    id="maxTx"
                    type="number"
                    placeholder="e.g., 100"
                    value={formData.maxTransactionAmount}
                    onChange={(e) =>
                      setFormData({ ...formData, maxTransactionAmount: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty for no limit
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dailyLimit">Daily Limit (SOL)</Label>
                  <Input
                    id="dailyLimit"
                    type="number"
                    placeholder="e.g., 500"
                    value={formData.dailyLimit}
                    onChange={(e) => setFormData({ ...formData, dailyLimit: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty for no limit
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="requiresApproval">Requires Approval</Label>
                    <p className="text-xs text-muted-foreground">
                      Transactions need admin approval
                    </p>
                  </div>
                  <Switch
                    id="requiresApproval"
                    checked={formData.requiresApproval}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, requiresApproval: checked })
                    }
                  />
                </div>
                {formData.requiresApproval && (
                  <div className="space-y-2">
                    <Label htmlFor="minApprovers">Minimum Approvers</Label>
                    <Input
                      id="minApprovers"
                      type="number"
                      min="1"
                      value={formData.minApprovers}
                      onChange={(e) =>
                        setFormData({ ...formData, minApprovers: e.target.value })
                      }
                    />
                  </div>
                )}
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
                <Button onClick={handleCreatePolicy} disabled={isCreating}>
                  {isCreating ? "Creating..." : "Create Policy"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      {/* Policies Grid */}
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
      ) : (policies?.length ?? 0) > 0 ? (
        <div className="grid gap-6 md:grid-cols-2">
          {policies?.map((policy: any) => (
            <Card key={policy._id} className={!policy.isActive ? "opacity-60" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      📜 {policy.name}
                      {policy.isActive ? (
                        <Badge color="emerald">Active</Badge>
                      ) : (
                        <Badge color="gray">Inactive</Badge>
                      )}
                    </CardTitle>
                    {policy.description && (
                      <CardDescription>{policy.description}</CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Rules */}
                <div className="space-y-2">
                  <Text className="text-sm font-medium">Rules</Text>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-muted p-2">
                      <Text className="text-xs text-muted-foreground">Max Transaction</Text>
                      <Title className="text-sm">
                        {policy.rules.maxTransactionAmount
                          ? formatLamports(policy.rules.maxTransactionAmount)
                          : "No limit"}
                      </Title>
                    </div>
                    <div className="rounded-lg bg-muted p-2">
                      <Text className="text-xs text-muted-foreground">Daily Limit</Text>
                      <Title className="text-sm">
                        {policy.rules.dailyLimit
                          ? formatLamports(policy.rules.dailyLimit)
                          : "No limit"}
                      </Title>
                    </div>
                  </div>
                </div>

                {/* Approval */}
                <div className="rounded-lg bg-muted p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Text className="text-sm font-medium">Approval Required</Text>
                      <Text className="text-xs text-muted-foreground">
                        {policy.rules.requiresApproval
                          ? `Minimum ${policy.rules.minApprovers || 1} approver(s)`
                          : "Auto-approved"}
                      </Text>
                    </div>
                    {policy.rules.requiresApproval ? (
                      <Badge color="amber">Yes</Badge>
                    ) : (
                      <Badge color="emerald">No</Badge>
                    )}
                  </div>
                </div>

                {/* Allowed Recipients */}
                {policy.rules.allowedRecipients &&
                  policy.rules.allowedRecipients.length > 0 && (
                    <div className="space-y-2">
                      <Text className="text-sm font-medium">Allowed Recipients</Text>
                      <div className="space-y-1">
                        {policy.rules.allowedRecipients.map((addr: string, i: number) => (
                          <code
                            key={i}
                            className="block rounded bg-muted px-2 py-1 text-xs"
                          >
                            {addr}
                          </code>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleToggleActive(policy._id, policy.isActive)}
                  >
                    {policy.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-4xl mb-4">📜</div>
            <Title>No Policies Configured</Title>
            <Text className="text-muted-foreground mb-4">
              Create spending policies to control treasury operations.
            </Text>
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={handleSetupDefaults}>
                Setup Defaults
              </Button>
              <Button onClick={() => setIsCreateOpen(true)}>Create Policy</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>About Treasury Policies</CardTitle>
        </CardHeader>
        <CardContent>
          <Text className="text-muted-foreground">
            Policies define rules for treasury spending. Assign policies to wallets to enforce
            spending limits and approval workflows.
          </Text>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>
              • <strong>Max Transaction</strong>: Maximum amount for a single transaction
            </li>
            <li>
              • <strong>Daily Limit</strong>: Maximum total spending per day
            </li>
            <li>
              • <strong>Approval Required</strong>: Whether transactions need admin approval
            </li>
            <li>
              • <strong>Min Approvers</strong>: Number of admins required to approve
            </li>
            <li>
              • <strong>Allowed Recipients</strong>: Whitelist of addresses that can receive funds
            </li>
          </ul>
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
