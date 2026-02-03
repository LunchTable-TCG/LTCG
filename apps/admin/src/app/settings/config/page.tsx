"use client";

/**
 * System Configuration Management Page
 *
 * Manage system-wide configuration values organized by category.
 */

import { PageWrapper } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoleGuard, useAdmin } from "@/contexts/AdminContext";
import { apiAny, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import { Text, Title } from "@tremor/react";
import {
  AlertCircleIcon,
  CheckCircleIcon,
  Loader2Icon,
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

const CATEGORY_CONFIG: Record<
  CategoryKey,
  { label: string; description: string; icon: string }
> = {
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

function ConfigField({
  config,
  value,
  onChange,
  hasChanges,
}: {
  config: ConfigItem;
  value: number | string | boolean;
  onChange: (value: number | string | boolean) => void;
  hasChanges: boolean;
  onReset?: () => void;
}) {
  const resetToDefault = useConvexMutation(apiAny.admin.config.resetToDefault);
  const [isResetting, setIsResetting] = useState(false);

  const handleResetToDefault = async () => {
    setIsResetting(true);
    try {
      const result = await resetToDefault({ key: config.key });
      toast.success(result.message);
      onChange(result.defaultValue);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to reset config"
      );
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
        <Text className="text-sm text-muted-foreground">
          {config.description}
        </Text>
        {config.minValue !== undefined || config.maxValue !== undefined ? (
          <Text className="text-xs text-muted-foreground">
            {config.minValue !== undefined && `Min: ${config.minValue}`}
            {config.minValue !== undefined &&
              config.maxValue !== undefined &&
              " | "}
            {config.maxValue !== undefined && `Max: ${config.maxValue}`}
          </Text>
        ) : null}
        <Text className="text-xs text-muted-foreground mt-1">
          Last updated: {new Date(config.updatedAt).toLocaleString()} by{" "}
          {config.updatedByUsername}
        </Text>
      </div>

      <div className="flex items-center gap-2">
        {config.valueType === "boolean" ? (
          <Switch
            checked={value as boolean}
            onCheckedChange={(checked) => onChange(checked)}
          />
        ) : config.valueType === "number" ? (
          <Input
            type="number"
            value={value as number}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
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
}: {
  category: CategoryKey;
  configs: ConfigItem[];
  localValues: Record<string, number | string | boolean>;
  setLocalValues: React.Dispatch<
    React.SetStateAction<Record<string, number | string | boolean>>
  >;
  originalValues: Record<string, number | string | boolean>;
}) {
  const bulkUpdate = useConvexMutation(apiAny.admin.config.bulkUpdateConfigs);
  const [isSaving, setIsSaving] = useState(false);

  const categoryConfigs = configs.filter((c) => c.category === category);

  const changedKeys = categoryConfigs.filter(
    (c) => localValues[c.key] !== originalValues[c.key]
  );
  const hasChanges = changedKeys.length > 0;

  const handleSave = async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    try {
      const updates = changedKeys.map((c) => ({
        key: c.key,
        value: localValues[c.key],
      }));

      const result = await bulkUpdate({ updates });

      if (result.success) {
        toast.success(result.message);
      } else {
        const failures = result.results.filter(
          (r: { success: boolean }) => !r.success
        );
        toast.error(
          `Some updates failed: ${failures.map((f: { key: string; error?: string }) => f.error).join(", ")}`
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save changes"
      );
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
                onChange={(value) =>
                  setLocalValues((prev) => ({ ...prev, [config.key]: value }))
                }
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
  const [localValues, setLocalValues] = useState<
    Record<string, number | string | boolean>
  >({});
  const [originalValues, setOriginalValues] = useState<
    Record<string, number | string | boolean>
  >({});

  // Queries
  const configsResult = useConvexQuery(apiAny.admin.config.listConfigs, {});
  const statsResult = useConvexQuery(apiAny.admin.config.getConfigStats, {});

  // Mutations
  const initializeDefaults = useConvexMutation(
    apiAny.admin.config.initializeDefaults
  );
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

  const handleInitializeDefaults = async () => {
    setIsInitializing(true);
    try {
      const result = await initializeDefaults({});
      if (result.createdCount > 0) {
        toast.success(result.message);
      } else {
        toast.info(result.message);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to initialize defaults"
      );
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
      (c) =>
        c.category === category &&
        localValues[c.key] !== originalValues[c.key]
    ).length;
  };

  return (
    <PageWrapper
      title="System Configuration"
      description="Manage game-wide configuration values"
      actions={
        <RoleGuard permission="config.edit">
          <Button
            variant="outline"
            onClick={handleInitializeDefaults}
            disabled={isInitializing}
          >
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
            <Text className="text-2xl font-bold">
              {statsResult?.totalConfigs ?? "..."}
            </Text>
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
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as CategoryKey)}
        >
          <TabsList className="mb-4">
            {(Object.keys(CATEGORY_CONFIG) as CategoryKey[]).map((category) => {
              const changesCount = getChangesCount(category);
              const categoryConfig = CATEGORY_CONFIG[category];
              return (
                <TabsTrigger
                  key={category}
                  value={category}
                  className="flex items-center gap-2"
                >
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
              />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </PageWrapper>
  );
}
