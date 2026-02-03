"use client";

/**
 * AI Provider Settings Page
 *
 * Configure AI providers (OpenRouter, Vercel AI Gateway, Anthropic, OpenAI),
 * select models, and manage AI feature settings.
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
// Dialog components available for future use if needed
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
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoleGuard, useAdmin } from "@/contexts/AdminContext";
import { apiAny, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import { Text, Title } from "@tremor/react";
import { useAction } from "convex/react";
import {
  AlertCircleIcon,
  CheckCircleIcon,
  Loader2Icon,
  SaveIcon,
  SettingsIcon,
  WifiIcon,
  WifiOffIcon,
  ZapIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

// =============================================================================
// Types
// =============================================================================

interface AIConfigItem {
  _id: string;
  key: string;
  value: number | string | boolean | string[];
  category: string;
  displayName: string;
  description: string;
  valueType: "number" | "string" | "boolean" | "json";
  minValue?: number;
  maxValue?: number;
  updatedAt: number;
  updatedByUsername: string;
}

interface ProviderStatus {
  openrouter: boolean;
  anthropic: boolean;
  openai: boolean;
  vercel: boolean;
}

type ProviderKey = keyof ProviderStatus;

const PROVIDER_INFO: Record<
  ProviderKey,
  {
    name: string;
    description: string;
    icon: string;
    docsUrl: string;
  }
> = {
  vercel: {
    name: "Vercel AI Gateway",
    description: "Low-latency proxy with built-in observability and ZDR support",
    icon: "V",
    docsUrl: "https://vercel.com/docs/ai-gateway",
  },
  openrouter: {
    name: "OpenRouter",
    description: "Unified API access to 400+ AI models with automatic fallback",
    icon: "OR",
    docsUrl: "https://openrouter.ai/docs",
  },
  anthropic: {
    name: "Anthropic",
    description: "Direct access to Claude models",
    icon: "A",
    docsUrl: "https://docs.anthropic.com/",
  },
  openai: {
    name: "OpenAI",
    description: "Direct access to GPT and embedding models",
    icon: "OA",
    docsUrl: "https://platform.openai.com/docs",
  },
};

// Popular models for OpenRouter
const OPENROUTER_MODELS = [
  { value: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
  { value: "anthropic/claude-3-opus", label: "Claude 3 Opus" },
  { value: "anthropic/claude-3-haiku", label: "Claude 3 Haiku" },
  { value: "openai/gpt-4o", label: "GPT-4o" },
  { value: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "openai/gpt-4-turbo", label: "GPT-4 Turbo" },
  { value: "google/gemini-pro", label: "Gemini Pro" },
  { value: "google/gemini-pro-1.5", label: "Gemini Pro 1.5" },
  { value: "meta-llama/llama-3.1-405b-instruct", label: "Llama 3.1 405B" },
  { value: "meta-llama/llama-3.1-70b-instruct", label: "Llama 3.1 70B" },
  { value: "mistralai/mistral-large", label: "Mistral Large" },
  { value: "mistralai/mixtral-8x7b-instruct", label: "Mixtral 8x7B" },
  { value: "cohere/command-r-plus", label: "Command R+" },
  { value: "perplexity/llama-3.1-sonar-large-128k-online", label: "Sonar Large (Online)" },
];

// Vercel AI Gateway models (typically OpenAI)
const VERCEL_MODELS = [
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
  { value: "gpt-4", label: "GPT-4" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
];

// Embedding models
const EMBEDDING_MODELS = [
  { value: "text-embedding-3-small", label: "text-embedding-3-small (OpenAI)" },
  { value: "text-embedding-3-large", label: "text-embedding-3-large (OpenAI)" },
  { value: "text-embedding-ada-002", label: "text-embedding-ada-002 (OpenAI)" },
];

// =============================================================================
// Helper Components
// =============================================================================

function ProviderStatusCard({
  provider,
  isConfigured,
  isTesting,
  testResult,
  onTest,
}: {
  provider: ProviderKey;
  isConfigured: boolean;
  isTesting: boolean;
  testResult?: { success: boolean; latencyMs?: number; error?: string } | null;
  onTest: () => void;
}) {
  const info = PROVIDER_INFO[provider];

  return (
    <Card className={isConfigured ? "border-green-500/50" : "border-muted"}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg font-bold text-sm ${
                isConfigured
                  ? "bg-green-500/10 text-green-600"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {info.icon}
            </div>
            <div>
              <CardTitle className="text-base">{info.name}</CardTitle>
              <CardDescription className="text-xs">{info.description}</CardDescription>
            </div>
          </div>
          {isConfigured ? (
            <WifiIcon className="h-5 w-5 text-green-500" />
          ) : (
            <WifiOffIcon className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <Badge variant={isConfigured ? "default" : "secondary"}>
            {isConfigured ? "API Key Configured" : "Not Configured"}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={onTest}
            disabled={!isConfigured || isTesting}
          >
            {isTesting ? (
              <>
                <Loader2Icon className="mr-2 h-3 w-3 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <ZapIcon className="mr-2 h-3 w-3" />
                Test
              </>
            )}
          </Button>
        </div>

        {testResult && (
          <div
            className={`mt-3 flex items-center gap-2 rounded-md p-2 text-sm ${
              testResult.success
                ? "bg-green-500/10 text-green-600"
                : "bg-red-500/10 text-red-600"
            }`}
          >
            {testResult.success ? (
              <>
                <CheckCircleIcon className="h-4 w-4" />
                Connected ({testResult.latencyMs}ms)
              </>
            ) : (
              <>
                <AlertCircleIcon className="h-4 w-4" />
                {testResult.error}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ConfigSlider({
  label,
  description,
  value,
  onChange,
  min,
  max,
  step,
  formatValue,
}: {
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  formatValue?: (value: number) => string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">{label}</Label>
          <Text className="text-xs text-muted-foreground">{description}</Text>
        </div>
        <Badge variant="outline" className="font-mono">
          {formatValue ? formatValue(value) : value}
        </Badge>
      </div>
      <Slider
        value={[value]}
        onValueChange={(values) => {
          const v = values[0];
          if (typeof v === "number") onChange(v);
        }}
        min={min}
        max={max}
        step={step ?? 1}
        className="py-2"
      />
    </div>
  );
}

function FeatureToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b last:border-b-0">
      <div className="space-y-1">
        <Label className="text-base font-medium">{label}</Label>
        <Text className="text-sm text-muted-foreground">{description}</Text>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-6 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-48" />
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

export default function AIProvidersPage() {
  useAdmin(); // Auth check

  // Queries
  const configsResult = useConvexQuery(apiAny.admin.aiConfig.getAIConfigs, {});

  // Mutations
  const updateConfig = useConvexMutation(apiAny.admin.aiConfig.updateAIConfig);
  const initializeDefaults = useConvexMutation(apiAny.admin.aiConfig.initializeAIDefaults);
  const testProvider = useAction(apiAny.admin.aiConfig.testProviderConnection);

  // Local state
  const [localValues, setLocalValues] = useState<Record<string, any>>({});
  const [originalValues, setOriginalValues] = useState<Record<string, any>>({});
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  const [testResults, setTestResults] = useState<Record<ProviderKey, any>>({} as any);
  const [testingProvider, setTestingProvider] = useState<ProviderKey | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // savingKey reserved for per-field saving indicator (if needed)

  // Fetch provider status on mount
  const fetchProviderStatus = useCallback(async () => {
    try {
      const result = await testProvider({});
      if (result.providerStatus) {
        setProviderStatus(result.providerStatus);
      }
    } catch (error) {
      console.error("Failed to fetch provider status:", error);
    }
  }, [testProvider]);

  useEffect(() => {
    fetchProviderStatus();
  }, [fetchProviderStatus]);

  // Initialize local values when configs load
  useEffect(() => {
    if (configsResult?.configs) {
      const values: Record<string, any> = {};
      for (const config of configsResult.configs as AIConfigItem[]) {
        values[config.key] = config.value;
      }
      setLocalValues(values);
      setOriginalValues(values);
    }
  }, [configsResult?.configs]);

  // Get config value helper
  const getConfigValue = (key: string, defaultValue: any = null) => {
    return localValues[key] ?? defaultValue;
  };

  // Update local value
  const setConfigValue = (key: string, value: any) => {
    setLocalValues((prev) => ({ ...prev, [key]: value }));
  };

  // Check if value has changed
  const hasChanged = (key: string) => {
    return localValues[key] !== originalValues[key];
  };

  // Save all changed configs
  const saveAllChanges = async () => {
    const changedKeys = Object.keys(localValues).filter(
      (key) => localValues[key] !== originalValues[key]
    );

    if (changedKeys.length === 0) {
      toast.info("No changes to save");
      return;
    }

    setIsSaving(true);
    try {
      for (const key of changedKeys) {
        await updateConfig({
          key,
          value: localValues[key],
        });
      }
      setOriginalValues({ ...localValues });
      toast.success(`Saved ${changedKeys.length} settings`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  // Test provider connection
  const handleTestProvider = async (provider: ProviderKey) => {
    setTestingProvider(provider);
    setTestResults((prev) => ({ ...prev, [provider]: null }));

    try {
      const result = await testProvider({ provider });
      setTestResults((prev) => ({
        ...prev,
        [provider]: {
          success: result.success,
          latencyMs: result.latencyMs,
          error: result.error,
        },
      }));

      if (result.success) {
        toast.success(`${PROVIDER_INFO[provider].name} connected successfully`);
      } else {
        toast.error(result.error || "Connection failed");
      }
    } catch (error) {
      setTestResults((prev) => ({
        ...prev,
        [provider]: {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      }));
      toast.error("Failed to test connection");
    } finally {
      setTestingProvider(null);
    }
  };

  // Initialize defaults
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
      toast.error(error instanceof Error ? error.message : "Failed to initialize");
    } finally {
      setIsInitializing(false);
    }
  };

  const isLoading = configsResult === undefined;
  const configs = (configsResult?.configs ?? []) as AIConfigItem[];
  const hasConfigs = configs.length > 0;

  // Count total changes
  const totalChanges = Object.keys(localValues).filter(
    (key) => localValues[key] !== originalValues[key]
  ).length;

  return (
    <PageWrapper
      title="AI Provider Settings"
      description="Configure AI providers, models, and feature settings"
      actions={
        <div className="flex items-center gap-2">
          <RoleGuard permission="admin.manage">
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
          <RoleGuard permission="admin.manage">
            <Button
              onClick={saveAllChanges}
              disabled={totalChanges === 0 || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <SaveIcon className="mr-2 h-4 w-4" />
                  Save All Changes
                  {totalChanges > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {totalChanges}
                    </Badge>
                  )}
                </>
              )}
            </Button>
          </RoleGuard>
        </div>
      }
    >
      {isLoading ? (
        <LoadingSkeleton />
      ) : !hasConfigs ? (
        <Card className="py-12">
          <div className="text-center">
            <AlertCircleIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <Title>No AI Configuration Found</Title>
            <Text className="text-muted-foreground mt-2 mb-6">
              Initialize the default AI configuration values to get started.
            </Text>
            <RoleGuard permission="admin.manage">
              <Button onClick={handleInitializeDefaults} disabled={isInitializing}>
                {isInitializing ? (
                  <>
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                    Initializing...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="mr-2 h-4 w-4" />
                    Initialize AI Defaults
                  </>
                )}
              </Button>
            </RoleGuard>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Provider Status Cards */}
          <div>
            <Title className="mb-4">Provider Status</Title>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {(["vercel", "openrouter", "anthropic", "openai"] as ProviderKey[]).map(
                (provider) => (
                  <ProviderStatusCard
                    key={provider}
                    provider={provider}
                    isConfigured={providerStatus?.[provider] ?? false}
                    isTesting={testingProvider === provider}
                    testResult={testResults[provider]}
                    onTest={() => handleTestProvider(provider)}
                  />
                )
              )}
            </div>
          </div>

          {/* Configuration Tabs */}
          <Tabs defaultValue="providers" className="space-y-4">
            <TabsList>
              <TabsTrigger value="providers">Provider Selection</TabsTrigger>
              <TabsTrigger value="openrouter">OpenRouter</TabsTrigger>
              <TabsTrigger value="vercel">Vercel AI</TabsTrigger>
              <TabsTrigger value="general">General Settings</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
            </TabsList>

            {/* Provider Selection Tab */}
            <TabsContent value="providers">
              <Card>
                <CardHeader>
                  <CardTitle>Provider Selection</CardTitle>
                  <CardDescription>
                    Choose your primary and fallback AI providers
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Primary Provider</Label>
                      <Text className="text-xs text-muted-foreground mb-2">
                        Main provider for AI requests
                      </Text>
                      <Select
                        value={getConfigValue("ai.provider", "vercel")}
                        onValueChange={(value) => setConfigValue("ai.provider", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vercel">Vercel AI Gateway</SelectItem>
                          <SelectItem value="openrouter">OpenRouter</SelectItem>
                          <SelectItem value="anthropic">Anthropic (Direct)</SelectItem>
                          <SelectItem value="openai">OpenAI (Direct)</SelectItem>
                        </SelectContent>
                      </Select>
                      {hasChanged("ai.provider") && (
                        <Badge variant="outline" className="text-xs text-amber-600">
                          Modified
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Fallback Provider</Label>
                      <Text className="text-xs text-muted-foreground mb-2">
                        Used when primary provider fails
                      </Text>
                      <Select
                        value={getConfigValue("ai.fallback_provider", "openrouter")}
                        onValueChange={(value) => setConfigValue("ai.fallback_provider", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select fallback" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="openrouter">OpenRouter</SelectItem>
                          <SelectItem value="vercel">Vercel AI Gateway</SelectItem>
                          <SelectItem value="anthropic">Anthropic (Direct)</SelectItem>
                          <SelectItem value="openai">OpenAI (Direct)</SelectItem>
                          <SelectItem value="none">None</SelectItem>
                        </SelectContent>
                      </Select>
                      {hasChanged("ai.fallback_provider") && (
                        <Badge variant="outline" className="text-xs text-amber-600">
                          Modified
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="rounded-md bg-muted p-4">
                    <Text className="text-sm">
                      <strong>Current Setup:</strong> Primary requests go to{" "}
                      <Badge variant="secondary">
                        {PROVIDER_INFO[getConfigValue("ai.provider", "vercel") as ProviderKey]?.name ?? "Vercel AI"}
                      </Badge>
                      , with{" "}
                      {getConfigValue("ai.fallback_provider", "openrouter") !== "none" ? (
                        <>
                          fallback to{" "}
                          <Badge variant="secondary">
                            {PROVIDER_INFO[getConfigValue("ai.fallback_provider", "openrouter") as ProviderKey]?.name ?? "OpenRouter"}
                          </Badge>
                        </>
                      ) : (
                        "no fallback configured"
                      )}
                      .
                    </Text>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* OpenRouter Tab */}
            <TabsContent value="openrouter">
              <Card>
                <CardHeader>
                  <CardTitle>OpenRouter Settings</CardTitle>
                  <CardDescription>
                    Configure OpenRouter model selection and fallback chain
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Default Model</Label>
                    <Text className="text-xs text-muted-foreground mb-2">
                      Primary model for OpenRouter requests
                    </Text>
                    <Select
                      value={getConfigValue("ai.openrouter.model", "anthropic/claude-3.5-sonnet")}
                      onValueChange={(value) => setConfigValue("ai.openrouter.model", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        {OPENROUTER_MODELS.map((model) => (
                          <SelectItem key={model.value} value={model.value}>
                            {model.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {hasChanged("ai.openrouter.model") && (
                      <Badge variant="outline" className="text-xs text-amber-600">
                        Modified
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Fallback Models</Label>
                    <Text className="text-xs text-muted-foreground mb-2">
                      Models to try if the primary model fails (JSON array)
                    </Text>
                    <Input
                      value={JSON.stringify(getConfigValue("ai.openrouter.fallback_models", []))}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          if (Array.isArray(parsed)) {
                            setConfigValue("ai.openrouter.fallback_models", parsed);
                          }
                        } catch {
                          // Invalid JSON, keep current value
                        }
                      }}
                      placeholder='["openai/gpt-4o-mini", "google/gemini-pro"]'
                      className="font-mono text-sm"
                    />
                    {hasChanged("ai.openrouter.fallback_models") && (
                      <Badge variant="outline" className="text-xs text-amber-600">
                        Modified
                      </Badge>
                    )}
                  </div>

                  <div className="rounded-md bg-blue-500/10 p-4">
                    <Text className="text-sm text-blue-600">
                      OpenRouter provides access to 400+ models through a unified API.
                      Model pricing and availability may vary.{" "}
                      <a
                        href="https://openrouter.ai/models"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        View all models
                      </a>
                    </Text>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Vercel AI Tab */}
            <TabsContent value="vercel">
              <Card>
                <CardHeader>
                  <CardTitle>Vercel AI Gateway Settings</CardTitle>
                  <CardDescription>
                    Configure Vercel AI Gateway model and privacy settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Default Model</Label>
                    <Text className="text-xs text-muted-foreground mb-2">
                      Model to use with Vercel AI Gateway
                    </Text>
                    <Select
                      value={getConfigValue("ai.vercel.model", "gpt-4o")}
                      onValueChange={(value) => setConfigValue("ai.vercel.model", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        {VERCEL_MODELS.map((model) => (
                          <SelectItem key={model.value} value={model.value}>
                            {model.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {hasChanged("ai.vercel.model") && (
                      <Badge variant="outline" className="text-xs text-amber-600">
                        Modified
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between py-4 border rounded-md px-4">
                    <div className="space-y-1">
                      <Label className="text-base font-medium">Zero Data Retention (ZDR)</Label>
                      <Text className="text-sm text-muted-foreground">
                        Enable ZDR mode to prevent data from being stored by providers
                      </Text>
                    </div>
                    <Switch
                      checked={getConfigValue("ai.vercel.zdr_enabled", true)}
                      onCheckedChange={(checked) => setConfigValue("ai.vercel.zdr_enabled", checked)}
                    />
                  </div>
                  {hasChanged("ai.vercel.zdr_enabled") && (
                    <Badge variant="outline" className="text-xs text-amber-600">
                      ZDR setting modified
                    </Badge>
                  )}

                  <div className="rounded-md bg-purple-500/10 p-4">
                    <Text className="text-sm text-purple-600">
                      Vercel AI Gateway provides low-latency access with built-in observability,
                      caching, and Zero Data Retention mode for privacy-sensitive applications.
                    </Text>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* General Settings Tab */}
            <TabsContent value="general">
              <Card>
                <CardHeader>
                  <CardTitle>General AI Settings</CardTitle>
                  <CardDescription>
                    Configure response parameters and embedding model
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div className="space-y-2">
                    <Label>Embedding Model</Label>
                    <Text className="text-xs text-muted-foreground mb-2">
                      Model used for RAG and semantic search
                    </Text>
                    <Select
                      value={getConfigValue("ai.embedding_model", "text-embedding-3-small")}
                      onValueChange={(value) => setConfigValue("ai.embedding_model", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select embedding model" />
                      </SelectTrigger>
                      <SelectContent>
                        {EMBEDDING_MODELS.map((model) => (
                          <SelectItem key={model.value} value={model.value}>
                            {model.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {hasChanged("ai.embedding_model") && (
                      <Badge variant="outline" className="text-xs text-amber-600">
                        Modified
                      </Badge>
                    )}
                  </div>

                  <ConfigSlider
                    label="Max Tokens"
                    description="Maximum tokens per response (100-8000)"
                    value={getConfigValue("ai.max_tokens", 2000)}
                    onChange={(value) => setConfigValue("ai.max_tokens", value)}
                    min={100}
                    max={8000}
                    step={100}
                  />
                  {hasChanged("ai.max_tokens") && (
                    <Badge variant="outline" className="text-xs text-amber-600">
                      Max tokens modified
                    </Badge>
                  )}

                  <ConfigSlider
                    label="Temperature"
                    description="Response creativity (0 = deterministic, 1 = creative)"
                    value={getConfigValue("ai.temperature", 0.7)}
                    onChange={(value) => setConfigValue("ai.temperature", value)}
                    min={0}
                    max={1}
                    step={0.1}
                    formatValue={(v) => v.toFixed(1)}
                  />
                  {hasChanged("ai.temperature") && (
                    <Badge variant="outline" className="text-xs text-amber-600">
                      Temperature modified
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Features Tab */}
            <TabsContent value="features">
              <Card>
                <CardHeader>
                  <CardTitle>AI Features</CardTitle>
                  <CardDescription>Enable or disable AI-powered features</CardDescription>
                </CardHeader>
                <CardContent>
                  <FeatureToggle
                    label="Admin Assistant"
                    description="Enable the AI assistant in the admin dashboard for moderation support, content generation, and analytics help"
                    checked={getConfigValue("ai.admin_assistant_enabled", true)}
                    onChange={(checked) => setConfigValue("ai.admin_assistant_enabled", checked)}
                  />
                  {hasChanged("ai.admin_assistant_enabled") && (
                    <Badge variant="outline" className="text-xs text-amber-600 mb-4">
                      Admin Assistant setting modified
                    </Badge>
                  )}

                  <FeatureToggle
                    label="Game Guide Chat"
                    description="Enable the Lunchtable Guide AI in the web app to help players learn the game"
                    checked={getConfigValue("ai.game_guide_enabled", true)}
                    onChange={(checked) => setConfigValue("ai.game_guide_enabled", checked)}
                  />
                  {hasChanged("ai.game_guide_enabled") && (
                    <Badge variant="outline" className="text-xs text-amber-600">
                      Game Guide setting modified
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </PageWrapper>
  );
}
