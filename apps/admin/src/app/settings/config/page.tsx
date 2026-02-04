"use client";

/**
 * System Configuration Management Page
 *
 * Manage system-wide configuration values organized by category.
 */

import { PageWrapper } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { RoleGuard, useAdmin } from "@/contexts/AdminContext";
import { typedApi, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import { Text, Title } from "@tremor/react";
import {
  AlertCircleIcon,
  CheckCircleIcon,
  Loader2Icon,
  PencilIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  SaveIcon,
  SettingsIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// =============================================================================
// Types
// =============================================================================

interface ConfigItem {
  _id: string;
  key: string;
  value: number | string | boolean;
  category: string;
  displayName: string;
  description: string;
  valueType: "number" | "string" | "boolean" | "json";
  minValue?: number;
  maxValue?: number;
  updatedAt: number;
  updatedBy: string;
  updatedByUsername: string;
}

type CategoryKey = "economy" | "matchmaking" | "gameplay" | "rates";

const CATEGORY_CONFIG: Record<CategoryKey, { label: string; description: string; icon: string }> = {
  economy: {
    label: "Economy",
    description: "Gold rewards, marketplace fees, and currency settings",
    icon: "💰",
  },
  matchmaking: {
    label: "Matchmaking",
    description: "ELO ranges, queue timeouts, and matching parameters",
    icon: "🎯",
  },
  gameplay: {
    label: "Gameplay",
    description: "Life points, deck sizes, and game rules",
    icon: "🎮",
  },
  rates: {
    label: "Rate Limits",
    description: "API and chat rate limiting settings",
    icon: "⏱️",
  },
};

// =============================================================================
// Components
// =============================================================================

/**
 * Edit Config Dialog
 *
 * Modal dialog for editing a single config value.
 * Handles different value types: string, number, boolean, JSON.
 * Uses the updateConfig mutation for single-item updates.
 */
function EditConfigDialog({
  config,
  open,
  onOpenChange,
  onSuccess,
}: {
  config: ConfigItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (key: string, newValue: number | string | boolean) => void;
}) {
  const updateConfig = useConvexMutation(typedApi.admin.config.updateConfig);
  const [editValue, setEditValue] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize edit value when dialog opens or config changes
  useEffect(() => {
    if (config && open) {
      if (config.valueType === "json") {
        setEditValue(JSON.stringify(config.value, null, 2));
      } else {
        setEditValue(String(config.value));
      }
      setError(null);
    }
  }, [config, open]);

  const parseValue = (): {
    success: boolean;
    value?: number | string | boolean;
    error?: string;
  } => {
    if (!config) return { success: false, error: "No config selected" };

    switch (config.valueType) {
      case "number": {
        const num = Number.parseFloat(editValue);
        if (Number.isNaN(num)) {
          return { success: false, error: "Please enter a valid number" };
        }
        if (config.minValue !== undefined && num < config.minValue) {
          return { success: false, error: `Value must be at least ${config.minValue}` };
        }
        if (config.maxValue !== undefined && num > config.maxValue) {
          return { success: false, error: `Value must be at most ${config.maxValue}` };
        }
        return { success: true, value: num };
      }
      case "boolean": {
        const lower = editValue.toLowerCase().trim();
        if (lower === "true" || lower === "1" || lower === "yes") {
          return { success: true, value: true };
        }
        if (lower === "false" || lower === "0" || lower === "no") {
          return { success: true, value: false };
        }
        return { success: false, error: "Please enter true or false" };
      }
      case "json": {
        try {
          const parsed = JSON.parse(editValue);
          return { success: true, value: parsed };
        } catch {
          return { success: false, error: "Invalid JSON format" };
        }
      }
      default:
        return { success: true, value: editValue };
    }
  };

  const handleSave = async () => {
    if (!config) return;

    const result = parseValue();
    if (!result.success) {
      setError(result.error ?? "Invalid value");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // biome-ignore lint/suspicious/noExplicitAny: TypedAPI has incorrect arg types
      const response = (await (updateConfig as any)({
        key: config.key,
        value: result.value,
      })) as { message: string };
      toast.success(response.message);
      onSuccess(config.key, result.value as number | string | boolean);
      onOpenChange(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update config";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (!config) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Configuration</DialogTitle>
          <DialogDescription>
            Update the value for <strong>{config.displayName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Config Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{config.valueType}</Badge>
              <Badge variant="outline">{config.category}</Badge>
            </div>
            <Text className="text-sm text-muted-foreground">{config.description}</Text>
            {(config.minValue !== undefined || config.maxValue !== undefined) && (
              <Text className="text-xs text-muted-foreground">
                {config.minValue !== undefined && `Min: ${config.minValue}`}
                {config.minValue !== undefined && config.maxValue !== undefined && " | "}
                {config.maxValue !== undefined && `Max: ${config.maxValue}`}
              </Text>
            )}
          </div>

          {/* Value Input */}
          <div className="space-y-2">
            <Label htmlFor="config-value">Value</Label>
            {config.valueType === "boolean" ? (
              <div className="flex items-center gap-4">
                <Switch
                  id="config-value"
                  checked={editValue.toLowerCase() === "true"}
                  onCheckedChange={(checked) => setEditValue(String(checked))}
                />
                <Text className="text-sm text-muted-foreground">
                  {editValue.toLowerCase() === "true" ? "Enabled" : "Disabled"}
                </Text>
              </div>
            ) : config.valueType === "json" ? (
              <Textarea
                id="config-value"
                value={editValue}
                onChange={(e) => {
                  setEditValue(e.target.value);
                  setError(null);
                }}
                className="font-mono text-sm min-h-[150px]"
                placeholder="Enter valid JSON..."
              />
            ) : (
              <Input
                id="config-value"
                type={config.valueType === "number" ? "number" : "text"}
                value={editValue}
                onChange={(e) => {
                  setEditValue(e.target.value);
                  setError(null);
                }}
                min={config.minValue}
                max={config.maxValue}
                placeholder={`Enter ${config.valueType} value...`}
              />
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircleIcon className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Current Value Reference */}
          <div className="rounded-md bg-muted p-3">
            <Text className="text-xs text-muted-foreground">
              Current value:{" "}
              <code className="font-mono">
                {config.valueType === "json" ? JSON.stringify(config.value) : String(config.value)}
              </code>
            </Text>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <SaveIcon className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConfigField({
  config,
  value,
  onChange,
  hasChanges,
  onEditClick,
}: {
  config: ConfigItem;
  value: number | string | boolean;
  onChange: (value: number | string | boolean) => void;
  hasChanges: boolean;
  onReset?: () => void;
  onEditClick: () => void;
}) {
  const resetToDefault = useConvexMutation(typedApi.admin.config.resetToDefault);
  const [isResetting, setIsResetting] = useState(false);

  const handleResetToDefault = async () => {
    setIsResetting(true);
    try {
      // biome-ignore lint/suspicious/noExplicitAny: TypedAPI has incorrect arg/return types
      const result = (await (resetToDefault as any)({ key: config.key })) as {
        message: string;
        defaultValue: number | string | boolean;
      };
      toast.success(result.message);
      onChange(result.defaultValue);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reset config");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b last:border-b-0">
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <Label className="text-base font-medium">{config.displayName}</Label>
          {hasChanges && (
            <Badge variant="outline" className="text-xs text-amber-600">
              Modified
            </Badge>
          )}
        </div>
        <Text className="text-sm text-muted-foreground">{config.description}</Text>
        {config.minValue !== undefined || config.maxValue !== undefined ? (
          <Text className="text-xs text-muted-foreground">
            {config.minValue !== undefined && `Min: ${config.minValue}`}
            {config.minValue !== undefined && config.maxValue !== undefined && " | "}
            {config.maxValue !== undefined && `Max: ${config.maxValue}`}
          </Text>
        ) : null}
        <Text className="text-xs text-muted-foreground mt-1">
          Last updated: {new Date(config.updatedAt).toLocaleString()} by {config.updatedByUsername}
        </Text>
      </div>

      <div className="flex items-center gap-2">
        {config.valueType === "boolean" ? (
          <Switch checked={value as boolean} onCheckedChange={(checked) => onChange(checked)} />
        ) : config.valueType === "number" ? (
          <Input
            type="number"
            value={value as number}
            onChange={(e) => onChange(Number.parseFloat(e.target.value) || 0)}
            min={config.minValue}
            max={config.maxValue}
            className="w-32"
          />
        ) : (
          <Input
            type="text"
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
            className="w-48"
          />
        )}

        <RoleGuard permission="config.edit">
          <Button variant="ghost" size="sm" onClick={onEditClick} title="Edit in dialog">
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetToDefault}
            disabled={isResetting}
            title="Reset to default"
          >
            {isResetting ? (
              <Loader2Icon className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcwIcon className="h-4 w-4" />
            )}
          </Button>
        </RoleGuard>
      </div>
    </div>
  );
}

function CategoryTab({
  category,
  configs,
  localValues,
  setLocalValues,
  originalValues,
  onEditConfig,
}: {
  category: CategoryKey;
  configs: ConfigItem[];
  localValues: Record<string, number | string | boolean>;
  setLocalValues: React.Dispatch<React.SetStateAction<Record<string, number | string | boolean>>>;
  originalValues: Record<string, number | string | boolean>;
  onEditConfig: (config: ConfigItem) => void;
}) {
  const bulkUpdate = useConvexMutation(typedApi.admin.config.bulkUpdateConfigs);
  const [isSaving, setIsSaving] = useState(false);

  const categoryConfigs = configs.filter((c) => c.category === category);

  const changedKeys = categoryConfigs.filter((c) => localValues[c.key] !== originalValues[c.key]);
  const hasChanges = changedKeys.length > 0;

  const handleSave = async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    try {
      const updates = changedKeys.map((c) => ({
        key: c.key,
        value: localValues[c.key],
      }));

      // biome-ignore lint/suspicious/noExplicitAny: TypedAPI has incorrect return type
      const result = (await bulkUpdate({ updates })) as unknown as {
        success: boolean;
        message: string;
        results: Array<{ success: boolean; key: string; error?: string }>;
      };

      if (result.success) {
        toast.success(result.message);
      } else {
        const failures = result.results.filter((r) => !r.success);
        toast.error(`Some updates failed: ${failures.map((f) => f.error).join(", ")}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    // Reset local values to original
    const resetValues = { ...localValues };
    for (const config of categoryConfigs) {
      const originalValue = originalValues[config.key];
      if (originalValue !== undefined) {
        resetValues[config.key] = originalValue;
      }
    }
    setLocalValues(resetValues);
  };

  const categoryConfig = CATEGORY_CONFIG[category];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{categoryConfig.icon}</span>
            <div>
              <CardTitle>{categoryConfig.label}</CardTitle>
              <CardDescription>{categoryConfig.description}</CardDescription>
            </div>
          </div>
          <RoleGuard permission="config.edit">
            <div className="flex gap-2">
              {hasChanges && (
                <Button variant="outline" onClick={handleReset}>
                  <RefreshCwIcon className="mr-2 h-4 w-4" />
                  Discard
                </Button>
              )}
              <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
                {isSaving ? (
                  <>
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <SaveIcon className="mr-2 h-4 w-4" />
                    Save Changes
                    {hasChanges && (
                      <Badge variant="secondary" className="ml-2">
                        {changedKeys.length}
                      </Badge>
                    )}
                  </>
                )}
              </Button>
            </div>
          </RoleGuard>
        </div>
      </CardHeader>
      <CardContent>
        {categoryConfigs.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <AlertCircleIcon className="mx-auto h-8 w-8 mb-2" />
            <Text>No configs found for this category</Text>
          </div>
        ) : (
          <div className="divide-y">
            {categoryConfigs.map((config) => (
              <ConfigField
                key={config._id}
                config={config}
                value={localValues[config.key] ?? config.value}
                onChange={(value) => setLocalValues((prev) => ({ ...prev, [config.key]: value }))}
                hasChanges={localValues[config.key] !== originalValues[config.key]}
                onReset={() => {
                  const originalValue = originalValues[config.key];
                  if (originalValue !== undefined) {
                    setLocalValues((prev) => ({
                      ...prev,
                      [config.key]: originalValue,
                    }));
                  }
                }}
                onEditClick={() => onEditConfig(config)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between py-4">
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-64" />
              </div>
              <Skeleton className="h-10 w-32" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function SystemConfigPage() {
  useAdmin(); // Auth check
  const [activeTab, setActiveTab] = useState<CategoryKey>("economy");
  const [localValues, setLocalValues] = useState<Record<string, number | string | boolean>>({});
  const [originalValues, setOriginalValues] = useState<Record<string, number | string | boolean>>(
    {}
  );

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ConfigItem | null>(null);

  // Queries
  // biome-ignore lint/suspicious/noExplicitAny: TypedAPI has incorrect return type
  const configsResult = useConvexQuery(typedApi.admin.config.listConfigs, {}) as
    | { configs: ConfigItem[]; totalCount: number }
    | undefined;
  // biome-ignore lint/suspicious/noExplicitAny: TypedAPI has incorrect return type
  const statsResult = useConvexQuery(typedApi.admin.config.getConfigStats, {}) as
    | { totalConfigs: number; byCategory: Record<string, number> }
    | undefined;

  // Mutations
  const initializeDefaults = useConvexMutation(typedApi.admin.config.initializeDefaults);
  const [isInitializing, setIsInitializing] = useState(false);

  // Initialize local values when configs load
  useEffect(() => {
    if (configsResult?.configs) {
      const values: Record<string, number | string | boolean> = {};
      for (const config of configsResult.configs) {
        values[config.key] = config.value;
      }
      setLocalValues(values);
      setOriginalValues(values);
    }
  }, [configsResult?.configs]);

  // Handle opening edit dialog for a config
  const handleEditConfig = (config: ConfigItem) => {
    setEditingConfig(config);
    setEditDialogOpen(true);
  };

  // Handle successful edit from dialog - update local and original values
  const handleEditSuccess = (key: string, newValue: number | string | boolean) => {
    setLocalValues((prev) => ({ ...prev, [key]: newValue }));
    setOriginalValues((prev) => ({ ...prev, [key]: newValue }));
  };

  const handleInitializeDefaults = async () => {
    setIsInitializing(true);
    try {
      // biome-ignore lint/suspicious/noExplicitAny: TypedAPI has incorrect return type
      const result = (await initializeDefaults({})) as unknown as {
        createdCount: number;
        message: string;
      };
      if (result.createdCount > 0) {
        toast.success(result.message);
      } else {
        toast.info(result.message);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to initialize defaults");
    } finally {
      setIsInitializing(false);
    }
  };

  const isLoading = configsResult === undefined;
  const configs = (configsResult?.configs ?? []) as ConfigItem[];
  const hasConfigs = configs.length > 0;

  // Count changes per category for badges
  const getChangesCount = (category: CategoryKey) => {
    return configs.filter(
      (c) => c.category === category && localValues[c.key] !== originalValues[c.key]
    ).length;
  };

  return (
    <PageWrapper
      title="System Configuration"
      description="Manage game-wide configuration values"
      actions={
        <RoleGuard permission="config.edit">
          <Button variant="outline" onClick={handleInitializeDefaults} disabled={isInitializing}>
            {isInitializing ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                Initializing...
              </>
            ) : (
              <>
                <SettingsIcon className="mr-2 h-4 w-4" />
                Initialize Defaults
              </>
            )}
          </Button>
        </RoleGuard>
      }
    >
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-5 mb-6">
        <Card>
          <div className="text-center p-4">
            <Text className="text-2xl font-bold">{statsResult?.totalConfigs ?? "..."}</Text>
            <Text className="text-sm text-muted-foreground">Total Configs</Text>
          </div>
        </Card>
        <Card>
          <div className="text-center p-4">
            <Text className="text-2xl font-bold text-amber-500">
              {statsResult?.byCategory?.economy ?? 0}
            </Text>
            <Text className="text-sm text-muted-foreground">Economy</Text>
          </div>
        </Card>
        <Card>
          <div className="text-center p-4">
            <Text className="text-2xl font-bold text-blue-500">
              {statsResult?.byCategory?.matchmaking ?? 0}
            </Text>
            <Text className="text-sm text-muted-foreground">Matchmaking</Text>
          </div>
        </Card>
        <Card>
          <div className="text-center p-4">
            <Text className="text-2xl font-bold text-green-500">
              {statsResult?.byCategory?.gameplay ?? 0}
            </Text>
            <Text className="text-sm text-muted-foreground">Gameplay</Text>
          </div>
        </Card>
        <Card>
          <div className="text-center p-4">
            <Text className="text-2xl font-bold text-purple-500">
              {statsResult?.byCategory?.rates ?? 0}
            </Text>
            <Text className="text-sm text-muted-foreground">Rate Limits</Text>
          </div>
        </Card>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : !hasConfigs ? (
        <Card className="py-12">
          <div className="text-center">
            <AlertCircleIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <Title>No Configuration Found</Title>
            <Text className="text-muted-foreground mt-2 mb-6">
              Initialize the default configuration values to get started.
            </Text>
            <RoleGuard permission="config.edit">
              <Button onClick={handleInitializeDefaults} disabled={isInitializing}>
                {isInitializing ? (
                  <>
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                    Initializing...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="mr-2 h-4 w-4" />
                    Initialize Default Configs
                  </>
                )}
              </Button>
            </RoleGuard>
          </div>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CategoryKey)}>
          <TabsList className="mb-4">
            {(Object.keys(CATEGORY_CONFIG) as CategoryKey[]).map((category) => {
              const changesCount = getChangesCount(category);
              const categoryConfig = CATEGORY_CONFIG[category];
              return (
                <TabsTrigger key={category} value={category} className="flex items-center gap-2">
                  <span>{categoryConfig.icon}</span>
                  <span>{categoryConfig.label}</span>
                  {changesCount > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {changesCount}
                    </Badge>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {(Object.keys(CATEGORY_CONFIG) as CategoryKey[]).map((category) => (
            <TabsContent key={category} value={category}>
              <CategoryTab
                category={category}
                configs={configs}
                localValues={localValues}
                setLocalValues={setLocalValues}
                originalValues={originalValues}
                onEditConfig={handleEditConfig}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Edit Config Dialog */}
      <EditConfigDialog
        config={editingConfig}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={handleEditSuccess}
      />
    </PageWrapper>
  );
}
